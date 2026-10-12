const Invoice = require('../models/Invoice');
const Rent = require('../models/Rent');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const User = require('../models/User');
const InvoiceService = require('../services/invoiceService');
const mongoose = require('mongoose');
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('❌ Failed to initialize Stripe client in invoice.controller:', e && e.message ? e.message : e);
    stripe = null;
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe features are disabled in invoice.controller.');
}

// Create a new invoice
const createInvoice = async (req, res) => {
  try {
    const {
      rentId,
      ownershipTransferId,
      propertyId,
      billTo,
      dueDate,
      period,
      lineItems,
      discounts,
      fees,
      tax,
      auto
    } = req.body;
    const userId = req.user.userId;

    // Validate that either rentId or ownershipTransferId is provided
    if (!rentId && !ownershipTransferId && !propertyId) {
      return res.status(400).json({ 
        message: 'Either rentId, ownershipTransferId, or propertyId must be provided' 
      });
    }

    let property, rent, ownershipTransfer;

    // Validate rent if provided
    if (rentId) {
      rent = await Rent.findById(rentId).populate('propertyId');
      if (!rent) {
        return res.status(404).json({ message: 'Rent contract not found' });
      }
      property = rent.propertyId;
      
      // Check authorization (only owner can create rent invoices)
      if (rent.ownerId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to create invoice for this rent' });
      }
    }

    // Validate ownership transfer if provided
    if (ownershipTransferId) {
      ownershipTransfer = await OwnershipTransfer.findById(ownershipTransferId).populate('propertyId');
      if (!ownershipTransfer) {
        return res.status(404).json({ message: 'Ownership transfer not found' });
      }
      property = ownershipTransfer.propertyId;
      
      // Check authorization (seller can create purchase invoices)
      if (ownershipTransfer.sellerId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to create invoice for this ownership transfer' });
      }
    }

    // Validate property if provided directly
    if (propertyId && !property) {
      property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      // Check authorization (only owner can create property invoices)
      if (property.ownerUserId?.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to create invoice for this property' });
      }
    }

    // Validate billTo user exists
    const billToUser = await User.findById(billTo);
    if (!billToUser) {
      return res.status(404).json({ message: 'Bill-to user not found' });
    }

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNo = `INV-${Date.now()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const totalDiscounts = discounts || 0;
    const totalFees = fees || 0;
    const totalTax = tax || 0;
    const total = subtotal - totalDiscounts + totalFees + totalTax;

    // Create invoice
    const newInvoice = new Invoice({
      invoiceNo,
      rentId,
      ownershipTransferId,
      propertyId: property._id,
      billTo,
      issuedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      period: period ? {
        start: new Date(period.start),
        end: new Date(period.end)
      } : null,
      lineItems: lineItems.map(item => ({
        type: item.type,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.amount
      })),
      subtotal,
      discounts: totalDiscounts,
      fees: totalFees,
      tax: totalTax,
      total,
      paidAmount: 0,
      balance: total,
      status: 'open',
      auto: auto || { generated: false, source: null }
    });

    await newInvoice.save();

    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate('propertyId', 'address city state')
      .populate('billTo', 'firstName lastName email')
      .populate('rentId')
      .populate('ownershipTransferId');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create invoice',
      error: error.message 
    });
  }
};

// Get all invoices (with filtering)
const getInvoices = async (req, res) => {
  try {
    const { 
      status, 
      rentId, 
      propertyId, 
      billTo, 
      overdue, 
      page = 1, 
      limit = 10 
    } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    
    if (userRole === 'Tenant') {
      filter.billTo = userId;
    } else if (userRole === 'Owner') {
      // Find properties owned by user
      const ownedProperties = await Property.find({ ownerUserId: userId }).select('_id');
      const propertyIds = ownedProperties.map(p => p._id);
      filter.propertyId = { $in: propertyIds };
    }
    // Admin can see all invoices (no additional filter)

    // Add optional filters
    if (status) filter.status = status;
    if (rentId) filter.rentId = rentId;
    if (propertyId) filter.propertyId = propertyId;
    if (billTo && userRole === 'Admin') filter.billTo = billTo;
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $in: ['open', 'partially_paid'] };
    }

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(filter)
      .populate('propertyId', 'address city state')
      .populate('billTo', 'firstName lastName email')
      .populate('rentId')
      .populate('ownershipTransferId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      invoices,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoices',
      error: error.message 
    });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const invoice = await Invoice.findById(invoiceId)
      .populate('propertyId')
      .populate('billTo', 'firstName lastName email')
      .populate('rentId')
      .populate('ownershipTransferId')
      .populate('history.actor', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check authorization
    const isBillTo = invoice.billTo._id.toString() === userId;
    const isPropertyOwner = invoice.propertyId.ownerUserId?.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isBillTo && !isPropertyOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this invoice' 
      });
    }

    // Get related payments
    const payments = await Payment.find({ invoiceId: invoice._id })
      .populate('payerId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      invoice,
      payments
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoice',
      error: error.message 
    });
  }
};

// Update invoice status
const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status, note } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const invoice = await Invoice.findById(invoiceId).populate('propertyId');
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check authorization (property owner or admin can update status)
    const isPropertyOwner = invoice.propertyId.ownerUserId?.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isPropertyOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this invoice' 
      });
    }

    // Validate status transition
    const validStatuses = ['draft', 'open', 'partially_paid', 'paid', 'void', 'overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid invoice status' 
      });
    }

    // Use instance method for status updates
    if (status === 'void') {
      await invoice.void(userId, note);
    } else {
      invoice.status = status;
      invoice.history.push({
        event: `Status changed to ${status}`,
        actor: userId,
        timestamp: new Date(),
        details: { previousStatus: invoice.status, newStatus: status, note }
      });
      await invoice.save();
    }

    const updatedInvoice = await Invoice.findById(invoiceId)
      .populate('propertyId')
      .populate('billTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update invoice status',
      error: error.message 
    });
  }
};

// Add line item to invoice
const addLineItem = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { type, description, amount, quantity, unitPrice } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const invoice = await Invoice.findById(invoiceId).populate('propertyId');
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check authorization (property owner or admin can add line items)
    const isPropertyOwner = invoice.propertyId.ownerUserId?.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isPropertyOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to modify this invoice' 
      });
    }

    // Check if invoice can be modified
    if (['paid', 'void'].includes(invoice.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot modify invoice in status: ${invoice.status}` 
      });
    }

    // Add line item using instance method
    await invoice.addLineItem({
      type,
      description,
      amount,
      quantity: quantity || 1,
      unitPrice: unitPrice || amount
    }, userId);

    const updatedInvoice = await Invoice.findById(invoiceId)
      .populate('propertyId')
      .populate('billTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Line item added successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error adding line item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add line item',
      error: error.message 
    });
  }
};

// Process payment for invoice
// Create Stripe checkout session for invoice payment
const processPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentMethod, originUrl } = req.body;
    const userId = req.user.userId;

    const invoice = await Invoice.findById(invoiceId)
      .populate('propertyId', 'title address')
      .populate('billTo', 'firstName lastName email');
      
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check authorization (bill-to user can process payments)
    if (invoice.billTo._id.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to process payment for this invoice' 
      });
    }

    // Validate payment amount
    if (amount !== invoice.total) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount does not match invoice total' 
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${invoice.invoiceNumber || invoice._id.slice(-6)}`,
            description: `Payment for ${invoice.propertyId?.title || 'Property'} - ${invoice.description || 'Rent Payment'}`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${originUrl || process.env.FRONTEND_URL}/tenant/payment?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${originUrl || process.env.FRONTEND_URL}/tenant/payment?status=cancelled`,
      metadata: {
        invoiceId: invoice._id.toString(),
        userId: userId,
        type: 'invoice_payment'
      },
      customer_email: invoice.billTo.email,
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment session',
      error: error.message 
    });
  }
};

// Process completed payment from Stripe webhook
const processCompletedPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentId } = req.body;
    const userId = req.user.userId;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    // Check authorization (bill-to user can process payments)
    if (invoice.billTo.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to process payment for this invoice' 
      });
    }

    // Validate payment is for this invoice
    if (payment.invoiceId?.toString() !== invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment is not for this invoice' 
      });
    }

    // Process payment using instance method
    await invoice.processPayment(payment, userId);

    const updatedInvoice = await Invoice.findById(invoiceId)
      .populate('propertyId')
      .populate('billTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Payment processed successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process payment',
      error: error.message 
    });
  }
};

// Get overdue invoices
const getOverdueInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {
      dueDate: { $lt: new Date() },
      status: { $in: ['open', 'partially_paid'] }
    };
    
    if (userRole === 'Tenant') {
      filter.billTo = userId;
    } else if (userRole === 'Owner') {
      // Find properties owned by user
      const ownedProperties = await Property.find({ ownerUserId: userId }).select('_id');
      const propertyIds = ownedProperties.map(p => p._id);
      filter.propertyId = { $in: propertyIds };
    }

    const skip = (page - 1) * limit;

    const overdueInvoices = await Invoice.find(filter)
      .populate('propertyId', 'address city state')
      .populate('billTo', 'firstName lastName email')
      .populate('rentId')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      overdueInvoices,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch overdue invoices',
      error: error.message 
    });
  }
};

// Generate monthly rent invoices (for automation)
const generateMonthlyRentInvoices = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only admin can trigger bulk invoice generation
    if (userRole !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to generate bulk invoices' 
      });
    }

    // Use the invoice service for automatic generation
    const results = await InvoiceService.generateMonthlyRentInvoices();

    res.json({
      success: true,
      message: `Generated ${results.success} invoices successfully`,
      results
    });
  } catch (error) {
    console.error('Error generating monthly rent invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate monthly rent invoices',
      error: error.message 
    });
  }
};

// Generate ownership transfer invoice
const generateOwnershipTransferInvoice = async (req, res) => {
  try {
    const { ownershipTransferId } = req.params;
    const userId = req.user.userId;

    const invoice = await InvoiceService.generateOwnershipTransferInvoice(ownershipTransferId, userId);

    res.json({
      success: true,
      message: 'Ownership transfer invoice generated successfully',
      invoice
    });
  } catch (error) {
    console.error('Error generating ownership transfer invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate ownership transfer invoice',
      error: error.message 
    });
  }
};

// Process invoice payment using service
const processInvoicePaymentService = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentAmount, paymentMethod } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid payment amount is required' 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment method is required' 
      });
    }

    // Check if invoice exists and user has permission
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check authorization (bill-to user can process payments)
    if (invoice.tenantId?.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to process payment for this invoice' 
      });
    }

    const updatedInvoice = await InvoiceService.processInvoicePayment(
      invoiceId, 
      paymentAmount, 
      paymentMethod, 
      userId
    );

    res.json({
      success: true,
      message: 'Payment processed successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error processing invoice payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process payment',
      error: error.message 
    });
  }
};

// Mark overdue invoices
const markOverdueInvoices = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only admin can trigger overdue marking
    if (userRole !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to mark overdue invoices' 
      });
    }

    const count = await InvoiceService.markOverdueInvoices();

    res.json({
      success: true,
      message: `Marked ${count} invoices as overdue`,
      count
    });
  } catch (error) {
    console.error('Error marking overdue invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark overdue invoices',
      error: error.message 
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  addLineItem,
  processPayment,
  processCompletedPayment,
  getOverdueInvoices,
  generateMonthlyRentInvoices,
  generateOwnershipTransferInvoice,
  processInvoicePaymentService,
  markOverdueInvoices
};