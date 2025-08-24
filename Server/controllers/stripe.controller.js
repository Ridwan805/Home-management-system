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
    console.log('🔑 Stripe Secret Key exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('🔑 Stripe Publishable Key exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
    console.log('🔑 Testing Stripe connection...');
    
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
    console.log('🔄 Creating payment session - Request ID:', req.params.requestId);
    console.log('🔄 User ID:', req.user.userId || req.user._id || req.user.id);
    console.log('🔄 Request body:', req.body);
    console.log('🔍 About to extract requestId and userId...');
    
    const { requestId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;
    
    console.log('🔍 Variables extracted - requestId:', requestId, 'userId:', userId);
    console.log('🔍 Starting database query for request:', requestId);
    // Find the request with populated property and tenant data
    const request = await Request.findById(requestId)
      .populate('propertyId')
      .populate('tenantId')
      .populate('ownerId');
    console.log('🔍 Database query completed. Request found:', !!request);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Verify the tenant is the one making the payment
    const tenantIdToCompare = request.tenantId._id ? request.tenantId._id.toString() : request.tenantId.toString();
    console.log('🔍 Authorization check - tenantIdToCompare:', tenantIdToCompare);
    console.log('🔍 Authorization check - userId:', userId);
    
    if (tenantIdToCompare !== userId.toString()) {
      console.log('❌ Authorization failed - tenant mismatch');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to make this payment'
      });
    }
    console.log('✅ Authorization passed - tenant matches');

    // Check if payment is already made
    if (request.advancePayment && request.advancePayment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Advance payment has already been made for this request'
      });
    }

    // Verify tenant data is populated
    const tenant = request.tenantId;
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant data not found in request'
      });
    }

    // Use advance payment amount set by owner
    if (!request.advancePayment || !request.advancePayment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Advance payment amount not set by property owner'
      });
    }
    
    let paymentAmount = request.advancePayment.amount;
    
    // Fix for extremely large payment amounts - cap at reasonable maximum
    if (paymentAmount > 1000000) { // Cap at 1 million BDT
      console.log('⚠️ Payment amount too large, capping at 1,000,000 BDT');
      paymentAmount = 1000000;
    }

    // Debug: Log the originUrl being received
    console.log('🔍 Debug - originUrl received:', req.body.originUrl);
    console.log('🔍 Debug - FRONTEND_URL fallback:', process.env.FRONTEND_URL);
    const redirectBaseUrl = req.body.originUrl || process.env.FRONTEND_URL;
    console.log('🔍 Debug - Final redirect base URL:', redirectBaseUrl);

    console.log('💰 Payment amount (BDT):', paymentAmount);
    const usdAmount = Math.round(paymentAmount * 100 / 110);
    console.log('💰 USD amount (cents):', usdAmount);
    
    // Validate USD amount is within Stripe limits (max $999,999.99)
    if (usdAmount > 99999999) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds maximum allowed limit'
      });
    }
    
    // Create Stripe checkout session
    console.log('🔄 Creating Stripe session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
          currency: 'usd', // Changed from 'bdt' to 'usd' as BDT has limited Stripe support
          product_data: {
            name: `Advance Payment for ${request.propertyId?.propertyType || 'Property'} - ${request.propertyId?.address || 'Property'}`,
            description: `Advance payment for ${request.propertyId?.propertyType || 'property'} at ${request.propertyId?.address || 'Property Location'}`
          },
          unit_amount: usdAmount, // Convert BDT to USD (approximate rate 1 USD = 110 BDT) and to cents
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
      success_url: `${redirectBaseUrl}/tenant/request-info?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectBaseUrl}/tenant/request-info?payment_status=cancelled`,
    });
    
    console.log('✅ Stripe session created successfully:', session.id);
    console.log('🔗 Session URL:', session.url);

    // Update request with payment session info
    request.advancePayment = {
      sessionId: session.id,
      amount: paymentAmount,
      status: 'pending',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Set due date to 7 days from now
    };
    await request.save();

    // Create payment record
    await Payment.create({
      requestId: requestId,
      payerId: userId,
      propertyId: request.propertyId._id,
      payeeId: request.ownerId,
      stripeDetails: { sessionId: session.id },
      amount: paymentAmount,
      type: 'advance_payment',
      status: 'pending',
      method: 'stripe',
      description: `Advance Payment for ${request.propertyId?.propertyType || 'Property'} - ${request.propertyId?.address || 'Property'}`,
      createdAt: new Date()
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Error creating payment session:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session: ' + error.message
    });
  }
};

// Create Stripe checkout session for full payment
const createFullPaymentSession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId || req.user._id || req.user.id;

    // Find the request with populated property and tenant data
    const request = await Request.findById(requestId)
      .populate('propertyId')
      .populate('tenantId')
      .populate('ownerId');
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

    // Verify tenant data is populated
    const tenant = request.tenantId;
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant data not found in request'
      });
    }

    // Calculate payment amount (90% of property price)
    const propertyPrice = request.propertyId.price;
    const paymentAmount = Math.round(propertyPrice * 0.9);

    // Debug: Log the originUrl being received
    console.log('🔍 Debug Full Payment - originUrl received:', req.body.originUrl);
    console.log('🔍 Debug Full Payment - FRONTEND_URL fallback:', process.env.FRONTEND_URL);
    const redirectBaseUrl = req.body.originUrl || process.env.FRONTEND_URL;
    console.log('🔍 Debug Full Payment - Final redirect base URL:', redirectBaseUrl);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
          currency: 'usd', // Changed from 'bdt' to 'usd' as BDT has limited Stripe support
          product_data: {
            name: `Full Payment for ${request.propertyId?.propertyType || 'Property'} - ${request.propertyId?.address || 'Property'}`,
            description: `Remaining 90% payment for ${request.propertyId?.propertyType || 'property'} at ${request.propertyId?.address || 'Property Location'}`
          },
          unit_amount: Math.round(paymentAmount * 100 / 110), // Convert BDT to USD (approximate rate 1 USD = 110 BDT) and to cents
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
      success_url: `${redirectBaseUrl}/tenant/request-info?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectBaseUrl}/tenant/request-info?payment_status=cancelled`,
    });

    // Update request with payment session info
    request.fullPayment = {
      sessionId: session.id,
      amount: paymentAmount,
      status: 'pending',
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
      status: 'pending',
      paymentMethod: 'Card',
      createdAt: new Date()
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
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
    
    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      console.error('Request not found for payment success:', requestId);
      return;
    }
    
    // Update payment status
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
    request.advancePayment.isPaid = true;
    request.isPaid = true; // Set top-level isPaid field
    request.status = 'AdvancePaid';
    
    // Generate a payment ID
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    request.advancePayment.paymentId = paymentId;
    
    await request.save();
    
    // Get payment details from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
    const charge = paymentIntent.charges.data[0];
    
    // Get user details for receipt
    const tenant = await User.findById(tenantId);
    const owner = await User.findById(request.ownerId);
    
    // Generate receipt data with more detailed information
    const receiptData = {
      paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      propertyTitle: request.propertyId ? request.propertyId.title : 'Property',
      propertyAddress: request.propertyId ? (request.propertyId.address || request.propertyId.location) : 'Address not available',
      amount: request.advancePayment.amount,
      currency: 'BDT',
      paymentDate: new Date(),
      paymentMethod: 'Credit/Debit Card',
      paymentStatus: 'Completed',
      transactionId: session.payment_intent,
      receiptUrl: charge.receipt_url,
      paymentType: 'Advance Payment',
      payerName: tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : 'N/A',
      payeeName: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'N/A',
      paymentDescription: `Advance Payment for property purchase request`,
      generatedAt: new Date()
    };
    
    // Find and update the payment record, or create if not found
    let payment = await Payment.findOne({ 'stripeDetails.sessionId': session.id });
    
    if (payment) {
      // Update existing payment record
      payment.status = 'completed';
      payment.paidAt = new Date();
      payment.stripeDetails.paymentIntentId = session.payment_intent;
      payment.stripeDetails.chargeId = charge.id;
      payment.stripeDetails.receiptUrl = charge.receipt_url;
      payment.receiptData = receiptData;
      await payment.save();
      console.log('✅ Payment record updated successfully:', payment._id);
    } else {
      // Create new payment record if not found
      payment = await Payment.create({
        requestId: requestId,
        payerId: tenantId,
        propertyId: request.propertyId._id,
        payeeId: request.ownerId,
        stripeDetails: { 
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          chargeId: charge.id,
          receiptUrl: charge.receipt_url
        },
        amount: request.advancePayment.amount,
        type: 'advance_payment',
        status: 'completed',
        method: 'stripe',
        description: `Advance Payment for ${request.propertyId.title}`,
        paidAt: new Date(),
        receiptData: receiptData
      });
      console.log('✅ New payment record created successfully:', payment._id);
    }
    
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
      message: `Your advance payment of BDT ${request.advancePayment.amount} has been processed successfully. You can download the receipt from your request details.`,
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
    request.fullPayment.status = 'completed';
    request.fullPayment.paidAt = new Date();
    request.isPaid = true; // Set top-level isPaid field
    request.status = 'Paid/Completed';
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

// Generate and download payment receipt
const generateReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Find the payment record
    const payment = await Payment.findOne({ paymentId }).populate('propertyId').populate('payerId').populate('payeeId');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // If Stripe receipt URL is available, redirect to it
    if (payment.stripeDetails && payment.stripeDetails.receiptUrl) {
      return res.status(200).json({
        success: true,
        receiptUrl: payment.stripeDetails.receiptUrl,
        payment: payment
      });
    }
    
    // If receipt data is available, return it
    if (payment.receiptData) {
      return res.status(200).json({
        success: true,
        receiptData: payment.receiptData,
        payment: payment
      });
    }
    
    // If no receipt data is available, generate basic receipt data
    const receiptData = {
      paymentId: payment.paymentId,
      propertyTitle: payment.propertyId ? payment.propertyId.title : 'Property',
      propertyAddress: payment.propertyId ? payment.propertyId.address : 'Address not available',
      amount: payment.amount,
      currency: payment.currency,
      paymentDate: payment.paidAt || payment.createdAt,
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      transactionId: payment.stripeDetails ? payment.stripeDetails.paymentIntentId : ''
    };
    
    return res.status(200).json({
      success: true,
      receiptData: receiptData,
      payment: payment
    });
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
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
    payment.proofUrls.push(proofUrl);
    if (note) {
      payment.notes = note;
    }
    
    // Add to payment history
    payment.history.push({
      status: payment.status,
      timestamp: new Date(),
      note: 'Payment proof uploaded by tenant',
      updatedBy: userId
    });
    
    await payment.save();
    
    // Find the related request
    if (payment.requestId) {
      const request = await Request.findById(payment.requestId);
      if (request) {
        // Update request with payment proof
        if (payment.type === 'advance_payment' && request.advancePayment) {
          request.advancePayment.proofUrl = proofUrl;
          request.status = 'Payment Submitted';
          await request.save();
        }
      }
    }
    
    // Send notification to owner
    await NotificationService.createNotification({
      recipientId: payment.payeeId,
      senderId: userId,
      type: 'payment_proof',
      title: 'Payment Proof Uploaded',
      message: `A payment proof has been uploaded for ${payment.description}. Please review and verify the payment.`,
      relatedId: payment.requestId || payment._id,
      relatedType: payment.requestId ? 'request' : 'payment'
    });
    
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

module.exports = {
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus,
  generateReceipt,
  uploadPaymentProof
};