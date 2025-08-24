const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const { PAYMENT_STATUSES } = require('../models/Payment');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/GuardrailsService');

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

    // Check if payment is already made or cannot pay again
    if (request.advancePayment && (request.advancePayment.status === 'Paid' || !request.advancePayment.canPayAgain)) {
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
<<<<<<< Updated upstream
            currency: 'bdt',
            product_data: {
              name: `Advance Payment for ${request.propertyId.title}`,
              description: `10% advance payment for property at ${request.propertyId.location}`
            },
            unit_amount: paymentAmount * 100, // Convert to cents
=======
          currency: 'usd', // Changed from 'bdt' to 'usd' as BDT has limited Stripe support
          product_data: {
            name: `Advance Payment - ${request.propertyId.propertyType} at ${request.propertyId.address}`,
            description: `Tenant: ${tenant.firstName} ${tenant.lastName} (${tenant.email})\nProperty: ${request.propertyId.address}\nType: ${request.propertyId.propertyType}\nBedrooms: ${request.propertyId.bedrooms}, Bathrooms: ${request.propertyId.bathrooms}\nSize: ${request.propertyId.squareFootage} sq ft\nListing: ${request.propertyId.listingType}\nRequest ID: ${request.requestId}`
>>>>>>> Stashed changes
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: requestId,
        requestNumber: request.requestId,
        tenantId: userId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        tenantEmail: tenant.email,
        propertyId: request.propertyId._id.toString(),
        propertyAddress: request.propertyId.address,
        propertyType: request.propertyId.propertyType,
        requestType: 'advance_payment',
        paymentAmount: paymentAmount.toString(),
        currency: 'BDT'
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=cancelled`,
    });

    // Update request with payment session info
    if (!request.advancePayment) {
      request.advancePayment = {};
    }
    
    request.advancePayment.sessionId = session.id;
    request.advancePayment.stripeSessionId = session.id; // Keep for backward compatibility
    request.advancePayment.amount = paymentAmount;
    request.advancePayment.status = 'pending';
    request.advancePayment.createdAt = new Date();
    request.advancePayment.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Set due date to 7 days from now
    request.advancePayment.canPayAgain = true; // Initially allow payment
    
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
      description: `Advance Payment for ${request.propertyId.title}`,
      createdAt: new Date()
    });

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
<<<<<<< Updated upstream
            currency: 'bdt',
            product_data: {
              name: `Full Payment for ${request.propertyId.title}`,
              description: `Remaining 90% payment for property at ${request.propertyId.location}`
            },
            unit_amount: paymentAmount * 100, // Convert to cents
=======
          currency: 'usd', // Changed from 'bdt' to 'usd' as BDT has limited Stripe support
          product_data: {
            name: `Full Payment - ${request.propertyId.propertyType} at ${request.propertyId.address}`,
            description: `Tenant: ${tenant.firstName} ${tenant.lastName} (${tenant.email})\nProperty: ${request.propertyId.address}\nType: ${request.propertyId.propertyType}\nBedrooms: ${request.propertyId.bedrooms}, Bathrooms: ${request.propertyId.bathrooms}\nSize: ${request.propertyId.squareFootage} sq ft\nListing: ${request.propertyId.listingType}\nRemaining 90% payment\nRequest ID: ${request.requestId}`
>>>>>>> Stashed changes
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: requestId,
        requestNumber: request.requestId,
        tenantId: userId,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        tenantEmail: tenant.email,
        propertyId: request.propertyId._id.toString(),
        propertyAddress: request.propertyId.address,
        propertyType: request.propertyId.propertyType,
        requestType: 'full_payment',
        paymentAmount: paymentAmount.toString(),
        currency: 'BDT'
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/tenant/request-info?payment=cancelled`,
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
// Store processed webhook events to prevent duplicate processing
const processedWebhookEvents = new Set();

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('✅ Webhook signature verified successfully for event:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
<<<<<<< Updated upstream
  // Handle the event
  switch (event.type) {
    case 'billing_portal.configuration.created':
      // Handle billing_portal.configuration.created event
      break;
    case 'billing_portal.configuration.updated':
      // Handle billing_portal.configuration.updated event
      break;
    case 'billing_portal.session.created':
      // Handle billing_portal.session.created event
      break;
    case 'billing.alert.triggered':
      // Handle billing.alert.triggered event
      break;
    case 'billing.credit_balance_transaction.created':
      // Handle billing.credit_balance_transaction.created event
      break;
    case 'billing.credit_grant.created':
      // Handle billing.credit_grant.created event
      break;
    case 'billing.credit_grant.updated':
      // Handle billing.credit_grant.updated event
      break;
    case 'billing.meter.created':
      // Handle billing.meter.created event
      break;
    case 'billing.meter.deactivated':
      // Handle billing.meter.deactivated event
      break;
    case 'billing.meter.reactivated':
      // Handle billing.meter.reactivated event
      break;
    case 'billing.meter.updated':
      // Handle billing.meter.updated event
      break;
    case 'checkout.session.async_payment_failed':
      // Handle checkout.session.async_payment_failed event
      break;
    case 'checkout.session.async_payment_succeeded':
      // Handle checkout.session.async_payment_succeeded event
      break;
    case 'checkout.session.completed':
      const requestType = event.data.object.metadata.requestType || 'advance_payment';
      
      // Process the payment first
      if (requestType === 'full_payment') {
        await handleFullPaymentSuccess(event.data.object);
      } else {
        await handlePaymentSuccess(event.data.object);
      }
      
      // Update the request status in the database to ensure UI reflects payment
      try {
        const { requestId } = event.data.object.metadata;
        if (requestId) {
          const request = await Request.findById(requestId);
          if (request) {
            // Update isPaid flag and payment status
            request.isPaid = true;
            
            if (requestType === 'full_payment') {
              request.status = 'FullyPaid';
              if (request.fullPayment) {
                request.fullPayment.status = 'Paid';
                request.fullPayment.isPaid = true;
                request.fullPayment.canPayAgain = false;
              }
            } else {
              request.status = 'AdvancePaid';
              if (request.advancePayment) {
                request.advancePayment.status = 'Paid';
                request.advancePayment.isPaid = true;
                request.advancePayment.canPayAgain = false;
              }
            }
            
            // Apply guardrails to prevent payment status inconsistencies
            await GuardrailsService.validatePaymentStatus(request);
            
            await request.save();
            console.log(`✅ Request ${requestId} payment status updated successfully`);
          }
        }
      } catch (error) {
        console.error('Error updating request payment status:', error);
      }
      break;
    case 'checkout.session.expired':
      await handlePaymentExpired(event.data.object);
      break;
    case 'invoice.created':
      // Handle invoice.created event
      break;
    case 'invoice.deleted':
      // Handle invoice.deleted event
      break;
    case 'invoice.finalization_failed':
      // Handle invoice.finalization_failed event
      break;
    case 'invoice.finalized':
      // Handle invoice.finalized event
      break;
    case 'invoice.marked_uncollectible':
      // Handle invoice.marked_uncollectible event
      break;
    case 'invoice.paid':
      // Handle invoice.paid event
      const invoice = event.data.object;
      const chargeId = invoice.charge;

      if (chargeId) {
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          const paymentIntentId = charge.payment_intent;

          if (paymentIntentId) {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            const { requestId } = paymentIntent.metadata;

            if (requestId) {
              const request = await Request.findById(requestId);
              if (request) {
                request.isPaid = true;
                request.status = 'Paid/Completed';
                if (request.advancePayment) {
                  request.advancePayment.status = 'Paid';
                  request.advancePayment.isPaid = true;
                  request.advancePayment.canPayAgain = false;
                }
                if (request.fullPayment) {
                  request.fullPayment.status = 'completed';
                }
                await request.save();
                console.log(`✅ Request ${requestId} updated to Paid/Completed based on invoice.paid event`);
              }
            }
          }
        } catch (error) {
          console.error('Error handling invoice.paid event:', error);
        }
      }
      break;
    case 'invoice.payment_action_required':
      // Handle invoice.payment_action_required event
      break;
    case 'invoice.payment_failed':
      // Handle invoice.payment_failed event
      const failedInvoice = event.data.object;
      const failedChargeId = failedInvoice.charge;

      if (failedChargeId) {
        try {
          const failedCharge = await stripe.charges.retrieve(failedChargeId);
          const failedPaymentIntentId = failedCharge.payment_intent;

          if (failedPaymentIntentId) {
            const failedPaymentIntent = await stripe.paymentIntents.retrieve(failedPaymentIntentId);
            const { requestId } = failedPaymentIntent.metadata;

            if (requestId) {
              const request = await Request.findById(requestId);
              if (request) {
                if (request.advancePayment) {
                  request.advancePayment.status = 'failed';
                }
                if (request.fullPayment) {
                  request.fullPayment.status = 'failed';
                }
                await request.save();
                console.log(`✅ Request ${requestId} payment status updated to failed based on invoice.payment_failed event`);
              }
            }
          }
        } catch (error) {
          console.error('Error handling invoice.payment_failed event:', error);
        }
      }
      break;
    case 'invoice.payment_succeeded':
      // Handle invoice.payment_succeeded event
      break;
    case 'invoice.sent':
      // Handle invoice.sent event
      break;
    case 'invoice.upcoming':
      // Handle invoice.upcoming event
      break;
    case 'invoice.updated':
      // Handle invoice.updated event
      break;
    case 'invoice.voided':
      // Handle invoice.voided event
      break;
    case 'invoiceitem.created':
      // Handle invoiceitem.created event
      break;
    case 'invoiceitem.deleted':
      // Handle invoiceitem.deleted event
      break;
    case 'payment_intent.amount_capturable_updated':
      // Handle payment_intent.amount_capturable_updated event
      break;
    case 'payment_intent.canceled':
      // Handle payment_intent.canceled event
      break;
    case 'payment_intent.created':
      // Handle payment_intent.created event
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'payment_intent.partially_funded':
      // Handle payment_intent.partially_funded event
      break;
    case 'payment_intent.processing':
      // Handle payment_intent.processing event
      break;
    case 'payment_intent.requires_action':
      // Handle payment_intent.requires_action event
      break;
    case 'payment_intent.succeeded':
      // Handle payment_intent.succeeded event
      const paymentIntent = event.data.object;
      const { requestId } = paymentIntent.metadata;

      if (requestId) {
        try {
          const request = await Request.findById(requestId);
          if (request) {
            request.isPaid = true;
            request.status = 'Paid/Completed';
            if (request.advancePayment) {
              request.advancePayment.status = 'Paid';
              request.advancePayment.isPaid = true;
              request.advancePayment.canPayAgain = false;
            }
            if (request.fullPayment) {
              request.fullPayment.status = 'completed';
            }
            await request.save();
            console.log(`✅ Request ${requestId} updated to Paid/Completed based on payment_intent.succeeded event`);
          }
        } catch (error) {
          console.error('Error handling payment_intent.succeeded event:', error);
        }
      }
      break;
    case 'payment_link.created':
      // Handle payment_link.created event
      break;
    case 'payment_link.updated':
      // Handle payment_link.updated event
      break;
    case 'payment_method.attached':
      // Handle payment_method.attached event
      break;
    case 'payment_method.automatically_updated':
      // Handle payment_method.automatically_updated event
      break;
    case 'payment_method.detached':
      // Handle payment_method.detached event
      break;
    case 'payment_method.updated':
      // Handle payment_method.updated event
      break;
    case 'payout.canceled':
      // Handle payout.canceled event
      break;
    case 'payout.created':
      // Handle payout.created event
      break;
    case 'payout.failed':
      // Handle payout.failed event
      break;
    case 'payout.paid':
      // Handle payout.paid event
      break;
    case 'payout.reconciliation_completed':
      // Handle payout.reconciliation_completed event
      break;
    case 'payout.updated':
      // Handle payout.updated event
      break;
    case 'refund.created':
      // Handle refund.created event
      break;
    case 'refund.failed':
      // Handle refund.failed event
      break;
    case 'refund.updated':
      // Handle refund.updated event
      break;
    case 'subscription_schedule.aborted':
      // Handle subscription_schedule.aborted event
      break;
    case 'subscription_schedule.canceled':
      // Handle subscription_schedule.canceled event
      break;
    case 'subscription_schedule.completed':
      // Handle subscription_schedule.completed event
      break;
    case 'subscription_schedule.created':
      // Handle subscription_schedule.created event
      break;
    case 'subscription_schedule.expiring':
      // Handle subscription_schedule.expiring event
      break;
    case 'subscription_schedule.released':
      // Handle subscription_schedule.released event
      break;
    case 'subscription_schedule.updated':
      // Handle subscription_schedule.updated event
      break;
    case 'transfer.created':
      // Handle transfer.created event
      break;
    case 'transfer.reversed':
      // Handle transfer.reversed event
      break;
    case 'transfer.updated':
      // Handle transfer.updated event
      break;
    case 'charge.captured':
      // Handle charge.captured event
      break;
    case 'charge.expired':
      // Handle charge.expired event
      break;
    case 'charge.failed':
      // Handle charge.failed event
      break;
    case 'charge.pending':
      // Handle charge.pending event
      break;
    case 'charge.refunded':
      // Handle charge.refunded event
      break;
    case 'charge.succeeded':
      // Handle charge.succeeded event
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const { requestId } = paymentIntent.metadata;

          if (requestId) {
            const request = await Request.findById(requestId);
            if (request) {
              request.isPaid = true;
              request.status = 'Paid/Completed';
              if (request.advancePayment) {
                request.advancePayment.status = 'Paid';
                request.advancePayment.isPaid = true;
                request.advancePayment.canPayAgain = false;
              }
              if (request.fullPayment) {
                request.fullPayment.status = 'completed';
              }
              await request.save();
              console.log(`✅ Request ${requestId} updated to Paid/Completed based on charge.succeeded event`);
            }
          }
        } catch (error) {
          console.error('Error handling charge.succeeded event:', error);
        }
      }
      break;
    case 'charge.failed':
      // Handle charge.failed event
      const failedCharge = event.data.object;
      const failedPaymentIntentId = failedCharge.payment_intent;

      if (failedPaymentIntentId) {
        try {
          const failedPaymentIntent = await stripe.paymentIntents.retrieve(failedPaymentIntentId);
          const { requestId } = failedPaymentIntent.metadata;

          if (requestId) {
            const request = await Request.findById(requestId);
            if (request) {
              if (request.advancePayment) {
                request.advancePayment.status = 'failed';
              }
              if (request.fullPayment) {
                request.fullPayment.status = 'failed';
              }
              await request.save();
              console.log(`✅ Request ${requestId} payment status updated to failed based on charge.failed event`);
            }
          }
        } catch (error) {
          console.error('Error handling charge.failed event:', error);
        }
      }
      break;
    case 'charge.updated':
      // Handle charge.updated event
      break;
    case 'charge.dispute.closed':
      // Handle charge.dispute.closed event
      break;
    case 'charge.dispute.created':
      // Handle charge.dispute.created event
      break;
    case 'charge.dispute.funds_reinstated':
      // Handle charge.dispute.funds_reinstated event
      break;
    case 'charge.dispute.funds_withdrawn':
      // Handle charge.dispute.funds_withdrawn event
      break;
    case 'charge.dispute.updated':
      // Handle charge.dispute.updated event
      break;
    case 'charge.refund.updated':
      // Handle charge.refund.updated event
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
=======
  // Implement idempotency - check if we've already processed this event
  if (processedWebhookEvents.has(event.id)) {
    console.log('⚠️ Webhook event already processed, skipping:', event.id);
    return res.json({ received: true, status: 'already_processed' });
>>>>>>> Stashed changes
  }
  
  try {
    console.log('🔄 Processing webhook event:', event.type, 'ID:', event.id);
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const requestType = event.data.object.metadata.requestType || 'advance_payment';
        console.log('💳 Processing checkout.session.completed for:', requestType);
        if (requestType === 'full_payment') {
          await handleFullPaymentSuccess(event.data.object);
        } else {
          await handlePaymentSuccess(event.data.object);
        }
        break;
      case 'checkout.session.expired':
        console.log('⏰ Processing checkout.session.expired');
        await handlePaymentExpired(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        console.log('❌ Processing payment_intent.payment_failed');
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`⚠️ Unhandled event type ${event.type}`);
    }
    
    // Mark event as processed
    processedWebhookEvents.add(event.id);
    
    // Clean up old processed events (keep only last 1000 to prevent memory leaks)
    if (processedWebhookEvents.size > 1000) {
      const eventsArray = Array.from(processedWebhookEvents);
      processedWebhookEvents.clear();
      eventsArray.slice(-500).forEach(id => processedWebhookEvents.add(id));
    }
    
    console.log('✅ Webhook event processed successfully:', event.id);
    res.json({ received: true, status: 'processed' });
    
  } catch (error) {
    console.error('❌ Error processing webhook event:', event.id, error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Don't mark as processed if there was an error
    res.status(500).json({ 
      received: false, 
      error: 'Internal server error processing webhook',
      eventId: event.id 
    });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (session) => {
  const mongoose = require('mongoose');
  const sessionDb = await mongoose.startSession();
  
  try {
    await sessionDb.startTransaction();
    
<<<<<<< Updated upstream
    const request = await Request.findById(requestId);
    if (!request) {
      console.error('Request not found for payment success:', requestId);
=======
    const { requestId, tenantId } = session.metadata;
    console.log('🔄 Processing payment success for request:', requestId, 'tenant:', tenantId);
    
    // Check if payment already exists to prevent duplicates
    const existingPayment = await Payment.findOne({ 
      'stripeDetails.sessionId': session.id 
    }).session(sessionDb);
    
    if (existingPayment) {
      console.log('⚠️ Payment already exists for session:', session.id, 'Payment ID:', existingPayment._id);
      await sessionDb.abortTransaction();
      return;
    }
    
    const request = await Request.findById(requestId)
      .populate('propertyId')
      .session(sessionDb);
      
    if (!request) {
      console.error('❌ Request not found for payment success:', requestId);
      await sessionDb.abortTransaction();
      return;
    }
    
    // Check if payment is already marked as paid to prevent duplicate processing
    if (request.advancePayment && request.advancePayment.status === 'Paid') {
      console.log('⚠️ Request already marked as paid:', requestId);
      await sessionDb.abortTransaction();
      return;
    }
    
    // Update payment status with validation
    if (!request.advancePayment) {
      console.error('❌ No advance payment configuration found for request:', requestId);
      await sessionDb.abortTransaction();
>>>>>>> Stashed changes
      return;
    }
    
    request.advancePayment.status = 'Paid';
    request.advancePayment.paidAt = new Date();
<<<<<<< Updated upstream
    request.status = 'AdvancePaid';
=======
    request.advancePayment.isPaid = true;
<<<<<<< Updated upstream
    request.advancePayment.canPayAgain = false; // Prevent duplicate payments
=======
    request.advancePayment.stripeSessionId = session.id;
>>>>>>> Stashed changes
    request.isPaid = true; // Set top-level isPaid field
    request.status = 'AdvancePaid';
    
    // Ensure the payment status is properly set for UI display
    console.log('✅ Setting payment status to Paid for request:', requestId);
    
    // Generate a payment ID
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    request.advancePayment.paymentId = paymentId;
    
<<<<<<< Updated upstream
>>>>>>> Stashed changes
    await request.save();
=======
    await request.save({ session: sessionDb });
    console.log('✅ Request updated successfully:', requestId);
>>>>>>> Stashed changes
    
    // Get payment details from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
    const charge = paymentIntent.charges.data[0];
    
    // Generate receipt data with more detailed information
    const receiptData = {
      paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      propertyTitle: request.propertyId ? request.propertyId.title : 'Property',
      propertyAddress: request.propertyId ? request.propertyId.address : 'Address not available',
      amount: request.advancePayment.amount,
      currency: 'BDT',
      paymentDate: new Date(),
      paymentMethod: 'Credit/Debit Card',
      paymentStatus: 'Completed',
      transactionId: session.payment_intent,
      receiptUrl: charge.receipt_url,
      paymentType: 'Advance Payment',
      payerName: await User.findById(tenantId).then(user => user.name),
      payeeName: await User.findById(request.ownerId).then(user => user.name),
      paymentDescription: `Advance Payment for property purchase request`,
      generatedAt: new Date()
    };
    
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    // Update payment record with receipt information
    await Payment.findOneAndUpdate(
      { 'stripeDetails.sessionId': session.id },
      { 
        status: 'completed',
=======
    // Find and update the payment record, or create if not found
    let payment = await Payment.findOne({ 'stripeDetails.sessionId': session.id });
    
    if (payment) {
      // Update existing payment record
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.stripeDetails.paymentIntentId = session.payment_intent;
      payment.stripeDetails.chargeId = charge.id;
      payment.stripeDetails.receiptUrl = charge.receipt_url;
      payment.receiptData = receiptData;
      
      // Add to payment history
      if (!payment.history) payment.history = [];
      payment.history.push({
        status: 'paid',
        timestamp: new Date(),
        note: 'Payment completed successfully via Stripe',
        metadata: { 
          paymentIntentId: session.payment_intent,
          receiptUrl: charge.receipt_url 
        }
      });
      
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
        status: 'paid',
        method: 'stripe',
        description: `Advance Payment for ${request.propertyId.title}`,
>>>>>>> Stashed changes
        paidAt: new Date(),
        'stripeDetails.paymentIntentId': session.payment_intent,
        'stripeDetails.chargeId': charge.id,
        'stripeDetails.receiptUrl': charge.receipt_url,
        receiptData: receiptData,
        receiptGenerated: true,
        receiptGeneratedAt: new Date()
      }
    );
=======
    // Create new payment record within the transaction
    const payment = await Payment.create([{
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
    }], { session: sessionDb });
    
    console.log('✅ New payment record created successfully:', payment[0]._id);
>>>>>>> Stashed changes
    
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
    
    // Commit the transaction
    await sessionDb.commitTransaction();
    console.log('✅ Advance payment processed successfully for request:', requestId);
    
  } catch (error) {
    // Rollback the transaction on error
    await sessionDb.abortTransaction();
    console.error('❌ Error processing payment success:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Re-throw the error so webhook handler can catch it
    throw error;
  } finally {
    // End the session
    await sessionDb.endSession();
  }
};

// Handle successful full payment
const handleFullPaymentSuccess = async (session) => {
  const mongoose = require('mongoose');
  const sessionDb = await mongoose.startSession();
  
  try {
    await sessionDb.startTransaction();
    
    const { requestId, tenantId } = session.metadata;
    console.log('🔄 Processing full payment success for request:', requestId, 'tenant:', tenantId);
    
    // Check if payment already exists to prevent duplicates
    const existingPayment = await Payment.findOne({ 
      'stripeDetails.sessionId': session.id 
    }).session(sessionDb);
    
    if (existingPayment) {
      console.log('⚠️ Full payment already exists for session:', session.id, 'Payment ID:', existingPayment._id);
      await sessionDb.abortTransaction();
      return;
    }
    
    const request = await Request.findById(requestId)
      .populate('propertyId')
      .session(sessionDb);
      
    if (!request) {
      console.error('❌ Request not found for full payment success:', requestId);
      await sessionDb.abortTransaction();
      return;
    }
    
    // Check if full payment is already completed
    if (request.fullPayment && request.fullPayment.status === 'completed') {
      console.log('⚠️ Request full payment already completed:', requestId);
      await sessionDb.abortTransaction();
      return;
    }
    
    // Update full payment status with validation
    if (!request.fullPayment) {
      console.error('❌ No full payment configuration found for request:', requestId);
      await sessionDb.abortTransaction();
      return;
    }
    
<<<<<<< Updated upstream
    // Update payment status
    request.fullPayment.status = 'Paid';
    request.fullPayment.paidAt = new Date();
    request.status = 'FullyPaid';
    
    // Add isPaid flag to fullPayment object for UI consistency
    if (!request.fullPayment.isPaid) {
      request.fullPayment.isPaid = true;
    }
    
    // Prevent duplicate payments
    if (request.fullPayment.canPayAgain !== false) {
      request.fullPayment.canPayAgain = false;
    }
    
    console.log('✅ Setting full payment status to Paid for request:', requestId);
    await request.save();
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { sessionId: session.id },
      { 
        status: 'paid',
        paidAt: new Date(),
        transactionId: session.payment_intent
      }
    );
=======
    request.fullPayment.status = 'completed';
    request.fullPayment.paidAt = new Date();
    request.fullPayment.stripeSessionId = session.id;
    request.isPaid = true; // Set top-level isPaid field
    request.status = 'Paid/Completed';
    
    await request.save({ session: sessionDb });
    console.log('✅ Request full payment updated successfully:', requestId);
    
    // Get payment details from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
    const charge = paymentIntent.charges.data[0];
    
    // Get user details for receipt
    const tenant = await User.findById(tenantId);
    const owner = await User.findById(request.ownerId);
    
    // Generate receipt data
    const receiptData = {
      paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      propertyTitle: request.propertyId ? request.propertyId.title : 'Property',
      propertyAddress: request.propertyId ? (request.propertyId.address || request.propertyId.location) : 'Address not available',
      amount: request.fullPayment.amount,
      currency: 'BDT',
      paymentDate: new Date(),
      paymentMethod: 'Credit/Debit Card',
      paymentStatus: 'Completed',
      transactionId: session.payment_intent,
      receiptUrl: charge.receipt_url,
      paymentType: 'Full Payment',
      payerName: tenant ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() : 'N/A',
      payeeName: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'N/A',
      paymentDescription: `Full Payment for property purchase request`,
      generatedAt: new Date()
    };
    
    // Create new payment record within the transaction
    const payment = await Payment.create([{
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
      amount: request.fullPayment.amount,
      type: 'full_payment',
      status: 'completed',
      method: 'stripe',
      description: `Full Payment for ${request.propertyId.title}`,
      paidAt: new Date(),
      receiptData: receiptData
    }], { session: sessionDb });
    
    console.log('✅ New full payment record created successfully:', payment[0]._id);
>>>>>>> Stashed changes
    
    // Update property status
    await Property.findByIdAndUpdate(
      request.propertyId._id,
      { status: 'Sold', soldTo: tenantId, soldAt: new Date() },
      { session: sessionDb }
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
    
    // Commit the transaction
    await sessionDb.commitTransaction();
    console.log('✅ Full payment processed successfully for request:', requestId);
    
  } catch (error) {
    // Rollback the transaction on error
    await sessionDb.abortTransaction();
    console.error('❌ Error processing full payment success:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Re-throw the error so webhook handler can catch it
    throw error;
  } finally {
    // End the session
    await sessionDb.endSession();
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

/**
 * Update payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, note } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }
    
    if (!status || !PAYMENT_STATUSES.includes(status.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${PAYMENT_STATUSES.join(', ')}` 
      });
    }
    
    // Find payment by paymentId
    const payment = await Payment.findOne({ paymentId });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Update payment status
    payment.status = status.toLowerCase();
    
    // Add to payment history
    payment.history.push({
      status: status.toLowerCase(),
      timestamp: new Date(),
      note: note || `Payment status updated to ${status}`,
      updatedBy: req.user._id,
      metadata: {}
    });
    
    await payment.save();
    
    return res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        receiptUrl: payment.stripeDetails?.receiptUrl || null
      }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update payment status' });
  }
};

/**
 * Check and update payment status for a request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }
    
    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    // Find payment records for this request
    const payments = await Payment.find({ requestId: request._id });
    
    // Check if any payments are marked as paid
    const hasPaidPayment = payments.some(payment => payment.status === 'paid');
    
    // Update request if there's a paid payment but request is not marked as paid
    if (hasPaidPayment && (!request.isPaid || 
        (request.advancePayment && !request.advancePayment.isPaid) || 
        (request.status !== 'AdvancePaid' && request.status !== 'FullyPaid'))) {
      
      // Determine if it's advance or full payment
      const isFullPayment = payments.some(p => p.type === 'full_payment' && p.status === 'paid');
      
      // Update request status
      request.isPaid = true;
      
      if (isFullPayment) {
        request.status = 'FullyPaid';
        if (request.fullPayment) {
          request.fullPayment.status = 'Paid';
          request.fullPayment.isPaid = true;
          request.fullPayment.canPayAgain = false;
        }
      } else {
        request.status = 'AdvancePaid';
        if (request.advancePayment) {
          request.advancePayment.status = 'Paid';
          request.advancePayment.isPaid = true;
          request.advancePayment.canPayAgain = false;
        }
      }
      
      await request.save();
      console.log(`✅ Request ${requestId} payment status synchronized successfully`);
    }
    
    return res.status(200).json({
      success: true,
      isPaid: request.isPaid,
      status: request.status,
      advancePayment: request.advancePayment,
      fullPayment: request.fullPayment
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
};

module.exports = {
  getPublishableKey,
  createPaymentSession,
  createFullPaymentSession,
  handleWebhook,
  getPaymentStatus,
  generateReceipt,
  uploadPaymentProof,
  updatePaymentStatus,
  checkPaymentStatus
};