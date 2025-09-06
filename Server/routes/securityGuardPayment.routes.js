const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const JobPost = require('../models/JobPost');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Property = require('../models/Property');
const NotificationService = require('../services/notificationService');
const { getHiredGuardsWithPaymentDetails, generateMonthlyInvoice, handlePaymentSuccess, getPaymentReceipt, getGuardPaymentNotifications } = require('../controllers/securityGuardPayment.controller');

// Create payment session for security guard
router.post('/create-payment-session', authMiddleware, authorizeRole(['Owner']), async (req, res) => {
  try {
    const { jobPostId, amount, description, frequency = 'monthly', originUrl } = req.body;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    if (!jobPostId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Job post ID and amount are required'
      });
    }

    // Find the job post and verify ownership
    const jobPost = await JobPost.findById(jobPostId)
      .populate('hiredUserId', 'name email')
      .populate('propertyId', 'title address');

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found'
      });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to make payment for this job post'
      });
    }

    if (!jobPost.hiredUserId) {
      return res.status(400).json({
        success: false,
        message: 'No guard has been hired for this job post'
      });
    }

    // Create payment record
    const payment = new Payment({
      type: 'security_guard_payment',
      status: 'pending',
      method: 'stripe',
      amount: parseFloat(amount),
      currency: 'BDT',
      payerId: ownerId,
      payeeId: jobPost.hiredUserId._id,
      propertyId: jobPost.propertyId._id,
      description: description || `Security guard payment for ${jobPost.title}`,
      metadata: {
        jobPostId: jobPost._id,
        frequency: frequency,
        guardName: jobPost.hiredUserId.name,
        propertyTitle: jobPost.propertyId.title
      }
    });

    await payment.save();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd', // Stripe requires USD
          product_data: {
            name: `Security Guard Payment - ${jobPost.title}`,
            description: `Payment to ${jobPost.hiredUserId.name} for security services at ${jobPost.propertyId.title}`
          },
          unit_amount: Math.round((parseFloat(amount) / 120) * 100) // Convert BDT to USD cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${originUrl || process.env.CLIENT_URL}/dashboard/owner/security-guards?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originUrl || process.env.CLIENT_URL}/dashboard/owner/security-guards?payment=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        jobPostId: jobPost._id.toString(),
        guardId: jobPost.hiredUserId._id.toString(),
        ownerId: ownerId.toString(),
        type: 'security_guard_payment',
        amount: amount.toString(),
        currency: 'BDT',
        frequency: frequency
      }
    });

    // Update payment with session ID
    payment.stripeDetails = {
      sessionId: session.id
    };
    await payment.save();

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Error creating security guard payment session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session'
    });
  }
});

// Get payment history for a job post
router.get('/job-post/:jobPostId/payments', authMiddleware, authorizeRole(['Owner']), async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Verify job post ownership
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found'
      });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view payments for this job post'
      });
    }

    // Get payments for this job post
    const payments = await Payment.find({
      'metadata.jobPostId': jobPostId,
      type: 'security_guard_payment'
    })
    .populate('payeeId', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Get payments received by a guard
router.get('/guard/payments', authMiddleware, authorizeRole(['SecurityGuard']), async (req, res) => {
  try {
    const guardId = req.user._id || req.user.userId || req.user.id;

    const payments = await Payment.find({
      payeeId: guardId,
      type: 'security_guard_payment'
    })
    .populate('payerId', 'name email')
    .populate('propertyId', 'title address')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Error fetching guard payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Update payment info for a job post
router.put('/job-post/:jobPostId/payment-info', authMiddleware, authorizeRole(['Owner']), async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const { amount, frequency, nextPaymentDue } = req.body;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found'
      });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update payment info for this job post'
      });
    }

    // Update payment info
    jobPost.paymentInfo = {
      ...jobPost.paymentInfo,
      amount: amount || jobPost.paymentInfo.amount,
      frequency: frequency || jobPost.paymentInfo.frequency,
      nextPaymentDue: nextPaymentDue || jobPost.paymentInfo.nextPaymentDue
    };

    await jobPost.save();

    res.json({
      success: true,
      message: 'Payment info updated successfully',
      paymentInfo: jobPost.paymentInfo
    });

  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment info'
    });
  }
});

// Get hired security guards with payment details for owner's payments section
router.get('/hired-guards', authMiddleware, authorizeRole(['Owner']), getHiredGuardsWithPaymentDetails);

// Generate monthly invoice for security guard salary
router.post('/generate-invoice/:guardJobId', authMiddleware, authorizeRole(['Owner']), generateMonthlyInvoice);

// Handle successful payment and generate receipt
router.post('/payment-success/:sessionId', authMiddleware, authorizeRole(['Owner']), handlePaymentSuccess);

// Get payment receipt
router.get('/receipt/:paymentId', authMiddleware, authorizeRole(['Owner', 'SecurityGuard']), getPaymentReceipt);

// Get security guard payment notifications and receipts
router.get('/guard/notifications', authMiddleware, authorizeRole(['SecurityGuard']), getGuardPaymentNotifications);

module.exports = router;