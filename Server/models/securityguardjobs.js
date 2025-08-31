const mongoose = require('mongoose');

const securityGuardJobSchema = new mongoose.Schema({
  // Core Job Information
  jobPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  guardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Property and Location Details
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
    default: null // May not have tenant initially
  },
  
  // Job Status and Timeline
  status: {
    type: String,
    enum: ['Applied', 'Reviewed', 'Accepted', 'Rejected', 'Hired', 'Active', 'Fired', 'Completed'],
    default: 'Applied'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  hiredDate: {
    type: Date,
    default: null
  },
  terminationDate: {
    type: Date,
    default: null
  },
  
  // Financial Information
  salary: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'monthly'
    }
  },
  
  // Guard Application Details
  applicationDetails: {
    experience: { type: String, required: true },
    license: { type: String, default: '' },
    certifications: { type: String, default: '' },
    availability: { type: String, required: true },
    previousWork: { type: String, default: '' },
    skills: { type: String, default: '' },
    coverLetter: { type: String, default: '' }
  },
  
  // Documents
  documents: {
    idDocument: { type: String, default: '' },
    licenseDocument: { type: String, default: '' },
    certificationDocuments: { type: String, default: '' },
    resume: { type: String, default: '' }
  },
  
  // Job Specific Details
  jobDetails: {
    workSchedule: {
      type: String,
      default: ''
    },
    duties: {
      type: String,
      default: ''
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    equipmentProvided: {
      type: String,
      default: ''
    },
    specialInstructions: {
      type: String,
      default: ''
    }
  },
  
  // Decision and Review Information
  decisionAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  terminationReason: {
    type: String,
    default: ''
  },
  
  // Performance and Feedback
  performanceRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  ownerFeedback: {
    type: String,
    default: ''
  },
  guardFeedback: {
    type: String,
    default: ''
  },
  
  // Session Management
  isActive: {
    type: Boolean,
    default: true // Set to false when fired/terminated
  },
  sessionEndReason: {
    type: String,
    enum: ['fired', 'resigned', 'contract_ended', 'property_sold', 'other'],
    default: null
  }
}, { 
  timestamps: true,
  // Add virtual for easy access to related data
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one active job per guard per property
securityGuardJobSchema.index({ guardId: 1, propertyId: 1, isActive: 1 }, { 
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Indexes for efficient queries
securityGuardJobSchema.index({ guardId: 1, status: 1 });
securityGuardJobSchema.index({ propertyId: 1, status: 1 });
securityGuardJobSchema.index({ ownerId: 1, status: 1 });
securityGuardJobSchema.index({ jobPostId: 1 });
securityGuardJobSchema.index({ isActive: 1, status: 1 });

// Virtual for calculating job duration
securityGuardJobSchema.virtual('jobDuration').get(function() {
  if (this.hiredDate) {
    const endDate = this.terminationDate || new Date();
    return Math.floor((endDate - this.hiredDate) / (1000 * 60 * 60 * 24)); // Days
  }
  return 0;
});

// Static method to get current active job for a guard
securityGuardJobSchema.statics.getCurrentJob = function(guardId) {
  return this.findOne({ 
    guardId: guardId, 
    isActive: true, 
    status: { $in: ['Hired', 'Active'] }
  })
  .populate('propertyId', 'address city state zipCode')
  .populate('ownerId', 'firstName lastName email phone')
  .populate('tenantId', 'firstName lastName email phone')
  .populate('jobPostId', 'title description requirements');
};

// Static method to get job history for a guard
securityGuardJobSchema.statics.getJobHistory = function(guardId) {
  return this.find({ guardId: guardId })
  .populate('propertyId', 'address city state zipCode')
  .populate('ownerId', 'firstName lastName email phone')
  .populate('jobPostId', 'title description')
  .sort({ createdAt: -1 });
};

// Method to terminate job session
securityGuardJobSchema.methods.terminateJob = function(reason, terminationReason) {
  this.isActive = false;
  this.status = reason === 'fired' ? 'Fired' : 'Completed';
  this.terminationDate = new Date();
  this.sessionEndReason = reason;
  if (terminationReason) {
    this.terminationReason = terminationReason;
  }
  return this.save();
};

module.exports = mongoose.model('SecurityGuardJob', securityGuardJobSchema);