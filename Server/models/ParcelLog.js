const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const parcelLogSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Collected'],
    default: 'Pending'
  },
  collectedAt: {
    type: Date,
    default: null
  },
  // Additional fields for better tracking
  description: {
    type: String,
    trim: true
  },
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Security guard who logged the parcel
  }
}, {
  timestamps: true
});

// Index for efficient queries
parcelLogSchema.index({ recipientId: 1, status: 1 });
parcelLogSchema.index({ timestamp: 1 });

// Virtual for checking if parcel is overdue (48 hours)
parcelLogSchema.virtual('isOverdue').get(function() {
  if (this.status === 'Collected') return false;
  const now = new Date();
  const hoursDiff = (now - this.timestamp) / (1000 * 60 * 60);
  return hoursDiff > 48;
});

// Ensure virtual fields are serialized
parcelLogSchema.set('toJSON', { virtuals: true });
parcelLogSchema.set('toObject', { virtuals: true });

// Add pagination plugin
parcelLogSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('ParcelLog', parcelLogSchema);