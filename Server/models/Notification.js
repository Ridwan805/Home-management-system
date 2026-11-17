// Server/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Intended recipient user ID
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Recipient role for filtering and authorization
  recipientRole: {
    type: String,
    enum: ['Tenant', 'tenant', 'Owner', 'owner', 'Security Guard', 'security guard', 'admin', 'user'],
    default: 'user'
  },
  // Optional sender user ID (e.g. owner, tenant, admin)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'general',
      'property_status',
      'request_status',
      'payment',
      'system',
      'message',
      'new_application',
      'job_application',
      'job_hired',
      'guard_assigned',
      'guard_hired_confirmation',
      'job_terminated',
      'maintenance',
      'admin_moderation',
      'report',
      'notice'
    ], 
    default: 'general' 
  },
  relatedEntityType: { 
    type: String, 
    enum: ['Property', 'Request', 'Payment', 'Invoice', 'MaintenanceReport', 'Notice', 'Report', 'User', 'securityguardjobs'], 
    default: 'Property' 
  },
  relatedEntityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'relatedEntityType' 
  },
  // Direct in-app route destination when clicked
  actionUrl: {
    type: String,
    default: ''
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: { 
    type: Date 
  },
  // Backward compatibility aliases
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  relatedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'relatedModel' 
  },
  relatedModel: { 
    type: String, 
    enum: ['Property', 'Request', 'Payment', 'Invoice', 'MaintenanceReport', 'Notice', 'Report', 'User', 'securityguardjobs'], 
    default: 'Property' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Sync aliases pre-validation / pre-save
NotificationSchema.pre('validate', function(next) {
  if (this.recipientId && !this.userId) {
    this.userId = this.recipientId;
  } else if (this.userId && !this.recipientId) {
    this.recipientId = this.userId;
  }
  if (this.relatedEntityType && !this.relatedModel) {
    this.relatedModel = this.relatedEntityType;
  } else if (this.relatedModel && !this.relatedEntityType) {
    this.relatedEntityType = this.relatedModel;
  }
  if (this.relatedEntityId && !this.relatedId) {
    this.relatedId = this.relatedEntityId;
  } else if (this.relatedId && !this.relatedEntityId) {
    this.relatedEntityId = this.relatedId;
  }
  next();
});

// Compound indexes for performant queries
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ senderId: 1, createdAt: -1 });
NotificationSchema.index({ relatedEntityId: 1, relatedEntityType: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);