// Test script to manually trigger a webhook event for testing
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Payment = require('./models/Payment');

async function triggerTestWebhook() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to database');
    
    // Find our test payment
    const testPayment = await Payment.findOne({ 
      paymentId: 'PAY-1756617405035-UIBB7F77K',
      status: 'pending' 
    });
    
    if (!testPayment) {
      console.log('❌ Test payment not found or already processed');
      return;
    }
    
    console.log(`🔍 Found test payment: ${testPayment.paymentId}`);
    console.log(`Current status: ${testPayment.status}`);
    
    // Get the Stripe session ID from metadata
    const sessionId = testPayment.metadata?.stripeSessionId;
    if (!sessionId) {
      console.log('❌ No Stripe session ID found in payment metadata');
      return;
    }
    
    console.log(`🔗 Stripe session ID: ${sessionId}`);
    
    // Retrieve the session from Stripe
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(`📊 Session status: ${session.status}`);
      console.log(`💰 Payment status: ${session.payment_status}`);
      
      if (session.payment_status === 'paid') {
        console.log('✅ Payment completed in Stripe! Updating local record...');
        
        // Update our payment record
        testPayment.status = 'completed';
        testPayment.metadata.stripePaymentIntentId = session.payment_intent;
        testPayment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: 'Payment completed via Stripe checkout'
        });
        
        await testPayment.save();
        console.log('✅ Payment record updated successfully!');
        
      } else {
        console.log(`⏳ Payment not yet completed. Status: ${session.payment_status}`);
        console.log('💡 Complete the payment in the browser and run this script again.');
      }
      
    } catch (stripeError) {
      console.log('❌ Error retrieving Stripe session:', stripeError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

triggerTestWebhook();