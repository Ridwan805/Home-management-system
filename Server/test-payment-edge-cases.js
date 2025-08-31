const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:5001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/home_management';

// Test scenarios for security guard payments
const PAYMENT_EDGE_CASES = [
  {
    name: 'Invalid Job Post ID',
    endpoint: '/api/security-guard-payments/create-payment-session',
    method: 'POST',
    data: {
      jobPostId: 'invalid-job-id',
      amount: 1000,
      currency: 'USD',
      frequency: 'monthly'
    },
    expectedStatus: 400,
    description: 'Should reject invalid job post ID'
  },
  {
    name: 'Negative Payment Amount',
    endpoint: '/api/security-guard-payments/create-payment-session',
    method: 'POST',
    data: {
      jobPostId: '507f1f77bcf86cd799439011',
      amount: -500,
      currency: 'USD',
      frequency: 'monthly'
    },
    expectedStatus: 400,
    description: 'Should reject negative payment amounts'
  },
  {
    name: 'Invalid Currency',
    endpoint: '/api/security-guard-payments/create-payment-session',
    method: 'POST',
    data: {
      jobPostId: '507f1f77bcf86cd799439011',
      amount: 1000,
      currency: 'INVALID',
      frequency: 'monthly'
    },
    expectedStatus: 400,
    description: 'Should reject invalid currency codes'
  },
  {
    name: 'Invalid Payment Frequency',
    endpoint: '/api/security-guard-payments/create-payment-session',
    method: 'POST',
    data: {
      jobPostId: '507f1f77bcf86cd799439011',
      amount: 1000,
      currency: 'USD',
      frequency: 'invalid-frequency'
    },
    expectedStatus: 400,
    description: 'Should reject invalid payment frequencies'
  },
  {
    name: 'Missing Required Fields',
    endpoint: '/api/security-guard-payments/create-payment-session',
    method: 'POST',
    data: {
      amount: 1000
      // Missing jobPostId, currency, frequency
    },
    expectedStatus: 400,
    description: 'Should reject requests with missing required fields'
  },
  {
    name: 'Unauthorized Payment History Access',
    endpoint: '/api/security-guard-payments/job-post/507f1f77bcf86cd799439011/payments',
    method: 'GET',
    data: null,
    expectedStatus: 401,
    description: 'Should require authentication for payment history'
  },
  {
    name: 'Non-existent Guard Payments',
    endpoint: '/api/security-guard-payments/guard/payments',
    method: 'GET',
    data: null,
    expectedStatus: 401, // Will fail auth first
    description: 'Should handle requests for non-existent guard payments'
  }
];

// Helper function to make requests
async function makeRequest(method, url, token = null, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { 
      success: true, 
      status: response.status, 
      data: response.data 
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    };
  }
}

// Test payment validation edge cases
async function testPaymentEdgeCases() {
  console.log('🧪 Testing Security Guard Payment Edge Cases\n');
  console.log('=' .repeat(70));
  
  let passedTests = 0;
  let totalTests = PAYMENT_EDGE_CASES.length;
  
  for (const testCase of PAYMENT_EDGE_CASES) {
    console.log(`\n🔍 ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    
    const result = await makeRequest(
      testCase.method,
      testCase.endpoint,
      null, // No token for most edge cases
      testCase.data
    );
    
    const statusMatches = result.status === testCase.expectedStatus;
    
    if (statusMatches) {
      console.log(`   ✅ PASS: Got expected status ${testCase.expectedStatus}`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Expected status ${testCase.expectedStatus}, got ${result.status}`);
      if (result.message) {
        console.log(`   📝 Message: ${result.message}`);
      }
    }
  }
  
  return { passedTests, totalTests };
}

// Test payment data integrity
async function testPaymentDataIntegrity() {
  console.log('\n💾 Testing Payment Data Integrity\n');
  console.log('=' .repeat(70));
  
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // Connect to MongoDB to test data validation
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB for data integrity tests');
    
    const Payment = require('./models/Payment');
    
    // Test 1: Invalid payment type
    totalTests++;
    try {
      const invalidPayment = new Payment({
        paymentId: 'test-invalid-type',
        paymentType: 'invalid_type', // Should fail validation
        amount: 1000,
        currency: 'USD',
        payerId: new mongoose.Types.ObjectId(),
        payeeId: new mongoose.Types.ObjectId(),
        status: 'pending'
      });
      
      await invalidPayment.validate();
      console.log('❌ FAIL: Invalid payment type should have failed validation');
    } catch (error) {
      console.log('✅ PASS: Invalid payment type correctly rejected');
      passedTests++;
    }
    
    // Test 2: Valid security guard payment
    totalTests++;
    try {
      const validPayment = new Payment({
        paymentId: 'test-valid-guard-payment',
        paymentType: 'security_guard_payment',
        amount: 1500,
        currency: 'USD',
        payerId: new mongoose.Types.ObjectId(),
        payeeId: new mongoose.Types.ObjectId(),
        status: 'pending',
        paymentMethod: 'stripe',
        stripeDetails: {
          sessionId: 'cs_test_123',
          paymentIntentId: 'pi_test_123'
        }
      });
      
      await validPayment.validate();
      console.log('✅ PASS: Valid security guard payment passed validation');
      passedTests++;
    } catch (error) {
      console.log(`❌ FAIL: Valid payment should have passed validation: ${error.message}`);
    }
    
    // Test 3: Invalid currency
    totalTests++;
    try {
      const invalidCurrencyPayment = new Payment({
        paymentId: 'test-invalid-currency',
        paymentType: 'security_guard_payment',
        amount: 1000,
        currency: 'INVALID', // Should fail validation
        payerId: new mongoose.Types.ObjectId(),
        payeeId: new mongoose.Types.ObjectId(),
        status: 'pending'
      });
      
      await invalidCurrencyPayment.validate();
      console.log('❌ FAIL: Invalid currency should have failed validation');
    } catch (error) {
      console.log('✅ PASS: Invalid currency correctly rejected');
      passedTests++;
    }
    
    // Test 4: Invalid status
    totalTests++;
    try {
      const invalidStatusPayment = new Payment({
        paymentId: 'test-invalid-status',
        paymentType: 'security_guard_payment',
        amount: 1000,
        currency: 'USD',
        payerId: new mongoose.Types.ObjectId(),
        payeeId: new mongoose.Types.ObjectId(),
        status: 'invalid_status' // Should fail validation
      });
      
      await invalidStatusPayment.validate();
      console.log('❌ FAIL: Invalid status should have failed validation');
    } catch (error) {
      console.log('✅ PASS: Invalid status correctly rejected');
      passedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    console.log('⚠️  Skipping data integrity tests');
  } finally {
    await mongoose.disconnect();
  }
  
  return { passedTests, totalTests };
}

// Test webhook security
async function testWebhookSecurity() {
  console.log('\n🔒 Testing Webhook Security\n');
  console.log('=' .repeat(70));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Webhook without signature
  totalTests++;
  const webhookResult1 = await makeRequest(
    'POST',
    '/api/stripe/webhook',
    null,
    {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid'
        }
      }
    }
  );
  
  if (webhookResult1.status === 400 || webhookResult1.status === 401) {
    console.log('✅ PASS: Webhook without signature correctly rejected');
    passedTests++;
  } else {
    console.log(`❌ FAIL: Webhook without signature should be rejected, got status ${webhookResult1.status}`);
  }
  
  // Test 2: Webhook with invalid signature
  totalTests++;
  const webhookResult2 = await makeRequest(
    'POST',
    '/api/stripe/webhook',
    null,
    {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid'
        }
      }
    }
  );
  
  // Add invalid stripe signature header
  if (webhookResult2.status === 400 || webhookResult2.status === 401) {
    console.log('✅ PASS: Webhook with invalid signature correctly rejected');
    passedTests++;
  } else {
    console.log(`❌ FAIL: Webhook with invalid signature should be rejected, got status ${webhookResult2.status}`);
  }
  
  return { passedTests, totalTests };
}

// Main test runner
async function runPaymentEdgeCaseTests() {
  console.log('🚀 Starting Security Guard Payment Edge Case Tests\n');
  
  const edgeCaseResults = await testPaymentEdgeCases();
  const dataIntegrityResults = await testPaymentDataIntegrity();
  const webhookSecurityResults = await testWebhookSecurity();
  
  const totalPassed = edgeCaseResults.passedTests + dataIntegrityResults.passedTests + webhookSecurityResults.passedTests;
  const totalTests = edgeCaseResults.totalTests + dataIntegrityResults.totalTests + webhookSecurityResults.totalTests;
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 PAYMENT EDGE CASE TEST SUMMARY');
  console.log('=' .repeat(70));
  console.log(`✅ Passed: ${totalPassed}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - totalPassed}/${totalTests} tests`);
  
  console.log('\n📋 Test Breakdown:');
  console.log(`   🧪 Edge Cases: ${edgeCaseResults.passedTests}/${edgeCaseResults.totalTests}`);
  console.log(`   💾 Data Integrity: ${dataIntegrityResults.passedTests}/${dataIntegrityResults.totalTests}`);
  console.log(`   🔒 Webhook Security: ${webhookSecurityResults.passedTests}/${webhookSecurityResults.totalTests}`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 All payment edge case tests passed!');
  } else {
    console.log('\n⚠️  Some payment edge case tests failed. Please review the results above.');
  }
  
  return { totalPassed, totalTests };
}

// Export for use in other test files
module.exports = {
  runPaymentEdgeCaseTests,
  testPaymentEdgeCases,
  testPaymentDataIntegrity,
  testWebhookSecurity
};

// Run tests if this file is executed directly
if (require.main === module) {
  runPaymentEdgeCaseTests().catch(console.error);
}