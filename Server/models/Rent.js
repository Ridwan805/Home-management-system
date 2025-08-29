const mongoose = require('mongoose');

// Define valid rent statuses
const RENT_STATUSES = ['Pending', 'Active', 'Paused', 'Terminated', 'Expired'];

// Define valid term types
const TERM_TYPES = ['fixed', 'month_to_month'];

// Define valid billing frequencies
const BILLING_FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

// History event schema for tracking rent lifecycle
const RentHistorySchema = new mongoose.Schema({
  event: { type: String, required: true },
  status: { type: String, enum: RENT_STATUSES },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Security deposit deduction schema
const DeductionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  deductedAt: { type: Date, default: Date.now },
  deductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Main Rent schema
const RentSchema = new mongoose.Schema({
  // Core relationships
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
  tenants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }],
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Request' 
  },
  
  // Term details
  term: {
    type: { 
      type: String, 
      enum: TERM_TYPES, 
      required: true 
    },
    startDate: { 
      type: Date, 
      required: true 
    },
    endDate: { 
      type: Date 
    },
    noticeDays: { 
      type: Number, 
      default: 30,
      min: 0 
    }
  },
  
  // Rent payment details
  rent: {
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'BDT', 
      required: true 
    },
    dueDay: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 31 
    },
    graceDays: { 
      type: Number, 
      default: 5, 
      min: 0 
    },
    lateFee: {
      amount: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
      percentage: { type: Number, default: 0, min: 0, max: 100 }
    }
  },
  
  // Security deposit details
  securityDeposit: {
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    held: { 
      type: Number, 
      default: function() { return this.amount; },
      min: 0 
    },
    releasedAt: { 
      type: Date 
    },
    deductions: [DeductionSchema]
  },
  
  // Billing configuration
  billing: {
    frequency: { 
      type: String, 
      enum: BILLING_FREQUENCIES, 
      default: 'monthly' 
    },
    nextInvoiceDate: { 
      type: Date, 
      required: true 
    },
    autoGenerate: { 
      type: Boolean, 
      default: true 
    },
    lastInvoiceDate: { 
      type: Date 
    }
  },
  
  // Status management
  status: { 
    type: String, 
    enum: RENT_STATUSES, 
    default: 'Pending', 
    required: true 
  },
  
  // History and audit trail
  history: [RentHistorySchema],
  
  // Additional metadata
  notes: { 
    type: String, 
    default: '' 
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
  collection: 'Rents'
});

// Indexes for better query performance
RentSchema.index({ propertyId: 1, status: 1 });
RentSchema.index({ tenants: 1, status: 1 });
RentSchema.index({ ownerId: 1 });
RentSchema.index({ 'billing.nextInvoiceDate': 1 });
RentSchema.index({ status: 1 });
RentSchema.index({ createdAt: -1 });
RentSchema.index({ 'term.startDate': 1, 'term.endDate': 1 });

// Pre-save middleware to update history
RentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.history.push({
      event: `Status changed to ${this.status}`,
      status: this.status,
      timestamp: new Date(),
      note: `Rent status updated to ${this.status}`
    });
  }
  
  // Set held amount to deposit amount if not set
  if (this.securityDeposit && !this.securityDeposit.held) {
    this.securityDeposit.held = this.securityDeposit.amount;
  }
  
  next();
});

// Post-delete middleware to handle property status updates
RentSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after rent ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-rent-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after rent ${doc._id} deletion`);
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for rent:', error);
    }
  }
});

RentSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after rent ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-rent-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after rent ${doc._id} deletion`);
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for rent:', error);
    }
  }
});

RentSchema.post('deleteMany', async function() {
  try {
    // For bulk deletes, run a full cleanup check
    const PropertyCleanupService = require('../services/propertyCleanupService');
    
    console.log('🧹 Running property cleanup after bulk rent deletion...');
    await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'auto-cleanup-bulk-rent-delete'
    });
  } catch (error) {
    console.error('Error in post-bulk-delete property cleanup for rents:', error);
  }
});

// Instance methods
RentSchema.methods.activate = function(activatedBy, note = '') {
  this.status = 'Active';
  this.history.push({
    event: 'Rent activated',
    status: 'Active',
    timestamp: new Date(),
    note: note || 'Rent contract activated',
    updatedBy: activatedBy
  });
  return this.save();
};

RentSchema.methods.terminate = function(terminatedBy, reason = '') {
  this.status = 'Terminated';
  this.history.push({
    event: 'Rent terminated',
    status: 'Terminated',
    timestamp: new Date(),
    note: reason || 'Rent contract terminated',
    updatedBy: terminatedBy
  });
  return this.save();
};

RentSchema.methods.pause = function(pausedBy, reason = '') {
  this.status = 'Paused';
  this.history.push({
    event: 'Rent paused',
    status: 'Paused',
    timestamp: new Date(),
    note: reason || 'Rent contract paused',
    updatedBy: pausedBy
  });
  return this.save();
};

RentSchema.methods.addDeduction = function(amount, reason, description = '', deductedBy) {
  const deduction = {
    amount,
    reason,
    description,
    deductedAt: new Date(),
    deductedBy
  };
  
  this.securityDeposit.deductions.push(deduction);
  this.securityDeposit.held = Math.max(0, this.securityDeposit.held - amount);
  
  this.history.push({
    event: 'Security deposit deduction',
    timestamp: new Date(),
    note: `Deducted ${amount} for ${reason}`,
    updatedBy: deductedBy,
    metadata: { deduction }
  });
  
  return this.save();
};

RentSchema.methods.releaseDeposit = function(releasedBy, note = '') {
  this.securityDeposit.releasedAt = new Date();
  this.history.push({
    event: 'Security deposit released',
    timestamp: new Date(),
    note: note || 'Security deposit released to tenant',
    updatedBy: releasedBy,
    metadata: { 
      releasedAmount: this.securityDeposit.held,
      totalDeductions: this.securityDeposit.deductions.reduce((sum, d) => sum + d.amount, 0)
    }
  });
  return this.save();
};

// Static methods
RentSchema.statics.findActiveByProperty = function(propertyId) {
  return this.findOne({ propertyId, status: 'Active', isDeleted: false });
};

RentSchema.statics.findByTenant = function(tenantId, status = null) {
  const query = { tenants: tenantId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('propertyId ownerId');
};

RentSchema.statics.findByOwner = function(ownerId, status = null) {
  const query = { ownerId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('propertyId tenants');
};

RentSchema.statics.findDueForInvoicing = function() {
  const today = new Date();
  return this.find({
    status: 'Active',
    'billing.autoGenerate': true,
    'billing.nextInvoiceDate': { $lte: today },
    isDeleted: false
  });
};

module.exports = mongoose.model('Rent', RentSchema);