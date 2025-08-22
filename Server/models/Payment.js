const mongoose = require('mongoose');

// Define valid payment types
const PAYMENT_TYPES = ['advance_payment', 'full_payment', 'monthly_rent', 'security_deposit', 'utility_bill', 'maintenance_fee', 'other'];

// Define valid payment statuses
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'];

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
  
  // Payment basic information
  type: { type: String, enum: PAYMENT_TYPES, required: true },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', required: true },
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  
  // Amount and currency
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'BDT', required: true },
  
  // Related entities
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Tenant
  payeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Owner
  
  // Payment description and metadata
  description: { type: String, required: true },
  notes: { type: String, default: '' },
  
  // Payment method specific details
  stripeDetails: StripeDetailsSchema,
  bankTransferDetails: BankTransferDetailsSchema,
  mobileBankingDetails: MobileBankingDetailsSchema,
  
  // Proof and verification
  proofUrls: [{ type: String }], // URLs to payment proof documents
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationNote: { type: String, default: '' },
  
  // Dates
  dueDate: { type: Date },
  paidAt: { type: Date },
  
  // Payment history and audit trail
  history: [PaymentHistorySchema],
  
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
  
  // Tags for categorization
  tags: [{ type: String }],
  
  // System metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  
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
PaymentSchema.index({ propertyId: 1, status: 1 });
PaymentSchema.index({ payerId: 1, status: 1 });
PaymentSchema.index({ payeeId: 1, status: 1 });
PaymentSchema.index({ requestId: 1 });
PaymentSchema.index({ type: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ dueDate: 1 });
PaymentSchema.index({ paidAt: -1 });

// Pre-save middleware to update history
PaymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.history.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
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

module.exports = mongoose.model('Payment', PaymentSchema);