const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const JobPost = require('../models/JobPost');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationUtils');

// Create payment session for hired guard
const createPaymentSession = async (req, res) => {
  try {
    const { jobPostId, amount, description, currency = 'USD', frequency = 'monthly' } = req.body;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Input validation
    if (!jobPostId) {
      return res.status(400).json({ message: 'Job post ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid currency code' });
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'];
    if (!validFrequencies.includes(frequency.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid payment frequency' });
    }

    // Validate job post and ownership
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to make payments for this job post' });
    }

    if (!jobPost.hiredUserId) {
      return res.status(400).json({ message: 'No guard hired for this job post' });
    }

    // Get hired guard details
    const hiredGuard = await User.findById(jobPost.hiredUserId);
    if (!hiredGuard) {
      return res.status(404).json({ message: 'Hired guard not found' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Security Guard Payment - ${hiredGuard.firstName} ${hiredGuard.lastName}`,
              description: description || `Payment for security services at ${jobPost.title}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/owner/security-guards?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/owner/security-guards?payment=cancelled`,
      metadata: {
        type: 'security_guard_payment',
        jobPostId: jobPostId,
        ownerId: ownerId.toString(),
        guardId: jobPost.hiredUserId.toString(),
        amount: amount.toString()
      }
    });

    // Create payment record
    const payment = new Payment({
      paymentId: session.id,
      type: 'security_guard_payment',
      amount: amount,
      currency: 'USD',
      status: 'pending',
      payerId: ownerId,
      payeeId: jobPost.hiredUserId,
      relatedEntity: {
        entityType: 'JobPost',
        entityId: jobPostId
      },
      paymentMethod: 'stripe',
      stripeDetails: {
        sessionId: session.id,
        paymentIntentId: null // Will be updated on webhook
      },
      description: description || `Security guard payment for ${jobPost.title}`
    });

    await payment.save();

    res.json({
      sessionId: session.id,
      url: session.url,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ message: 'Failed to create payment session', error: error.message });
  }
};

// Handle payment for hired guard (direct payment)
const processGuardPayment = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const { amount, description, frequency } = req.body;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Validate job post and ownership
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to make payments for this job post' });
    }

    if (!jobPost.hiredUserId) {
      return res.status(400).json({ message: 'No guard hired for this job post' });
    }

    // Create payment session
    const sessionData = {
      jobPostId,
      amount,
      description
    };

    // Call createPaymentSession logic
    req.body = sessionData;
    await createPaymentSession(req, res);

  } catch (error) {
    console.error('Error processing guard payment:', error);
    res.status(500).json({ message: 'Failed to process payment', error: error.message });
  }
};

// Get payment history for a job post
const getJobPostPaymentHistory = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Validate job post and ownership
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view payments for this job post' });
    }

    // Get payment history
    const payments = await Payment.find({
      'relatedEntity.entityType': 'JobPost',
      'relatedEntity.entityId': jobPostId,
      type: 'security_guard_payment'
    })
    .populate('payeeId', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json({
      jobPost: {
        id: jobPost._id,
        title: jobPost.title,
        paymentInfo: jobPost.paymentInfo
      },
      payments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history', error: error.message });
  }
};

// Get payments received by a guard
const getGuardPayments = async (req, res) => {
  try {
    const guardId = req.user._id || req.user.userId || req.user.id;

    // Get payments received by this guard
    const payments = await Payment.find({
      payeeId: guardId,
      type: 'security_guard_payment'
    })
    .populate('payerId', 'firstName lastName email')
    .populate('relatedEntity.entityId')
    .sort({ createdAt: -1 });

    // Calculate total earnings
    const totalEarnings = payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      payments,
      totalEarnings,
      paymentCount: payments.length
    });

  } catch (error) {
    console.error('Error fetching guard payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
};

// Update payment information for a job post
const updateJobPostPaymentInfo = async (req, res) => {
  try {
    const { jobPostId } = req.params;
    const { frequency, nextDueDate, notes } = req.body;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Validate job post and ownership
    const jobPost = await JobPost.findById(jobPostId);
    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (jobPost.postedById.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update payment info for this job post' });
    }

    // Update payment info
    const updateData = {};
    if (frequency) updateData['paymentInfo.frequency'] = frequency;
    if (nextDueDate) updateData['paymentInfo.nextDueDate'] = new Date(nextDueDate);
    if (notes) updateData['paymentInfo.notes'] = notes;

    const updatedJobPost = await JobPost.findByIdAndUpdate(
      jobPostId,
      { $set: updateData },
      { new: true }
    );

    res.json({
      message: 'Payment information updated successfully',
      paymentInfo: updatedJobPost.paymentInfo
    });

  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(500).json({ message: 'Failed to update payment info', error: error.message });
  }
};

module.exports = {
  createPaymentSession,
  processGuardPayment,
  getJobPostPaymentHistory,
  getGuardPayments,
  updateJobPostPaymentInfo
};