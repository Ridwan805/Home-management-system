const mongoose = require('mongoose');
require('dotenv').config();
const GuardrailsService = require('./services/guardrailsService');
const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');

async function testGuardrailsValidation() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database');

    // Test with the specific request and user IDs
    const requestId = '68b2118aba54b3f37b74d622';
    const correctUserId = '68931f1f70da4d0dedf29d0d';
    const wrongUserId = '6891a1c76742fd1f69f69d5c';

    console.log('\n🔍 Finding request...');
    const request = await Request.findById(requestId);
    if (!request) {
      console.log('❌ Request not found');
      return;
    }

    console.log('📋 Found request:', {
      id: request._id,
      tenantId: request.tenantId,
      status: request.status,
      requestType: request.requestType
    });

    console.log('\n🧪 Testing eligibility validation...');
    const eligibilityResult = await GuardrailsService.validateFullPaymentEligibility(request);
    console.log('📋 Eligibility result:', eligibilityResult);

    console.log('\n🧪 Testing with CORRECT userId (should pass)...');
    const correctResult = await GuardrailsService.validateFullPaymentAuthorization(correctUserId, request);
    console.log('✅ Correct user result:', correctResult);

    console.log('\n🧪 Testing with WRONG userId (should fail)...');
    const wrongResult = await GuardrailsService.validateFullPaymentAuthorization(wrongUserId, request);
    console.log('❌ Wrong user result:', wrongResult);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testGuardrailsValidation();