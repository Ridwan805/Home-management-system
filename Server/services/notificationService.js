// Server/services/notificationService.js
const User = require('../models/User');
const Request = require('../models/Request');
const Property = require('../models/Property');

// In-memory notification store (in production, use Redis or database)
const notifications = new Map();

class NotificationService {
  // Create a notification
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      const notification = {
        id: Date.now().toString(),
        userId,
        type, // 'info', 'success', 'warning', 'error'
        title,
        message,
        data,
        read: false,
        createdAt: new Date()
      };

      if (!notifications.has(userId)) {
        notifications.set(userId, []);
      }
      
      notifications.get(userId).unshift(notification);
      
      // Keep only last 50 notifications per user
      if (notifications.get(userId).length > 50) {
        notifications.get(userId).splice(50);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static getUserNotifications(userId, limit = 20) {
    const userNotifications = notifications.get(userId) || [];
    return userNotifications.slice(0, limit);
  }

  // Mark notification as read
  static markAsRead(userId, notificationId) {
    const userNotifications = notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return notification;
  }

  // Mark all notifications as read
  static markAllAsRead(userId) {
    const userNotifications = notifications.get(userId) || [];
    userNotifications.forEach(n => n.read = true);
    return userNotifications;
  }

  // Get unread count
  static getUnreadCount(userId) {
    const userNotifications = notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Notification templates for different events
  static async notifyRequestStatusChange(requestId, oldStatus, newStatus, actorId) {
    try {
      const request = await Request.findById(requestId)
        .populate('tenantId', 'firstName lastName')
        .populate('ownerId', 'firstName lastName')
        .populate('propertyId', 'address');

      if (!request) return;

      const actor = await User.findById(actorId).select('firstName lastName role');
      const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'System';
      const propertyAddress = request.propertyId?.address || 'Property';

      // Notify tenant
      if (request.tenantId && request.tenantId._id.toString() !== actorId) {
        await this.createNotification(
          request.tenantId._id,
          this.getStatusNotificationType(newStatus),
          'Request Status Updated',
          `Your request for ${propertyAddress} has been ${newStatus.toLowerCase()} by ${actorName}`,
          { requestId, oldStatus, newStatus, propertyAddress }
        );
      }

      // Notify owner
      if (request.ownerId && request.ownerId._id.toString() !== actorId) {
        await this.createNotification(
          request.ownerId._id,
          this.getStatusNotificationType(newStatus),
          'Request Status Updated',
          `Request from ${request.tenantId?.firstName} ${request.tenantId?.lastName} for ${propertyAddress} has been ${newStatus.toLowerCase()}`,
          { requestId, oldStatus, newStatus, propertyAddress }
        );
      }
    } catch (error) {
      console.error('Error sending request status notification:', error);
    }
  }

  static async notifyPaymentReceived(requestId, amount, currency) {
    try {
      const request = await Request.findById(requestId)
        .populate('ownerId', 'firstName lastName')
        .populate('propertyId', 'address');

      if (!request || !request.ownerId) return;

      await this.createNotification(
        request.ownerId._id,
        'success',
        'Payment Received',
        `Payment of ${amount} ${currency} received for ${request.propertyId?.address || 'property'}. Please verify the payment.`,
        { requestId, amount, currency }
      );
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  }

  static async notifyPropertyAssigned(propertyId, tenantId, assignmentType) {
    try {
      const property = await Property.findById(propertyId).populate('owner', 'firstName lastName');
      const tenant = await User.findById(tenantId).select('firstName lastName');

      if (!property || !tenant) return;

      // Notify tenant
      await this.createNotification(
        tenantId,
        'success',
        'Property Assigned',
        `Congratulations! ${property.address} has been ${assignmentType.toLowerCase()} to you.`,
        { propertyId, assignmentType }
      );

      // Notify owner
      if (property.owner) {
        await this.createNotification(
          property.owner._id,
          'success',
          'Property Assignment Complete',
          `Your property at ${property.address} has been ${assignmentType.toLowerCase()} to ${tenant.firstName} ${tenant.lastName}.`,
          { propertyId, tenantId, assignmentType }
        );
      }
    } catch (error) {
      console.error('Error sending property assignment notification:', error);
    }
  }

  static async notifyAdvancePaymentSetup(requestId, amount, currency, dueDate) {
    try {
      const request = await Request.findById(requestId)
        .populate('tenantId', 'firstName lastName')
        .populate('propertyId', 'address');

      if (!request || !request.tenantId) return;

      await this.createNotification(
        request.tenantId._id,
        'info',
        'Advance Payment Required',
        `Please pay ${amount} ${currency} for ${request.propertyId?.address || 'property'} by ${new Date(dueDate).toLocaleDateString()}.`,
        { requestId, amount, currency, dueDate }
      );
    } catch (error) {
      console.error('Error sending advance payment notification:', error);
    }
  }

  // Helper method to determine notification type based on status
  static getStatusNotificationType(status) {
    const statusTypes = {
      'Approved – Pay Advance': 'success',
      'Paid/Completed': 'success',
      'Rejected': 'error',
      'Info Requested': 'warning',
      'Under Review': 'info',
      'Payment Submitted': 'info'
    };
    return statusTypes[status] || 'info';
  }
}

module.exports = NotificationService;