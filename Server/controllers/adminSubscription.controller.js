const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Admin = require('../models/Admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get admin subscription invoices
 */
const getAdminInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, adminId } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query for admin subscription invoices
    const query = {
      'lineItems.type': 'subscription',
      propertyId: null // Admin subscriptions don't have propertyId
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (adminId) {
      query.billTo = adminId;
    }
    
    const invoices = await Invoice.find(query)
      .populate('billTo', 'email role isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Invoice.countDocuments(query);
    
    res.status(200).json({
      success: true,
      invoices,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching admin invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin invoices',
      error: error.message
    });
  }
};

/**
 * Get admin subscription payments
 */
const getAdminPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, adminId } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query for admin subscription payments
    const query = {
      type: 'subscription'
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (adminId) {
      query.payer = adminId;
    }
    
    const payments = await Payment.find(query)
      .populate('payer', 'email role isActive')
      .populate('invoice', 'invoiceNumber amount dueDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Payment.countDocuments(query);
    
    res.status(200).json({
      success: true,
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin payments',
      error: error.message
    });
  }
};

/**
 * Get admin subscription statistics
 */
const getAdminStats = async (req, res) => {
  try {
    // Get total active admins
    const totalAdmins = await Admin.countDocuments({ isActive: true });
    
    // Get subscription invoice statistics
    const invoiceStats = await Invoice.aggregate([
      {
        $match: {
          'lineItems.type': 'subscription',
          propertyId: null
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get payment statistics
    const paymentStats = await Payment.aggregate([
      {
        $match: {
          type: 'subscription'
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get current month statistics
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const currentMonthInvoices = await Invoice.countDocuments({
      'lineItems.type': 'subscription',
      propertyId: null,
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    
    const currentMonthPayments = await Payment.countDocuments({
      type: 'subscription',
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    
    // Calculate revenue
    const totalRevenue = paymentStats
      .filter(stat => stat._id === 'completed')
      .reduce((sum, stat) => sum + stat.totalAmount, 0);
    
    const currentMonthRevenue = await Payment.aggregate([
      {
        $match: {
          type: 'subscription',
          status: 'completed',
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        totalAdmins,
        invoices: {
          total: invoiceStats.reduce((sum, stat) => sum + stat.count, 0),
          byStatus: invoiceStats,
          currentMonth: currentMonthInvoices
        },
        payments: {
          total: paymentStats.reduce((sum, stat) => sum + stat.count, 0),
          byStatus: paymentStats,
          currentMonth: currentMonthPayments
        },
        revenue: {
          total: totalRevenue,
          currentMonth: currentMonthRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
};

/**
 * Get current admin's subscription data
 */
const getMySubscription = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Get admin's invoices
    const invoices = await Invoice.find({
      billTo: adminId,
      'lineItems.type': 'subscription',
      propertyId: null
    })
    .sort({ createdAt: -1 })
    .lean();
    
    // Get admin's payments
    const payments = await Payment.find({
      payer: adminId,
      type: 'subscription'
    })
    .populate('invoice', 'invoiceNumber amount dueDate')
    .sort({ createdAt: -1 })
    .lean();
    
    res.status(200).json({
      success: true,
      data: {
        invoices,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching admin subscription data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin subscription data',
      error: error.message
    });
  }
};

/**
 * Process payment for admin subscription invoice
 */
const processPayment = async (req, res) => {
  try {
    const { invoiceId, paymentMethodId } = req.body;
    const adminId = req.user.id;
    
    // Find the invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Verify the invoice belongs to the admin
    if (invoice.billTo.toString() !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to pay this invoice'
      });
    }
    
    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.CLIENT_URL}/admin/subscription`,
      metadata: {
        invoiceId: invoice._id.toString(),
        adminId: adminId,
        type: 'admin_subscription'
      }
    });
    
    // Create payment record
    const payment = new Payment({
      invoice: invoice._id,
      payer: adminId,
      amount: invoice.amount,
      type: 'subscription',
      method: 'stripe',
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      stripePaymentIntentId: paymentIntent.id,
      metadata: {
        adminSubscription: true
      }
    });
    
    await payment.save();
    
    // Update invoice status if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      await invoice.save();
    }
    
    res.status(200).json({
      success: true,
      message: paymentIntent.status === 'succeeded' ? 'Payment completed successfully' : 'Payment initiated',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        stripePaymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error processing admin payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};

module.exports = {
  getAdminInvoices,
  getAdminPayments,
  getAdminStats,
  getMySubscription,
  processPayment
};