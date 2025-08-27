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
OwnershipTransferSchema.methods.close = function(closedBy, note = '') {
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
  
  return this.save();
};

OwnershipTransferSchema.methods.cancel = function(canceledBy, reason = '') {
  this.status = 'Canceled';
  
  this.history.push({
    event: 'Ownership transfer canceled',
    status: 'Canceled',
    timestamp: new Date(),
    note: reason || 'Ownership transfer canceled',
    updatedBy: canceledBy
  });
  
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

module.exports = mongoose.model('OwnershipTransfer', OwnershipTransferSchema);