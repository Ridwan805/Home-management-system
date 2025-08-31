const mongoose = require('mongoose');

// Define valid status values for the request lifecycle
const VALID_STATUSES = [
  'Submitted',
  'Under Review',
  'Info Requested',
  'Approved – Pay Advance',
  'Payment Submitted',
  'AdvancePaid',
  'Confirmed for Sale',
  'Refunded',
  'Paid/Completed',
  'Rejected',
  'Canceled',
  'Expired'
];

// Define valid request types
const REQUEST_TYPES = ['Rent', 'Buy'];

// Timeline event schema for tracking request history
const TimelineEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { _id: false });

// Message schema for tenant-owner communication
const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  attachments: [{ type: String }] // URLs to uploaded files
}, { _id: true });

// Advance payment schema for handling payment details
const AdvancePaymentSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'Paid', 'failed'], default: 'pending' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  dueDate: { type: Date, required: true },
  instructions: { type: String, default: '' },
  note: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  stripeSessionId: { type: String, default: '' },
  paymentIntentId: { type: String, default: '' },
  paidAt: { type: Date },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationNote: { type: String, default: '' },
  isPaid: { type: Boolean, default: false },
  canPayAgain: { type: Boolean, default: false },
  paymentId: { type: String, default: '' }
}, { _id: false });

// Full payment schema for handling complete payment details
const FullPaymentSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  stripeSessionId: { type: String, default: '' },
  paymentIntentId: { type: String, default: '' },
  paidAt: { type: Date },
  proofUrl: { type: String, default: '' },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationNote: { type: String, default: '' },
  canPayAgain: { type: Boolean, default: false }
}, { _id: false });

// Main Request schema
const RequestSchema = new mongoose.Schema({
  // IDs & Context
  requestId: { 
    type: String, 
    unique: true,
    default: function() {
      return 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
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
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  requestType: { 
    type: String, 
    enum: REQUEST_TYPES, 
    required: true 
  },
  
  // New fields for linking to contracts
  rentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rent',
    required: false // Set when rental request is approved and Rent is created
  },
  ownershipTransferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OwnershipTransfer',
    required: false // Set when purchase request is approved and OwnershipTransfer is created
  },

  // Payload - Stores all submitted form data from unified inquiry form
  payload: {
    // Family Members (≥1 required)
    familyMembers: [{
      name: { type: String, required: true },
      relation: { type: String, required: true },
      age: { type: Number, required: true }
    }],
    
    // Belongings with pets/vehicle toggles
    belongings: {
      items: [{ type: String }], // Free input list
      hasPets: { type: Boolean, default: false },
      petDetails: { type: String, default: '' },
      hasVehicle: { type: Boolean, default: false },
      vehicleDetails: { type: String, default: '' }
    },
    
    // Occupation details
    occupation: {
      employmentType: { type: String, required: true }, // employed, self-employed, student, unemployed
      role: { type: String, required: true },
      yearsOfExperience: { type: Number, required: true },
      // Conditional employer fields
      companyName: { type: String },
      companyAddress: { type: String },
      supervisorName: { type: String },
      supervisorContact: { type: String }
    },
    
    // Identity & Compliance with file uploads
    identity: {
      nidFileUrl: { type: String, required: true }, // Required NID card
      tinFileUrl: { type: String }, // Optional TIN certificate
      personalPhotoUrl: { type: String, required: true } // Required personal photo
    },
    
    // Financial Information
    financials: {
      monthlyIncome: { type: Number, required: true },
      // Optional fields
      bankName: { type: String },
      accountNumber: { type: String },
      creditScore: { type: Number },
      additionalIncome: { type: Number },
      incomeSource: { type: String }
    },
    
    // Letter to Owner
    letterToOwner: { 
      type: String, 
      required: true,
      minlength: 20,
      maxlength: 1500
    }
  },

  // Status Management
  status: { 
    type: String, 
    enum: VALID_STATUSES, 
    default: 'Submitted',
    required: true 
  },
  
  // Payment status at request level
  isPaid: {
    type: Boolean,
    default: false
  },
  
  // Timeline for tracking all events
  timeline: [TimelineEventSchema],
  
  // Enhanced Consent Tracking
  consent: {
    agreed: { type: Boolean, required: true },
    version: { type: String, required: true, default: 'v1.0' },
    timestamp: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  
  // Advance Payment Details
  advancePayment: AdvancePaymentSchema,
  
  // Full payment details (only for Buy requests)
  fullPayment: {
    type: FullPaymentSchema,
    required: false,
    validate: {
      validator: function(value) {
        // Only allow fullPayment for Buy requests
        return this.requestType === 'Buy' || !value;
      },
      message: 'Full payment is not allowed for Rent requests'
    }
  },
  
  // Messaging thread between tenant and owner
  messages: [MessageSchema],
  
  // Additional Metadata
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'], 
    default: 'Medium' 
  },
  
  // Expiration handling
  expiresAt: { type: Date },
  
  // Internal notes for admins/owners
  internalNotes: [{
    note: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: true }
  }]
}, { 
  timestamps: true,
  collection: 'Requests'
});

// Middleware to automatically add timeline events on status changes
RequestSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      event: `Status changed to ${this.status}`,
      actor: this.modifiedBy || this.tenantId, // Should be set by the controller
      timestamp: new Date(),
      note: this.statusChangeNote || ''
    });
  }
  
  // Add initial submission event for new requests
  if (this.isNew) {
    this.timeline.push({
      event: 'Request submitted',
      actor: this.tenantId,
      timestamp: new Date(),
      note: 'Initial request submission'
    });
  }
  
  next();
});

// Middleware to automatically reset property status when request reaches terminal state
RequestSchema.post('save', async function(doc) {
  // Check if status was changed to a terminal state that should trigger property cleanup
  const terminalStates = ['Canceled', 'Rejected', 'Expired', 'Refunded'];
  
  if (this.isModified && this.isModified('status') && terminalStates.includes(doc.status)) {
    try {
      // Import services here to avoid circular dependency
      const PropertyCleanupService = require('../services/propertyCleanupService');
      const propertyStatusLogger = require('../utils/propertyStatusLogger');
      
      // Get property details for logging
      const Property = require('./Property');
      const property = await Property.findById(doc.propertyId);
      
      if (property) {
        const previousStatus = property.status;
        
        // Check if the property is now orphaned and reset if needed
        const wasReset = await PropertyCleanupService.resetOrphanedProperty(
          doc.propertyId.toString(),
          `auto-cleanup-on-${doc.status.toLowerCase()}`
        );
        
        if (wasReset) {
          console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after request ${doc._id} status changed to ${doc.status}`);
          
          // Log the status update
          await propertyStatusLogger.logStatusUpdate({
            propertyId: doc.propertyId.toString(),
            previousStatus,
            newStatus: 'Available',
            trigger: `request-${doc.status.toLowerCase()}`,
            triggeredBy: `auto-cleanup-on-${doc.status.toLowerCase()}`,
            source: 'Request.post-save',
            metadata: {
              requestId: doc._id.toString(),
              requestType: doc.requestType,
              requestStatus: doc.status,
              tenantId: doc.tenantId?.toString(),
              ownerId: doc.ownerId?.toString(),
              statusChangeReason: doc.statusChangeNote || 'Not specified'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in post-save property cleanup:', error);
      
      // Log the error
      try {
        const propertyStatusLogger = require('../utils/propertyStatusLogger');
        await propertyStatusLogger.logError({
          propertyId: doc.propertyId?.toString() || 'unknown',
          operation: 'request-status-change-cleanup',
          error: error.message,
          source: 'Request.post-save'
        });
      } catch (logError) {
        console.error('Error logging request cleanup error:', logError);
      }
    }
  }
});

// Static method to get valid status transitions
RequestSchema.statics.getValidStatusTransitions = function() {
  return {
    'Submitted': ['Under Review', 'Rejected', 'Canceled'],
    'Under Review': ['Info Requested', 'Approved – Pay Advance', 'Rejected', 'Canceled'],
    'Info Requested': ['Under Review', 'Rejected', 'Canceled', 'Expired'],
    'Approved – Pay Advance': ['Payment Submitted', 'Canceled', 'Expired'],
    'Payment Submitted': ['AdvancePaid', 'Under Review', 'Canceled'],
    'AdvancePaid': ['Paid/Completed', 'Confirmed for Sale', 'Refunded', 'Canceled'],
    'Confirmed for Sale': ['Paid/Completed', 'Canceled'],
    'Refunded': [], // Terminal state
    'Paid/Completed': [], // Terminal state
    'Rejected': [], // Terminal state
    'Canceled': [], // Terminal state
    'Expired': ['Under Review'] // Can be reopened
  };
};

// Instance method to check if status transition is valid
RequestSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = this.constructor.getValidStatusTransitions();
  const allowedStatuses = validTransitions[this.status] || [];
  return allowedStatuses.includes(newStatus);
};

// Instance method to transition status with validation
RequestSchema.methods.transitionStatus = function(newStatus, actor, note = '') {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  this.modifiedBy = actor;
  this.statusChangeNote = note;
  
  return this.save();
};

// Instance methods for contract linking
RequestSchema.methods.linkToRent = function(rentId) {
  if (this.requestType !== 'Rent') {
    throw new Error('Cannot link non-rental request to Rent');
  }
  if (this.status !== 'Paid/Completed') {
    throw new Error('Request must be completed before linking to Rent');
  }
  
  this.rentId = rentId;
  return this.save();
};

RequestSchema.methods.linkToOwnershipTransfer = function(ownershipTransferId) {
  if (this.requestType !== 'Buy') {
    throw new Error('Cannot link non-purchase request to OwnershipTransfer');
  }
  if (this.status !== 'Paid/Completed') {
    throw new Error('Request must be completed before linking to OwnershipTransfer');
  }
  
  this.ownershipTransferId = ownershipTransferId;
  return this.save();
};

// Static methods for contract linking queries
RequestSchema.statics.findByRent = function(rentId) {
  return this.findOne({ rentId });
};

RequestSchema.statics.findByOwnershipTransfer = function(ownershipTransferId) {
  return this.findOne({ ownershipTransferId });
};

RequestSchema.statics.findCompletedWithoutContract = function() {
  return this.find({
    status: 'Paid/Completed',
    $and: [
      { rentId: { $exists: false } },
      { ownershipTransferId: { $exists: false } }
    ]
  }).sort({ updatedAt: 1 });
};

// Middleware to handle property status cleanup when requests are deleted
RequestSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.propertyId) {
    try {
      // Import services here to avoid circular dependency
      const PropertyCleanupService = require('../services/propertyCleanupService');
      const propertyStatusLogger = require('../utils/propertyStatusLogger');
      
      // Get property details for logging
      const Property = require('./Property');
      const property = await Property.findById(doc.propertyId);
      
      if (property) {
        const previousStatus = property.status;
        
        // Check if the property is now orphaned and reset if needed
        const wasReset = await PropertyCleanupService.resetOrphanedProperty(
          doc.propertyId.toString(),
          'auto-cleanup-on-delete'
        );
        
        if (wasReset) {
          console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after request ${doc._id} deletion`);
          
          // Log the status update
          await propertyStatusLogger.logStatusUpdate({
            propertyId: doc.propertyId.toString(),
            previousStatus,
            newStatus: 'Available',
            trigger: 'request-deleted',
            triggeredBy: 'auto-cleanup-on-delete',
            source: 'Request.post-findOneAndDelete',
            metadata: {
              deletedRequestId: doc._id.toString(),
              requestType: doc.requestType,
              requestStatus: doc.status,
              tenantId: doc.tenantId?.toString(),
              ownerId: doc.ownerId?.toString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup:', error);
      
      // Log the error
      try {
        const propertyStatusLogger = require('../utils/propertyStatusLogger');
        await propertyStatusLogger.logError({
          propertyId: doc.propertyId?.toString() || 'unknown',
          operation: 'request-deletion-cleanup',
          error: error.message,
          source: 'Request.post-findOneAndDelete'
        });
      } catch (logError) {
        console.error('Error logging request deletion cleanup error:', logError);
      }
    }
  }
});

RequestSchema.post('deleteOne', async function() {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      const propertyStatusLogger = require('../utils/propertyStatusLogger');
      
      // Get property details for logging
      const Property = require('./Property');
      const property = await Property.findById(doc.propertyId);
      
      if (property) {
        const previousStatus = property.status;
        
        const wasReset = await PropertyCleanupService.resetOrphanedProperty(
          doc.propertyId.toString(),
          'auto-cleanup-on-delete'
        );
        
        if (wasReset) {
          console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after request ${doc._id} deletion`);
          
          // Log the status update
          await propertyStatusLogger.logStatusUpdate({
            propertyId: doc.propertyId.toString(),
            previousStatus,
            newStatus: 'Available',
            trigger: 'request-deleted',
            triggeredBy: 'auto-cleanup-on-delete',
            source: 'Request.post-deleteOne',
            metadata: {
              deletedRequestId: doc._id.toString(),
              requestType: doc.requestType,
              requestStatus: doc.status,
              tenantId: doc.tenantId?.toString(),
              ownerId: doc.ownerId?.toString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup:', error);
      
      // Log the error
      try {
        const propertyStatusLogger = require('../utils/propertyStatusLogger');
        await propertyStatusLogger.logError({
          propertyId: doc.propertyId?.toString() || 'unknown',
          operation: 'request-deletion-cleanup',
          error: error.message,
          source: 'Request.post-deleteOne'
        });
      } catch (logError) {
        console.error('Error logging request deletion cleanup error:', logError);
      }
    }
  }
});

RequestSchema.post('deleteMany', async function() {
  try {
    // For bulk deletes, run a full cleanup check
    const PropertyCleanupService = require('../services/propertyCleanupService');
    const propertyStatusLogger = require('../utils/propertyStatusLogger');
    
    console.log('🧹 Running property cleanup after bulk request deletion...');
    const cleanupResults = await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'auto-cleanup-bulk-delete'
    });
    
    // Log cleanup operation
    await propertyStatusLogger.logCleanupOperation({
      operation: 'bulk-request-deletion-cleanup',
      propertiesChecked: cleanupResults?.totalChecked || 0,
      orphanedFound: cleanupResults?.orphanedFound || 0,
      propertiesFixed: cleanupResults?.fixed || 0,
      errors: cleanupResults?.errors || [],
      triggeredBy: 'auto-cleanup-bulk-delete'
    });
    
  } catch (error) {
    console.error('Error in post-bulk-delete property cleanup:', error);
    
    // Log the error
    try {
      const propertyStatusLogger = require('../utils/propertyStatusLogger');
      await propertyStatusLogger.logError({
        propertyId: 'bulk-operation',
        operation: 'bulk-request-deletion-cleanup',
        error: error.message,
        source: 'Request.post-deleteMany'
      });
    } catch (logError) {
      console.error('Error logging bulk request deletion cleanup error:', logError);
    }
  }
});

// Indexes for better query performance
RequestSchema.index({ propertyId: 1, tenantId: 1 });
RequestSchema.index({ ownerId: 1, status: 1 });
RequestSchema.index({ status: 1, createdAt: -1 });
RequestSchema.index({ requestId: 1 }, { unique: true });
RequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RequestSchema.index({ rentId: 1 });
RequestSchema.index({ ownershipTransferId: 1 });
RequestSchema.index({ requestType: 1, status: 1 });
RequestSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Request', RequestSchema);