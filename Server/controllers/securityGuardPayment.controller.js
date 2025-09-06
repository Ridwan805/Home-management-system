const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const JobPost = require('../models/JobPost');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SecurityGuardJob = require('../models/securityguardjobs');
// const { sendNotification } = require('../utils/notificationUtils');

// Create payment session for hired guard
const createPaymentSession = async (req, res) => {
  try {
    const { jobPostId, amount, description, originUrl, currency = 'USD', frequency = 'monthly' } = req.body;
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
      success_url: `${originUrl || process.env.FRONTEND_URL}/owner/payments?payment=success&session_id={CHECKOUT_SESSION_ID}&type=security_guard`,
      cancel_url: `${originUrl || process.env.FRONTEND_URL}/owner/payments?payment=cancelled`,
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
      method: 'stripe',
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

// Generate monthly invoice for security guard salary
const generateMonthlyInvoice = async (req, res) => {
  try {
    const { guardJobId } = req.params;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Find the security guard job
    const guardJob = await SecurityGuardJob.findById(guardJobId)
      .populate('guardId', 'firstName lastName email phone')
      .populate('propertyId', 'title address')
      .populate('jobPostId', 'title description')
      .populate('ownerId', 'firstName lastName email');

    if (!guardJob) {
      return res.status(404).json({ message: 'Security guard job not found' });
    }

    if (guardJob.ownerId._id.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: 'Not authorized to generate invoice for this guard' });
    }

    if (!['Hired', 'Active'].includes(guardJob.status)) {
      return res.status(400).json({ message: 'Guard must be hired or active to generate invoice' });
    }

    // Generate invoice details
    const currentDate = new Date();
    const invoiceMonth = currentDate.getMonth();
    const invoiceYear = currentDate.getFullYear();
    const invoiceNumber = `INV-${invoiceYear}${String(invoiceMonth + 1).padStart(2, '0')}-${guardJob._id.toString().slice(-6).toUpperCase()}`;

    // Check if invoice already exists for this month
    const existingPayment = await Payment.findOne({
      payeeId: guardJob.guardId._id,
      payerId: ownerId,
      type: 'security_guard_payment',
      'relatedEntity.entityId': guardJob.jobPostId._id,
      'invoiceDetails.invoiceNumber': invoiceNumber
    });

    if (existingPayment) {
      return res.status(400).json({ 
        message: 'Invoice already exists for this month',
        invoiceNumber: invoiceNumber,
        paymentId: existingPayment._id
      });
    }

    // Create payment object with pending status
    const payment = new Payment({
      paymentId: `pending_${Date.now()}_${guardJob._id}`,
      type: 'security_guard_payment',
      amount: guardJob.salary.amount,
      currency: guardJob.salary.currency || 'USD',
      status: 'pending',
      payerId: ownerId,
      payeeId: guardJob.guardId._id,
      relatedEntity: {
        entityType: 'JobPost',
        entityId: guardJob.jobPostId._id
      },
      method: 'stripe',
      description: `Monthly salary for ${guardJob.guardId.firstName} ${guardJob.guardId.lastName} - ${guardJob.jobPostId.title}`,
      invoiceDetails: {
        invoiceNumber: invoiceNumber,
        invoiceDate: currentDate,
        dueDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        billingPeriod: {
          from: new Date(invoiceYear, invoiceMonth, 1),
          to: new Date(invoiceYear, invoiceMonth + 1, 0)
        },
        lineItems: [{
          description: `Security Guard Services - ${guardJob.jobPostId.title}`,
          quantity: 1,
          unitPrice: guardJob.salary.amount,
          total: guardJob.salary.amount
        }],
        subtotal: guardJob.salary.amount,
        tax: 0,
        total: guardJob.salary.amount,
        notes: `Monthly salary payment for security services at ${guardJob.propertyId.title}`
      },
      billingDetails: {
        from: {
          name: `${guardJob.ownerId.firstName} ${guardJob.ownerId.lastName}`,
          email: guardJob.ownerId.email,
          address: guardJob.propertyId.address
        },
        to: {
          name: `${guardJob.guardId.firstName} ${guardJob.guardId.lastName}`,
          email: guardJob.guardId.email,
          phone: guardJob.guardId.phone
        }
      }
    });

    await payment.save();

    // Send notification to security guard about new invoice
    // await sendNotification({
    //   userId: guardJob.guardId._id,
    //   type: 'payment_invoice_generated',
    //   title: 'New Salary Invoice Generated',
    //   message: `A new salary invoice (${invoiceNumber}) has been generated for ${guardJob.propertyId.title}. Amount: ${guardJob.salary.currency} ${guardJob.salary.amount}`,
    //   data: {
    //     paymentId: payment._id,
    //     invoiceNumber: invoiceNumber,
    //     amount: guardJob.salary.amount,
    //     currency: guardJob.salary.currency,
    //     propertyTitle: guardJob.propertyId.title
    //   }
    // });

    res.json({
      success: true,
      message: 'Monthly invoice generated successfully',
      invoice: {
        paymentId: payment._id,
        invoiceNumber: invoiceNumber,
        amount: guardJob.salary.amount,
        currency: guardJob.salary.currency,
        status: 'pending',
        dueDate: payment.invoiceDetails.dueDate,
        guard: {
          name: `${guardJob.guardId.firstName} ${guardJob.guardId.lastName}`,
          email: guardJob.guardId.email
        },
        property: {
          title: guardJob.propertyId.title,
          address: guardJob.propertyId.address
        }
      }
    });

  } catch (error) {
    console.error('Error generating monthly invoice:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate monthly invoice', 
      error: error.message 
    });
  }
};

// Handle successful payment and generate receipt
const handlePaymentSuccess = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const ownerId = req.user._id || req.user.userId || req.user.id;

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Payment session not found' });
    }

    // Find the payment record
    const payment = await Payment.findOne({
      'stripeDetails.sessionId': sessionId,
      payerId: ownerId
    }).populate('payeeId', 'firstName lastName email phone');

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    // Update payment status and details
    payment.status = 'completed';
    payment.stripeDetails.paymentIntentId = session.payment_intent;
    payment.stripeDetails.receiptUrl = session.receipt_email ? session.receipt_url : null;
    payment.completedAt = new Date();

    // Generate receipt data
    const receiptData = {
      receiptNumber: `RCP-${Date.now()}-${payment._id.toString().slice(-6).toUpperCase()}`,
      paymentId: payment._id,
      sessionId: sessionId,
      amount: payment.amount,
      currency: payment.currency,
      paymentDate: new Date(),
      method: 'Credit Card (Stripe)',
      description: payment.description,
      payer: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      payee: {
        name: `${payment.payeeId.firstName} ${payment.payeeId.lastName}`,
        email: payment.payeeId.email
      },
      invoiceNumber: payment.invoiceDetails?.invoiceNumber || null
    };

    payment.receiptData = receiptData;
    await payment.save();

    // Send notification to security guard about payment received
    // await sendNotification({
    //   userId: payment.payeeId._id,
    //   type: 'payment_received',
    //   title: 'Salary Payment Received',
    //   message: `You have received a salary payment of ${payment.currency} ${payment.amount}. Receipt: ${receiptData.receiptNumber}`,
    //   data: {
    //     paymentId: payment._id,
    //     receiptNumber: receiptData.receiptNumber,
    //     amount: payment.amount,
    //     currency: payment.currency,
    //     paymentDate: receiptData.paymentDate,
    //     receiptData: receiptData
    //   }
    // });

    res.json({
      success: true,
      message: 'Payment completed successfully',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        completedAt: payment.completedAt,
        receiptData: receiptData
      }
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process payment success', 
      error: error.message 
    });
  }
};

// Get payment receipt
const getPaymentReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id || req.user.userId || req.user.id;

    // Find the payment record
    const payment = await Payment.findById(paymentId)
      .populate('payerId', 'firstName lastName email')
      .populate('payeeId', 'firstName lastName email phone');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is authorized to view this receipt
    const isAuthorized = payment.payerId._id.toString() === userId.toString() || 
                        payment.payeeId._id.toString() === userId.toString();
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this receipt' });
    }

    if (!payment.receiptData) {
      return res.status(404).json({ message: 'Receipt not available for this payment' });
    }

    res.json({
      success: true,
      receipt: payment.receiptData,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        completedAt: payment.completedAt,
        invoiceDetails: payment.invoiceDetails
      }
    });

  } catch (error) {
    console.error('Error fetching payment receipt:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payment receipt', 
      error: error.message 
    });
  }
};

// Get security guard payment notifications and receipts
const getGuardPaymentNotifications = async (req, res) => {
  try {
    const guardId = req.user._id || req.user.userId || req.user.id;

    // Get all payments for this security guard
    const payments = await Payment.find({
      payeeId: guardId,
      type: 'security_guard_payment'
    })
    .populate('payerId', 'firstName lastName email')
    .populate('relatedEntity.entityId', 'title description')
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 payments

    // Get security guard job details for context
    const guardJobs = await SecurityGuardJob.find({
      guardId: guardId,
      status: { $in: ['Hired', 'Active'] }
    })
    .populate('propertyId', 'title address')
    .populate('ownerId', 'firstName lastName email phone');

    // Format payment notifications
    const paymentNotifications = payments.map(payment => {
      const relatedJob = guardJobs.find(job => 
        job.jobPostId.toString() === payment.relatedEntity.entityId.toString()
      );

      return {
        id: payment._id,
        type: 'payment',
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        invoiceDetails: payment.invoiceDetails,
        receiptData: payment.receiptData,
        payer: {
          name: `${payment.payerId.firstName} ${payment.payerId.lastName}`,
          email: payment.payerId.email
        },
        jobDetails: relatedJob ? {
          propertyTitle: relatedJob.propertyId.title,
          propertyAddress: relatedJob.propertyId.address,
          ownerContact: {
            name: `${relatedJob.ownerId.firstName} ${relatedJob.ownerId.lastName}`,
            email: relatedJob.ownerId.email,
            phone: relatedJob.ownerId.phone
          }
        } : null,
        hasReceipt: !!payment.receiptData
      };
    });

    // Get summary statistics
    const totalEarnings = payments
      .filter(p => ['completed', 'paid'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const completedPayments = payments.filter(p => ['completed', 'paid'].includes(p.status)).length;

    res.json({
      success: true,
      summary: {
        totalEarnings,
        pendingPayments,
        completedPayments,
        currency: payments.length > 0 ? payments[0].currency : 'USD'
      },
      notifications: paymentNotifications,
      activeJobs: guardJobs.map(job => ({
        id: job._id,
        propertyTitle: job.propertyId.title,
        propertyAddress: job.propertyId.address,
        salary: job.salary,
        status: job.status,
        hiredDate: job.hiredDate,
        owner: {
          name: `${job.ownerId.firstName} ${job.ownerId.lastName}`,
          email: job.ownerId.email,
          phone: job.ownerId.phone
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching guard payment notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payment notifications', 
      error: error.message 
    });
  }
};

// Get hired security guards with payment details for owner's payments section
const getHiredGuardsWithPaymentDetails = async (req, res) => {
  console.log('🚀 HIRED GUARDS API: Function called');
  try {
    const ownerId = req.user._id || req.user.userId || req.user.id;
    console.log('🔍 HIRED GUARDS API: Owner ID:', ownerId);

    // Find all hired security guard jobs for this owner
    const hiredGuards = await SecurityGuardJob.find({
      ownerId: ownerId,
      status: { $in: ['Hired', 'Active'] },
      isActive: true
    })
    .populate('guardId', 'firstName lastName email phone profilePicture')
    .populate('propertyId', 'title address')
    .populate('jobPostId', 'title description requirements')
    .sort({ hiredDate: -1 });
    
    console.log('🔍 HIRED GUARDS API: Found', hiredGuards.length, 'hired guards');

    // Get payment details for each hired guard
    const guardsWithPaymentDetails = await Promise.all(
      hiredGuards.map(async (guardJob) => {
        // Get latest payment for this guard
        const latestPayment = await Payment.findOne({
          payeeId: guardJob.guardId._id,
          payerId: ownerId,
          type: 'security_guard_payment',
          'relatedEntity.entityId': guardJob.jobPostId._id
        }).sort({ createdAt: -1 });

        // Get all payments for this guard to calculate total paid
        const allPayments = await Payment.find({
          payeeId: guardJob.guardId._id,
          payerId: ownerId,
          type: 'security_guard_payment',
          status: { $in: ['completed', 'paid'] },
          'relatedEntity.entityId': guardJob.jobPostId._id
        });

        const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const paymentCount = allPayments.length;

        // Calculate next payment due date (assuming monthly payments)
        const nextPaymentDue = new Date();
        if (latestPayment && latestPayment.status === 'completed') {
          nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
        }

        // Determine payment status
        let paymentStatus = 'pending';
        if (latestPayment) {
          if (latestPayment.status === 'completed' || latestPayment.status === 'paid') {
            const lastPaymentDate = new Date(latestPayment.createdAt);
            const currentDate = new Date();
            const daysSinceLastPayment = Math.floor((currentDate - lastPaymentDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastPayment < 30) {
              paymentStatus = 'paid';
            } else {
              paymentStatus = 'due';
            }
          } else if (latestPayment.status === 'pending' || latestPayment.status === 'processing') {
            paymentStatus = 'processing';
          }
        }

        return {
          guardJobId: guardJob._id,
          jobPostId: guardJob.jobPostId._id,
          guard: {
            id: guardJob.guardId._id,
            firstName: guardJob.guardId.firstName,
            lastName: guardJob.guardId.lastName,
            email: guardJob.guardId.email,
            phone: guardJob.guardId.phone,
            profilePicture: guardJob.guardId.profilePicture
          },
          property: {
            id: guardJob.propertyId._id,
            title: guardJob.propertyId.title,
            address: guardJob.propertyId.address
          },
          jobDetails: {
            title: guardJob.jobPostId.title,
            description: guardJob.jobPostId.description,
            hiredDate: guardJob.hiredDate,
            status: guardJob.status
          },
          salary: {
            amount: guardJob.salary.amount,
            currency: guardJob.salary.currency,
            paymentFrequency: guardJob.salary.paymentFrequency
          },
          paymentDetails: {
            status: paymentStatus,
            totalPaid: totalPaid,
            paymentCount: paymentCount,
            nextPaymentDue: nextPaymentDue,
            latestPayment: latestPayment ? {
              id: latestPayment._id,
              amount: latestPayment.amount,
              status: latestPayment.status,
              createdAt: latestPayment.createdAt,
              receiptUrl: latestPayment.stripeDetails?.receiptUrl
            } : null
          }
        };
      })
    );

    console.log('🔍 HIRED GUARDS API: Returning', guardsWithPaymentDetails.length, 'guards with payment details');
    
    res.json({
      success: true,
      count: guardsWithPaymentDetails.length,
      guards: guardsWithPaymentDetails
    });

  } catch (error) {
    console.error('🚨 HIRED GUARDS API ERROR:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch hired guards with payment details', 
      error: error.message 
    });
  }
};

module.exports = {
  createPaymentSession,
  processGuardPayment,
  getJobPostPaymentHistory,
  getGuardPayments,
  updateJobPostPaymentInfo,
  getHiredGuardsWithPaymentDetails,
  generateMonthlyInvoice,
  handlePaymentSuccess,
  getPaymentReceipt,
  getGuardPaymentNotifications
};