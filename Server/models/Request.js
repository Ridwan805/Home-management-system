const mongoose = require('mongoose');

// Define valid status values for the request lifecycle
const VALID_STATUSES = [
  'Submitted',
  'Under Review',
  'Info Requested',
  'Approved – Pay Advance',
  'Payment Submitted',
  'AdvancePaid',
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
  status: { type: String, enum: ['pending', 'Paid', 'failed'], default: 'Paid' },
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
  verificationNote: { type: String, default: '' }
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
  
  // Full payment details (for complete payment processing)
  fullPayment: FullPaymentSchema,
  
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

// Static method to get valid status transitions
RequestSchema.statics.getValidStatusTransitions = function() {
  return {
    'Submitted': ['Under Review', 'Rejected', 'Canceled'],
    'Under Review': ['Info Requested', 'Approved – Pay Advance', 'Rejected', 'Canceled'],
    'Info Requested': ['Under Review', 'Rejected', 'Canceled', 'Expired'],
    'Approved – Pay Advance': ['Payment Submitted', 'Canceled', 'Expired'],
    'Payment Submitted': ['AdvancePaid', 'Under Review', 'Canceled'],
    'AdvancePaid': ['Paid/Completed', 'Canceled'],
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

// Index for efficient queries
RequestSchema.index({ propertyId: 1, tenantId: 1 });
RequestSchema.index({ ownerId: 1, status: 1 });
RequestSchema.index({ status: 1, createdAt: -1 });
RequestSchema.index({ requestId: 1 }, { unique: true });
RequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Request', RequestSchema);