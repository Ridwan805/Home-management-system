const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const User = require('../models/User');

// Create Stripe checkout session for advance payment
const createPaymentSession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId)
      .populate('propertyId', 'address')
      .populate('ownerId', 'firstName lastName email');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is the tenant
    if (request.tenantId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this request'
      });
    }
    
    // Validate request status
    if (request.status !== 'Approved – Pay Advance') {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for request in status: ${request.status}`
      });
    }
    
    // Check if advance payment is set up
    if (!request.advancePayment || !request.advancePayment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Advance payment not set up for this request'
      });
    }
    
    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(request.advancePayment.amount * 100);
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: request.advancePayment.currency.toLowerCase(),
            product_data: {
              name: `Advance Payment - ${request.propertyId.address}`,
              description: `Request ID: ${request.requestId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/tenant/my-requests?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/my-requests?payment=cancelled`,
      metadata: {
        requestId: request._id.toString(),
        tenantId: userId,
        ownerId: request.ownerId._id.toString(),
        requestType: 'advance_payment'
      },
      customer_email: req.user.email,
    });
    
    // Save session ID to request
    request.advancePayment.stripeSessionId = session.id;
    await request.save();
    
    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
    
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session'
    });
  }
};

// Handle Stripe webhook events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'checkout.session.expired':
      await handlePaymentExpired(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
};

// Handle successful payment
const handlePaymentSuccess = async (session) => {
  try {
    const { requestId, tenantId } = session.metadata;
    
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for payment success:', requestId);
      return;
    }
    
    // Update payment status
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;
    
    // Update request status
    request.status = 'Payment Pending (Stripe)';
    
    // Add timeline event
    request.timeline.push({
      event: 'Advance payment completed via Stripe',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency}`
    });
    
    await request.save();
    
    console.log('Payment processed successfully for request:', requestId);
    
    // TODO: Send notification to owner about payment completion
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle expired payment session
const handlePaymentExpired = async (session) => {
  try {
    const { requestId } = session.metadata;
    
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for payment expiry:', requestId);
      return;
    }
    
    // Add timeline event
    request.timeline.push({
      event: 'Payment session expired',
      actor: request.tenantId,
      timestamp: new Date(),
      note: 'Stripe checkout session expired without payment'
    });
    
    await request.save();
    
    console.log('Payment session expired for request:', requestId);
    
  } catch (error) {
    console.error('Error handling payment expiry:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (paymentIntent) => {
  try {
    // Find request by payment intent ID
    const request = await Request.findOne({
      'advancePayment.paymentIntentId': paymentIntent.id
    });
    
    if (!request) {
      console.error('Request not found for payment failure:', paymentIntent.id);
      return;
    }
    
    // Add timeline event
    request.timeline.push({
      event: 'Payment failed',
      actor: request.tenantId,
      timestamp: new Date(),
      note: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
    });
    
    await request.save();
    
    console.log('Payment failed for request:', request._id);
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Get payment session status
const getPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.status(200).json({
      success: true,
      status: session.payment_status,
      session
    });
    
  } catch (error) {
    console.error('Error retrieving payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment status'
    });
  }
};

module.exports = {
  createPaymentSession,
  handleWebhook,
  getPaymentStatus
};