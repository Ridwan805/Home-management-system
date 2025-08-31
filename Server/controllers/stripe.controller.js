const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');
const PaymentStatusChecker = require('../services/paymentStatusChecker');
// Long polling functionality removed

// Get Stripe publishable key
const getPublishableKey = async (req, res) => {
  try {
    console.log('🔑 Stripe Secret Key exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('🔑 Stripe Publishable Key exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
  
    
    // Test Stripe connection
    const testProduct = await stripe.products.list({ limit: 1 });
    console.log('✅ Stripe connection successful');
    
    res.status(200).json({
      success: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('❌ Error getting publishable key:', error);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get publishable key: ' + error.message
    });
  }
};

// Create Stripe checkout session for advance payment
const createPaymentSession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { amount: providedAmount, currency: providedCurrency = 'BDT' } = req.body;
    const userId = req.user.userId;
    console.log('🧭 createPaymentSession called', { requestId, userId, providedAmount, providedCurrency });
    
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

    // Get amount and currency from request's advancePayment (ignore body to prevent tampering)
    let amount = request.advancePayment?.amount;
    let currency = (request.advancePayment?.currency || 'USD').toUpperCase();

    // New: derive checkout currency and amount for Stripe
    let checkoutCurrency = currency;
    let amountForCheckout = amount;

    // Convert BDT -> USD at fixed rate 120 BDT = 1 USD
    if (checkoutCurrency === 'BDT') {
      console.log('🔁 Converting BDT to USD for Stripe Checkout at 120 BDT = 1 USD');
      checkoutCurrency = 'USD';
      amountForCheckout = amount / 120;
    }

    // Ensure currency is supported by Stripe Checkout in test/dev; fallback to USD if not
    const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
    if (!supportedCurrencies.has(checkoutCurrency)) {
      console.warn(`⚠️ Unsupported currency "${checkoutCurrency}" for Stripe Checkout. Falling back to USD.`);
      checkoutCurrency = 'USD';
    }

    console.log('🧮 Advance payment details:', { amount, currency, checkoutCurrency, amountForCheckout });

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advance payment amount'
      });
    }

    // Convert amount to the smallest currency unit (e.g., cents)
    const amountInCents = Math.round(amountForCheckout * 100);

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
            currency: checkoutCurrency.toLowerCase(),
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
      success_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=cancelled`,
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
    const { amount: providedAmount, currency: providedCurrency = 'BDT' } = req.body;
    const userId = req.user.userId;
    console.log('🧭 createFullPaymentSession called', { requestId, userId, providedAmount, providedCurrency });
    
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

    // Determine amount and currency for full payment (ignore body to prevent tampering)
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
      success_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=cancelled`,
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

    console.log('✅ Full payment checkout session created', { sessionId: session.id, url: session.url });

    return res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❗ Error creating full payment session:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    if (error?.raw) console.error('Stripe error details:', error.raw);
    return res.status(500).json({ success: false, message: 'Failed to create full payment session' });
  }
};

// Handle Stripe webhook events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  // Enhanced webhook reception diagnostics
  try {
    const isBuffer = Buffer.isBuffer(req.body);
    const bodyPreview = isBuffer ? `<buffer:${req.body.length} bytes>` : typeof req.body;
    console.log('🔔 [WEBHOOK] Stripe webhook received at', new Date().toISOString(), {
      hasSignatureHeader: !!sig,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      bodyType: bodyPreview,
      url: req.originalUrl,
      method: req.method
    });
  } catch (e) {
    console.error('🔔 [WEBHOOK] Error in webhook diagnostics:', e.message);
  }
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ [WEBHOOK] Webhook signature verified successfully', { 
      eventType: event?.type,
      eventId: event?.id,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [WEBHOOK] Webhook signature verification failed:', err.message);
    console.error('❌ [WEBHOOK] Signature header:', sig ? 'Present' : 'Missing');
    console.error('❌ [WEBHOOK] Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : 'Missing');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log('🔄 [WEBHOOK] Processing event:', {
    type: event.type,
    id: event.id,
    created: event.created,
    livemode: event.livemode
  });
  
  // Handle the event with enhanced error handling - using only Stripe API
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const sessionId = event.data.object.id;
        console.log('➡️ [WEBHOOK] Processing checkout.session.completed', {
          sessionId: sessionId
        });
        
        // Fetch complete session data from Stripe API
        let sessionData;
        try {
          sessionData = await stripe.checkout.sessions.retrieve(sessionId);
          console.log('✅ [WEBHOOK] Retrieved session data from Stripe API:', {
            sessionId: sessionData.id,
            paymentStatus: sessionData.payment_status,
            status: sessionData.status,
            metadata: sessionData.metadata
          });
        } catch (stripeError) {
          console.error('❌ [WEBHOOK] Failed to retrieve session from Stripe API:', stripeError.message);
          return; // Exit if we can't get session data
        }
        
        // Only process if payment is actually completed
        if (sessionData.payment_status !== 'paid') {
          console.log('⚠️ [WEBHOOK] Payment not completed, skipping:', {
            sessionId: sessionData.id,
            paymentStatus: sessionData.payment_status
          });
          return;
        }
        
        const requestType = sessionData.metadata.requestType || 'advance_payment';
        
<<<<<<< Updated upstream
        if (requestType === 'full_payment') {
=======
        if (paymentType === 'subscription_payment') {
          console.log('🔄 [WEBHOOK] Handling subscription payment...');
          await handleSubscriptionPaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Subscription payment handled successfully');
        } else if (paymentType === 'invoice_payment') {
          console.log('🔄 [WEBHOOK] Handling invoice payment...');
          await handleInvoicePaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Invoice payment handled successfully');
        } else if (paymentType === 'full_payment') {
>>>>>>> Stashed changes
          console.log('🔄 [WEBHOOK] Handling full payment...');
          await handleFullPaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Full payment handled successfully');
        } else {
          console.log('🔄 [WEBHOOK] Handling advance payment...');
          await handlePaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Advance payment handled successfully');
        }
        break;
        
      case 'checkout.session.expired':
        const expiredSessionId = event.data.object.id;
        console.log('⚠️ [WEBHOOK] Processing checkout.session.expired', { sessionId: expiredSessionId });
        
        // Fetch session data from Stripe API for expired session
        let expiredSessionData;
        try {
          expiredSessionData = await stripe.checkout.sessions.retrieve(expiredSessionId);
        } catch (stripeError) {
          console.error('❌ [WEBHOOK] Failed to retrieve expired session from Stripe API:', stripeError.message);
          return;
        }
        
        await handlePaymentExpired(expiredSessionData);
        console.log('✅ [WEBHOOK] Payment expiry handled successfully');
        break;
        
      case 'payment_intent.payment_failed':
        console.log('❌ [WEBHOOK] Processing payment_intent.payment_failed', { paymentIntent: event.data.object?.id });
        await handlePaymentFailed(event.data.object);
        console.log('✅ [WEBHOOK] Payment failure handled successfully');
        break;
        
      default:
        console.log(`⚠️ [WEBHOOK] Unhandled event type: ${event.type}`);
    }
    
    console.log('✅ [WEBHOOK] Event processing completed successfully at', new Date().toISOString());
    
  } catch (eventError) {
    console.error('❌ [WEBHOOK] Error processing webhook event:', {
      error: eventError.message,
      stack: eventError.stack,
      eventType: event.type,
      eventId: event.id
    });
    // Still return 200 to acknowledge receipt, but log the error
  }
  
  res.status(200).json({ received: true, eventType: event.type, timestamp: new Date().toISOString() });
};

// Handle successful payment
const handlePaymentSuccess = async (session) => {
  const startTime = Date.now();
  try {
    console.log('➡️ [WEBHOOK] handlePaymentSuccess invoked at', new Date().toISOString(), {
      sessionId: session?.id,
      paymentIntent: session?.payment_intent,
      paymentStatus: session?.payment_status,
      metadata: session?.metadata
    });
    
    // Payment status is already verified in webhook handler before calling this function
    
    const { requestId, tenantId, amount, currency } = session.metadata;
    
    if (!requestId || !tenantId) {
      console.error('❌ [WEBHOOK] Missing required metadata:', { requestId, tenantId });
      return;
    }
    
    console.log('🔍 [WEBHOOK] Looking up request:', requestId);
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('❌ [WEBHOOK] Request not found for payment success:', requestId);
      return;
    }
    console.log('✅ [WEBHOOK] Found request for advance payment', { 
      requestId: requestId,
      currentStatus: request.status,
      currentAdvanceStatus: request.advancePayment?.status
    });
    
    // Check if payment is already processed to avoid duplicate processing
    if (request.advancePayment?.status === 'Paid') {
      console.log('⚠️ [WEBHOOK] Payment already processed, skipping update:', {
        requestId,
        currentStatus: request.advancePayment.status
      });
      return;
    }
    
    console.log('🔄 [WEBHOOK] Updating request payment status...');
    
    // Update payment status on Request
    request.advancePayment = request.advancePayment || {};
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;
    request.advancePayment.isPaid = true;
    // Prevent multiple payments for the same advance
    request.advancePayment.canPayAgain = false;
    
    // Stripe completed -> mark request as AdvancePaid (not Payment Submitted)
    const oldRequestStatus = request.status;
    request.status = 'AdvancePaid';
    
    // Add timeline event
    request.timeline.push({
      event: 'Advance payment completed via Stripe webhook',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency} - Processed immediately via webhook`
    });
    
    console.log('💾 [WEBHOOK] Saving request updates...');
    await request.save();
    console.log('✅ [WEBHOOK] Request updated successfully', {
      requestId,
      oldStatus: oldRequestStatus,
      newStatus: request.status,
      advancePaymentStatus: request.advancePayment.status,
      processingTime: `${Date.now() - startTime}ms`
    });

    // Also update the corresponding Payment record from pending -> completed
    console.log('🔄 [WEBHOOK] Updating Payment record...');
    try {
      // Prefer lookup by linked paymentId on the request, fallback to requestId/type
      let payment;
      if (request.advancePayment?.paymentId) {
        console.log('🔍 [WEBHOOK] Looking up payment by paymentId:', request.advancePayment.paymentId);
        payment = await Payment.findOne({ paymentId: request.advancePayment.paymentId });
      }
      if (!payment) {
        console.log('🔍 [WEBHOOK] Looking up payment by requestId and type...');
        payment = await Payment.findOne({ requestId: request._id, type: 'advance_payment' }).sort({ createdAt: -1 });
      }
      
      if (payment) {
        console.log('✅ [WEBHOOK] Found Payment record to update:', {
          paymentId: payment.paymentId,
          currentStatus: payment.status
        });
        
        const oldStatus = payment.status;
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.amount = request.advancePayment.amount;
        payment.currency = (request.advancePayment.currency || 'BDT').toUpperCase();
        payment.stripeDetails = {
          ...(payment.stripeDetails || {}),
          sessionId: session.id,
          paymentIntentId: session.payment_intent
        };
        
        // Manually add to history to ensure it's tracked
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: `Advance payment completed via Stripe webhook. Changed from ${oldStatus} to completed - Processed immediately`,
          updatedBy: tenantId
        });
        
        console.log('💾 [WEBHOOK] Saving Payment record...');
        await payment.save();
        console.log('✅ [WEBHOOK] Payment record updated successfully', {
          paymentId: payment.paymentId || payment._id?.toString?.(),
          oldStatus,
          newStatus: payment.status,
          historyEntries: payment.history.length
        });
      } else {
        console.warn('⚠️ [WEBHOOK] No Payment record found to update for request:', request._id.toString());
      }
    } catch (paymentUpdateErr) {
      console.error('❌ [WEBHOOK] Failed updating Payment record:', {
        error: paymentUpdateErr.message,
        stack: paymentUpdateErr.stack,
        requestId
      });
    }
    
    console.log('Payment processed successfully for request:', requestId);
    
    // Long polling notifications removed
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle full payment success
const handleFullPaymentSuccess = async (session) => {
  const startTime = Date.now();
  try {
    console.log('🎉 [WEBHOOK] handleFullPaymentSuccess invoked at', new Date().toISOString(), {
      sessionId: session?.id,
      paymentIntent: session?.payment_intent,
      paymentStatus: session?.payment_status,
      metadata: session?.metadata
    });
    
    // Payment status is already verified in webhook handler before calling this function
    
    const { requestId, tenantId, amount, currency } = session.metadata;
    
    if (!requestId || !tenantId) {
      console.error('❌ [WEBHOOK] Missing required metadata for full payment:', { requestId, tenantId });
      return;
    }
    
    console.log('🔍 [WEBHOOK] Looking up request for full payment:', requestId);
    const request = await Request.findById(requestId)
      .populate('propertyId', 'address ownerId')
      .populate('ownerId', 'firstName lastName email');
    
    if (!request) {
      console.error('❌ [WEBHOOK] Request not found for full payment:', requestId);
      return;
    }
    
    console.log('✅ [WEBHOOK] Found request for full payment', {
      requestId: requestId,
      currentStatus: request.status,
      currentFullPaymentStatus: request.fullPayment?.status
    });
    
    // Check if payment is already processed to avoid duplicate processing
    if (request.fullPayment?.status === 'completed') {
      console.log('⚠️ [WEBHOOK] Full payment already processed, skipping update:', {
        requestId,
        currentStatus: request.fullPayment.status
      });
      return;
    }
    
    console.log('🔄 [WEBHOOK] Updating request full payment status...');
    
    // Update request with full payment details
    const oldRequestStatus = request.status;
    request.fullPayment = {
      status: 'completed',
      amount: parseFloat(amount),
      currency,
      stripeSessionId: session.id,
      paidAt: new Date()
    };
    
    // Update request status to completed
    request.status = 'Paid/Completed';
    
    // Add timeline event
    request.timeline.push({
      event: 'Full payment completed via Stripe webhook',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${amount} ${currency} via Stripe - Processed immediately via webhook`
    });
    
    console.log('💾 [WEBHOOK] Saving request with full payment updates...');
    await request.save();
    console.log('✅ [WEBHOOK] Request updated successfully with full payment', {
      requestId,
      oldStatus: oldRequestStatus,
      newStatus: request.status,
      fullPaymentStatus: request.fullPayment.status,
      processingTime: `${Date.now() - startTime}ms`
    });
    
    // Also update or create the corresponding Payment record for full payment
    console.log('🔄 [WEBHOOK] Updating/creating Payment record for full payment...');
    try {
      let payment = await Payment.findOne({ requestId: request._id, type: 'full_payment' }).sort({ createdAt: -1 });
      
      if (payment) {
        console.log('✅ [WEBHOOK] Found existing Payment record to update:', {
          paymentId: payment.paymentId,
          currentStatus: payment.status
        });
        
        // Update existing payment record
        const oldStatus = payment.status;
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.amount = parseFloat(amount);
        payment.currency = currency.toUpperCase();
        payment.stripeDetails = {
          ...(payment.stripeDetails || {}),
          sessionId: session.id,
          paymentIntentId: session.payment_intent
        };
        
        // Manually add to history to ensure it's tracked
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: `Full payment completed via Stripe webhook. Changed from ${oldStatus} to completed - Processed immediately`,
          updatedBy: tenantId
        });
        
        console.log('💾 [WEBHOOK] Saving existing Payment record...');
        await payment.save();
        console.log('✅ [WEBHOOK] Full payment record updated successfully', {
          paymentId: payment.paymentId,
          oldStatus,
          newStatus: payment.status,
          historyEntries: payment.history.length
        });
      } else {
        console.log('🆕 [WEBHOOK] Creating new Payment record for full payment...');
        
        // Create new payment record for full payment
        payment = new Payment({
          type: 'full_payment',
          status: 'completed',
          method: 'stripe',
          amount: parseFloat(amount),
          currency: currency.toUpperCase(),
          requestId: request._id,
          propertyId: request.propertyId,
          payerId: tenantId,
          payeeId: request.ownerId,
          description: `Full payment for ${request.requestType} request`,
          paidAt: new Date(),
          stripeDetails: {
            sessionId: session.id,
            paymentIntentId: session.payment_intent
          }
        });
        
        // Add initial history entry
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: 'Full payment completed via Stripe webhook - Processed immediately',
          updatedBy: tenantId
        });
        
        console.log('💾 [WEBHOOK] Saving new Payment record...');
        await payment.save();
        console.log('✅ [WEBHOOK] New full payment record created successfully', {
          paymentId: payment.paymentId,
          status: payment.status,
          historyEntries: payment.history.length
        });
        
        // Link paymentId to the Request's fullPayment for easy lookup later
        request.fullPayment.paymentId = payment.paymentId;
        console.log('💾 [WEBHOOK] Linking payment to request...');
        await request.save();
        console.log('✅ [WEBHOOK] Payment linked to request successfully');
      }
    } catch (paymentUpdateErr) {
      console.error('❌ [WEBHOOK] Failed updating/creating Payment record for full payment:', {
        error: paymentUpdateErr.message,
        stack: paymentUpdateErr.stack,
        requestId
      });
    }
    console.log('✅ [WEBHOOK] Full payment processed successfully for request:', {
      requestId,
      status: request.status,
      fullPaymentStatus: request.fullPayment.status,
      totalProcessingTime: `${Date.now() - startTime}ms`
    });
    
    // Long polling notifications removed
    
  } catch (error) {
    console.error('Error handling full payment success:', error);
  }
};

<<<<<<< Updated upstream
// Handle payment expired
=======
// Handle successful invoice payment
const handleInvoicePaymentSuccess = async (session) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [INVOICE PAYMENT] Processing invoice payment success:', {
      sessionId: session.id,
      metadata: session.metadata,
      amountTotal: session.amount_total,
      currency: session.currency
    });

    const { paymentId, userId } = session.metadata;
    
    if (!paymentId || !userId) {
      console.error('❌ [INVOICE PAYMENT] Missing required metadata:', { paymentId, userId });
      return;
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId)
      .populate('invoiceId', 'invoiceNumber billTo propertyId')
      .populate({
        path: 'invoiceId',
        populate: {
          path: 'propertyId',
          select: 'title address ownerId'
        }
      });
      
    if (!payment) {
      console.error('❌ [INVOICE PAYMENT] Payment not found:', paymentId);
      return;
    }

    // Verify the user is authorized
    if (payment.payerId.toString() !== userId) {
      console.error('❌ [INVOICE PAYMENT] User not authorized for this payment:', { userId, payerId: payment.payerId });
      return;
    }

    // Use PaymentService to mark payment as completed
    const paymentDetails = {
      stripePaymentIntentId: session.payment_intent,
      chargeId: session.payment_intent, // This would be the actual charge ID from Stripe
      receiptUrl: session.receipt_url || null
    };

    await PaymentService.markPaymentAsCompleted(paymentId, paymentDetails);
    console.log('✅ [INVOICE PAYMENT] Payment and invoice status updated');

    // Send notification to tenant
    try {
      await NotificationService.sendNotification({
        userId: userId,
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of $${(session.amount_total / 100).toFixed(2)} for invoice #${payment.invoiceId.invoiceNo || payment.invoiceId._id.slice(-6)} has been processed successfully.`,
        data: {
          invoiceId: payment.invoiceId._id,
          paymentId: payment._id,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase()
        }
      });
      console.log('✅ [INVOICE PAYMENT] Notification sent to tenant');
    } catch (notificationError) {
      console.error('❌ [INVOICE PAYMENT] Failed to send notification:', notificationError.message);
    }

    // Send notification to property owner if different from tenant
    try {
      const property = await Property.findById(payment.invoiceId.propertyId._id).populate('ownerId');
      if (property && property.ownerId && property.ownerId._id.toString() !== userId) {
        const tenant = await User.findById(userId);
        await NotificationService.sendNotification({
          userId: property.ownerId._id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of $${(session.amount_total / 100).toFixed(2)} received for ${property.displayName || property.address || 'Property'} from ${tenant.firstName} ${tenant.lastName}.`,
          data: {
            invoiceId: payment.invoiceId._id,
            paymentId: payment._id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            propertyTitle: property.title
          }
        });
        console.log('✅ [INVOICE PAYMENT] Notification sent to property owner');
      }
    } catch (ownerNotificationError) {
      console.error('❌ [INVOICE PAYMENT] Failed to send owner notification:', ownerNotificationError.message);
    }

    console.log('✅ [INVOICE PAYMENT] Invoice payment processing completed:', {
      invoiceId: payment.invoiceId._id,
      paymentId: payment._id,
      totalProcessingTime: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    console.error('❌ [INVOICE PAYMENT] Error handling invoice payment success:', error);
  }
};

/**
 * Create a Stripe payment session for an invoice
 */
const createInvoicePaymentSession = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const userId = req.user?.userId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find the payment and populate related data
    const payment = await Payment.findById(paymentId)
      .populate('invoiceId', 'lineItems total dueDate period')
      .populate('rentId', 'propertyId')
      .populate({
        path: 'rentId',
        populate: {
          path: 'propertyId',
          select: 'title address'
        }
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify the user is authorized to pay this invoice
    if (payment.payerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to pay this invoice'
      });
    }

    // Check if payment is still pending
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment is already ${payment.status}`
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
              line_items: [{
          price_data: {
            currency: payment.currency.toLowerCase(),
            product_data: {
              name: `Monthly Rent - ${payment.rentId.propertyId.displayName || payment.rentId.propertyId.address || 'Property'}`,
              description: `Invoice for period: ${new Date(payment.invoiceId.period.start).toLocaleDateString()} - ${new Date(payment.invoiceId.period.end).toLocaleDateString()}`
            },
            unit_amount: Math.round(payment.amount * 100) // Convert to cents
          },
          quantity: 1
        }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/tenant/payment?session_id={CHECKOUT_SESSION_ID}&status=success&payment_id=${paymentId}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/payment?status=cancelled&payment_id=${paymentId}`,
      metadata: {
        paymentId: paymentId,
        userId: userId,
        type: 'invoice_payment'
      }
    });

    console.log('✅ Created Stripe session for invoice payment:', {
      sessionId: session.id,
      paymentId: paymentId,
      amount: payment.amount
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Error creating invoice payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session',
      error: error.message
    });
  }
};

// Create Stripe checkout session for subscription payment
const createSubscriptionPaymentSession = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    const userId = req.user?.userId;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice IDs are required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find the invoices
    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      ownerId: userId,
      status: 'pending'
    });

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid pending invoices found'
      });
    }

    if (invoices.length !== invoiceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some invoices are not found or not pending'
      });
    }

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const currency = invoices[0].currency || 'USD';

    // Create line items for Stripe
    const lineItems = invoices.map(invoice => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: `Subscription Fee - ${new Date(invoice.period.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          description: `Period: ${new Date(invoice.period.start).toLocaleDateString()} - ${new Date(invoice.period.end).toLocaleDateString()}`
        },
        unit_amount: Math.round(invoice.total * 100) // Convert to cents
      },
      quantity: 1
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/owner/payment?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/owner/payment?status=cancelled`,
      metadata: {
        invoiceIds: invoiceIds.join(','),
        userId: userId,
        type: 'subscription_payment',
        totalAmount: totalAmount.toString()
      }
    });

    console.log('✅ Created Stripe session for subscription payment:', {
      sessionId: session.id,
      invoiceIds: invoiceIds,
      totalAmount: totalAmount
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('❌ Error creating subscription payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session',
      error: error.message
    });
  }
};

// Handle successful subscription payment
const handleSubscriptionPaymentSuccess = async (session) => {
  try {
    console.log('🔄 Processing subscription payment success:', {
      sessionId: session.id,
      metadata: session.metadata
    });

    const { invoiceIds, userId, totalAmount } = session.metadata;
    
    if (!invoiceIds || !userId) {
      throw new Error('Missing required metadata in session');
    }

    const invoiceIdArray = invoiceIds.split(',');
    
    // Update invoice statuses to paid
    const updateResult = await Invoice.updateMany(
      {
        _id: { $in: invoiceIdArray },
        ownerId: userId,
        status: 'pending'
      },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'stripe',
          stripeSessionId: session.id
        }
      }
    );

    console.log('✅ Updated invoices:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });

    // Create payment records for each invoice
    const invoices = await Invoice.find({ _id: { $in: invoiceIdArray } });
    
    const paymentPromises = invoices.map(async (invoice) => {
      const payment = new Payment({
        invoiceId: invoice._id,
        payerId: userId,
        payeeId: null, // System payment
        amount: invoice.total,
        currency: invoice.currency || 'USD',
        status: 'completed',
        paymentMethod: 'stripe',
        stripeSessionId: session.id,
        type: 'subscription',
        description: `Subscription payment for ${new Date(invoice.period.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        paidAt: new Date()
      });
      
      return await payment.save();
    });

    const savedPayments = await Promise.all(paymentPromises);
    
    console.log('✅ Created payment records:', {
      count: savedPayments.length,
      paymentIds: savedPayments.map(p => p._id)
    });

    // Send notification to owner
    try {
      const owner = await User.findById(userId);
      if (owner) {
        await NotificationService.createNotification({
          userId: userId,
          type: 'payment_success',
          title: 'Subscription Payment Successful',
          message: `Your subscription payment of $${totalAmount} has been processed successfully.`,
          data: {
            sessionId: session.id,
            invoiceCount: invoices.length,
            totalAmount: totalAmount
          }
        });
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send notification:', notificationError.message);
    }

    console.log('✅ Subscription payment processing completed successfully');
    
  } catch (error) {
    console.error('❌ Error processing subscription payment success:', error);
    throw error;
  }
};

>>>>>>> Stashed changes
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



// Upload payment proof
const uploadPaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { proofUrl, note } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    
    // Validate input
    if (!proofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof URL is required'
      });
    }
    
    // Find the payment record
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Verify the user is the payer
    if (payment.payerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload proof for this payment'
      });
    }
    
    // Update payment with proof
    payment.proofUrls = payment.proofUrls || [];
    payment.proofUrls.push(proofUrl);
    if (note) {
      payment.notes = note;
    }
    
    // Add to payment history
    payment.history = payment.history || [];
    payment.history.push({
      status: payment.status,
      timestamp: new Date(),
      note: 'Payment proof uploaded by tenant',
      updatedBy: userId
    });
    
    await payment.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof'
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, note } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;
    
    // Validate input
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    // Find the payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update payment status
    const oldStatus = payment.status;
    payment.status = status;
    
    // Add to payment history
    payment.history = payment.history || [];
    payment.history.push({
      status: oldStatus,
      timestamp: new Date(),
      note: note || `Status updated from ${oldStatus} to ${status}`,
      updatedBy: userId
    });
    
    await payment.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      payment
    });
    
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
};

// The webhook-based system provides real-time updates without the need for manual polling
// Get receipt data for a payment
const getReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;
    
    console.log('🧾 Receipt request received:');
    console.log('- Payment ID:', paymentId);
    console.log('- User ID:', userId);
    
    // Find the payment record
    const payment = await Payment.findOne({ paymentId }).populate({
      path: 'requestId',
      populate: [
        { path: 'tenantId', select: 'name email phone' },
        { path: 'ownerId', select: 'name email phone' },
        { path: 'propertyId', select: 'address price description images' }
      ]
    });
    
    console.log('💳 Payment found:', payment ? 'Yes' : 'No');
    if (payment) {
      console.log('- Payment details:', {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        requestId: payment.requestId?._id
      });
    } else {
      // Try to find payment by different criteria
      console.log('🔍 Searching for payment with alternative methods...');
      const allPayments = await Payment.find({}).limit(5);
      console.log('- Sample payments in DB:', allPayments.map(p => ({ paymentId: p.paymentId, status: p.status })));
    }
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment receipt not found'
      });
    }
    
    // Check authorization - user must be tenant or owner of the request
    const request = payment.requestId;
    if (!request || 
        (request.tenantId._id.toString() !== userId.toString() && 
         request.ownerId._id.toString() !== userId.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this receipt'
      });
    }
    
    // Prepare receipt data
    const receiptData = {
      receiptId: payment.paymentId,
      paymentId: payment.paymentId,
      transactionId: payment.stripeDetails?.paymentIntentId || payment.stripeDetails?.sessionId || 'N/A',
      paymentStatus: payment.status,
      paymentMethod: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      
      // Request details
      request: {
        requestId: request.requestId,
        requestType: request.requestType,
        status: request.status,
        submittedAt: request.createdAt
      },
      
      // Property details
      property: {
        address: request.propertyId?.address || 'N/A',
        price: request.propertyId?.price || 0,
        description: request.propertyId?.description || 'N/A'
      },
      
      // Tenant details
      tenant: {
        name: request.tenantId?.name || 'N/A',
        email: request.tenantId?.email || 'N/A',
        phone: request.tenantId?.phone || 'N/A'
      },
      
      // Owner details
      owner: {
        name: request.ownerId?.name || 'N/A',
        email: request.ownerId?.email || 'N/A',
        phone: request.ownerId?.phone || 'N/A'
      }
    };
    
    res.status(200).json({
      success: true,
      receiptData,
      message: 'Receipt retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error retrieving receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt'
    });
  }
};

// Long polling functionality removed

module.exports = {
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus,
  uploadPaymentProof,
  updatePaymentStatus,
<<<<<<< Updated upstream
  getReceipt
=======
  getReceipt,
  createInvoicePaymentSession,
  createSubscriptionPaymentSession
>>>>>>> Stashed changes
};