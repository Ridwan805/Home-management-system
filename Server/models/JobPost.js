const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  jobPostId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'JP' + Date.now() + Math.random().toString(36).substr(2, 5);
    }
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  postedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobType: {
    type: String,
    enum: ['SecurityGuard', 'ServiceProvider'],
    required: true
  },
  requirements: {
    description: { type: String, required: true },
    duties: { type: String, required: true },
    skills: { type: String, default: '' },
    workingHours: { type: String, required: true },
    documentsRequired: { type: String, default: '' },
    salary: { type: String, default: '' },
    experience: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'Filled', 'Cancelled'],
    default: 'Open'
  },
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SecurityGuardJob'
  }],
  hiredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  hiredApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SecurityGuardJob',
    default: null
  },
  paymentInfo: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'BDT' },
    frequency: { type: String, enum: ['monthly', 'weekly', 'daily', 'one-time'], default: 'monthly' },
    nextPaymentDue: { type: Date },
    lastPaymentDate: { type: Date },
    totalPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'current', 'overdue'], default: 'pending' }
  },
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for efficient queries
jobPostSchema.index({ jobType: 1, status: 1 });
jobPostSchema.index({ propertyId: 1 });
jobPostSchema.index({ postedById: 1 });

module.exports = mongoose.model('JobPost', jobPostSchema);