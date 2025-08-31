const mongoose = require('mongoose');

// Define subscription statuses
const SUBSCRIPTION_STATUSES = ['active', 'warning', 'overdue', 'frozen', 'cancelled'];

// Define payment reminder types
const REMINDER_TYPES = ['14_days', '7_days', '1_day', 'overdue', 'final_warning'];

// Payment history schema for subscription payments
const SubscriptionPaymentHistorySchema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String },
  receiptUrl: { type: String },
  billingPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  lateFee: { type: Number, default: 0 },
  status: { type: String, enum: ['completed', 'failed', 'refunded'], default: 'completed' }
}, { _id: false });

// Reminder history schema
const ReminderHistorySchema = new mongoose.Schema({
  type: { type: String, enum: REMINDER_TYPES, required: true },
  sentAt: { type: Date, default: Date.now },
  method: { type: String, enum: ['email', 'sms', 'notification'], required: true },
  status: { type: String, enum: ['sent', 'failed', 'delivered'], default: 'sent' },
  message: { type: String }
}, { _id: false });

// Account freeze history schema
const FreezeHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['freeze', 'unfreeze'], required: true },
  reason: { type: String, required: true },
  frozenAt: { type: Date },
  unfrozenAt: { type: Date },
  frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
  appealSubmitted: { type: Boolean, default: false },
  appealReason: { type: String },
  appealStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { _id: false });

// Subscription configuration schema
const SubscriptionConfigSchema = new mongoose.Schema({
  monthlyFee: { type: Number, required: true, default: 500 }, // Default monthly fee in BDT
  currency: { type: String, default: 'BDT' },
  paymentDeadline: { type: Number, default: 5 }, // Day of month (1-31)
  gracePeriodDays: { type: Number, default: 7 }, // Grace period after deadline
  lateFeePercentage: { type: Number, default: 5 }, // Late fee as percentage of monthly fee
  autoFreezeAfterDays: { type: Number, default: 15 }, // Auto-freeze after X days overdue
  reminderSchedule: {
    fourteenDays: { type: Boolean, default: true },
    sevenDays: { type: Boolean, default: true },
    oneDay: { type: Boolean, default: true },
    overdue: { type: Boolean, default: true },
    finalWarning: { type: Boolean, default: true }
  }
}, { _id: false });

const SubscriptionSchema = new mongoose.Schema({
  // Owner reference
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Subscription status
  status: {
    type: String,
    enum: SUBSCRIPTION_STATUSES,
    default: 'active',
    required: true
  },
  
  // Current billing period
  currentBillingPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    dueDate: { type: Date, required: true },
    lateFee: { type: Number, default: 0 }
  },
  
  // Next billing period
  nextBillingPeriod: {
    startDate: { type: Date },
    endDate: { type: Date },
    amount: { type: Number },
    currency: { type: String, default: 'BDT' },
    dueDate: { type: Date }
  },
  
  // Payment tracking
  totalPaid: { type: Number, default: 0 },
  totalOutstanding: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  paymentHistory: [SubscriptionPaymentHistorySchema],
  
  // Account freeze information
  isFrozen: { type: Boolean, default: false },
  frozenAt: { type: Date },
  frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  freezeReason: { type: String },
  freezeHistory: [FreezeHistorySchema],
  
  // Reminder tracking
  reminderHistory: [ReminderHistorySchema],
  lastReminderSent: { type: Date },
  reminderCount: { type: Number, default: 0 },
  
  // Configuration (can be customized per owner)
  config: {
    type: SubscriptionConfigSchema,
    default: () => ({})
  },
  
  // Properties owned (for multiple property handling)
  propertyCount: { type: Number, default: 0 },
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  
  // Special considerations
  hasHardshipException: { type: Boolean, default: false },
  hardshipDetails: {
    reason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    expiresAt: { type: Date },
    customPaymentPlan: {
      installmentAmount: { type: Number },
      installmentFrequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'] },
      totalInstallments: { type: Number }
    }
  },
  
  // Audit trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Metadata
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'Subscriptions'
});

// Indexes for performance
SubscriptionSchema.index({ ownerId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ 'currentBillingPeriod.dueDate': 1 });
SubscriptionSchema.index({ 'currentBillingPeriod.isPaid': 1 });
SubscriptionSchema.index({ isFrozen: 1 });
SubscriptionSchema.index({ createdAt: -1 });
SubscriptionSchema.index({ lastPaymentDate: -1 });
SubscriptionSchema.index({ totalOutstanding: -1 });

// Virtual for days overdue
SubscriptionSchema.virtual('daysOverdue').get(function() {
  if (this.currentBillingPeriod.isPaid) return 0;
  const now = new Date();
  const dueDate = new Date(this.currentBillingPeriod.dueDate);
  if (now <= dueDate) return 0;
  return Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
});

// Virtual for grace period status
SubscriptionSchema.virtual('isInGracePeriod').get(function() {
  const daysOverdue = this.daysOverdue;
  return daysOverdue > 0 && daysOverdue <= this.config.gracePeriodDays;
});

// Virtual for auto-freeze eligibility
SubscriptionSchema.virtual('shouldAutoFreeze').get(function() {
  return this.daysOverdue > this.config.autoFreezeAfterDays && !this.isFrozen;
});

// Instance methods
SubscriptionSchema.methods.calculateLateFee = function() {
  if (this.currentBillingPeriod.isPaid || this.daysOverdue <= this.config.gracePeriodDays) {
    return 0;
  }
  return Math.round(this.currentBillingPeriod.amount * (this.config.lateFeePercentage / 100));
};

SubscriptionSchema.methods.markAsPaid = function(paymentId, paymentDate = new Date(), paymentMethod = 'stripe') {
  this.currentBillingPeriod.isPaid = true;
  this.currentBillingPeriod.paidAt = paymentDate;
  this.lastPaymentDate = paymentDate;
  this.totalPaid += this.currentBillingPeriod.amount;
  this.totalOutstanding = Math.max(0, this.totalOutstanding - this.currentBillingPeriod.amount);
  
  // Add to payment history
  this.paymentHistory.push({
    paymentId: paymentId,
    amount: this.currentBillingPeriod.amount,
    paymentDate: paymentDate,
    paymentMethod: paymentMethod,
    billingPeriod: {
      startDate: this.currentBillingPeriod.startDate,
      endDate: this.currentBillingPeriod.endDate
    },
    lateFee: this.currentBillingPeriod.lateFee
  });
  
  // Update status if was overdue
  if (this.status === 'overdue' || this.status === 'warning') {
    this.status = 'active';
  }
  
  return this.save();
};

SubscriptionSchema.methods.freezeAccount = function(reason, frozenBy, notes = '') {
  this.isFrozen = true;
  this.frozenAt = new Date();
  this.frozenBy = frozenBy;
  this.freezeReason = reason;
  this.status = 'frozen';
  
  // Add to freeze history
  this.freezeHistory.push({
    action: 'freeze',
    reason: reason,
    frozenAt: this.frozenAt,
    frozenBy: frozenBy,
    notes: notes
  });
  
  return this.save();
};

SubscriptionSchema.methods.unfreezeAccount = function(reason, unfrozenBy, notes = '') {
  this.isFrozen = false;
  this.frozenAt = null;
  this.frozenBy = null;
  this.freezeReason = null;
  
  // Determine new status based on payment status
  if (this.currentBillingPeriod.isPaid) {
    this.status = 'active';
  } else if (this.daysOverdue > this.config.gracePeriodDays) {
    this.status = 'overdue';
  } else if (this.daysOverdue > 0) {
    this.status = 'warning';
  } else {
    this.status = 'active';
  }
  
  // Add to freeze history
  this.freezeHistory.push({
    action: 'unfreeze',
    reason: reason,
    unfrozenAt: new Date(),
    frozenBy: unfrozenBy,
    notes: notes
  });
  
  return this.save();
};

SubscriptionSchema.methods.addReminder = function(type, method = 'email', message = '') {
  this.reminderHistory.push({
    type: type,
    method: method,
    message: message
  });
  this.lastReminderSent = new Date();
  this.reminderCount += 1;
  
  return this.save();
};

SubscriptionSchema.methods.generateNextBillingPeriod = function() {
  const currentEnd = new Date(this.currentBillingPeriod.endDate);
  const nextStart = new Date(currentEnd);
  nextStart.setDate(nextStart.getDate() + 1);
  
  const nextEnd = new Date(nextStart);
  nextEnd.setMonth(nextEnd.getMonth() + 1);
  nextEnd.setDate(0); // Last day of the month
  
  const nextDue = new Date(nextStart);
  nextDue.setDate(this.config.paymentDeadline);
  
  this.nextBillingPeriod = {
    startDate: nextStart,
    endDate: nextEnd,
    amount: this.config.monthlyFee,
    currency: this.config.currency,
    dueDate: nextDue
  };
  
  return this.save();
};

// Static methods
SubscriptionSchema.statics.findOverdueSubscriptions = function() {
  const now = new Date();
  return this.find({
    'currentBillingPeriod.isPaid': false,
    'currentBillingPeriod.dueDate': { $lt: now },
    isFrozen: false,
    isDeleted: false
  }).populate('ownerId', 'name firstName email notificationPreferences');
};

SubscriptionSchema.statics.findSubscriptionsForReminder = function(reminderType) {
  const now = new Date();
  
  if (reminderType) {
    let daysAhead;
    
    switch (reminderType) {
      case '14_days':
        daysAhead = 14;
        break;
      case '7_days':
        daysAhead = 7;
        break;
      case '1_day':
        daysAhead = 1;
        break;
      default:
        return this.find({});
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    
    return this.find({
      'currentBillingPeriod.isPaid': false,
      'currentBillingPeriod.dueDate': {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
      },
      isFrozen: false,
      isDeleted: false
    });
  }
  
  // When no reminderType specified, return all unpaid subscriptions that need reminders
  const fourteenDaysFromNow = new Date(now);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  
  return this.find({
    'currentBillingPeriod.isPaid': false,
    'currentBillingPeriod.dueDate': {
      $lte: fourteenDaysFromNow // Due within 14 days or overdue
    },
    isFrozen: false,
    isDeleted: false
  }).populate('ownerId', 'name firstName email notificationPreferences');
};

SubscriptionSchema.statics.getSubscriptionStats = function() {
  return this.aggregate([
    {
      $match: { isDeleted: false }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOutstanding: { $sum: '$totalOutstanding' },
        totalPaid: { $sum: '$totalPaid' }
      }
    }
  ]);
};

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// Export constants
Subscription.STATUSES = SUBSCRIPTION_STATUSES;
Subscription.REMINDER_TYPES = REMINDER_TYPES;

module.exports = Subscription;
module.exports.SUBSCRIPTION_STATUSES = SUBSCRIPTION_STATUSES;
module.exports.REMINDER_TYPES = REMINDER_TYPES;