const jwt = require('jsonwebtoken');
require('dotenv').config();

// This is a test token - in real usage, you would get this from the frontend
function decodeToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

// Test with a sample token (you'll need to replace this with a real token from your frontend)
console.log('🔍 Testing JWT token decoding...');
console.log('💡 To test with your actual token, replace the token below with your real token from localStorage');

// You can test this by:
// 1. Open browser dev tools
// 2. Go to Application/Storage tab
// 3. Find localStorage
// 4. Copy the token from dwellSyncUser
// 5. Replace the token below

const sampleToken = 'your-token-here'; // Replace with actual token
if (sampleToken !== 'your-token-here') {
  decodeToken(sampleToken);
} else {
  console.log('❌ Please replace the sample token with your actual token to test');
  console.log('📝 Instructions:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Application tab');
  console.log('3. Find localStorage');
  console.log('4. Copy the token from dwellSyncUser');
  console.log('5. Replace the token in this script');
} 