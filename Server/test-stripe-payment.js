// Test script to create a Stripe payment and verify webhook functionality
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const User = require('./models/User');

async function createTestPayment() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to database');
    
    // Find a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`👤 Using test user: ${testUser.name} (${testUser.email})`);
    
    // Create a test payment record in our database first
    const testPayment = new Payment({
      type: 'other',
      status: 'pending',
      method: 'stripe',
      amount: 500, // 5.00 BDT
      currency: 'BDT',
      payerId: testUser._id,
      description: 'Test payment for webhook verification',
      notes: 'Created by test script to verify webhook functionality',
      metadata: {
        testPayment: true,
        createdBy: 'test-script'
      },
      tags: ['test', 'webhook-verification']
    });
    
    await testPayment.save();
    console.log(`💾 Created test payment record: ${testPayment.paymentId}`);
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd', // Using USD for testing as BDT might not be supported
          product_data: {
            name: 'Test Payment - Webhook Verification',
            description: 'Test payment to verify webhook functionality'
          },
          unit_amount: 500, // $5.00 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/payment-cancel',
      metadata: {
        paymentId: testPayment.paymentId,
        testPayment: 'true'
      }
    });
    
    console.log('🔗 Stripe checkout session created!');
    console.log(`Session ID: ${session.id}`);
    console.log(`Payment URL: ${session.url}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Open the payment URL in your browser');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Use any future expiry date and any 3-digit CVC');
    console.log('4. Complete the payment');
    console.log('5. Check server logs for webhook events');
    console.log('');
    console.log('📊 You can also check payment status with:');
    console.log('node test-payment-api.js');
    
    // Update our payment record with the Stripe session ID
    testPayment.metadata.stripeSessionId = session.id;
    await testPayment.save();
    
  } catch (error) {
    console.error('❌ Error creating test payment:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

createTestPayment();