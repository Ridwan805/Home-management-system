const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const testAPI = async () => {
  try {
    console.log('🔍 Testing API endpoint directly...');
    
    // Create token for the correct tenant
    const tenantId = '68931f1f70da4d0dedf29d0d';
    const token = jwt.sign(
      { userId: tenantId, role: 'tenant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Created token for tenant:', tenantId);
    
    // Make the API call
    const response = await axios.post(
      'http://localhost:5001/api/stripe/create-full-payment-session/68b2118aba54b3f37b74d622',
      {
        amount: 50000,
        currency: 'BDT',
        originUrl: 'http://localhost:5173/tenant/request-info',
        debugRequestType: 'DIRECT_API_TEST'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', response.data);
    
  } catch (error) {
    console.log('❌ API call failed');
    console.log('📊 Status:', error.response?.status);
    console.log('📋 Error data:', error.response?.data);
  }
};

testAPI();