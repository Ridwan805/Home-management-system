const mongoose = require('mongoose');

// Define valid payment types
const PAYMENT_TYPES = ['advance_payment', 'full_payment', 'monthly_rent', 'security_deposit', 'utility_bill', 'maintenance_fee', 'other'];

// Define valid payment statuses
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'paid', 'failed', 'cancelled', 'refunded', 'disputed'];

// Define valid payment methods
const PAYMENT_METHODS = ['stripe', 'bank_transfer', 'cash', 'check', 'mobile_banking', 'other'];

// Payment history schema for tracking payment lifecycle
const PaymentHistorySchema = new mongoose.Schema({
  status: { type: String, enum: PAYMENT_STATUSES, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Stripe payment details schema
const StripeDetailsSchema = new mongoose.Schema({
  sessionId: { type: String },
  paymentIntentId: { type: String },
  chargeId: { type: String },
  customerId: { type: String },
  receiptUrl: { type: String },
  refundId: { type: String }
}, { _id: false });

// Bank transfer details schema
const BankTransferDetailsSchema = new mongoose.Schema({
  bankName: { type: String },
  accountNumber: { type: String },
  routingNumber: { type: String },
  transactionId: { type: String },
  referenceNumber: { type: String }
}, { _id: false });

// Mobile banking details schema
const MobileBankingDetailsSchema = new mongoose.Schema({
  provider: { type: String }, // bKash, Nagad, Rocket, etc.
  transactionId: { type: String },
  senderNumber: { type: String },
  receiverNumber: { type: String }
}, { _id: false });

// Receipt data schema
const ReceiptDataSchema = new mongoose.Schema({
  paymentId: { type: String },
  propertyTitle: { type: String },
  propertyAddress: { type: String },
  amount: { type: Number },
  currency: { type: String },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  paymentStatus: { type: String },
  transactionId: { type: String },
  receiptUrl: { type: String }
}, { _id: false });

// Payment status constants
const PAYMENT_STATUSES_NEW = {
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded', 
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
};

// Payment method constants
const PAYMENT_METHODS_NEW = {
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
  MOBILE_BANKING: 'mobile_banking',
  CASH: 'cash',
  CHECK: 'check'
};

// Payment provider constants
const PAYMENT_PROVIDERS = {
  STRIPE: 'stripe',
  BKASH: 'bkash',
  NAGAD: 'nagad',
  ROCKET: 'rocket',
  BANK: 'bank',
  CASH: 'cash'
};

// Payment attempt schema
const PaymentAttemptSchema = new mongoose.Schema({
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUSES_NEW),
    required: true
  },
  errorCode: String,
  errorMessage: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  processingTime: Number // milliseconds
}, { _id: false });

// Main Payment schema
const PaymentSchema = new mongoose.Schema({
  // Unique payment identifier
  paymentId: {
    type: String,
    unique: true,
    default: function() {
      return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  
  // New fields for invoice and rent linking
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: false
  },
  rentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rent',
    required: false
  },
  
  // Payment basic information
  type: { type: String, enum: PAYMENT_TYPES, required: true },
  status: { type: String, enum: [...PAYMENT_STATUSES, ...Object.values(PAYMENT_STATUSES_NEW)], default: 'completed', required: true },
  method: { type: String, enum: [...PAYMENT_METHODS, ...Object.values(PAYMENT_METHODS_NEW)], required: true },
  
  // New provider field
  provider: {
    type: String,
    required: false,
    enum: Object.values(PAYMENT_PROVIDERS)
  },
  
  // External reference from payment provider
  externalRef: {
    type: String,
    required: false
  },
  
  // Payment attempts array
  attempts: [PaymentAttemptSchema],
  
  // Amount and currency
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'BDT', required: true },
  amountInUsd: { type: Number, required: false, min: 0 }, // USD equivalent for BDT amounts
  
  // Related entities
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: false }, // Made optional since invoice might have property info
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Tenant
  payeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Owner - made optional
  
  // New receiverId field
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Payment description and metadata
  description: { type: String, required: true },
  notes: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  // Payment method specific details
  stripeDetails: StripeDetailsSchema,
  bankTransferDetails: BankTransferDetailsSchema,
  mobileBankingDetails: MobileBankingDetailsSchema,
  
  // Receipt data
  receiptData: ReceiptDataSchema,
  
  // Payment history and audit trail
  history: [PaymentHistorySchema],
  
  // Proof and verification
  proofUrls: [{ type: String }], // URLs to payment proof documents
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationNote: { type: String, default: '' },
  
  // Dates
  dueDate: { type: Date },
  paidAt: { type: Date },
  
  // Billing period (for recurring payments)
  billingPeriod: {
    startDate: { type: Date },
    endDate: { type: Date },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: { type: String, enum: ['monthly', 'quarterly', 'yearly'] }
  },
  
  // Fees and charges
  fees: {
    processingFee: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    otherFees: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },
  
  // Refund information
  refund: {
    isRefunded: { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: '' },
    refundedAt: { type: Date },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // New refund fields
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  originalPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: false // For refund payments
  },
  isRefund: {
    type: Boolean,
    default: false
  },
  
  // Tags for categorization
  tags: [{ type: String }],
  
  // System metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  
  // Timestamps
  processedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  refundedAt: { type: Date },
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'Payments'
});

// Indexes for better query performance
PaymentSchema.index({ paymentId: 1 }, { unique: true });
PaymentSchema.index({ invoiceId: 1, status: 1 });
PaymentSchema.index({ payerId: 1, createdAt: -1 });
PaymentSchema.index({ rentId: 1, createdAt: -1 });
PaymentSchema.index({ provider: 1, externalRef: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ propertyId: 1, status: 1 });
PaymentSchema.index({ receiverId: 1, createdAt: -1 });
PaymentSchema.index({ payeeId: 1, status: 1 });
PaymentSchema.index({ requestId: 1 });
PaymentSchema.index({ type: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ dueDate: 1 });
PaymentSchema.index({ paidAt: -1 });

// Post-delete middleware to handle property status updates
PaymentSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after payment ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-payment-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after payment ${doc._id} deletion`);
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for payment:', error);
    }
  }
});

PaymentSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after payment ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-payment-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after payment ${doc._id} deletion`);
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for payment:', error);
    }
  }
});

PaymentSchema.post('deleteMany', async function() {
  try {
    // For bulk deletes, run a full cleanup check
    const PropertyCleanupService = require('../services/propertyCleanupService');
    
    console.log('🧹 Running property cleanup after bulk payment deletion...');
    await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'auto-cleanup-bulk-payment-delete'
    });
  } catch (error) {
    console.error('Error in post-bulk-delete property cleanup for payments:', error);
  }
});

// Pre-save middleware to sync legacy and new fields
PaymentSchema.pre('save', function(next) {
  // Sync receiverId with payeeId if not set
  if (!this.receiverId && this.payeeId) {
    this.receiverId = this.payeeId;
  }
  
  // Sync payeeId with receiverId if receiverId changed
  if (this.isModified('receiverId') && this.receiverId) {
    this.payeeId = this.receiverId;
  }
  
  // Add attempt record on status change
  if (this.isModified('status') && !this.isNew) {
    this.attempts.push({
      status: this.status,
      attemptedAt: new Date()
    });
  }
  
  // Update history
  if (this.isModified('status')) {
    this.history.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
  }
  
  // Set timestamps based on status
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'succeeded':
      case 'completed': // legacy status
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
      case 'refunded':
      case 'partially_refunded':
        if (!this.refundedAt) this.refundedAt = now;
        break;
    }
  }
  
  // Calculate total fees
  if (this.fees) {
    this.fees.totalFees = (this.fees.processingFee || 0) + 
                         (this.fees.lateFee || 0) + 
                         (this.fees.otherFees || 0);
  }
  
  next();
});

// Instance methods
PaymentSchema.methods.markAsPaid = function(paidAt = new Date(), note = '') {
  this.status = 'completed';
  this.paidAt = paidAt;
  this.history.push({
    status: 'completed',
    timestamp: paidAt,
    note: note || 'Payment completed'
  });
  return this.save();
};

PaymentSchema.methods.markAsFailed = function(reason = '') {
  this.status = 'failed';
  this.history.push({
    status: 'failed',
    timestamp: new Date(),
    note: reason || 'Payment failed'
  });
  return this.save();
};

PaymentSchema.methods.processRefund = function(amount, reason, refundedBy) {
  this.refund.isRefunded = true;
  this.refund.refundAmount = amount;
  this.refund.refundReason = reason;
  this.refund.refundedAt = new Date();
  this.refund.refundedBy = refundedBy;
  this.status = 'refunded';
  
  this.history.push({
    status: 'refunded',
    timestamp: new Date(),
    note: `Refund processed: ${amount} ${this.currency}. Reason: ${reason}`,
    updatedBy: refundedBy
  });
  
  return this.save();
};

PaymentSchema.methods.markSucceeded = function(externalRef = null, providerResponse = null) {
  this.status = 'succeeded';
  this.completedAt = new Date();
  if (externalRef) this.externalRef = externalRef;
  if (providerResponse) {
    this.attempts.push({
      status: 'succeeded',
      providerResponse,
      attemptedAt: new Date()
    });
  }
  return this.save();
};

PaymentSchema.methods.markFailed = function(errorCode = null, errorMessage = null, providerResponse = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.attempts.push({
    status: 'failed',
    errorCode,
    errorMessage,
    providerResponse,
    attemptedAt: new Date()
  });
  return this.save();
};

PaymentSchema.methods.createRefund = function(refundAmount = null, reason = '') {
  const amount = refundAmount || this.amount;
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed original payment amount');
  }
  
  const refundPayment = new this.constructor({
    amount: amount,
    currency: this.currency,
    method: this.method,
    provider: this.provider,
    status: 'processing',
    payerId: this.receiverId, // Reverse the flow
    receiverId: this.payerId,
    invoiceId: this.invoiceId,
    rentId: this.rentId,
    propertyId: this.propertyId,
    originalPaymentId: this._id,
    isRefund: true,
    description: `Refund for payment ${this.paymentId}: ${reason}`,
    notes: reason
  });
  
  // Update refund status
  this.refundAmount += amount;
  if (this.refundAmount >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  this.refundedAt = new Date();
  
  return { refundPayment, originalPayment: this };
};

// Static methods
PaymentSchema.statics.getPaymentsByProperty = function(propertyId, options = {}) {
  const query = { propertyId, isDeleted: false };
  
  if (options.status) query.status = options.status;
  if (options.type) query.type = options.type;
  if (options.payerId) query.payerId = options.payerId;
  
  return this.find(query)
    .populate('payerId', 'firstName lastName email')
    .populate('payeeId', 'firstName lastName email')
    .populate('propertyId', 'address')
    .sort({ createdAt: -1 });
};

PaymentSchema.statics.getPaymentsByUser = function(userId, options = {}) {
  const query = { 
    $or: [{ payerId: userId }, { payeeId: userId }],
    isDeleted: false 
  };
  
  if (options.status) query.status = options.status;
  if (options.type) query.type = options.type;
  
  return this.find(query)
    .populate('payerId', 'firstName lastName email')
    .populate('payeeId', 'firstName lastName email')
    .populate('propertyId', 'address')
    .sort({ createdAt: -1 });
};

PaymentSchema.statics.getPaymentStats = function(filters = {}) {
  const matchStage = { isDeleted: false, ...filters };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

PaymentSchema.statics.findByInvoice = function(invoiceId, status = null) {
  const query = { invoiceId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByRent = function(rentId, status = null) {
  const query = { rentId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByPayer = function(payerId, status = null) {
  const query = { payerId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByReceiver = function(receiverId, status = null) {
  const query = { receiverId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.findSuccessful = function() {
  return this.find({ 
    status: { $in: ['succeeded', 'completed'] } 
  }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findRefunds = function() {
  return this.find({ isRefund: true }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByExternalRef = function(provider, externalRef) {
  return this.findOne({ provider, externalRef });
};

const Payment = mongoose.model('Payment', PaymentSchema);

// Export constants
Payment.STATUSES = PAYMENT_STATUSES;
Payment.METHODS = PAYMENT_METHODS;
Payment.PROVIDERS = PAYMENT_PROVIDERS;
Payment.STATUSES_NEW = PAYMENT_STATUSES_NEW;
Payment.METHODS_NEW = PAYMENT_METHODS_NEW;

module.exports = Payment;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES_NEW = PAYMENT_STATUSES_NEW;
module.exports.PAYMENT_METHODS_NEW = PAYMENT_METHODS_NEW;
module.exports.PAYMENT_PROVIDERS = PAYMENT_PROVIDERS;