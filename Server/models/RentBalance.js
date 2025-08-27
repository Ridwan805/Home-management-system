const mongoose = require('mongoose');

// Rent Balance Schema for rent-specific financial tracking
const RentBalanceSchema = new mongoose.Schema({
  rentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rent',
    required: true,
    unique: true
  },
  
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  tenantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Current financial state
  currentBalance: {
    type: Number,
    default: 0 // Positive = tenant owes, Negative = overpaid/credit
  },
  
  totalRentCharged: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalOutstanding: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalOverdue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Security deposit tracking
  securityDepositHeld: {
    type: Number,
    default: 0,
    min: 0
  },
  
  securityDepositPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Late fees
  totalLateFees: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lateFeesOutstanding: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Currency
  currency: {
    type: String,
    default: 'BDT',
    enum: ['BDT', 'USD', 'EUR']
  },
  
  // Invoice tracking
  nextInvoiceDate: {
    type: Date,
    required: false
  },
  
  lastInvoiceDate: {
    type: Date,
    required: false
  },
  
  totalInvoices: {
    type: Number,
    default: 0,
    min: 0
  },
  
  paidInvoices: {
    type: Number,
    default: 0,
    min: 0
  },
  
  overdueInvoices: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment tracking
  lastPaymentAt: {
    type: Date,
    required: false
  },
  
  lastPaymentAmount: {
    type: Number,
    default: 0
  },
  
  totalPayments: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Monthly payment history (last 12 months)
  monthlyHistory: [{
    month: {
      type: String,
      required: true // Format: 'YYYY-MM'
    },
    rentDue: {
      type: Number,
      default: 0
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    lateFees: {
      type: Number,
      default: 0
    },
    balance: {
      type: Number,
      default: 0
    },
    invoicesGenerated: {
      type: Number,
      default: 0
    },
    paymentsReceived: {
      type: Number,
      default: 0
    },
    daysLate: {
      type: Number,
      default: 0
    }
  }],
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  hasOverdueBalance: {
    type: Boolean,
    default: false
  },
  
  autoGenerateInvoices: {
    type: Boolean,
    default: true
  },
  
  // Grace period tracking
  gracePeriodDays: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Last calculation metadata
  lastCalculatedAt: {
    type: Date,
    default: Date.now
  },
  
  calculationVersion: {
    type: String,
    default: '1.0'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'RentBalances'
});

// Indexes for better query performance
RentBalanceSchema.index({ rentId: 1 }, { unique: true });
RentBalanceSchema.index({ propertyId: 1 });
RentBalanceSchema.index({ ownerId: 1 });
RentBalanceSchema.index({ tenantIds: 1 });
RentBalanceSchema.index({ currentBalance: -1 });
RentBalanceSchema.index({ totalOutstanding: -1 });
RentBalanceSchema.index({ nextInvoiceDate: 1 });
RentBalanceSchema.index({ hasOverdueBalance: 1, isActive: 1 });
RentBalanceSchema.index({ lastCalculatedAt: 1 });
RentBalanceSchema.index({ isActive: 1, autoGenerateInvoices: 1 });

// Pre-save middleware to update calculated fields
RentBalanceSchema.pre('save', function(next) {
  // Calculate current balance
  this.currentBalance = this.totalRentCharged - this.totalPaid;
  
  // Update overdue flag
  this.hasOverdueBalance = this.totalOverdue > 0;
  
  // Update outstanding amount
  this.totalOutstanding = Math.max(0, this.currentBalance);
  
  next();
});

// Instance methods
RentBalanceSchema.methods.addPayment = function(amount, paidAt = new Date()) {
  this.totalPaid += amount;
  this.totalPayments += 1;
  this.lastPaymentAt = paidAt;
  this.lastPaymentAmount = amount;
  
  // Update monthly history
  const month = paidAt.toISOString().substring(0, 7); // YYYY-MM
  this.addMonthlyData(month, { amountPaid: amount, paymentsReceived: 1 });
  
  return this.save();
};

RentBalanceSchema.methods.addRentCharge = function(amount, month = null) {
  this.totalRentCharged += amount;
  
  if (month) {
    this.addMonthlyData(month, { rentDue: amount });
  }
  
  return this.save();
};

RentBalanceSchema.methods.addLateFee = function(amount, month = null) {
  this.totalLateFees += amount;
  this.lateFeesOutstanding += amount;
  
  if (month) {
    this.addMonthlyData(month, { lateFees: amount });
  }
  
  return this.save();
};

RentBalanceSchema.methods.addMonthlyData = function(month, data) {
  const existingIndex = this.monthlyHistory.findIndex(item => item.month === month);
  
  if (existingIndex >= 0) {
    // Update existing month
    const existing = this.monthlyHistory[existingIndex];
    this.monthlyHistory[existingIndex] = {
      month,
      rentDue: existing.rentDue + (data.rentDue || 0),
      amountPaid: existing.amountPaid + (data.amountPaid || 0),
      lateFees: existing.lateFees + (data.lateFees || 0),
      balance: existing.balance + (data.balance || 0),
      invoicesGenerated: existing.invoicesGenerated + (data.invoicesGenerated || 0),
      paymentsReceived: existing.paymentsReceived + (data.paymentsReceived || 0),
      daysLate: Math.max(existing.daysLate, data.daysLate || 0)
    };
  } else {
    // Add new month
    this.monthlyHistory.push({ month, ...data });
    
    // Keep only last 12 months
    this.monthlyHistory.sort((a, b) => b.month.localeCompare(a.month));
    if (this.monthlyHistory.length > 12) {
      this.monthlyHistory = this.monthlyHistory.slice(0, 12);
    }
  }
  
  return this;
};

RentBalanceSchema.methods.updateNextInvoiceDate = function(date) {
  this.nextInvoiceDate = date;
  return this.save();
};

RentBalanceSchema.methods.markInvoiceGenerated = function(invoiceDate = new Date()) {
  this.lastInvoiceDate = invoiceDate;
  this.totalInvoices += 1;
  
  const month = invoiceDate.toISOString().substring(0, 7);
  this.addMonthlyData(month, { invoicesGenerated: 1 });
  
  return this.save();
};

RentBalanceSchema.methods.markInvoicePaid = function() {
  this.paidInvoices += 1;
  return this.save();
};

RentBalanceSchema.methods.markInvoiceOverdue = function() {
  this.overdueInvoices += 1;
  return this.save();
};

RentBalanceSchema.methods.deactivate = function() {
  this.isActive = false;
  this.autoGenerateInvoices = false;
  return this.save();
};

RentBalanceSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

RentBalanceSchema.methods.getPaymentHistory = function(months = 12) {
  return this.monthlyHistory
    .slice(0, months)
    .sort((a, b) => a.month.localeCompare(b.month));
};

RentBalanceSchema.methods.getAverageMonthlyPayment = function(months = 6) {
  const history = this.getPaymentHistory(months);
  if (history.length === 0) return 0;
  
  const totalPaid = history.reduce((sum, month) => sum + month.amountPaid, 0);
  return totalPaid / history.length;
};

RentBalanceSchema.methods.getDaysOverdue = function() {
  if (!this.hasOverdueBalance || !this.nextInvoiceDate) return 0;
  
  const now = new Date();
  const diffTime = now - this.nextInvoiceDate;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

// Static methods
RentBalanceSchema.statics.findByRent = function(rentId) {
  return this.findOne({ rentId, isDeleted: false });
};

RentBalanceSchema.statics.findOrCreateByRent = async function(rentId, propertyId, ownerId, tenantIds) {
  let balance = await this.findByRent(rentId);
  
  if (!balance) {
    balance = new this({ 
      rentId, 
      propertyId, 
      ownerId, 
      tenantIds: Array.isArray(tenantIds) ? tenantIds : [tenantIds]
    });
    await balance.save();
  }
  
  return balance;
};

RentBalanceSchema.statics.findByProperty = function(propertyId) {
  return this.find({ propertyId, isDeleted: false });
};

RentBalanceSchema.statics.findByOwner = function(ownerId) {
  return this.find({ ownerId, isDeleted: false });
};

RentBalanceSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantIds: tenantId, isDeleted: false });
};

RentBalanceSchema.statics.findWithOutstandingBalance = function(minAmount = 0) {
  return this.find({ 
    totalOutstanding: { $gt: minAmount },
    isActive: true,
    isDeleted: false 
  }).sort({ totalOutstanding: -1 });
};

RentBalanceSchema.statics.findOverdue = function() {
  return this.find({ 
    hasOverdueBalance: true,
    isActive: true,
    isDeleted: false 
  }).sort({ totalOverdue: -1 });
};

RentBalanceSchema.statics.findReadyForInvoicing = function() {
  const now = new Date();
  return this.find({ 
    isActive: true,
    autoGenerateInvoices: true,
    nextInvoiceDate: { $lte: now },
    isDeleted: false 
  }).sort({ nextInvoiceDate: 1 });
};

RentBalanceSchema.statics.findStaleCalculations = function(hoursOld = 24) {
  const cutoff = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
  return this.find({ 
    lastCalculatedAt: { $lt: cutoff },
    isActive: true,
    isDeleted: false 
  });
};

RentBalanceSchema.statics.getTopPerformingRents = function(limit = 10) {
  return this.find({ isActive: true, isDeleted: false })
    .sort({ totalPaid: -1 })
    .limit(limit)
    .populate('rentId propertyId ownerId tenantIds');
};

RentBalanceSchema.statics.getWorstPerformingRents = function(limit = 10) {
  return this.find({ isActive: true, isDeleted: false })
    .sort({ totalOverdue: -1, currentBalance: -1 })
    .limit(limit)
    .populate('rentId propertyId ownerId tenantIds');
};

module.exports = mongoose.model('RentBalance', RentBalanceSchema);