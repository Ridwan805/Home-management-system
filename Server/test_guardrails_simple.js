const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Request = require('./models/Request');
const GuardrailsService = require('./services/guardrailsService');

const testGuardrails = async () => {
  try {
    console.log('🔍 Testing GuardrailsService validation...');
    
    // Find the test request
    const request = await Request.findById('68b2118aba54b3f37b74d622')
      .populate('propertyId', 'address price listingType')
      .populate('tenantId')
      .populate('ownerId', 'firstName lastName email');
    
    if (!request) {
      console.log('❌ Request not found');
      return;
    }
    
    console.log('📋 Request found:', {
      id: request._id,
      tenantId: request.tenantId._id,
      status: request.status
    });
    
    const userId = request.tenantId._id.toString();
    console.log('🔍 Testing with correct user ID:', userId);
    
    // Test the validation
    const result = await GuardrailsService.validateFullPaymentAuthorization(userId, request);
    
    console.log('📊 Validation result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    mongoose.disconnect();
  }
};

testGuardrails();