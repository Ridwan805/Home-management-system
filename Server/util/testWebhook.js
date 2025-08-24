// Webhook Testing Utility
// This script helps test and verify Stripe webhook configuration

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Test webhook endpoint configuration
const testWebhookConfig = async () => {
  console.log('🔧 Testing Stripe Webhook Configuration...');
  console.log('================================');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  console.log('STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
  console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ Cannot proceed without STRIPE_SECRET_KEY');
    return;
  }
  
  try {
    // Test Stripe connection
    console.log('\n🔌 Testing Stripe Connection...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe connection successful');
    console.log('Account ID:', account.id);
    console.log('Account Type:', account.type);
    console.log('Country:', account.country);
    
    // List webhook endpoints
    console.log('\n🔗 Webhook Endpoints:');
    const webhookEndpoints = await stripe.webhookEndpoints.list();
    
    if (webhookEndpoints.data.length === 0) {
      console.log('⚠️ No webhook endpoints configured in Stripe Dashboard');
      console.log('\n📝 To configure webhooks:');
      console.log('1. Go to https://dashboard.stripe.com/webhooks');
      console.log('2. Click "Add endpoint"');
      console.log('3. Enter your webhook URL: https://yourdomain.com/api/stripe/webhook');
      console.log('4. Select events: checkout.session.completed, checkout.session.expired, payment_intent.payment_failed');
      console.log('5. Copy the signing secret to your .env file as STRIPE_WEBHOOK_SECRET');
    } else {
      webhookEndpoints.data.forEach((endpoint, index) => {
        console.log(`\nEndpoint ${index + 1}:`);
        console.log('  URL:', endpoint.url);
        console.log('  Status:', endpoint.status);
        console.log('  Events:', endpoint.enabled_events.join(', '));
        console.log('  Created:', new Date(endpoint.created * 1000).toISOString());
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Stripe configuration:', error.message);
  }
};

// Create a test webhook event
const createTestEvent = async () => {
  console.log('\n🧪 Creating Test Webhook Event...');
  
  try {
    // Create a test checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'bdt',
          product_data: {
            name: 'Test Payment',
          },
          unit_amount: 100000, // 1000 BDT in paisa
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        requestId: 'test-request-id',
        tenantId: 'test-tenant-id',
        requestType: 'advance_payment'
      }
    });
    
    console.log('✅ Test checkout session created:');
    console.log('Session ID:', session.id);
    console.log('Payment URL:', session.url);
    
    return session;
    
  } catch (error) {
    console.error('❌ Error creating test event:', error.message);
  }
};

// Validate webhook signature (for testing)
const validateWebhookSignature = (payload, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    console.log('✅ Webhook signature validation successful');
    console.log('Event ID:', event.id);
    console.log('Event Type:', event.type);
    return event;
  } catch (error) {
    console.error('❌ Webhook signature validation failed:', error.message);
    return null;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Stripe Webhook Tests\n');
  
  await testWebhookConfig();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Webhook Testing Checklist:');
  console.log('\n1. ✅ Environment variables configured');
  console.log('2. ⏳ Webhook endpoint registered in Stripe Dashboard');
  console.log('3. ⏳ Webhook endpoint accessible from internet');
  console.log('4. ⏳ Webhook events being received and processed');
  
  console.log('\n🔧 To test with Stripe CLI:');
  console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Login: stripe login');
  console.log('3. Forward events: stripe listen --forward-to localhost:5001/api/stripe/webhook');
  console.log('4. Copy the webhook signing secret from CLI output to .env');
  console.log('5. Trigger test event: stripe trigger checkout.session.completed');
  
  console.log('\n🌐 For production:');
  console.log('1. Deploy your application to a public URL');
  console.log('2. Register webhook endpoint: https://yourdomain.com/api/stripe/webhook');
  console.log('3. Configure events: checkout.session.completed, checkout.session.expired, payment_intent.payment_failed');
  console.log('4. Update STRIPE_WEBHOOK_SECRET with production signing secret');
};

// Export functions for use in other scripts
module.exports = {
  testWebhookConfig,
  createTestEvent,
  validateWebhookSignature,
  runTests
};

// Run tests if script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}