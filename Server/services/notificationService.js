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
   * Get unread notifications count for a user
   * @param {string} userId - The user ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ userId, isRead: false });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Update result
   */
  static async markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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

  /**
   * Send security guard application status notification
   * @param {string} guardId - The guard ID to notify
   * @param {string} applicationId - The application ID
   * @param {string} oldStatus - The old status
   * @param {string} newStatus - The new status
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @param {string} rejectionReason - Optional rejection reason
   * @returns {Promise<Object>} The created notification
   */
  static async sendGuardApplicationStatusNotification(guardId, applicationId, oldStatus, newStatus, jobTitle, propertyAddress, rejectionReason = '') {
    try {
      let title, message;
      
      switch (newStatus) {
        case 'Reviewed':
          title = 'Application Under Review';
          message = `Your application for ${jobTitle} at ${propertyAddress} is now under review.`;
          break;
        case 'Accepted':
          title = 'Application Accepted';
          message = `Congratulations! Your application for ${jobTitle} at ${propertyAddress} has been accepted. You may be contacted soon for the hiring process.`;
          break;
        case 'Hired':
          title = 'You Have Been Hired!';
          message = `Congratulations! You have been officially hired for ${jobTitle} at ${propertyAddress}. Please check your dashboard for further details.`;
          break;
        case 'Rejected':
          title = 'Application Rejected';
          message = `Unfortunately, your application for ${jobTitle} at ${propertyAddress} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;
          break;
        default:
          title = 'Application Status Updated';
          message = `Your application for ${jobTitle} at ${propertyAddress} status has been updated to ${newStatus}.`;
      }
      
      return await this.createNotification(
        guardId,
        'job_application',
        title,
        message,
        { applicationId }
      );
    } catch (error) {
      console.error('Error sending guard application status notification:', error);
      throw error;
    }
  }

  /**
   * Send security guard hiring notification
   * @param {string} guardId - The guard ID to notify
   * @param {string} jobPostId - The job post ID
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @param {Object} jobDetails - Additional job details
   * @returns {Promise<Object>} The created notification
   */
  static async sendGuardHiringNotification(guardId, jobPostId, jobTitle, propertyAddress, jobDetails = {}) {
    try {
      const title = 'Congratulations! You\'ve Been Hired';
      const message = `You have been hired for the position of ${jobTitle} at ${propertyAddress}. ${jobDetails.salary ? `Salary: ${jobDetails.salary}. ` : ''}${jobDetails.workingHours ? `Working Hours: ${jobDetails.workingHours}. ` : ''}Please check your dashboard for more details.`;
      
      return await this.createNotification(
        guardId,
        'job_hired',
        title,
        message,
        { jobPostId }
      );
    } catch (error) {
      console.error('Error sending guard hiring notification:', error);
      throw error;
    }
  }

  /**
   * Send owner notification about new guard application
   * @param {string} ownerId - The owner ID to notify
   * @param {string} applicationId - The application ID
   * @param {string} guardName - The guard's name
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @returns {Promise<Object>} The created notification
   */
  static async sendOwnerNewApplicationNotification(ownerId, applicationId, guardName, jobTitle, propertyAddress) {
    try {
      const title = 'New Security Guard Application';
      const message = `${guardName} has applied for the ${jobTitle} position at ${propertyAddress}. Review the application in your dashboard.`;
      
      return await this.createNotification(
        ownerId,
        'new_application',
        title,
        message,
        { applicationId }
      );
    } catch (error) {
      console.error('Error sending owner new application notification:', error);
      throw error;
    }
  }

  /**
   * Send guard termination notification
   * @param {string} guardId - The guard ID to notify
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @param {string} reason - Optional termination reason
   * @returns {Promise<Object>} The created notification
   */
  static async sendGuardTerminationNotification(guardId, jobTitle, propertyAddress, reason = '') {
    try {
      const title = 'Employment Terminated';
      const message = `Your employment as ${jobTitle} at ${propertyAddress} has been terminated.${reason ? ` Reason: ${reason}` : ''}`;
      
      return await this.createNotification(
        guardId,
        'job_terminated',
        title,
        message
      );
    } catch (error) {
      console.error('Error sending guard termination notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to tenants about hired guard
   * @param {string} tenantId - The tenant ID to notify
   * @param {string} guardName - The guard's name
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @param {Object} guardDetails - Additional guard details
   * @returns {Promise<Object>} The created notification
   */
  static async sendTenantGuardHiredNotification(tenantId, guardName, jobTitle, propertyAddress, guardDetails = {}) {
    try {
      const title = 'New Security Guard Assigned';
      const message = `A new security guard, ${guardName}, has been hired for ${jobTitle} at your property: ${propertyAddress}. ${guardDetails.workingHours ? `Working Hours: ${guardDetails.workingHours}. ` : ''}You can view their contact information in your dashboard.`;
      
      return await this.createNotification(
        tenantId,
        'guard_assigned',
        title,
        message,
        { guardDetails }
      );
    } catch (error) {
      console.error('Error sending tenant guard hired notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to owners about hired guard
   * @param {string} ownerId - The owner ID to notify
   * @param {string} guardName - The guard's name
   * @param {string} jobTitle - The job title
   * @param {string} propertyAddress - The property address
   * @param {Object} guardDetails - Additional guard details
   * @returns {Promise<Object>} The created notification
   */
  static async sendOwnerGuardHiredNotification(ownerId, guardName, jobTitle, propertyAddress, guardDetails = {}) {
    try {
      const title = 'Security Guard Successfully Hired';
      const message = `You have successfully hired ${guardName} for ${jobTitle} at ${propertyAddress}. ${guardDetails.salary ? `Salary: ${guardDetails.salary}. ` : ''}${guardDetails.workingHours ? `Working Hours: ${guardDetails.workingHours}. ` : ''}The guard information has been shared with your tenants.`;
      
      return await this.createNotification(
        ownerId,
        'guard_hired_confirmation',
        title,
        message,
        { guardDetails }
      );
    } catch (error) {
      console.error('Error sending owner guard hired notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;