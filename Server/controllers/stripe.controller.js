let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('❌ Failed to initialize Stripe client:', e && e.message ? e.message : e);
    stripe = null;
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe features are disabled.');
}
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Rent = require('../models/Rent');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');
const PaymentStatusChecker = require('../services/paymentStatusChecker');
const PaymentService = require('../services/paymentService');
const InvoiceService = require('../services/invoiceService');
const stripePaymentService = require('../services/stripePaymentService');
// Long polling functionality removed

// Get Stripe publishable key
const getPublishableKey = async (req, res) => {
  try {
    if (!stripe) {
      console.warn('⚠️ Stripe client not initialized when requesting publishable key');
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }

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
    const { originUrl } = req.body;
    const userId = req.user.userId;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const purpose = request.requestType === 'Buy' ? 'PURCHASE_BOOKING_DEPOSIT' : 'RENTAL_ADVANCE';

    const result = await stripePaymentService.createPaymentSession({
      purpose,
      requestId,
      userId,
      customerEmail: req.user.email,
      reqOrigin: originUrl || req.headers.origin
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error creating advance payment session:', error?.message || error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create payment session'
    });
  }
};

// Create Stripe checkout session for full payment
const createFullPaymentSession = async (req, res) => {
  let userId, amount, currency; // Declare variables outside try block for catch block access
  
  try {
    const { requestId } = req.params;
    const { amount: providedAmount, currency: providedCurrency = 'BDT', originUrl } = req.body;
    userId = req.user.userId;
    
    console.log('🔄 Creating full payment session...');
    console.log('🧭 createFullPaymentSession called', { requestId, userId, providedAmount, providedCurrency });
    
    console.log('🔄 STRIPE CONTROLLER: Creating FULL payment session for:', { requestId, userId });
    console.log('🔑 Stripe keys check:', {
      secretKeyExists: !!process.env.STRIPE_SECRET_KEY,
      secretKeyLength: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0,
      publishableKeyExists: !!process.env.STRIPE_PUBLISHABLE_KEY,
      frontendUrlExists: !!process.env.FRONTEND_URL
    });
    
    // Validate Stripe API key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is missing');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment service configuration error',
        error: 'STRIPE_NOT_CONFIGURED'
      });
    }

    // Validate input parameters
    if (!requestId) {
      console.error('❌ Request ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Request ID is required',
        error: 'MISSING_REQUEST_ID'
      });
    }

    if (!userId) {
      console.error('❌ User ID is missing from token');
      return res.status(401).json({
        success: false,
        message: 'Authentication failed - user ID not found',
        error: 'MISSING_USER_ID'
      });
    }

    console.log('🔍 Looking for request with ID:', requestId);
    console.log('🔍 User ID from token:', userId);

    // Find the request and populate necessary fields
    const request = await Request.findById(requestId)
      .populate('propertyId', 'address price listingType ownerId pricing buyPrice rent')
      .populate('tenantId')
      .populate('ownerId', 'firstName lastName email');

    if (!request) {
      console.error('❌ Request not found:', requestId);
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found',
        error: 'REQUEST_NOT_FOUND'
      });
    }

    console.log('📋 Found request:', {
      id: request._id,
      status: request.status,
      requestType: request.requestType,
      tenantId: request.tenantId?._id,
      propertyListingType: request.propertyId?.listingType,
      advancePayment: request.advancePayment,
      fullPayment: request.fullPayment
    });

    // Verify the user is the tenant of this request
    if (request.tenantId._id.toString() !== userId) {
      console.error('❌ User is not the tenant of this request');
      console.error('❌ Request tenant ID:', request.tenantId._id.toString());
      console.error('❌ User ID:', userId);
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: You are not the tenant of this request',
        error: 'UNAUTHORIZED_USER'
      });
    }

    // Check if the property is for sale
    if (request.propertyId.listingType !== 'For Sale') {
      console.error('❌ Property is not for sale:', request.propertyId.listingType);
      return res.status(400).json({
        success: false,
        message: 'Full payment is only available for properties listed for sale',
        error: 'INVALID_PROPERTY_TYPE'
      });
    }

    // Check if the request status is 'Confirmed for Sale'
    if (request.status !== 'Confirmed for Sale') {
      console.error('❌ Request status is not "Confirmed for Sale":', request.status);
      return res.status(400).json({
        success: false,
        message: `Full payment can only be made after the owner confirms the sale. Current status: ${request.status}`,
        error: 'INVALID_REQUEST_STATUS'
      });
    }

    // Check if advance payment has been made
    if (!request.advancePayment || !request.advancePayment.isPaid) {
      console.error('❌ Advance payment not completed');
      return res.status(400).json({
        success: false,
        message: 'Advance payment must be completed before making full payment',
        error: 'ADVANCE_PAYMENT_REQUIRED'
      });
    }

    // Check if full payment has already been made
    if (request.fullPayment && request.fullPayment.isPaid) {
      console.error('❌ Full payment already completed');
      return res.status(400).json({
        success: false,
        message: 'Full payment has already been completed for this request',
        error: 'FULL_PAYMENT_ALREADY_COMPLETED'
      });
    }

    // Enhanced validation using GuardrailsService
    try {
      console.log('🛡️ Running full payment validations...');
      
      // Validate full payment eligibility
      const eligibilityValidation = await GuardrailsService.validateFullPaymentEligibility(request);
      if (!eligibilityValidation.isValid) {
        console.error('❌ Full payment eligibility validation failed:', eligibilityValidation.errors);
        return res.status(400).json({
          success: false,
          message: eligibilityValidation.errors.join(', '),
          error: 'ELIGIBILITY_VALIDATION_FAILED'
        });
      }
      
      // Validate user authorization
      const authValidation = await GuardrailsService.validateFullPaymentAuthorization(userId, request);
      if (!authValidation.isValid) {
        console.error('❌ Full payment authorization validation failed:', authValidation.errors);
        return res.status(403).json({
          success: false,
          message: authValidation.errors.join(', '),
          error: 'AUTHORIZATION_VALIDATION_FAILED'
        });
      }
      
      console.log('✅ All full payment validations passed');
    } catch (validationError) {
      console.error('❌ Error during full payment validation:', validationError.message);
      return res.status(500).json({
        success: false,
        message: 'Validation service error',
        error: 'VALIDATION_SERVICE_ERROR'
      });
    }

    // Determine amount and currency for full payment (only for sale properties)
    // Calculate remaining amount: sale price - advance payment amount
    const salePrice = Number(request.propertyId?.pricing?.sale) || 0;
    const advanceAmount = Number(request.advancePayment?.amount) || 0;
    amount = salePrice - advanceAmount;
    
    console.log('🧮 Calculating full payment amount for sale property:', {
      salePrice,
      advanceAmount,
      calculatedAmount: amount,
      listingType: request.propertyId?.listingType,
      pricingData: request.propertyId?.pricing
    });
    
    // Use BDT as the primary currency for full payments
    currency = 'BDT';
    
    // Convert BDT to USD for Stripe checkout (1 USD = 120 BDT)
    const bdtToUsdRate = 120;
    const amountInUsd = amount / bdtToUsdRate;
    
    console.log('🧮 Full payment details:', { 
      amount, 
      currency, 
      amountInUsd, 
      bdtToUsdRate 
    });

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid full payment amount' });
    }

    // Note: Amount validation is handled in the comprehensive validation below

    // Use USD amount for Stripe (convert to cents)
    const amountInCents = Math.round(amountInUsd * 100);

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



    // Use the originUrl from the request body if provided, otherwise fall back to FRONTEND_URL
    const frontendUrl = req.body.originUrl || process.env.FRONTEND_URL;
    
    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        error: 'FRONTEND_URL_NOT_CONFIGURED',
        message: 'Frontend URL is not configured. Please set FRONTEND_URL environment variable.'
      });
    }
    console.log('🔗 Using frontend URL for redirects:', frontendUrl);
    
    const successUrl = `${frontendUrl}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/tenant/request-info?payment=cancelled`;
    
    console.log('🔗 Stripe session URLs:', { successUrl, cancelUrl });

    // Final comprehensive validation before creating Stripe session
    try {
      const comprehensiveValidation = await GuardrailsService.validateFullPayment(userId, requestId, request.propertyId._id, request, request.propertyId);
      if (!comprehensiveValidation.isValid) {
        console.error('❌ Comprehensive full payment validation failed:', comprehensiveValidation.errors);
        return res.status(400).json({
          success: false,
          message: comprehensiveValidation.errors.join(', '),
          error: 'COMPREHENSIVE_VALIDATION_FAILED'
        });
      }
      console.log('✅ Comprehensive full payment validation passed');
    } catch (comprehensiveValidationError) {
      console.error('❌ Error during comprehensive validation:', comprehensiveValidationError.message);
      return res.status(500).json({
        success: false,
        message: 'Comprehensive validation service error',
        error: 'COMPREHENSIVE_VALIDATION_SERVICE_ERROR'
      });
    }

    // Validate amount against Stripe limits (max $999,999.99 = 99999999 cents)
    const STRIPE_MAX_AMOUNT = 99999999; // $999,999.99 in cents
    if (amountInCents > STRIPE_MAX_AMOUNT) {
      console.error('❌ Amount exceeds Stripe limit:', {
        amountInCents,
        maxAllowed: STRIPE_MAX_AMOUNT,
        amountInDollars: amountInCents / 100,
        maxAllowedInDollars: STRIPE_MAX_AMOUNT / 100
      });
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${(amountInCents / 100).toLocaleString()}) exceeds Stripe's maximum limit of $999,999.99`,
        error: 'AMOUNT_EXCEEDS_STRIPE_LIMIT'
      });
    }

    console.log('🔄 Creating Stripe checkout session with params:', {
      currency: currency.toLowerCase(),
      amount: amountInCents,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail
    });
    
    // Get property name and address for display
    const propertyName = request.propertyId?.name || 'Property';
    const propertyAddress = request.propertyId?.address || 'Address not available';
    const displayName = `${propertyName} - ${propertyAddress}`;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // Stripe checkout uses USD
            product_data: {
              name: `Full Payment - ${displayName}`,
              description: `Amount: ${amount.toLocaleString()} BDT (≈ $${amountInUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        requestId: request._id.toString(),
        tenantId: userId.toString(),
        ownerId: request.ownerId._id.toString(),
        requestType: 'full_payment',
        amount: amount.toString(),
        currency,
        amountInUsd: amountInUsd.toString(),
        bdtToUsdRate: bdtToUsdRate.toString()
      },
      customer_email: customerEmail,
    });

    // Store session id and add timeline event
    // Don't create fullPayment object yet - it will be created after successful payment
    request.timeline.push({
      event: 'Full payment session created',
      actor: userId,
      timestamp: new Date(),
      note: `Amount: ${amount.toLocaleString()} BDT (≈ $${amountInUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`
    });
    await request.save();

    console.log('✅ Full payment checkout session created', { sessionId: session.id, url: session.url });

    return res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❗ Error creating full payment session:', error?.message || error);
    console.error('❗ Error type:', error?.type);
    console.error('❗ Error code:', error?.code);
    console.error('❗ Request ID:', req.params.requestId);
    console.error('❗ User ID:', userId);
    console.error('❗ Amount:', amount);
    console.error('❗ Currency:', currency);
    if (error?.stack) console.error('❗ Error stack:', error.stack);
    if (error?.raw) console.error('❗ Stripe error details:', error.raw);
    
    // Log additional context for debugging
    console.error('❗ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to create full payment session';
    let statusCode = 500;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.type === 'StripeCardError') {
      errorMessage = `Payment error: ${error.message}`;
      statusCode = 400;
      errorCode = 'STRIPE_CARD_ERROR';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Invalid request: ${error.message}`;
      statusCode = 400;
      errorCode = 'STRIPE_INVALID_REQUEST';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable';
      statusCode = 503;
      errorCode = 'STRIPE_API_ERROR';
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Could not connect to payment service';
      statusCode = 503;
      errorCode = 'STRIPE_CONNECTION_ERROR';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment service authentication error';
      statusCode = 500;
      errorCode = 'STRIPE_AUTH_ERROR';
      console.error('❌ Stripe authentication error - check API keys');
    } else if (error.code === 'resource_missing') {
      errorMessage = 'Payment configuration error';
      statusCode = 500;
      errorCode = 'STRIPE_RESOURCE_MISSING';
    } else if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${error.message}`;
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid request ID format';
      statusCode = 400;
      errorCode = 'INVALID_REQUEST_ID';
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      errorMessage = 'Database error occurred';
      statusCode = 500;
      errorCode = 'DATABASE_ERROR';
      console.error('❌ Database error details:', error);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Network connection error';
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout - please try again';
      statusCode = 408;
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message) {
      errorMessage = `Server error: ${error.message}`;
      errorCode = 'SERVER_ERROR';
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        errorType: error.type,
        errorCode: error.code,
        stack: error.stack
      } : undefined
    });
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
        
        const paymentType = sessionData.metadata.type || sessionData.metadata.requestType || 'advance_payment';
        
        if (paymentType === 'security_guard_payment') {
          console.log('🔄 [WEBHOOK] Handling security guard payment...');
          await handleSecurityGuardPaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Security guard payment handled successfully');
        } else {
          console.log('🔄 [WEBHOOK] Processing property payment through centralized StripePaymentService...');
          await stripePaymentService.handlePaymentSuccess(sessionData);
          console.log('✅ [WEBHOOK] Payment handled successfully');
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
    request.advancePayment.canPayAgain = false;

    if (request.offer) {
      request.offer.status = 'Paid';
    }
    if (request.reservation) {
      request.reservation.status = 'Converted';
      request.reservation.convertedAt = new Date();
    }
    
    // Add timeline event
    request.timeline.push({
      event: 'Advance payment completed via Stripe',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency} - Verified successfully`
    });

    // Also update the corresponding Payment record from pending -> completed
    console.log('🔄 [WEBHOOK] Updating Payment record...');
    try {
      let payment;
      if (request.advancePayment?.paymentId) {
        payment = await Payment.findOne({ paymentId: request.advancePayment.paymentId });
      }
      if (!payment) {
        payment = await Payment.findOne({ requestId: request._id, type: 'advance_payment' }).sort({ createdAt: -1 });
      }
      
      if (payment) {
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
        
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: `Advance payment completed via Stripe. Changed from ${oldStatus} to completed.`,
          updatedBy: tenantId
        });
        
        await payment.save();
        console.log('✅ [WEBHOOK] Payment record updated to completed:', payment.paymentId);
      }
    } catch (paymentUpdateErr) {
      console.error('❌ [WEBHOOK] Failed updating Payment record:', paymentUpdateErr.message);
    }
    
    // Tenancy establishment for Rent vs Reservation progression for Buy
    try {
      const property = await Property.findById(request.propertyId);
      if (!property) {
        console.error('❌ [WEBHOOK] Property not found:', request.propertyId);
        await request.save();
        return;
      }

      if (request.requestType === 'Rent') {
        // Core Business Rule: Verified advance payment triggers tenancy activation
        let rent = null;
        if (request.rentId) {
          rent = await Rent.findById(request.rentId);
        }
        if (!rent) {
          rent = await Rent.findOne({ requestId: request._id, status: 'Active' });
        }

        if (!rent) {
          console.log('🏠 [PAYMENT] Activating tenancy upon verified advance payment...');
          const rentAmount = Number(request.offer?.monthlyRent || property.pricing?.rent || property.pricing?.monthlyRent || property.price || request.advancePayment.amount || 0);
          const depositAmount = Number(request.offer?.securityDeposit || request.advancePayment.amount || rentAmount);
          const startDate = request.offer?.startDate ? new Date(request.offer.startDate) : new Date();
          const endDate = request.offer?.endDate ? new Date(request.offer.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
          const noticeDays = Number(request.offer?.noticeDays) || 60;
          const dueDay = Number(request.offer?.dueDay) || 1;
          const currency = (request.offer?.currency || request.advancePayment.currency || 'BDT').toUpperCase();

          rent = new Rent({
            propertyId: property._id,
            ownerId: request.ownerId._id || request.ownerId,
            tenants: [tenantId],
            requestId: request._id,
            term: {
              type: 'fixed',
              startDate,
              endDate,
              noticeDays
            },
            rent: {
              amount: rentAmount,
              currency,
              dueDay,
              graceDays: 5,
              lateFee: { amount: 0, type: 'fixed' }
            },
            securityDeposit: {
              amount: depositAmount,
              held: depositAmount,
              refundedAmount: 0,
              refundStatus: 'none',
              deductions: [],
              refundTransactions: []
            },
            billing: {
              frequency: 'monthly',
              nextInvoiceDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
              autoGenerate: true
            },
            status: 'Active'
          });

          await rent.save();
          console.log('✅ [PAYMENT] Active Rent created:', rent._id);
        }

        request.rentId = rent._id;
        request.status = 'Paid/Completed';
        request.timeline.push({
          event: 'Tenancy Activated',
          actor: tenantId,
          timestamp: new Date(),
          note: `Tenancy active. Security deposit held: ৳${rent.securityDeposit?.amount?.toLocaleString()}.`
        });

        property.status = 'Rented';
        property.currentRentId = rent._id;
        property.rentedAt = new Date();
        if (!property.stateHistory) property.stateHistory = [];
        property.stateHistory.push({
          status: 'Rented',
          timestamp: new Date(),
          note: `Property marked Rented upon advance payment verification for request ${requestId}`,
          updatedBy: tenantId
        });
        await property.save();

        // Generate first monthly rent invoice
        try {
          console.log('🧾 Generating first monthly invoice after advance payment...');
          await InvoiceService.generateFirstMonthlyInvoiceAfterAdvance(request._id);
          console.log('✅ First monthly invoice generated successfully');
        } catch (invoiceErr) {
          console.warn('First invoice generation warning:', invoiceErr.message);
        }
      } else if (request.requestType === 'Buy') {
        // For purchase requests: DO NOT create Rent or rental invoice
        request.status = 'AdvancePaid';
        request.timeline.push({
          event: 'Booking Deposit Paid',
          actor: tenantId,
          timestamp: new Date(),
          note: `Booking deposit received. Property reserved for sale completion.`
        });

        property.status = 'Processing';
        if (!property.stateHistory) property.stateHistory = [];
        property.stateHistory.push({
          status: 'Processing',
          state: 'Processing',
          timestamp: new Date(),
          note: `Property marked Processing upon booking deposit for purchase request ${requestId}`,
          updatedBy: tenantId
        });
        await property.save();
      }
    } catch (activationErr) {
      console.error('❌ [PAYMENT] Error activating tenancy or updating property:', activationErr);
    }

    await request.save();
    
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
    const bdtToUsdRate = parseFloat(session.metadata.bdtToUsdRate || '120');
    const amountInUsd = parseFloat(amount) / bdtToUsdRate;
    request.timeline.push({
      event: 'Full payment completed via Stripe webhook',
      actor: tenantId,
      timestamp: new Date(),
      note: `Amount: ${parseFloat(amount).toLocaleString()} BDT (≈ $${amountInUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD) via Stripe - Processed immediately via webhook`
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
    let payment; // Declare payment variable in wider scope
    try {
      payment = await Payment.findOne({ requestId: request._id, type: 'full_payment' }).sort({ createdAt: -1 });
      
      if (payment) {
        console.log('✅ [WEBHOOK] Found existing Payment record to update:', {
          paymentId: payment.paymentId,
          currentStatus: payment.status
        });
        
        // Update existing payment record
        const oldStatus = payment.status;
        const bdtToUsdRate = parseFloat(session.metadata.bdtToUsdRate || '120');
        const amountInUsd = parseFloat(amount) / bdtToUsdRate;
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.amount = parseFloat(amount);
        payment.currency = 'BDT'; // Always BDT for full payments
        payment.amountInUsd = amountInUsd; // Store USD equivalent
        payment.description = `Full payment for ${request.requestType} request - ${parseFloat(amount).toLocaleString()} BDT (≈ $${amountInUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`;
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
        const bdtToUsdRate = parseFloat(session.metadata.bdtToUsdRate || '120');
        const amountInUsd = parseFloat(amount) / bdtToUsdRate;
        payment = new Payment({
          type: 'full_payment',
          status: 'completed',
          method: 'stripe',
          amount: parseFloat(amount),
          currency: 'BDT', // Always BDT for full payments
          amountInUsd: amountInUsd, // Store USD equivalent
          requestId: request._id,
          propertyId: request.propertyId,
          payerId: tenantId,
          payeeId: request.ownerId,
          description: `Full payment for ${request.requestType} request - ${parseFloat(amount).toLocaleString()} BDT (≈ $${amountInUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`,
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
    
    // Update property status after full payment (Rent objects created only on owner approval)
    try {
      console.log('🏠 [WEBHOOK] Updating property status after full payment...');
      const property = await Property.findById(request.propertyId);
      
      if (property && property.listingType === 'For Rent') {
        // Note: Rent objects are now created only when owner approves the request
        // This webhook only updates the property status after full payment
        console.log('🏠 [WEBHOOK] Updating property status to Rented after full payment...');
        await property.rent(tenantId, null, `Property status updated to Rented after full payment completion for request ${requestId}`);
        console.log('✅ [WEBHOOK] Property status updated to Rented for rental property');
      } else if (property && property.listingType === 'For Sale') {
        console.log('🏠 [WEBHOOK] Processing property sale and ownership transfer...');
        
        // Use the OwnershipTransferService for automatic ownership transfer
        const OwnershipTransferService = require('../services/ownershipTransferService');
        
        try {
          const transferResult = await OwnershipTransferService.processOwnershipTransfer(
            request, 
            session, 
            payment
          );
          
          console.log('✅ [WEBHOOK] Ownership transfer completed successfully:', transferResult);
        } catch (transferError) {
          console.error('❌ [WEBHOOK] Ownership transfer failed:', {
            error: transferError.message,
            stack: transferError.stack,
            requestId,
            propertyId: request.propertyId
          });
          // Don't throw the error to prevent webhook failure, but log it for investigation
        }
      }
    } catch (propertyUpdateErr) {
      console.error('❌ [WEBHOOK] Failed to update property status after full payment:', {
        error: propertyUpdateErr.message,
        stack: propertyUpdateErr.stack,
        requestId,
        propertyId: request.propertyId
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
    const { paymentId, invoiceId, originUrl } = req.body;
    const userId = req.user?.userId;

    if (!paymentId && !invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID or Invoice ID is required'
      });
    }

    const result = await stripePaymentService.createPaymentSession({
      purpose: 'MONTHLY_RENT',
      paymentId,
      invoiceId,
      userId,
      customerEmail: req.user?.email,
      reqOrigin: originUrl || req.headers.origin
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error creating invoice payment session:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create payment session'
    });
  }
};

const verifyPaymentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await stripePaymentService.verifySession(sessionId);
    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    const payment = await Payment.findOne({ stripeSessionId: sessionId });
    if (payment) {
      return res.status(200).json({
        success: true,
        paymentStatus: payment.paymentStatus || payment.status,
        payment
      });
    }
    const session = await stripePaymentService.verifySession(sessionId);
    res.status(200).json({
      success: true,
      paymentStatus: session.payment_status === 'paid' ? 'completed' : 'pending',
      session
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadPaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { proofUrl, note } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (proofUrl) payment.paymentProof = proofUrl;
    if (note) payment.note = note;
    await payment.save();
    res.status(200).json({ success: true, message: 'Payment proof uploaded', payment });
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, note } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    payment.paymentStatus = status;
    payment.status = status;
    if (status === 'completed') payment.paidAt = new Date();
    if (note) payment.note = note;
    await payment.save();
    res.status(200).json({ success: true, message: 'Payment status updated', payment });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId)
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email')
      .populate('propertyId', 'title address city');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.status(200).json({
      success: true,
      receiptData: {
        receiptNumber: payment.receiptNumber || `REC-${payment._id.toString().slice(-6).toUpperCase()}`,
        amount: payment.amount,
        currency: payment.currency || 'BDT',
        paymentDate: payment.paidAt || payment.createdAt,
        paymentMethod: payment.paymentMethod || 'Stripe',
        transactionId: payment.transactionId || payment.stripePaymentIntentId,
        payer: payment.payerId,
        payee: payment.payeeId,
        property: payment.propertyId,
        status: payment.paymentStatus || payment.status
      }
    });
  } catch (error) {
    console.error('Error getting receipt:', error);
    res.status(500).json({ success: false, message: error.message });
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
  getReceipt,
  createInvoicePaymentSession,
  verifyPaymentSession
};