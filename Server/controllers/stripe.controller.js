const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');
const PaymentStatusChecker = require('../services/paymentStatusChecker');

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
  
  // Added: High-level webhook reception diagnostics
  try {
    const isBuffer = Buffer.isBuffer(req.body);
    const bodyPreview = isBuffer ? `<buffer:${req.body.length} bytes>` : typeof req.body;
    console.log('🔔 Stripe webhook received', {
      hasSignatureHeader: !!sig,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      bodyType: bodyPreview
    });
  } catch (e) {
    // non-fatal
  }
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook verified', { eventType: event?.type });
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const requestType = event.data.object.metadata.requestType || 'advance_payment';
      console.log('➡️ Processing checkout.session.completed', {
        requestType,
        sessionId: event.data.object.id,
        paymentIntent: event.data.object.payment_intent
      });
      if (requestType === 'full_payment') {
        await handleFullPaymentSuccess(event.data.object);
      } else {
        await handlePaymentSuccess(event.data.object);
      }
      break;
    case 'checkout.session.expired':
      console.log('⚠️ Processing checkout.session.expired', { sessionId: event.data.object.id });
      await handlePaymentExpired(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      console.log('❌ Processing payment_intent.payment_failed', { paymentIntent: event.data.object?.id });
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
    console.log('➡️ handlePaymentSuccess invoked', {
      sessionId: session?.id,
      paymentIntent: session?.payment_intent,
      metadata: session?.metadata
    });
    const { requestId, tenantId } = session.metadata;
    
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for payment success:', requestId);
      return;
    }
    console.log('✅ Found request for advance payment', { requestId: requestId });
    
    // Update payment status on Request
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.paymentIntentId = session.payment_intent;
    request.advancePayment.stripeSessionId = session.id;
    request.advancePayment.isPaid = true;
    // Prevent multiple payments for the same advance
    request.advancePayment.canPayAgain = false;
    
    // Stripe completed -> mark request as AdvancePaid (not Payment Submitted)
    request.status = 'AdvancePaid';
    
    // Add timeline event
    request.timeline.push({
      event: 'Advance payment completed via Stripe',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency}`
    });
    
    await request.save();
    console.log('📝 Request updated post-advance payment', {
      requestId,
      status: request.status,
      advancePaymentStatus: request.advancePayment.status
    });

    // Also update the corresponding Payment record from pending -> completed
    try {
      // Prefer lookup by linked paymentId on the request, fallback to requestId/type
      let payment;
      if (request.advancePayment?.paymentId) {
        payment = await Payment.findOne({ paymentId: request.advancePayment.paymentId });
      }
      if (!payment) {
        payment = await Payment.findOne({ requestId: request._id, type: 'advance_payment' }).sort({ createdAt: -1 });
      }
      if (payment) {
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.amount = request.advancePayment.amount;
        payment.currency = (request.advancePayment.currency || 'BDT').toUpperCase();
        payment.stripeDetails = {
          ...(payment.stripeDetails || {}),
          sessionId: session.id,
          paymentIntentId: session.payment_intent
        };
        await payment.save();
        console.log('💾 Payment record updated', {
          paymentId: payment.paymentId || payment._id?.toString?.(),
          status: payment.status
        });
      } else {
        console.warn('No pending Payment record found to update for request:', request._id.toString());
      }
    } catch (paymentUpdateErr) {
      console.error('Failed updating Payment record on success:', paymentUpdateErr);
    }
    
    console.log('Payment processed successfully for request:', requestId);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle full payment success
const handleFullPaymentSuccess = async (session) => {
  try {
    console.log('➡️ handleFullPaymentSuccess invoked', {
      sessionId: session?.id,
      paymentIntent: session?.payment_intent,
      metadata: session?.metadata
    });
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
    request.status = 'Paid/Completed';
    
    // Add timeline event
    request.timeline.push({
      event: 'Full payment completed',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${amount} ${currency} via Stripe`
    });
    
    await request.save();
    console.log('📝 Request updated post-full payment', {
      requestId,
      status: request.status,
      fullPaymentStatus: request.fullPayment.status
    });
    
    console.log('Full payment processed successfully for request:', requestId);
    
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

// Check payment status from Stripe
const checkPaymentStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;
    
    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is authorized
    if (request.tenantId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check this payment status'
      });
    }
    
    let paymentStatus = {
      advancePayment: {
        status: request.advancePayment?.status || 'not_started',
        amount: request.advancePayment?.amount || 0,
        sessionId: request.advancePayment?.stripeSessionId || null, // expose as sessionId for FE
        stripeSessionId: request.advancePayment?.stripeSessionId || null
      }
    };
    
    // If there's a Stripe session ID, check with Stripe
    if (request.advancePayment?.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(request.advancePayment.stripeSessionId);
        paymentStatus.advancePayment.stripeStatus = session.payment_status;
        
        // Update local status if Stripe shows paid
        if (session.payment_status === 'paid' && request.advancePayment.status !== 'Paid') {
          request.advancePayment.status = 'Paid';
          request.advancePayment.paidAt = new Date();
          request.advancePayment.paymentIntentId = session.payment_intent || request.advancePayment.paymentIntentId;
          request.advancePayment.isPaid = true;
          request.advancePayment.canPayAgain = false;
          request.status = 'AdvancePaid';

          // Update corresponding Payment document if present
          try {
            let payment;
            if (request.advancePayment?.paymentId) {
              payment = await Payment.findOne({ paymentId: request.advancePayment.paymentId });
            }
            if (!payment) {
              payment = await Payment.findOne({ requestId: request._id, type: 'advance_payment' }).sort({ createdAt: -1 });
            }
            if (payment) {
              payment.status = 'completed';
              payment.paidAt = new Date();
              payment.amount = request.advancePayment.amount;
              payment.currency = (request.advancePayment.currency || 'BDT').toUpperCase();
              payment.stripeDetails = {
                ...(payment.stripeDetails || {}),
                sessionId: request.advancePayment.stripeSessionId,
                paymentIntentId: session.payment_intent || payment.stripeDetails?.paymentIntentId
              };
              await payment.save();
            }
          } catch (pe) {
            console.error('Error syncing Payment record during status check:', pe);
          }

          await request.save();
          paymentStatus.advancePayment.status = 'Paid';
        }
      } catch (stripeError) {
        console.error('Error checking Stripe session:', stripeError);
      }
    }
    
    res.status(200).json({
      success: true,
      paymentStatus
    });
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
};

// Check all pending payments (fallback for webhook failures)
const checkPendingPayments = async (req, res) => {
  try {
    console.log('🔍 Manual payment status check initiated by user:', req.user.userId);
    
    const result = await PaymentStatusChecker.checkPendingPayments();
    
    res.status(200).json({
      success: true,
      message: `Checked ${result.checked} pending payments`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error checking pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check pending payments: ' + error.message
    });
  }
};

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

module.exports = {
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus,
  uploadPaymentProof,
  updatePaymentStatus,
  checkPaymentStatus,
  checkPendingPayments,
  getReceipt
};