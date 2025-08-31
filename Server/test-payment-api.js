// Test script to verify payment API functionality
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testPaymentAPI() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to database');
    
    // Find any user to test with
    let testUser = await User.findOne({ role: 'admin' });
    if (!testUser) {
      testUser = await User.findOne();
    }
    
    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Found test user: ${testUser.name} (${testUser.email}) - Role: ${testUser.role}`);
    
    // Create a test JWT token with both id and userId for compatibility
    const token = jwt.sign(
      { 
        id: testUser._id.toString(),
        userId: testUser._id.toString(),
        role: testUser.role 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated test token');
    
    // Test the payment API endpoint
    try {
      const response = await fetch('http://localhost:5001/api/payments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 API Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful!');
        console.log(`📊 Payments returned: ${Array.isArray(data) ? data.length : 'N/A'}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('\n📋 Payment Summary:');
          const pendingPayments = data.filter(p => p.status === 'pending');
          const completedPayments = data.filter(p => p.status === 'completed');
          console.log(`- Total payments: ${data.length}`);
          console.log(`- Pending payments: ${pendingPayments.length}`);
          console.log(`- Completed payments: ${completedPayments.length}`);
          
          console.log('\n🔍 Sample payment:');
          const sample = data[0];
          console.log(`- ID: ${sample.paymentId}`);
          console.log(`- Status: ${sample.status}`);
          console.log(`- Amount: ${sample.amount} ${sample.currency}`);
          console.log(`- Type: ${sample.type}`);
          console.log(`- Description: ${sample.description}`);
        }
      } else {
        const errorText = await response.text();
        console.log('❌ API call failed:');
        console.log(`Status: ${response.status}`);
        console.log(`Error: ${errorText}`);
      }
    } catch (fetchError) {
      console.log('❌ Network error:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing payment API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testPaymentAPI();