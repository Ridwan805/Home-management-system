const mongoose = require('mongoose');

// Supported notice types
const NOTICE_TYPES = [
  'rent_reminder',
  'overdue_payment',
  'eviction_warning',
  'meeting',
  'maintenance',
  'inspection',
  'general',
  'emergency'
];

// Delivery status enum
const DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'skipped'];

// Per-recipient delivery attempt schema
const RecipientDeliverySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantName: { type: String, default: '' },
  tenantEmail: { type: String, default: '' },
  unitNumber: { type: String, default: '' },
  propertyAddress: { type: String, default: '' },
  inAppDelivered: { type: Boolean, default: false },
  inAppNotificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    default: null
  },
  emailSent: { type: Boolean, default: false },
  emailDeliveryStatus: {
    type: String,
    enum: DELIVERY_STATUSES,
    default: 'pending'
  },
  emailId: { type: String, default: '' },
  emailError: { type: String, default: '' },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null }
}, { _id: true });

// Main Notice Schema
const NoticeSchema = new mongoose.Schema({
  noticeId: {
    type: String,
    unique: true,
    default: function() {
      return 'NTC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null,
    index: true
  },
  rentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rent',
    default: null
  },
  recipientType: {
    type: String,
    enum: ['individual', 'property_all', 'all_tenants'],
    default: 'individual',
    required: true
  },
  // If recipientType === 'individual', single tenant target
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  noticeType: {
    type: String,
    enum: NOTICE_TYPES,
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  issuedDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Deadline or scheduled event date (e.g. rent due date, inspection date, meeting time)
  dueDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'partially_sent', 'failed'],
    default: 'sent',
    index: true
  },
  // Required confirmation for legally significant notices (eviction/termination)
  requiresConfirmation: {
    type: Boolean,
    default: false
  },
  legalDisclaimerAcknowledged: {
    type: Boolean,
    default: false
  },
  legalDisclaimerText: {
    type: String,
    default: ''
  },
  // Audit trail of recipients and their delivery results
  recipients: [RecipientDeliverySchema],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'Notices'
});

NoticeSchema.index({ ownerId: 1, createdAt: -1 });
NoticeSchema.index({ 'recipients.tenantId': 1, createdAt: -1 });

module.exports = mongoose.model('Notice', NoticeSchema);
