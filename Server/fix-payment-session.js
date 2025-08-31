// Script to fix the payment record with the correct Stripe session ID
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function fixPaymentSession() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to database');
    
    // Find our test payment
    const testPayment = await Payment.findOne({ 
      paymentId: 'PAY-1756617405035-UIBB7F77K'
    });
    
    if (!testPayment) {
      console.log('❌ Test payment not found');
      return;
    }
    
    console.log(`🔍 Found test payment: ${testPayment.paymentId}`);
    console.log('Current metadata:', JSON.stringify(testPayment.metadata, null, 2));
    
    // Update with the session ID from our earlier test
    const sessionId = 'cs_test_a1c2KwcY9wwsPTOw2ygeuPjFj5R3rEPLZvHqv7zf399xpaVxuTtHGMp4M7';
    
    testPayment.metadata = {
      ...testPayment.metadata,
      stripeSessionId: sessionId
    };
    
    await testPayment.save();
    console.log('✅ Payment record updated with session ID');
    console.log('Updated metadata:', JSON.stringify(testPayment.metadata, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

fixPaymentSession();