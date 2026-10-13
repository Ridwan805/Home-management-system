const mongoose = require('mongoose');

// User Ledger Summary Schema for dashboard aggregations
const UserLedgerSummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Financial totals
  totalPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReceived: {
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
  
  // Currency
  currency: {
    type: String,
    default: 'BDT',
    enum: ['BDT', 'USD', 'EUR']
  },
  
  // Payment activity
  lastPaidAt: {
    type: Date,
    required: false
  },
  lastReceivedAt: {
    type: Date,
    required: false
  },
  
  // Counts
  totalPayments: {
    type: Number,
    default: 0,
    min: 0
  },
  totalInvoices: {
    type: Number,
    default: 0,
    min: 0
  },
  overdueInvoices: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Monthly breakdown (last 12 months)
  monthlyBreakdown: [{
    month: {
      type: String,
      required: true // Format: 'YYYY-MM'
    },
    paid: {
      type: Number,
      default: 0
    },
    received: {
      type: Number,
      default: 0
    },
    outstanding: {
      type: Number,
      default: 0
    },
    invoicesCount: {
      type: Number,
      default: 0
    },
    paymentsCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Property-specific summaries (for owners)
  propertySummaries: [{
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    totalReceived: {
      type: Number,
      default: 0
    },
    totalOutstanding: {
      type: Number,
      default: 0
    },
    lastPaymentAt: {
      type: Date
    },
    currentRentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rent'
    }
  }],
  
  // Rent-specific summaries (for tenants)
  rentSummaries: [{
    rentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rent',
      required: true
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    totalOutstanding: {
      type: Number,
      default: 0
    },
    lastPaymentAt: {
      type: Date
    },
    nextDueDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Last calculation timestamp
  lastCalculatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Calculation metadata
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
  collection: 'UserLedgerSummaries'
});

// Indexes for better query performance (userId unique index is defined on field)
UserLedgerSummarySchema.index({ lastCalculatedAt: 1 });
UserLedgerSummarySchema.index({ totalOutstanding: -1 });
UserLedgerSummarySchema.index({ totalOverdue: -1 });
UserLedgerSummarySchema.index({ 'propertySummaries.propertyId': 1 });
UserLedgerSummarySchema.index({ 'rentSummaries.rentId': 1 });

// Instance methods
UserLedgerSummarySchema.methods.addMonthlyData = function(month, data) {
  const existingIndex = this.monthlyBreakdown.findIndex(item => item.month === month);
  
  if (existingIndex >= 0) {
    // Update existing month
    this.monthlyBreakdown[existingIndex] = { ...this.monthlyBreakdown[existingIndex], ...data, month };
  } else {
    // Add new month
    this.monthlyBreakdown.push({ month, ...data });
    
    // Keep only last 12 months
    this.monthlyBreakdown.sort((a, b) => b.month.localeCompare(a.month));
    if (this.monthlyBreakdown.length > 12) {
      this.monthlyBreakdown = this.monthlyBreakdown.slice(0, 12);
    }
  }
  
  return this.save();
};

UserLedgerSummarySchema.methods.updatePropertySummary = function(propertyId, data) {
  const existingIndex = this.propertySummaries.findIndex(item => 
    item.propertyId.toString() === propertyId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing property
    this.propertySummaries[existingIndex] = { 
      ...this.propertySummaries[existingIndex], 
      ...data, 
      propertyId 
    };
  } else {
    // Add new property
    this.propertySummaries.push({ propertyId, ...data });
  }
  
  return this.save();
};

UserLedgerSummarySchema.methods.updateRentSummary = function(rentId, data) {
  const existingIndex = this.rentSummaries.findIndex(item => 
    item.rentId.toString() === rentId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing rent
    this.rentSummaries[existingIndex] = { 
      ...this.rentSummaries[existingIndex], 
      ...data, 
      rentId 
    };
  } else {
    // Add new rent
    this.rentSummaries.push({ rentId, ...data });
  }
  
  return this.save();
};

UserLedgerSummarySchema.methods.markCalculated = function() {
  this.lastCalculatedAt = new Date();
  return this.save();
};

UserLedgerSummarySchema.methods.getActiveRents = function() {
  return this.rentSummaries.filter(rent => rent.isActive);
};

UserLedgerSummarySchema.methods.getOverdueAmount = function() {
  return this.totalOverdue;
};

UserLedgerSummarySchema.methods.getNetBalance = function() {
  return this.totalReceived - this.totalPaid;
};

// Static methods
UserLedgerSummarySchema.statics.findByUser = function(userId) {
  return this.findOne({ userId, isDeleted: false });
};

UserLedgerSummarySchema.statics.findOrCreateByUser = async function(userId) {
  let summary = await this.findByUser(userId);
  
  if (!summary) {
    summary = new this({ userId });
    await summary.save();
  }
  
  return summary;
};

UserLedgerSummarySchema.statics.findUsersWithOutstanding = function(minAmount = 0) {
  return this.find({ 
    totalOutstanding: { $gt: minAmount },
    isDeleted: false 
  }).sort({ totalOutstanding: -1 });
};

UserLedgerSummarySchema.statics.findUsersWithOverdue = function(minAmount = 0) {
  return this.find({ 
    totalOverdue: { $gt: minAmount },
    isDeleted: false 
  }).sort({ totalOverdue: -1 });
};

UserLedgerSummarySchema.statics.findStaleCalculations = function(hoursOld = 24) {
  const cutoff = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
  return this.find({ 
    lastCalculatedAt: { $lt: cutoff },
    isDeleted: false 
  });
};

UserLedgerSummarySchema.statics.getTopPayers = function(limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ totalPaid: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

UserLedgerSummarySchema.statics.getTopEarners = function(limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ totalReceived: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

module.exports = mongoose.model('UserLedgerSummary', UserLedgerSummarySchema);