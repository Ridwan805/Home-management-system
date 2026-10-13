const mongoose = require('mongoose');

// Define valid invoice statuses
const INVOICE_STATUSES = ['draft', 'open', 'partially_paid', 'paid', 'void', 'overdue'];

// Define valid line item types
const LINE_ITEM_TYPES = ['rent', 'utility', 'fee', 'deposit', 'late_fee', 'deposit_deduction', 'other'];

// Line item schema for invoice details
const LineItemSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: LINE_ITEM_TYPES, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    default: 1, 
    min: 0 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxable: { 
    type: Boolean, 
    default: false 
  },
  taxRate: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  taxAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
}, { _id: true });

// Discount schema
const DiscountSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['fixed', 'percentage'], 
    required: true 
  },
  value: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  description: { 
    type: String, 
    required: true 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  appliedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { _id: true });

// Fee schema
const FeeSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  appliedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { _id: true });

// Auto generation details schema
const AutoGenerationSchema = new mongoose.Schema({
  generated: { 
    type: Boolean, 
    default: false 
  },
  source: { 
    type: String, 
    enum: ['manual', 'rent_billing', 'late_fee', 'system'], 
    default: 'manual' 
  },
  generatedAt: { 
    type: Date 
  },
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  templateId: { 
    type: String 
  }
}, { _id: false });

// Main Invoice schema
const InvoiceSchema = new mongoose.Schema({
  // Unique invoice identifier
  invoiceNo: {
    type: String,
    unique: true,
    default: function() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      return `INV-${year}${month}-${timestamp}`;
    }
  },
  
  // Related entities
  rentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Rent' 
  },
  ownershipTransferId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'OwnershipTransfer' 
  },
  propertyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  
  // Billing information
  billTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  billFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Dates
  issuedAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  
  // Billing period
  period: {
    start: { 
      type: Date 
    },
    end: { 
      type: Date 
    }
  },
  
  // Invoice items and calculations
  lineItems: [LineItemSchema],
  
  // Financial calculations
  subtotal: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  discounts: [DiscountSchema],
  totalDiscounts: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  fees: [FeeSchema],
  totalFees: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  tax: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  total: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  paidAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  balance: { 
    type: Number, 
    default: function() { return this.total; }, 
    min: 0 
  },
  
  // Currency
  currency: { 
    type: String, 
    default: 'BDT', 
    required: true 
  },
  
  // Status management
  status: { 
    type: String, 
    enum: INVOICE_STATUSES, 
    default: 'draft', 
    required: true 
  },
  
  // Auto generation details
  auto: AutoGenerationSchema,
  
  // Payment tracking
  payments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment' 
  }],
  
  // Late fee tracking
  lateFees: {
    applied: { type: Boolean, default: false },
    appliedAt: { type: Date },
    amount: { type: Number, default: 0, min: 0 },
    gracePeriodEnd: { type: Date }
  },
  
  // Notes and metadata
  notes: { 
    type: String, 
    default: '' 
  },
  internalNotes: { 
    type: String, 
    default: '' 
  },
  
  // Terms and conditions
  terms: { 
    type: String, 
    default: '' 
  },
  
  // Delivery and communication
  delivery: {
    method: { 
      type: String, 
      enum: ['email', 'postal', 'hand_delivery', 'portal'], 
      default: 'email' 
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    viewedAt: { type: Date },
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: { type: Date }
  },
  
  // Soft delete
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: { 
    type: Date 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true,
  collection: 'Invoices'
});

// Indexes for better query performance (invoiceNo unique index is defined on field)
InvoiceSchema.index({ billTo: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ rentId: 1, dueDate: 1 });
InvoiceSchema.index({ propertyId: 1, status: 1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ issuedAt: -1 });
InvoiceSchema.index({ ownershipTransferId: 1 });
InvoiceSchema.index({ billFrom: 1, status: 1 });

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  // Calculate subtotal from line items
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate total discounts
  this.totalDiscounts = this.discounts.reduce((sum, discount) => sum + discount.amount, 0);
  
  // Calculate total fees
  this.totalFees = this.fees.reduce((sum, fee) => sum + fee.amount, 0);
  
  // Calculate tax from taxable line items
  this.tax = this.lineItems.reduce((sum, item) => {
    if (item.taxable) {
      return sum + (item.amount * (item.taxRate / 100));
    }
    return sum;
  }, 0);
  
  // Calculate total
  this.total = this.subtotal - this.totalDiscounts + this.totalFees + this.tax;
  
  // Calculate balance
  this.balance = this.total - this.paidAmount;
  
  // Update status based on payment
  if (this.balance <= 0 && this.paidAmount > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.balance > 0) {
    this.status = 'partially_paid';
  } else if (this.status !== 'draft' && this.status !== 'void' && new Date() > this.dueDate && this.balance > 0) {
    this.status = 'overdue';
  }
  
  next();
});

// Instance methods
InvoiceSchema.methods.addLineItem = function(itemData) {
  // Calculate amount if not provided
  if (!itemData.amount) {
    itemData.amount = (itemData.quantity || 1) * (itemData.unitPrice || 0);
  }
  
  // Calculate tax amount if taxable
  if (itemData.taxable && itemData.taxRate) {
    itemData.taxAmount = itemData.amount * (itemData.taxRate / 100);
  }
  
  this.lineItems.push(itemData);
  return this.save();
};

InvoiceSchema.methods.addDiscount = function(discountData, appliedBy) {
  // Calculate discount amount
  if (discountData.type === 'percentage') {
    discountData.amount = this.subtotal * (discountData.value / 100);
  } else {
    discountData.amount = discountData.value;
  }
  
  discountData.appliedBy = appliedBy;
  this.discounts.push(discountData);
  return this.save();
};

InvoiceSchema.methods.addFee = function(feeData, appliedBy) {
  feeData.appliedBy = appliedBy;
  this.fees.push(feeData);
  return this.save();
};

InvoiceSchema.methods.addPayment = function(paymentId, amount) {
  this.payments.push(paymentId);
  this.paidAmount += amount;
  return this.save();
};

InvoiceSchema.methods.markAsPaid = function(paidAt = new Date()) {
  this.status = 'paid';
  this.paidAmount = this.total;
  this.balance = 0;
  return this.save();
};

InvoiceSchema.methods.markAsVoid = function(voidedBy, reason = '') {
  this.status = 'void';
  this.internalNotes += `\nVoided by ${voidedBy} on ${new Date()}: ${reason}`;
  return this.save();
};

InvoiceSchema.methods.applyLateFee = function(feeAmount, appliedBy) {
  if (!this.lateFees.applied) {
    this.addFee({
      type: 'late_fee',
      description: 'Late payment fee',
      amount: feeAmount
    }, appliedBy);
    
    this.lateFees.applied = true;
    this.lateFees.appliedAt = new Date();
    this.lateFees.amount = feeAmount;
    
    return this.save();
  }
  return Promise.resolve(this);
};

InvoiceSchema.methods.send = function(method = 'email') {
  this.status = 'open';
  this.delivery.method = method;
  this.delivery.sentAt = new Date();
  return this.save();
};

InvoiceSchema.methods.markAsViewed = function() {
  this.delivery.viewedAt = new Date();
  return this.save();
};

InvoiceSchema.methods.sendReminder = function() {
  this.delivery.remindersSent += 1;
  this.delivery.lastReminderAt = new Date();
  return this.save();
};

// Static methods
InvoiceSchema.statics.findByBillTo = function(billTo, status = null) {
  const query = { billTo, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('propertyId rentId');
};

InvoiceSchema.statics.findByProperty = function(propertyId, status = null) {
  const query = { propertyId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('billTo billFrom');
};

InvoiceSchema.statics.findByRent = function(rentId, status = null) {
  const query = { rentId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('billTo propertyId');
};

InvoiceSchema.statics.findOverdue = function(graceDays = 0) {
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - graceDays);
  
  return this.find({
    status: { $in: ['open', 'partially_paid'] },
    dueDate: { $lt: overdueDate },
    balance: { $gt: 0 },
    isDeleted: false
  }).populate('billTo propertyId');
};

InvoiceSchema.statics.findDueForLateFees = function() {
  return this.find({
    status: { $in: ['open', 'partially_paid', 'overdue'] },
    'lateFees.applied': false,
    dueDate: { $lt: new Date() },
    balance: { $gt: 0 },
    isDeleted: false
  }).populate('billTo propertyId rentId');
};

InvoiceSchema.statics.generateForRent = function(rentData, period) {
  const invoice = new this({
    rentId: rentData._id,
    propertyId: rentData.propertyId,
    billTo: rentData.tenants[0], // Primary tenant
    billFrom: rentData.ownerId,
    period: period,
    dueDate: new Date(period.end.getTime() + (rentData.rent.graceDays * 24 * 60 * 60 * 1000)),
    auto: {
      generated: true,
      source: 'rent_billing',
      generatedAt: new Date()
    }
  });
  
  // Add rent line item
  invoice.lineItems.push({
    type: 'rent',
    description: `Rent for ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`,
    quantity: 1,
    unitPrice: rentData.rent.amount,
    amount: rentData.rent.amount
  });
  
  return invoice;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);