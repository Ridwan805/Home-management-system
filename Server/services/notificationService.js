// Server/services/notificationService.js
const User = require('../models/User');
const Request = require('../models/Request');
const Property = require('../models/Property');
const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a notification for a user
   * @param {Object} notificationData - The notification data object
   * @returns {Promise<Object>} The created notification
   */
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      // Support both old and new formats for backward compatibility
      let notificationData;
      
      if (arguments.length === 1 && typeof userId === 'object') {
        // New format: single object parameter
        notificationData = userId;
      } else {
        // Old format: separate parameters
        notificationData = {
          userId,
          type: type || 'general',
          title,
          message,
          relatedId: data.requestId || data.propertyId,
          relatedModel: data.requestId ? 'Request' : data.propertyId ? 'Property' : undefined
        };
      }
      
      const notification = new Notification({
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'general',
        relatedId: notificationData.relatedId,
        relatedModel: notificationData.relatedModel,
        isRead: false,
        createdAt: new Date()
      });
      
      await notification.save();
      console.log(`Notification created for user ${notificationData.userId}: ${notificationData.title}`);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   * @param {string} userId - The user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of notifications
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, includeRead = false } = options;
      
      const query = { userId };
      if (!includeRead) {
        query.isRead = false;
      }
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - The notification ID
   * @returns {Promise<Object>} The updated notification
   */
  static async markAsRead(userId, notificationId) {
    try {
      // Support both old and new formats
      let query;
      
      if (arguments.length === 1) {
        // New format: just notification ID
        query = { _id: userId };
      } else {
        // Old format: userId and notificationId
        query = { _id: notificationId, userId };
      }
      
      const notification = await Notification.findOneAndUpdate(
        query,
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      
      if (!notification) {
        console.warn('Notification not found:', query);
        return null;
      }
      
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Send request status notification
   * @param {string} userId - The user ID to notify
   * @param {string} requestId - The request ID
   * @param {string} oldStatus - The old status
   * @param {string} newStatus - The new status
   * @param {string} note - Optional note
   * @returns {Promise<Object>} The created notification
   */
  static async sendRequestStatusNotification(userId, requestId, oldStatus, newStatus, note = '') {
    try {
      const title = 'Request Status Updated';
      const message = `Your request status has been updated from "${oldStatus}" to "${newStatus}".${note ? ` Note: ${note}` : ''}`;
      
      return await this.createNotification(
        userId,
        'request_status',
        title,
        message,
        { requestId }
      );
    } catch (error) {
      console.error('Error sending request status notification:', error);
      throw error;
    }
  }

  /**
   * Send property assignment notification
   * @param {string} userId - The user ID to notify
   * @param {string} propertyId - The property ID
   * @param {string} requestType - The request type (Rent/Buy)
   * @returns {Promise<Object>} The created notification
   */
  static async sendPropertyAssignmentNotification(userId, propertyId, requestType) {
    try {
      const title = `Property ${requestType === 'Buy' ? 'Purchase' : 'Rental'} Completed`;
      const message = `Congratulations! Your ${requestType.toLowerCase()} request has been completed and the property has been assigned to you.`;
      
      return await this.createNotification(
        userId,
        'property_status',
        title,
        message,
        { propertyId }
      );
    } catch (error) {
      console.error('Error sending property assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send advance payment request notification
   * @param {string} userId - The user ID to notify
   * @param {string} requestId - The request ID
   * @param {Object} advancePayment - The advance payment details
   * @returns {Promise<Object>} The created notification
   */
  static async sendAdvancePaymentRequestNotification(userId, requestId, advancePayment) {
    try {
      const title = 'Advance Payment Required';
      const message = `Your request has been approved! Please make an advance payment of ${advancePayment.amount} ${advancePayment.currency} by ${new Date(advancePayment.dueDate).toLocaleDateString()}.`;
      
      return await this.createNotification(
        userId,
        'payment',
        title,
        message,
        { requestId }
      );
    } catch (error) {
      console.error('Error sending advance payment request notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;