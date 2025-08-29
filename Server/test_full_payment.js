const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE_URL = 'http://localhost:5001/api';
const REQUEST_ID = '68b2118aba54b3f37b74d622'; // Using existing request from database
const USER_ID = '68931f1f70da4d0dedf29d0d'; // Correct tenant ID from the request

// Create a test JWT token
function createTestToken(userId) {
  const payload = {
    userId: userId,
    email: 'test@example.com',
    role: 'tenant'
  };
  
  // Use the actual JWT secret from environment
  const secret = '33b0881c0d6b572e59f197fbe115902bb54b2b12ca106dd929bc7ca9ec3a48957a755d7ba312137b23d3977ed4bbbc8a058fdc6eb7fb44132e9bb57b5a2ed426';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

async function testFullPayment() {
  try {
    console.log('🧪 Testing Full Payment Flow');
    console.log('================================');
    console.log('Request ID:', REQUEST_ID);
    console.log('User ID:', USER_ID);
    
    const token = createTestToken(USER_ID);
    console.log('Generated JWT token for testing');
    
    const response = await axios.post(
      `${API_BASE_URL}/stripe/create-full-payment-session/${REQUEST_ID}`,
      {
        currency: 'BDT',
        originUrl: 'http://localhost:3000/payment-success'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    
    if (response.data.success && response.data.sessionUrl) {
      console.log('\n🎉 SUCCESS: Stripe session created!');
      console.log('Session URL:', response.data.sessionUrl);
      console.log('Session ID:', response.data.sessionId);
      console.log('Amount:', response.data.amount);
      console.log('Currency:', response.data.currency);
    } else {
      console.log('\n❌ FAILED: No session URL returned');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ API call failed:');
    console.log('Full error:', error.message);
    console.log('Error code:', error.code);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error code:', error.response.data?.error);
      console.log('Error message:', error.response.data?.message);
      console.log('Error data:', error.response.data);
    } else {
      console.log('No response received - possible network error');
      console.log('Request config:', error.config?.url);
    }
  }
}

// Run the test
testFullPayment();