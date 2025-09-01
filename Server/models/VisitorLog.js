const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const visitorLogSchema = new mongoose.Schema({
  visitorName: {
    type: String,
    required: true,
    trim: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property', // Assuming Property model represents units
    required: true
  },
  expectedTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'CheckedIn', 'CheckedOut'],
    default: 'Pending'
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  preApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  // Additional fields for better tracking
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Security guard who logged the visitor
  },
  visitorPhone: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
visitorLogSchema.index({ unitId: 1, status: 1 });
visitorLogSchema.index({ checkInTime: 1 });
visitorLogSchema.index({ preApproved: 1, status: 1 });
visitorLogSchema.index({ approvedBy: 1 });

// Virtual for checking if visitor is overdue (12 hours without checkout)
visitorLogSchema.virtual('isOverdue').get(function() {
  if (this.status === 'CheckedOut' || this.status === 'Pending') return false;
  if (!this.checkInTime) return false;
  
  const now = new Date();
  const hoursDiff = (now - this.checkInTime) / (1000 * 60 * 60);
  return hoursDiff > 12;
});

// Virtual for visit duration
visitorLogSchema.virtual('visitDuration').get(function() {
  if (!this.checkInTime) return null;
  const endTime = this.checkOutTime || new Date();
  return Math.round((endTime - this.checkInTime) / (1000 * 60)); // Duration in minutes
});

// Ensure virtual fields are serialized
visitorLogSchema.set('toJSON', { virtuals: true });
visitorLogSchema.set('toObject', { virtuals: true });

// Add pagination plugin
visitorLogSchema.plugin(mongoosePaginate);

// Pre-save middleware to set checkInTime when status changes to CheckedIn
visitorLogSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'CheckedIn' && !this.checkInTime) {
      this.checkInTime = new Date();
    } else if (this.status === 'CheckedOut' && !this.checkOutTime) {
      this.checkOutTime = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('VisitorLog', visitorLogSchema);