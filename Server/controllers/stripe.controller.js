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

    console.log('🔄 STRIPE CONTROLLER: Creating ADVANCE payment session for:', { requestId, userId });
    console.log('🔑 Stripe keys check:', {
      secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
      publishableKeyExists: !!process.env.STRIPE_PUBLISHABLE_KEY,
      frontendUrlExists: !!process.env.FRONTEND_URL
    });

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
    if (request.tenantId.toString() !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this request'
      });
    }

    // Ensure request is approved for advance payment
    const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/[–—-]/g, '-');
    const normalizedStatus = normalize(request.status);
    console.log('🔎 Status normalization:', { original: request.status, normalized: normalizedStatus });
    if (normalizedStatus !== 'approved-pay-advance') {
      return res.status(400).json({
        success: false,
        message: 'Request is not approved for advance payment'
      });
    }

    // Get amount and currency from request's advancePayment
    const amount = request.advancePayment?.amount;
    let currency = (request.advancePayment?.currency || 'USD').toUpperCase();

    // Ensure currency is supported by Stripe Checkout in test/dev; fallback to USD if not
    const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
    if (!supportedCurrencies.has(currency)) {
      console.warn(`⚠️ Unsupported currency "${currency}" for Stripe Checkout. Falling back to USD.`);
      currency = 'USD';
    }

    console.log('🧮 Advance payment details:', { amount, currency });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advance payment amount'
      });
    }

    // Guardrails: Validate payment amount
    const paymentValidation = GuardrailsService.validatePaymentAmount(amount, currency);
    if (!paymentValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: paymentValidation.errors?.join(', ') || 'Invalid payment amount'
      });
    }

    // Guardrails: Detect suspicious payment activity
    const suspiciousActivity = await GuardrailsService.detectSuspiciousActivity(
      userId,
      'payment_submission',
      {
        requestId,
        amount,
        currency,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress
      }
    );

    if (suspiciousActivity.isSuspicious && suspiciousActivity.riskLevel === 'high') {
      await GuardrailsService.logSecurityEvent(
        userId,
        'suspicious_payment_attempt',
        {
          indicators: suspiciousActivity.indicators,
          requestId,
          amount,
          currency,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection?.remoteAddress
        },
        suspiciousActivity.riskLevel
      );

      return res.status(429).json({
        success: false,
        message: 'Payment temporarily blocked due to suspicious activity. Please contact support.'
      });
    }

    // Convert amount to the smallest currency unit (e.g., cents)
    const amountInCents = Math.round(amount * 100);

    // Ensure we pass a valid customer email (fallback to DB lookup)
    let customerEmail = req.user.email;
    if (!customerEmail) {
      try {
        const userDoc = await User.findById(userId).select('email');
        customerEmail = userDoc?.email;
      } catch (e) {
        console.warn('⚠️ Could not fetch user email for Stripe session (advance):', e.message);
      }
    }
    console.log('📧 [Advance] Using customer email for Stripe (may be undefined):', customerEmail);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Advance Payment - ${request.propertyId?.address || request.requestId}`,
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
        tenantId: userId.toString(),
        ownerId: request.ownerId._id.toString(),
        requestType: 'advance_payment',
        amount: amount.toString(),
        currency
      },
      customer_email: customerEmail,
    });

    // Store session id and add timeline event
    request.advancePayment = request.advancePayment || {};
    request.advancePayment.stripeSessionId = session.id;

    request.timeline.push({
      event: 'Advance payment session created',
      actor: userId,
      timestamp: new Date(),
      note: `Amount: ${amount} ${currency}`
    });

    await request.save();

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating advance payment session:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    if (error?.raw) console.error('Stripe error details:', error.raw);
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

    console.log('🔄 STRIPE CONTROLLER: Creating FULL payment session for:', { requestId, userId });
    console.log('🔑 Stripe keys check:', {
      secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
      publishableKeyExists: !!process.env.STRIPE_PUBLISHABLE_KEY,
      frontendUrlExists: !!process.env.FRONTEND_URL
    });

    const request = await Request.findById(requestId)
      .populate('propertyId', 'address price listingType ownerId')
      .populate('ownerId', 'firstName lastName email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if user is the tenant
    if (request.tenantId.toString() !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this request' });
    }

    // Determine amount and currency for full payment
    let amount = request.fullPayment?.amount;
    if (!amount || amount <= 0) {
      // Fallback to property price if full payment amount is not preset on the request
      amount = request.propertyId?.price;
    }
    let currency = (request.fullPayment?.currency || 'USD').toUpperCase();

    // Ensure currency is supported by Stripe Checkout; fallback to USD if not
    const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
    if (!supportedCurrencies.has(currency)) {
      console.warn(`⚠️ Unsupported currency "${currency}" for Stripe Checkout. Falling back to USD.`);
      currency = 'USD';
    }

    console.log('🧮 Full payment details:', { amount, currency });

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid full payment amount' });
    }

    // Guardrails: Validate payment amount
    const paymentValidation = GuardrailsService.validatePaymentAmount(amount, currency);
    if (!paymentValidation.isValid) {
      return res.status(400).json({ success: false, message: paymentValidation.errors?.join(', ') || 'Invalid payment amount' });
    }

    // Guardrails: Detect suspicious payment activity
    const suspiciousActivity = await GuardrailsService.detectSuspiciousActivity(
      userId,
      'payment_submission',
      {
        requestId,
        amount,
        currency,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress
      }
    );

    if (suspiciousActivity.isSuspicious && suspiciousActivity.riskLevel === 'high') {
      await GuardrailsService.logSecurityEvent(
        userId,
        'suspicious_payment_attempt',
        {
          indicators: suspiciousActivity.indicators,
          requestId,
          amount,
          currency,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection?.remoteAddress
        },
        suspiciousActivity.riskLevel
      );

      return res.status(429).json({ success: false, message: 'Payment temporarily blocked due to suspicious activity. Please contact support.' });
    }

    const amountInCents = Math.round(amount * 100);

    // Ensure we pass a valid customer email (fallback to DB lookup)
    let customerEmail = req.user.email;
    if (!customerEmail) {
      try {
        const userDoc = await User.findById(userId).select('email');
        customerEmail = userDoc?.email;
      } catch (e) {
        console.warn('⚠️ Could not fetch user email for Stripe session (full):', e.message);
      }
    }
    console.log('📧 [Full] Using customer email for Stripe (may be undefined):', customerEmail);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Full Payment - ${request.propertyId?.address || request.requestId}`,
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
        tenantId: userId.toString(),
        ownerId: request.ownerId._id.toString(),
        requestType: 'full_payment',
        amount: amount.toString(),
        currency
      },
      customer_email: customerEmail,
    });

    // Store session id and add timeline event
    request.fullPayment = request.fullPayment || {};
    request.fullPayment.stripeSessionId = session.id;
    request.timeline.push({
      event: 'Full payment session created',
      actor: userId,
      timestamp: new Date(),
      note: `Amount: ${amount} ${currency}`
    });
    await request.save();

    return res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating full payment session:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    if (error?.raw) console.error('Stripe error details:', error.raw);
    return res.status(500).json({ success: false, message: 'Failed to create full payment session' });
  }
};

module.exports = {
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus
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
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;
    
    // Update request status to a valid enum value
    request.status = 'Payment Submitted';
    
    // Add timeline event
    request.timeline.push({
      event: 'Advance payment completed via Stripe',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency}`
    });
    
    await request.save();
    
    // Assign property to tenant after successful payment
    try {
      const property = await Property.findById(request.propertyId);
      if (property) {
        property.assignedTenant = tenantId;
        property.assignedAt = new Date();
        property.assignmentType = request.requestType === 'rent' ? 'Rent' : 'Buy';
        property.status = request.requestType === 'rent' ? 'Rented' : 'Sold';
        await property.save();
        
        console.log(`Property ${property._id} assigned to tenant ${tenantId}`);
        
        // Update request status to completed since property is now assigned
        request.status = 'Paid/Completed';
        request.timeline.push({
          event: `Property assigned to tenant - ${property.assignmentType}`,
          actor: 'system',
          timestamp: new Date(),
          note: `Property ${property.address} has been assigned to the tenant`
        });
        await request.save();
      }
    } catch (propertyError) {
      console.error('Error assigning property to tenant:', propertyError);
    }
    
    // Create payment record in Payment collection
    try {
      const paymentRecord = new Payment({
        type: 'advance_payment',
        status: 'completed',
        method: 'stripe',
        amount: request.advancePayment.amount,
        currency: request.advancePayment.currency,
        requestId: request._id,
        propertyId: request.propertyId,
        payerId: tenantId,
        payeeId: request.ownerId,
        description: `Advance payment for property request ${request.requestId}`,
        stripeDetails: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          chargeId: session.payment_intent // Will be updated with actual charge ID
        },
        paidAt: new Date(),
        history: [{
          status: 'completed',
          timestamp: new Date(),
          note: 'Payment completed via Stripe'
        }]
      });
      
      await paymentRecord.save();
      console.log('Payment record created:', paymentRecord.paymentId);
    } catch (paymentRecordError) {
      console.error('Error creating payment record:', paymentRecordError);
    }
    
    console.log('Payment processed successfully for request:', requestId);
    
    // Send notifications about payment completion
    try {
      // Notify owner about payment receipt
      await NotificationService.sendPaymentReceiptNotification(
        request.ownerId,
        requestId,
        request.advancePayment.amount,
        request.advancePayment.currency
      );
      
      // Notify tenant about payment confirmation
      await NotificationService.sendPaymentReceiptNotification(
        tenantId,
        requestId,
        request.advancePayment.amount,
        request.advancePayment.currency
      );
    } catch (notificationError) {
      console.error('Error sending payment notifications:', notificationError);
    }
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle full payment success
const handleFullPaymentSuccess = async (session) => {
  try {
    const { requestId, tenantId, amount, currency } = session.metadata;
    
    const request = await Request.findById(requestId)
      .populate('propertyId', 'address ownerId')
      .populate('ownerId', 'firstName lastName email');
    
    if (!request) {
      console.error('Request not found for full payment:', requestId);
      return;
    }
    
    // Update request with full payment details
    request.fullPayment = {
      status: 'completed',
      amount: parseFloat(amount),
      currency,
      stripeSessionId: session.id,
      paidAt: new Date()
    };
    
    // Update request status to completed
    request.status = 'completed';
    
    // Add timeline event
    request.timeline.push({
      event: 'Full payment completed',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${amount} ${currency} via Stripe`
    });
    
    await request.save();
    
    // Create payment record in Payment collection for full payment
    try {
      const paymentRecord = new Payment({
        type: 'full_payment',
        status: 'completed',
        method: 'stripe',
        amount: parseFloat(amount),
        currency,
        requestId: request._id,
        propertyId: request.propertyId._id,
        payerId: tenantId,
        payeeId: request.ownerId._id,
        description: `Full payment for property request ${request.requestId}`,
        stripeDetails: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          chargeId: session.payment_intent
        },
        paidAt: new Date(),
        history: [{
          status: 'completed',
          timestamp: new Date(),
          note: 'Full payment completed via Stripe'
        }]
      });
      
      await paymentRecord.save();
      console.log('Full payment record created:', paymentRecord.paymentId);
    } catch (paymentRecordError) {
      console.error('Error creating full payment record:', paymentRecordError);
    }
    
    console.log('Full payment processed successfully for request:', requestId);
    
    // Send notifications about full payment completion
    try {
      // Notify owner about full payment receipt
      await NotificationService.sendPaymentReceiptNotification(
        request.ownerId._id,
        requestId,
        parseFloat(amount),
        currency
      );
      
      // Notify tenant about payment confirmation
      await NotificationService.sendPaymentReceiptNotification(
        tenantId,
        requestId,
        parseFloat(amount),
        currency
      );
      
      // Notify both parties about request completion
      await NotificationService.createNotification(
        request.ownerId._id,
        'success',
        'Request Completed',
        `The rental request for ${request.propertyId.address} has been completed with full payment received.`,
        { requestId, propertyAddress: request.propertyId.address }
      );
      
      await NotificationService.createNotification(
        tenantId,
        'success',
        'Request Completed',
        `Your rental request for ${request.propertyId.address} has been completed successfully.`,
        { requestId, propertyAddress: request.propertyId.address }
      );
      
    } catch (notificationError) {
      console.error('Error sending full payment notifications:', notificationError);
    }
    
  } catch (error) {
    console.error('Error handling full payment success:', error);
  }
};

// Handle payment expired
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