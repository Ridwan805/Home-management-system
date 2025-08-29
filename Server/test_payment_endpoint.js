const fetch = require('node-fetch');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');

async function testPaymentEndpoint() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/home-management');
    console.log('✅ Connected to database');

    // Check what users exist
    console.log('🔍 Checking all users in database...');
    const allUsers = await User.find({}, 'email role firstName lastName');
    console.log('📊 Total users found:', allUsers.length);
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });

    // Check what requests exist
    console.log('🔍 Checking all requests in database...');
    const allRequests = await Request.find({}, 'requestId status tenantId ownerId propertyId')
      .populate('tenantId', 'email')
      .populate('ownerId', 'email')
      .populate('propertyId', 'address');
    console.log('📊 Total requests found:', allRequests.length);
    allRequests.forEach(request => {
      console.log(`   - Request ${request.requestId}: ${request.status}`);
      console.log(`     Tenant: ${request.tenantId?.email || 'Unknown'}`);
      console.log(`     Owner: ${request.ownerId?.email || 'Unknown'}`);
      console.log(`     Property: ${request.propertyId?.address || 'Unknown'}`);
      console.log(`     Advance Payment: ${request.advancePayment?.amount || 'N/A'}`);
    });

    // Find any request with 'Approved – Pay Advance' status or use the first available request
    let request = await Request.findOne({ 
      status: 'Approved – Pay Advance'
    }).sort({ createdAt: -1 });
    
    // If no 'Approved – Pay Advance' request found, use any available request
    if (!request) {
      request = await Request.findOne({}).sort({ createdAt: -1 });
    }
    
    if (!request) {
      console.log('❌ No requests found in database');
      return;
    }
    
    // Find the tenant user for this request
    const tenant = await User.findById(request.tenantId);
    if (!tenant) {
      console.log('❌ No tenant user found for this request');
      return;
    }

    // If we have the tenant and request, let's test with them
    const testUser = tenant; // Use tenant
    const testRequest = request; // Use request
      
    console.log('\n🧪 Testing with:');
    console.log('   - User:', testUser.email, '(' + testUser.role + ')');
    console.log('   - Request:', testRequest.requestId);
    console.log('   - Request MongoDB ID:', testRequest._id);

    // Generate a test JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    console.log('✅ Generated test token');

    // Test the payment endpoint
    console.log('🔄 Testing payment endpoint...');
    const requestIdString = testRequest._id.toString();
    console.log(`   - Using request ID: ${requestIdString}`);
    const response = await fetch(`http://localhost:5001/api/stripe/create-payment-session/${requestIdString}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originUrl: 'http://localhost:5175'
      })
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('📊 Response data:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success && responseData.url) {
      console.log('✅ Payment endpoint is working correctly!');
      console.log('🔗 Stripe checkout URL:', responseData.url);
    } else {
      console.log('❌ Payment endpoint failed:', responseData.message || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the test
testPaymentEndpoint();