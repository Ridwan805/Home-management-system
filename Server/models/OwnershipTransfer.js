const mongoose = require('mongoose');

// Define valid ownership transfer statuses
const OWNERSHIP_TRANSFER_STATUSES = ['Pending', 'Closed', 'Canceled'];

// Define valid document types for closing
const DOCUMENT_TYPES = ['deed', 'title', 'inspection_report', 'appraisal', 'insurance', 'mortgage', 'other'];

// Closing document schema
const ClosingDocumentSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: DOCUMENT_TYPES, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  verifiedAt: { 
    type: Date 
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { _id: true });

// History event schema for tracking ownership transfer lifecycle
const OwnershipHistorySchema = new mongoose.Schema({
  event: { type: String, required: true },
  status: { type: String, enum: OWNERSHIP_TRANSFER_STATUSES },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Main OwnershipTransfer schema
const OwnershipTransferSchema = new mongoose.Schema({
  // Core relationships
  propertyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Request' 
  },
  
  // Financial details
  agreedPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  currency: { 
    type: String, 
    default: 'BDT', 
    required: true 
  },
  
  // Closing details
  closing: {
    date: { 
      type: Date 
    },
    scheduledDate: { 
      type: Date 
    },
    location: { 
      type: String, 
      default: '' 
    },
    documents: [ClosingDocumentSchema],
    notes: { 
      type: String, 
      default: '' 
    },
    completedAt: { 
      type: Date 
    },
    completedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }
  },
  
  // Status management
  status: { 
    type: String, 
    enum: OWNERSHIP_TRANSFER_STATUSES, 
    default: 'Pending', 
    required: true 
  },
  
  // Payment tracking
  downPayment: {
    amount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
  },
  
  finalPayment: {
    amount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
  },
  
  // Financing details (if applicable)
  financing: {
    isFinanced: { type: Boolean, default: false },
    lenderName: { type: String, default: '' },
    loanAmount: { type: Number, default: 0, min: 0 },
    interestRate: { type: Number, default: 0, min: 0 },
    loanTerm: { type: Number, default: 0, min: 0 }, // in months
    approvalDate: { type: Date },
    approvalDocument: { type: String, default: '' }
  },
  
  // Legal and compliance
  legal: {
    lawyerName: { type: String, default: '' },
    lawyerContact: { type: String, default: '' },
    titleSearch: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
      reportUrl: { type: String, default: '' }
    },
    inspection: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
      reportUrl: { type: String, default: '' },
      issues: [{ type: String }]
    }
  },
  
  // History and audit trail
  history: [OwnershipHistorySchema],
  
  // Additional metadata
  notes: { 
    type: String, 
    default: '' 
  },
  
  // Metadata for storing property details and previous owner information
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  
  // Contingencies
  contingencies: [{
    type: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: Date },
    satisfied: { type: Boolean, default: false },
    satisfiedAt: { type: Date },
    satisfiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
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
  collection: 'OwnershipTransfers'
});

// Indexes for better query performance
OwnershipTransferSchema.index({ propertyId: 1 });
OwnershipTransferSchema.index({ buyerId: 1 });
OwnershipTransferSchema.index({ sellerId: 1 });
OwnershipTransferSchema.index({ status: 1 });
OwnershipTransferSchema.index({ 'closing.date': 1 });
OwnershipTransferSchema.index({ createdAt: -1 });
OwnershipTransferSchema.index({ requestId: 1 });

// Pre-save middleware to update history
OwnershipTransferSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.history.push({
      event: `Status changed to ${this.status}`,
      status: this.status,
      timestamp: new Date(),
      note: `Ownership transfer status updated to ${this.status}`
    });
  }
  
  // Auto-calculate final payment amount
  if (this.agreedPrice && this.downPayment.amount) {
    this.finalPayment.amount = this.agreedPrice - this.downPayment.amount;
  }
  
  next();
});

// Instance methods
OwnershipTransferSchema.methods.close = async function(closedBy, note = '') {
  const previousStatus = this.status;
  
  this.status = 'Closed';
  this.closing.completedAt = new Date();
  this.closing.completedBy = closedBy;
  
  this.history.push({
    event: 'Ownership transfer closed',
    status: 'Closed',
    timestamp: new Date(),
    note: note || 'Ownership transfer completed successfully',
    updatedBy: closedBy
  });
  
  // Update property status to 'Sold' and transfer ownership
  const Property = mongoose.model('Property');
  const property = await Property.findById(this.propertyId);
  if (property) {
    const previousPropertyStatus = property.status;
    
    await property.sell(closedBy, this.buyerId, `Property sold via ownership transfer ${this._id}`);
    
    // Log the status update
    try {
      const propertyStatusLogger = require('../utils/propertyStatusLogger');
      await propertyStatusLogger.logStatusUpdate({
        propertyId: this.propertyId.toString(),
        previousStatus: previousPropertyStatus,
        newStatus: 'Sold',
        trigger: 'ownership-transfer-closed',
        triggeredBy: closedBy?.toString() || 'system',
        source: 'OwnershipTransfer.close',
        metadata: {
          transferId: this._id.toString(),
          buyerId: this.buyerId?.toString(),
          sellerId: this.sellerId?.toString(),
          agreedPrice: this.agreedPrice,
          closingNote: note || 'Ownership transfer completed successfully',
          previousTransferStatus: previousStatus,
          completedAt: this.closing.completedAt
        }
      });
    } catch (error) {
      console.error('Error logging ownership transfer closure:', error);
    }
  }
  
  return this.save();
};

OwnershipTransferSchema.methods.cancel = async function(canceledBy, reason = '') {
  const previousStatus = this.status;
  
  this.status = 'Canceled';
  
  this.history.push({
    event: 'Ownership transfer canceled',
    status: 'Canceled',
    timestamp: new Date(),
    note: reason || 'Ownership transfer canceled',
    updatedBy: canceledBy
  });
  
  // Automatically reset property status when ownership transfer is cancelled
  try {
    const Property = require('./Property');
    const property = await Property.findById(this.propertyId);
    
    if (property && property.status === 'Sold') {
      const previousPropertyStatus = property.status;
      
      await property.makeAvailable(
        canceledBy, 
        `Property automatically reset to Available after ownership transfer cancellation: ${reason || 'Transfer cancelled'}`,
        { cancelledTransferId: this._id }
      );
      
      console.log(`🔄 Property ${this.propertyId} automatically reset to Available after ownership transfer ${this._id} cancellation`);
      
      // Log the status update
      try {
        const propertyStatusLogger = require('../utils/propertyStatusLogger');
        await propertyStatusLogger.logStatusUpdate({
          propertyId: this.propertyId.toString(),
          previousStatus: previousPropertyStatus,
          newStatus: 'Available',
          trigger: 'ownership-transfer-cancelled',
          triggeredBy: canceledBy?.toString() || 'system',
          source: 'OwnershipTransfer.cancel',
          metadata: {
            transferId: this._id.toString(),
            buyerId: this.buyerId?.toString(),
            sellerId: this.sellerId?.toString(),
            agreedPrice: this.agreedPrice,
            reason: reason || 'Transfer cancelled',
            previousTransferStatus: previousStatus
          }
        });
      } catch (error) {
        console.error('Error logging ownership transfer cancellation:', error);
      }
    }
  } catch (error) {
    console.error('Error resetting property status after ownership transfer cancellation:', error);
  }
  
  return this.save();
};

OwnershipTransferSchema.methods.addDocument = function(documentData, uploadedBy) {
  const document = {
    ...documentData,
    uploadedAt: new Date(),
    uploadedBy
  };
  
  this.closing.documents.push(document);
  
  this.history.push({
    event: 'Document added',
    timestamp: new Date(),
    note: `Added ${documentData.type} document: ${documentData.name}`,
    updatedBy: uploadedBy,
    metadata: { document }
  });
  
  return this.save();
};

OwnershipTransferSchema.methods.verifyDocument = function(documentId, verifiedBy, note = '') {
  const document = this.closing.documents.id(documentId);
  if (document) {
    document.verified = true;
    document.verifiedAt = new Date();
    document.verifiedBy = verifiedBy;
    
    this.history.push({
      event: 'Document verified',
      timestamp: new Date(),
      note: note || `Document ${document.name} verified`,
      updatedBy: verifiedBy,
      metadata: { documentId, documentName: document.name }
    });
  }
  
  return this.save();
};

OwnershipTransferSchema.methods.addContingency = function(contingencyData) {
  this.contingencies.push(contingencyData);
  
  this.history.push({
    event: 'Contingency added',
    timestamp: new Date(),
    note: `Added contingency: ${contingencyData.type}`,
    metadata: { contingency: contingencyData }
  });
  
  return this.save();
};

OwnershipTransferSchema.methods.satisfyContingency = function(contingencyId, satisfiedBy, note = '') {
  const contingency = this.contingencies.id(contingencyId);
  if (contingency) {
    contingency.satisfied = true;
    contingency.satisfiedAt = new Date();
    contingency.satisfiedBy = satisfiedBy;
    
    this.history.push({
      event: 'Contingency satisfied',
      timestamp: new Date(),
      note: note || `Contingency ${contingency.type} satisfied`,
      updatedBy: satisfiedBy,
      metadata: { contingencyId, contingencyType: contingency.type }
    });
  }
  
  return this.save();
};

// Static methods
OwnershipTransferSchema.statics.findByProperty = function(propertyId, status = null) {
  const query = { propertyId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('buyerId sellerId requestId');
};

OwnershipTransferSchema.statics.findByBuyer = function(buyerId, status = null) {
  const query = { buyerId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('propertyId sellerId');
};

OwnershipTransferSchema.statics.findBySeller = function(sellerId, status = null) {
  const query = { sellerId, isDeleted: false };
  if (status) query.status = status;
  return this.find(query).populate('propertyId buyerId');
};

OwnershipTransferSchema.statics.findPendingClosings = function(daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.find({
    status: 'Pending',
    'closing.scheduledDate': { $lte: futureDate },
    isDeleted: false
  }).populate('propertyId buyerId sellerId');
};

// Middleware to handle property status cleanup when ownership transfers are deleted
OwnershipTransferSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after ownership transfer ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-ownership-transfer-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after ownership transfer ${doc._id} deletion`);
        
        // Log the status update
        try {
          const propertyStatusLogger = require('../utils/propertyStatusLogger');
          await propertyStatusLogger.logStatusUpdate({
            propertyId: doc.propertyId.toString(),
            previousStatus: 'Sold',
            newStatus: 'Available',
            trigger: 'ownership-transfer-deleted',
            triggeredBy: 'system',
            source: 'OwnershipTransfer.post.findOneAndDelete',
            metadata: {
              deletedTransferId: doc._id.toString(),
              buyerId: doc.buyerId?.toString(),
              sellerId: doc.sellerId?.toString(),
              agreedPrice: doc.agreedPrice,
              transferStatus: doc.status
            }
          });
        } catch (error) {
          console.error('Error logging ownership transfer deletion cleanup:', error);
        }
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for ownership transfer:', error);
    }
  }
});

OwnershipTransferSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  if (doc && doc.propertyId) {
    try {
      const PropertyCleanupService = require('../services/propertyCleanupService');
      
      console.log(`🧹 Checking property ${doc.propertyId} after ownership transfer ${doc._id} deletion...`);
      
      const wasReset = await PropertyCleanupService.resetOrphanedProperty(
        doc.propertyId.toString(),
        'auto-cleanup-on-ownership-transfer-delete'
      );
      
      if (wasReset) {
        console.log(`🔄 Property ${doc.propertyId} automatically reset to Available after ownership transfer ${doc._id} deletion`);
        
        // Log the status update
        try {
          const propertyStatusLogger = require('../utils/propertyStatusLogger');
          await propertyStatusLogger.logStatusUpdate({
            propertyId: doc.propertyId.toString(),
            previousStatus: 'Sold',
            newStatus: 'Available',
            trigger: 'ownership-transfer-deleted',
            triggeredBy: 'system',
            source: 'OwnershipTransfer.post.deleteOne',
            metadata: {
              deletedTransferId: doc._id.toString(),
              buyerId: doc.buyerId?.toString(),
              sellerId: doc.sellerId?.toString(),
              agreedPrice: doc.agreedPrice,
              transferStatus: doc.status
            }
          });
        } catch (error) {
          console.error('Error logging ownership transfer deletion cleanup:', error);
        }
      }
    } catch (error) {
      console.error('Error in post-delete property cleanup for ownership transfer:', error);
    }
  }
});

OwnershipTransferSchema.post('deleteMany', async function() {
  try {
    // For bulk deletes, run a full cleanup check
    const PropertyCleanupService = require('../services/propertyCleanupService');
    
    console.log('🧹 Running property cleanup after bulk ownership transfer deletion...');
    const cleanupResults = await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'auto-cleanup-bulk-ownership-transfer-delete'
    });
    
    // Log bulk cleanup results
    if (cleanupResults && cleanupResults.length > 0) {
      try {
        const propertyStatusLogger = require('../utils/propertyStatusLogger');
        
        for (const result of cleanupResults) {
          await propertyStatusLogger.logStatusUpdate({
            propertyId: result.propertyId,
            previousStatus: result.previousStatus || 'Sold',
            newStatus: result.newStatus || 'Available',
            trigger: 'bulk-ownership-transfer-deleted',
            triggeredBy: 'system',
            source: 'OwnershipTransfer.post.deleteMany',
            metadata: {
              bulkCleanup: true,
              cleanupReason: 'auto-cleanup-bulk-ownership-transfer-delete'
            }
          });
        }
      } catch (error) {
        console.error('Error logging bulk ownership transfer deletion cleanup:', error);
      }
    }
  } catch (error) {
    console.error('Error in post-bulk-delete property cleanup for ownership transfers:', error);
  }
});

module.exports = mongoose.model('OwnershipTransfer', OwnershipTransferSchema);