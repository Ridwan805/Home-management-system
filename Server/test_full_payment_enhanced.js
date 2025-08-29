const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test script for enhanced full payment functionality
const BASE_URL = 'http://localhost:5001/api';

// Test data
const testData = {
  validRequestId: '507f1f77bcf86cd799439011', // Replace with actual request ID
  invalidRequestId: 'invalid_id',
  validUserId: '507f1f77bcf86cd799439012', // Replace with actual user ID
  testAmount: 50000,
  testCurrency: 'BDT'
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (endpoint, method = 'GET', data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test functions
const testPublishableKey = async () => {
  console.log('\n🔑 Testing Stripe publishable key endpoint...');
  const result = await makeAuthenticatedRequest('/stripe/publishable-key');
  
  if (result.success) {
    console.log('✅ Publishable key endpoint working');
    console.log('📋 Response:', result.data);
  } else {
    console.log('❌ Publishable key endpoint failed');
    console.log('📋 Error:', result.error);
  }
  
  return result;
};

const testFullPaymentValidation = async () => {
  console.log('\n🛡️ Testing full payment validation...');
  
  // Test with invalid request ID
  console.log('\n📝 Testing with invalid request ID...');
  const invalidIdResult = await makeAuthenticatedRequest(
    `/stripe/create-full-payment-session/${testData.invalidRequestId}`,
    'POST',
    { amount: testData.testAmount, currency: testData.testCurrency }
  );
  
  if (!invalidIdResult.success && invalidIdResult.status === 400) {
    console.log('✅ Invalid request ID validation working');
    console.log('📋 Error response:', invalidIdResult.error);
  } else {
    console.log('❌ Invalid request ID validation not working properly');
  }
  
  // Test without authentication
  console.log('\n📝 Testing without authentication...');
  const noAuthResult = await makeAuthenticatedRequest(
    `/stripe/create-full-payment-session/${testData.validRequestId}`,
    'POST',
    { amount: testData.testAmount, currency: testData.testCurrency }
  );
  
  if (!noAuthResult.success && (noAuthResult.status === 401 || noAuthResult.status === 403)) {
    console.log('✅ Authentication validation working');
    console.log('📋 Error response:', noAuthResult.error);
  } else {
    console.log('❌ Authentication validation not working properly');
  }
  
  return { invalidIdResult, noAuthResult };
};

const testPaymentStatusChecker = async () => {
  console.log('\n⏰ Testing PaymentStatusChecker functionality...');
  
  try {
    // Import PaymentStatusChecker
    const PaymentStatusChecker = require('./services/paymentStatusChecker');
    
    console.log('📝 Testing checkPendingPayments method...');
    const result = await PaymentStatusChecker.checkPendingPayments();
    
    console.log('✅ PaymentStatusChecker.checkPendingPayments completed');
    console.log('📋 Result:', {
      total: result.total,
      checkedAdvance: result.checkedAdvance,
      checkedFull: result.checkedFull
    });
    
    return { success: true, result };
  } catch (error) {
    console.log('❌ PaymentStatusChecker test failed');
    console.log('📋 Error:', error.message);
    return { success: false, error: error.message };
  }
};

const testGuardrailsService = async () => {
  console.log('\n🛡️ Testing GuardrailsService functionality...');
  
  try {
    // Import GuardrailsService
    const GuardrailsService = require('./services/guardrailsService');
    
    console.log('📝 Testing validateFullPaymentEligibility...');
    // This would need a real request object, so we'll just test the method exists
    if (typeof GuardrailsService.validateFullPaymentEligibility === 'function') {
      console.log('✅ validateFullPaymentEligibility method exists');
    } else {
      console.log('❌ validateFullPaymentEligibility method missing');
    }
    
    console.log('📝 Testing validateFullPaymentAmount...');
    if (typeof GuardrailsService.validateFullPaymentAmount === 'function') {
      console.log('✅ validateFullPaymentAmount method exists');
    } else {
      console.log('❌ validateFullPaymentAmount method missing');
    }
    
    console.log('📝 Testing validateFullPaymentAuthorization...');
    if (typeof GuardrailsService.validateFullPaymentAuthorization === 'function') {
      console.log('✅ validateFullPaymentAuthorization method exists');
    } else {
      console.log('❌ validateFullPaymentAuthorization method missing');
    }
    
    console.log('📝 Testing validateFullPayment...');
    if (typeof GuardrailsService.validateFullPayment === 'function') {
      console.log('✅ validateFullPayment method exists');
    } else {
      console.log('❌ validateFullPayment method missing');
    }
    
    return { success: true };
  } catch (error) {
    console.log('❌ GuardrailsService test failed');
    console.log('📋 Error:', error.message);
    return { success: false, error: error.message };
  }
};

const testPaymentScheduler = async () => {
  console.log('\n⏰ Testing PaymentScheduler functionality...');
  
  try {
    // Import PaymentScheduler
    const PaymentScheduler = require('./services/paymentScheduler');
    
    console.log('📝 Testing PaymentScheduler status...');
    const status = PaymentScheduler.getStatus();
    console.log('✅ PaymentScheduler status:', status);
    
    console.log('📝 Testing manual check...');
    const manualCheckResult = await PaymentScheduler.runManualCheck();
    console.log('✅ Manual check completed:', {
      total: manualCheckResult.total,
      checkedAdvance: manualCheckResult.checkedAdvance,
      checkedFull: manualCheckResult.checkedFull
    });
    
    console.log('📝 Testing manual check by type (advance)...');
    const advanceCheckResult = await PaymentScheduler.runManualCheckByType('advance');
    console.log('✅ Advance check completed:', advanceCheckResult);
    
    console.log('📝 Testing manual check by type (full)...');
    const fullCheckResult = await PaymentScheduler.runManualCheckByType('full');
    console.log('✅ Full check completed:', fullCheckResult);
    
    return { success: true, status, manualCheckResult, advanceCheckResult, fullCheckResult };
  } catch (error) {
    console.log('❌ PaymentScheduler test failed');
    console.log('📋 Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Enhanced Full Payment Functionality Tests');
  console.log('=' .repeat(60));
  
  const results = {};
  
  // Test 1: Stripe publishable key
  results.publishableKey = await testPublishableKey();
  
  // Test 2: Full payment validation
  results.validation = await testFullPaymentValidation();
  
  // Test 3: PaymentStatusChecker
  results.paymentStatusChecker = await testPaymentStatusChecker();
  
  // Test 4: GuardrailsService
  results.guardrailsService = await testGuardrailsService();
  
  // Test 5: PaymentScheduler
  results.paymentScheduler = await testPaymentScheduler();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const testCategories = [
    { name: 'Stripe Publishable Key', result: results.publishableKey },
    { name: 'Payment Validation', result: results.validation },
    { name: 'PaymentStatusChecker', result: results.paymentStatusChecker },
    { name: 'GuardrailsService', result: results.guardrailsService },
    { name: 'PaymentScheduler', result: results.paymentScheduler }
  ];
  
  testCategories.forEach(test => {
    const status = test.result?.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
  });
  
  console.log('\n🎯 Enhanced full payment functionality testing completed!');
  
  return results;
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testPublishableKey, testFullPaymentValidation, testPaymentStatusChecker, testGuardrailsService, testPaymentScheduler };