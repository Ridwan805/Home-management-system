const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5001/api';

// Helper function to create a test token
const createTestToken = (userId, role = 'tenant') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (endpoint, method = 'GET', data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close', // Force new connection
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data }),
      timeout: 10000
    };
    
    console.log('🔄 Making request to:', endpoint);
    console.log('🔑 Using token:', token ? 'Yes' : 'No');
    if (token) {
      const decodedToken = jwt.decode(token);
      console.log('🔍 DEBUG: Token being sent contains userId:', decodedToken?.userId);
      console.log('🔍 DEBUG: Full token being sent:', token.substring(0, 50) + '...');
    }
    
    // Add small delay to avoid any timing issues
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      code: error.code
    };
  }
};

// Debug authentication and request flow
const debugPaymentAuth = async () => {
  console.log('🔍 Starting Payment Authentication Debug...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Find a request that should be eligible for full payment
    console.log('\n📋 Step 1: Finding eligible requests...');
    
    const requests = await Request.find({
      requestType: 'Buy',
      status: { $in: ['Confirmed for Sale', 'Advance Payment Completed'] },
      'propertyId': { $exists: true },
      'tenantId': { $exists: true }
    })
    .populate('propertyId', 'address price listingType')
    .populate('tenantId', 'firstName lastName email')
    .populate('ownerId', 'firstName lastName email')
    .limit(5);
    
    console.log(`✅ Found ${requests.length} eligible requests`);
    
    if (requests.length === 0) {
      console.log('❌ No eligible requests found. Creating test scenario...');
      return;
    }
    
    // 2. Test with the first eligible request
    const testRequest = requests[0];
    console.log('\n📋 Step 2: Testing with request:', {
      id: testRequest._id,
      status: testRequest.status,
      tenantId: testRequest.tenantId._id,
      tenantName: `${testRequest.tenantId.firstName} ${testRequest.tenantId.lastName}`,
      propertyAddress: testRequest.propertyId.address,
      propertyType: testRequest.propertyId.listingType,
      advancePayment: testRequest.advancePayment,
      fullPayment: testRequest.fullPayment
    });
    
    // 3. Create a valid token for the tenant
    const tenantIdString = testRequest.tenantId._id.toString();
    console.log('\n🔍 DEBUG: Tenant ID from request:', tenantIdString);
    const tenantToken = createTestToken(tenantIdString, 'tenant');
    console.log('🔑 Step 3: Created token for tenant:', testRequest.tenantId._id);
    
    // Decode the token to verify
    const decoded = jwt.decode(tenantToken);
    console.log('🔍 DEBUG: Decoded token:', decoded);
    
    // 4. Test the full payment endpoint
    console.log('\n💳 Step 4: Testing full payment endpoint...');
    
    const paymentData = {
      amount: 50000, // Test amount
      currency: 'BDT',
      originUrl: 'http://localhost:5173/tenant/request-info',
      debugRequestType: 'MAIN_TEST_CORRECT_TOKEN'
    };
    
    console.log('🔍 DEBUG: About to make main test request with token for tenant:', tenantIdString);
    console.log('🔍 DEBUG: Main test - tenantToken first 50 chars:', tenantToken.substring(0, 50));
    const result = await makeAuthenticatedRequest(
      `/stripe/create-full-payment-session/${testRequest._id}`,
      'POST',
      paymentData,
      tenantToken
    );
    
    console.log('\n📊 Payment Request Result:');
    console.log('Status:', result.status);
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('✅ Payment session created successfully!');
      console.log('Session URL:', result.data.url);
    } else {
      console.log('❌ Payment session failed:');
      console.log('Error:', result.error);
    }
    
    // 5. Test with invalid scenarios
    console.log('\n🧪 Step 5: Testing error scenarios...');
    
    // Test without token
    console.log('\n📝 Testing without authentication token...');
    const noAuthResult = await makeAuthenticatedRequest(
      `/stripe/create-full-payment-session/${testRequest._id}`,
      'POST',
      { ...paymentData, debugRequestType: 'NO_AUTH_TEST' }
    );
    console.log('No auth result:', noAuthResult.status, noAuthResult.error?.message);
    
    // Test with invalid token
    console.log('\n📝 Testing with invalid token...');
    const invalidAuthResult = await makeAuthenticatedRequest(
      `/stripe/create-full-payment-session/${testRequest._id}`,
      'POST',
      { ...paymentData, debugRequestType: 'INVALID_TOKEN_TEST' },
      'invalid-token'
    );
    console.log('Invalid auth result:', invalidAuthResult.status, invalidAuthResult.error?.message);
    
    // Test with wrong user token
    console.log('\n📝 Testing with wrong user token...');
    const otherUsers = await User.find({ _id: { $ne: testRequest.tenantId._id } }).limit(1);
    if (otherUsers.length > 0) {
      const wrongUserId = otherUsers[0]._id.toString();
      console.log('🔍 DEBUG: Creating wrong user token for:', wrongUserId);
      const wrongUserToken = createTestToken(wrongUserId, 'tenant');
      console.log('🔍 DEBUG: About to make wrong user test request');
      console.log('🔍 DEBUG: Wrong user test - wrongUserToken first 50 chars:', wrongUserToken.substring(0, 50));
      const wrongUserResult = await makeAuthenticatedRequest(
        `/stripe/create-full-payment-session/${testRequest._id}`,
        'POST',
        { ...paymentData, debugRequestType: 'WRONG_USER_TEST' },
        wrongUserToken
      );
      console.log('Wrong user result:', wrongUserResult.status, wrongUserResult.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Payment Authentication Debug Complete!');
};

// Run debug if this file is executed directly
if (require.main === module) {
  debugPaymentAuth()
    .then(() => {
      console.log('\n✅ Debug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugPaymentAuth, createTestToken, makeAuthenticatedRequest };