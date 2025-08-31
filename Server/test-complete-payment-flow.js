require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testCompletePaymentFlow() {
  try {
    console.log('🧪 Testing complete payment flow...');
    
    // 1. Find a pending payment
    const pendingPayment = await Payment.findOne({ status: 'pending' });
    
    if (!pendingPayment) {
      console.log('❌ No pending payments found. Creating a test payment...');
      
      // Create a test payment
      const testPayment = new Payment({
        paymentId: `PAY-${Date.now()}-TEST`,
        amount: 1000,
        currency: 'BDT',
        status: 'pending',
        type: 'subscription',
        description: 'Test payment for flow verification',
        userId: new mongoose.Types.ObjectId(),
        dueDate: new Date(),
        metadata: {
          testPayment: true
        }
      });
      
      await testPayment.save();
      console.log('✅ Test payment created:', testPayment.paymentId);
      
      // Create Stripe session for this payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'bdt',
            product_data: {
              name: 'Test Payment Flow',
              description: 'Testing complete payment flow'
            },
            unit_amount: testPayment.amount * 100
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5176'}/owner/payments?session_id={CHECKOUT_SESSION_ID}&status=success&payment_id=${testPayment.paymentId}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5176'}/owner/payments?status=cancelled`,
        metadata: {
          paymentId: testPayment.paymentId,
          type: 'test_payment_flow'
        }
      });
      
      // Update payment with session ID
      testPayment.metadata.stripeSessionId = session.id;
      await testPayment.save();
      
      console.log('\n🔗 Test Payment Flow URLs:');
      console.log('📋 Stripe Checkout URL:', session.url);
      console.log('✅ Success URL:', session.success_url);
      console.log('❌ Cancel URL:', session.cancel_url);
      console.log('\n📝 Instructions:');
      console.log('1. Open the Stripe Checkout URL in your browser');
      console.log('2. Use test card: 4242 4242 4242 4242');
      console.log('3. Use any future expiry date (e.g., 12/34)');
      console.log('4. Use any 3-digit CVC (e.g., 123)');
      console.log('5. Complete the payment');
      console.log('6. Verify you are redirected to the payments page');
      console.log('7. Check that the payment status is updated to completed');
      
      return {
        paymentId: testPayment.paymentId,
        sessionId: session.id,
        checkoutUrl: session.url,
        successUrl: session.success_url
      };
    } else {
      console.log('✅ Found pending payment:', pendingPayment.paymentId);
      
      if (pendingPayment.metadata?.stripeSessionId) {
        const session = await stripe.checkout.sessions.retrieve(pendingPayment.metadata.stripeSessionId);
        console.log('\n🔗 Existing Payment Flow URLs:');
        console.log('📋 Stripe Checkout URL:', session.url);
        console.log('✅ Success URL:', session.success_url);
        console.log('❌ Cancel URL:', session.cancel_url);
        
        return {
          paymentId: pendingPayment.paymentId,
          sessionId: session.id,
          checkoutUrl: session.url,
          successUrl: session.success_url
        };
      } else {
        console.log('❌ No Stripe session found for this payment. Creating new session...');
        
        // Create Stripe session for existing payment
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'bdt',
              product_data: {
                name: 'Test Payment Flow',
                description: pendingPayment.description || 'Testing complete payment flow'
              },
              unit_amount: pendingPayment.amount * 100
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:5176'}/owner/payments?session_id={CHECKOUT_SESSION_ID}&status=success&payment_id=${pendingPayment.paymentId}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5176'}/owner/payments?status=cancelled`,
          metadata: {
            paymentId: pendingPayment.paymentId,
            type: 'test_payment_flow'
          }
        });
        
        // Update payment with session ID
        if (!pendingPayment.metadata) pendingPayment.metadata = {};
        pendingPayment.metadata.stripeSessionId = session.id;
        await pendingPayment.save();
        
        console.log('\n🔗 Test Payment Flow URLs:');
        console.log('📋 Stripe Checkout URL:', session.url);
        console.log('✅ Success URL:', session.success_url);
        console.log('❌ Cancel URL:', session.cancel_url);
        console.log('\n📝 Instructions:');
        console.log('1. Open the Stripe Checkout URL in your browser');
        console.log('2. Use test card: 4242 4242 4242 4242');
        console.log('3. Use any future expiry date (e.g., 12/34)');
        console.log('4. Use any 3-digit CVC (e.g., 123)');
        console.log('5. Complete the payment');
        console.log('6. Verify you are redirected to the payments page');
        console.log('7. Check that the payment status is updated to completed');
        
        return {
          paymentId: pendingPayment.paymentId,
          sessionId: session.id,
          checkoutUrl: session.url,
          successUrl: session.success_url
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing payment flow:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testCompletePaymentFlow().then((result) => {
  if (result) {
    console.log('\n🎉 Payment flow test setup complete!');
    console.log('Payment ID:', result.paymentId);
    console.log('Session ID:', result.sessionId);
  }
});