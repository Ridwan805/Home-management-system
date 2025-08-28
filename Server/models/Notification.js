// Server/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
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
    enum: ['general', 'property_status', 'request_status', 'payment', 'system'], 
    default: 'general' 
  },
  relatedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'relatedModel' 
  },
  relatedModel: { 
    type: String, 
    enum: ['Property', 'Request', 'Payment', 'User'], 
    default: 'Property' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Index for faster queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);