const mongoose = require('mongoose');

// Define valid issue types
const ISSUE_TYPES = [
  'electrical', 'plumbing', 'heating_cooling', 'appliances', 'structural',
  'pest_control', 'cleaning', 'security', 'internet_cable', 'other'
];

// Define valid priority levels
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

// Define valid status options
const REPORT_STATUSES = ['pending', 'in_progress', 'resolved', 'cancelled'];

const MaintenanceReportSchema = new mongoose.Schema({
  // Reporter information
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Property information
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  
  // Owner information (for quick access)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Issue details
  issueType: {
    type: String,
    enum: ISSUE_TYPES,
    required: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Location details
  floor: {
    type: Number,
    min: -5, // Allow basement floors
    max: 200,
    required: false
  },
  
  room: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Priority and status
  priority: {
    type: String,
    enum: PRIORITY_LEVELS,
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: REPORT_STATUSES,
    default: 'pending'
  },
  
  // Images and attachments
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: 200
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Communication and updates
  updates: [{
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    statusChange: {
      from: {
        type: String,
        enum: REPORT_STATUSES
      },
      to: {
        type: String,
        enum: REPORT_STATUSES
      }
    }
  }],
  
  // Resolution details
  resolvedAt: {
    type: Date
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolutionNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Cost tracking (optional)
  estimatedCost: {
    type: Number,
    min: 0
  },
  
  actualCost: {
    type: Number,
    min: 0
  },
  
  // Service provider information (if external help is needed)
  serviceProvider: {
    name: String,
    contact: String,
    notes: String
  },
  
  // Urgency and scheduling
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  scheduledDate: {
    type: Date
  },
  
  // Tenant availability
  tenantAvailability: {
    preferredTimes: [String], // e.g., ['morning', 'afternoon', 'evening']
    availableDays: [String],  // e.g., ['Monday', 'Tuesday']
    specialInstructions: String
  }
}, {
  timestamps: true,
  collection: 'MaintenanceReports'
});

// Indexes for better query performance
MaintenanceReportSchema.index({ reporterId: 1 });
MaintenanceReportSchema.index({ propertyId: 1 });
MaintenanceReportSchema.index({ ownerId: 1 });
MaintenanceReportSchema.index({ status: 1 });
MaintenanceReportSchema.index({ issueType: 1 });
MaintenanceReportSchema.index({ priority: 1 });
MaintenanceReportSchema.index({ createdAt: -1 });
MaintenanceReportSchema.index({ ownerId: 1, status: 1 });
MaintenanceReportSchema.index({ propertyId: 1, status: 1 });

// Virtual for getting the latest update
MaintenanceReportSchema.virtual('latestUpdate').get(function() {
  if (this.updates && this.updates.length > 0) {
    return this.updates[this.updates.length - 1];
  }
  return null;
});

// Method to add an update
MaintenanceReportSchema.methods.addUpdate = function(message, updatedBy, statusChange = null) {
  const update = {
    message,
    updatedBy,
    updatedAt: new Date()
  };
  
  if (statusChange) {
    update.statusChange = statusChange;
    this.status = statusChange.to;
    
    // Set resolved date if status is resolved
    if (statusChange.to === 'resolved') {
      this.resolvedAt = new Date();
      this.resolvedBy = updatedBy;
    }
  }
  
  this.updates.push(update);
  return this.save();
};

// Method to resolve the report
MaintenanceReportSchema.methods.resolve = function(resolvedBy, resolutionNotes, actualCost = null) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = resolutionNotes;
  
  if (actualCost !== null) {
    this.actualCost = actualCost;
  }
  
  // Add resolution update
  this.updates.push({
    message: `Report resolved: ${resolutionNotes}`,
    updatedBy: resolvedBy,
    updatedAt: new Date(),
    statusChange: {
      from: this.status,
      to: 'resolved'
    }
  });
  
  return this.save();
};

// Static method to find reports by owner
MaintenanceReportSchema.statics.findByOwner = function(ownerId, status = null) {
  const query = { ownerId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('reporterId', 'name email phone')
    .populate('propertyId', 'address unitNumber floorNumber')
    .sort({ createdAt: -1 });
};

// Static method to find reports by tenant
MaintenanceReportSchema.statics.findByTenant = function(tenantId, status = null) {
  const query = { reporterId: tenantId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('propertyId', 'address unitNumber floorNumber')
    .populate('ownerId', 'name email phone')
    .sort({ createdAt: -1 });
};

// Static method to find reports by property
MaintenanceReportSchema.statics.findByProperty = function(propertyId, status = null) {
  const query = { propertyId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('reporterId', 'name email phone')
    .populate('ownerId', 'name email phone')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to set priority based on issue type and urgency
MaintenanceReportSchema.pre('save', function(next) {
  // Auto-set high priority for urgent issues
  if (this.isUrgent && this.priority === 'medium') {
    this.priority = 'urgent';
  }
  
  // Auto-set high priority for certain issue types
  const highPriorityIssues = ['electrical', 'plumbing', 'heating_cooling', 'security'];
  if (highPriorityIssues.includes(this.issueType) && this.priority === 'medium') {
    this.priority = 'high';
  }
  
  next();
});

// Set virtuals to be included in JSON output
MaintenanceReportSchema.set('toJSON', { virtuals: true });
MaintenanceReportSchema.set('toObject', { virtuals: true });

const MaintenanceReport = mongoose.model('MaintenanceReport', MaintenanceReportSchema, 'MaintenanceReports');

module.exports = MaintenanceReport;
module.exports.ISSUE_TYPES = ISSUE_TYPES;
module.exports.PRIORITY_LEVELS = PRIORITY_LEVELS;
module.exports.REPORT_STATUSES = REPORT_STATUSES;