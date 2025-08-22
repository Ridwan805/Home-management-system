const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');

// Get Stripe publishable key
const getPublishableKey = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Error getting publishable key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get publishable key'
    });
  }
};

// Create Stripe checkout session for advance payment
const createPaymentSession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;

    // Find the request
    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Verify the tenant is the one making the payment
    if (request.tenantId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to make this payment'
      });
    }

    // Check if payment is already made
    if (request.advancePayment && request.advancePayment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Advance payment has already been made for this request'
      });
    }

    // Get tenant details
    const tenant = await User.findById(userId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Calculate payment amount (10% of property price)
    const propertyPrice = request.propertyId.price;
    const paymentAmount = Math.round(propertyPrice * 0.1);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: `Advance Payment for ${request.propertyId.title}`,
              description: `10% advance payment for property at ${request.propertyId.location}`
            },
            unit_amount: paymentAmount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: requestId,
        tenantId: userId,
        propertyId: request.propertyId._id.toString(),
        requestType: 'advance_payment'
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    // Update request with payment session info
    request.advancePayment = {
      sessionId: session.id,
      amount: paymentAmount,
      status: 'Pending',
      createdAt: new Date()
    };
    await request.save();

    // Create payment record
    await Payment.create({
      requestId: requestId,
      tenantId: userId,
      propertyId: request.propertyId._id,
      ownerId: request.ownerId,
      sessionId: session.id,
      amount: paymentAmount,
      type: 'Advance',
      status: 'Pending',
      paymentMethod: 'Card',
      createdAt: new Date()
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session'
    });
  }
};

// Create Stripe checkout session for full payment
const createFullPaymentSession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;

    // Find the request
    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Verify the tenant is the one making the payment
    if (request.tenantId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to make this payment'
      });
    }

    // Check if advance payment is made
    if (!request.advancePayment || request.advancePayment.status !== 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Advance payment must be completed before making full payment'
      });
    }

    // Check if full payment is already made
    if (request.fullPayment && request.fullPayment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Full payment has already been made for this request'
      });
    }

    // Get tenant details
    const tenant = await User.findById(userId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Calculate payment amount (90% of property price)
    const propertyPrice = request.propertyId.price;
    const paymentAmount = Math.round(propertyPrice * 0.9);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: `Full Payment for ${request.propertyId.title}`,
              description: `Remaining 90% payment for property at ${request.propertyId.location}`
            },
            unit_amount: paymentAmount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: requestId,
        tenantId: userId,
        propertyId: request.propertyId._id.toString(),
        requestType: 'full_payment'
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    // Update request with payment session info
    request.fullPayment = {
      sessionId: session.id,
      amount: paymentAmount,
      status: 'Pending',
      createdAt: new Date()
    };
    await request.save();

    // Create payment record
    await Payment.create({
      requestId: requestId,
      tenantId: userId,
      propertyId: request.propertyId._id,
      ownerId: request.ownerId,
      sessionId: session.id,
      amount: paymentAmount,
      type: 'Full',
      status: 'Pending',
      paymentMethod: 'Card',
      createdAt: new Date()
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url
    });
  } catch (error) {
    console.error('Error creating full payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create full payment session'
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
      const requestType = event.data.object.metadata.requestType || 'advance_payment';
      if (requestType === 'full_payment') {
        await handleFullPaymentSuccess(event.data.object);
      } else {
        await handlePaymentSuccess(event.data.object);
      }
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
    request.status = 'AdvancePaid';
    await request.save();
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { sessionId: session.id },
      { 
        status: 'Completed',
        paidAt: new Date(),
        transactionId: session.payment_intent
      }
    );
    
    // Send notification to owner
    await NotificationService.createNotification({
      recipientId: request.ownerId,
      senderId: tenantId,
      type: 'payment',
      title: 'Advance Payment Received',
      message: `Advance payment of BDT ${request.advancePayment.amount} has been received for your property.`,
      relatedId: requestId,
      relatedType: 'request'
    });
    
    // Send notification to tenant
    await NotificationService.createNotification({
      recipientId: tenantId,
      type: 'payment',
      title: 'Advance Payment Successful',
      message: `Your advance payment of BDT ${request.advancePayment.amount} has been processed successfully.`,
      relatedId: requestId,
      relatedType: 'request'
    });
    
    console.log('Advance payment processed successfully for request:', requestId);
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
};

// Handle successful full payment
const handleFullPaymentSuccess = async (session) => {
  try {
    const { requestId, tenantId } = session.metadata;
    
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for full payment success:', requestId);
      return;
    }
    
    // Update payment status
    request.fullPayment.status = 'Paid';
    request.fullPayment.paidAt = new Date();
    request.status = 'FullyPaid';
    await request.save();
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { sessionId: session.id },
      { 
        status: 'Completed',
        paidAt: new Date(),
        transactionId: session.payment_intent
      }
    );
    
    // Update property status
    await Property.findByIdAndUpdate(
      request.propertyId,
      { status: 'Sold', soldTo: tenantId, soldAt: new Date() }
    );
    
    // Send notification to owner
    await NotificationService.createNotification({
      recipientId: request.ownerId,
      senderId: tenantId,
      type: 'payment',
      title: 'Full Payment Received',
      message: `Full payment of BDT ${request.fullPayment.amount} has been received for your property. The property has been marked as sold.`,
      relatedId: requestId,
      relatedType: 'request'
    });
    
    // Send notification to tenant
    await NotificationService.createNotification({
      recipientId: tenantId,
      type: 'payment',
      title: 'Full Payment Successful',
      message: `Your full payment of BDT ${request.fullPayment.amount} has been processed successfully. The property is now yours!`,
      relatedId: requestId,
      relatedType: 'request'
    });
    
    console.log('Full payment processed successfully for request:', requestId);
  } catch (error) {
    console.error('Error processing full payment success:', error);
  }
};

// Handle payment expired
const handlePaymentExpired = async (session) => {
  try {
    const { requestId, tenantId } = session.metadata;
    const requestType = session.metadata.requestType || 'advance_payment';
    
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for payment expired:', requestId);
      return;
    }
    
    // Update payment status based on payment type
    if (requestType === 'full_payment') {
      request.fullPayment.status = 'Expired';
    } else {
      request.advancePayment.status = 'Expired';
    }
    await request.save();
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { sessionId: session.id },
      { status: 'Expired' }
    );
    
    // Send notification to tenant
    await NotificationService.createNotification({
      recipientId: tenantId,
      type: 'payment',
      title: 'Payment Session Expired',
      message: `Your payment session has expired. Please try again if you still want to proceed with the payment.`,
      relatedId: requestId,
      relatedType: 'request'
    });
    
    console.log('Payment session expired for request:', requestId);
  } catch (error) {
    console.error('Error processing payment expired:', error);
  }
};

// Handle payment failed
const handlePaymentFailed = async (paymentIntent) => {
  try {
    // Find the payment record by payment intent ID
    const payment = await Payment.findOne({ transactionId: paymentIntent.id });
    if (!payment) {
      console.error('Payment not found for failed payment intent:', paymentIntent.id);
      return;
    }
    
    // Update payment status
    payment.status = 'Failed';
    await payment.save();
    
    // Find the request
    const request = await Request.findById(payment.requestId);
    if (!request) {
      console.error('Request not found for failed payment:', payment.requestId);
      return;
    }
    
    // Update request payment status based on payment type
    if (payment.type === 'Full') {
      request.fullPayment.status = 'Failed';
    } else {
      request.advancePayment.status = 'Failed';
    }
    await request.save();
    
    // Send notification to tenant
    await NotificationService.createNotification({
      recipientId: payment.tenantId,
      type: 'payment',
      title: 'Payment Failed',
      message: `Your payment of BDT ${payment.amount} has failed. Please try again or contact support.`,
      relatedId: payment.requestId,
      relatedType: 'request'
    });
    
    console.log('Payment failed for request:', payment.requestId);
  } catch (error) {
    console.error('Error processing payment failed:', error);
  }
};

// Get payment status
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
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus
};