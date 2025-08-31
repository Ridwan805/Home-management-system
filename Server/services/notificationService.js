// Server/services/notificationService.js
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const User = require('../models/User');
const Request = require('../models/Request');
const Property = require('../models/Property');
<<<<<<< Updated upstream

// In-memory notification store (in production, use Redis or database)
const notifications = new Map();

class NotificationService {
  // Create a notification
=======
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  // Initialize email transporter for subscription notifications
  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // or your preferred email service
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('📧 Email transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }
  /**
   * Create a notification for a user
   * @param {Object} notificationData - The notification data object
   * @returns {Promise<Object>} The created notification
   */
>>>>>>> Stashed changes
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

  // Send payment receipt notification
  static async sendPaymentReceiptNotification(userId, requestId, amount, currency) {
    try {
      const request = await Request.findById(requestId)
        .populate('propertyId', 'address')
        .populate('tenantId', 'firstName lastName')
        .populate('ownerId', 'firstName lastName');
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const isOwner = userId.toString() === request.ownerId._id.toString();
      const title = isOwner ? 'Payment Received' : 'Payment Confirmed';
      const message = isOwner 
        ? `You have received a payment of ${amount} ${currency} from ${request.tenantId.firstName} ${request.tenantId.lastName} for ${request.propertyId.address}`
        : `Your payment of ${amount} ${currency} for ${request.propertyId.address} has been confirmed`;
      
      await this.createNotification(
        userId,
        'success',
        title,
        message,
        {
          requestId,
          amount,
          currency,
          propertyAddress: request.propertyId.address
        }
      );
      
    } catch (error) {
      console.error('Error sending payment receipt notification:', error);
      throw error;
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

  // ===== SUBSCRIPTION NOTIFICATION METHODS =====

  // Send payment reminder email
  async sendPaymentReminder(user, subscription, daysUntilDue, reminderType) {
    try {
      const subject = this.getPaymentReminderSubject(reminderType, daysUntilDue);
      const htmlContent = this.getPaymentReminderTemplate(user, subscription, daysUntilDue, reminderType);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: htmlContent
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        console.log(`📧 Payment reminder sent to ${user.email} (${reminderType})`);
      }

      // Create in-app notification
      await NotificationService.createNotification({
        userId: user._id,
        type: 'payment_reminder',
        title: subject,
        message: `Payment due ${daysUntilDue >= 0 ? `in ${daysUntilDue} days` : `${Math.abs(daysUntilDue)} days ago`}`,
        relatedId: subscription._id,
        relatedModel: 'Subscription'
      });

      // Record the reminder in subscription history
      await this.recordReminderSent(subscription._id, reminderType, daysUntilDue);

      return true;
    } catch (error) {
      console.error('❌ Failed to send payment reminder:', error);
      return false;
    }
  }

  // Send account status change notification
  async sendAccountStatusNotification(user, oldStatus, newStatus, reason = null) {
    try {
      const subject = this.getStatusChangeSubject(newStatus);
      const htmlContent = this.getStatusChangeTemplate(user, oldStatus, newStatus, reason);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: htmlContent
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        console.log(`📧 Account status notification sent to ${user.email} (${newStatus})`);
      }

      // Create in-app notification
      await NotificationService.createNotification({
        userId: user._id,
        type: 'account_status',
        title: subject,
        message: `Account status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
        relatedId: user._id,
        relatedModel: 'User'
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send account status notification:', error);
      return false;
    }
  }

  // Send payment confirmation
  async sendPaymentConfirmation(user, subscription, paymentAmount, paymentDate) {
    try {
      const subject = 'Payment Confirmation - Home Management System';
      const htmlContent = this.getPaymentConfirmationTemplate(user, subscription, paymentAmount, paymentDate);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: subject,
        html: htmlContent
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        console.log(`📧 Payment confirmation sent to ${user.email}`);
      }

      // Create in-app notification
      await NotificationService.createNotification({
        userId: user._id,
        type: 'payment_confirmation',
        title: subject,
        message: `Payment of $${paymentAmount} confirmed for ${new Date(paymentDate).toLocaleDateString()}`,
        relatedId: subscription._id,
        relatedModel: 'Subscription'
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send payment confirmation:', error);
      return false;
    }
  }

  // Process scheduled payment reminders
  async processScheduledReminders() {
    try {
      console.log('🔄 Processing scheduled payment reminders...');
      
      const subscriptionsForReminder = await Subscription.findSubscriptionsForReminder();
      
      for (const subscription of subscriptionsForReminder) {
        const user = await User.findById(subscription.ownerId);
        if (!user || !user.notificationPreferences.emailReminders) {
          continue;
        }

        const daysUntilDue = Math.ceil(
          (new Date(subscription.nextBillingPeriod.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        let reminderType = 'general';
        if (daysUntilDue <= 1) {
          reminderType = 'final_day';
        } else if (daysUntilDue <= 7) {
          reminderType = 'one_week';
        } else if (daysUntilDue <= 14) {
          reminderType = 'two_weeks';
        }

        // Check if this type of reminder was already sent recently
        const lastReminder = subscription.reminderHistory[subscription.reminderHistory.length - 1];
        if (lastReminder && 
            lastReminder.type === reminderType && 
            new Date() - lastReminder.sentAt < 24 * 60 * 60 * 1000) { // 24 hours
          continue;
        }

        await this.sendPaymentReminder(user, subscription, daysUntilDue, reminderType);
      }

      console.log('✅ Scheduled payment reminders processed');
    } catch (error) {
      console.error('❌ Error processing scheduled reminders:', error);
    }
  }

  // Process overdue notifications
  async processOverdueNotifications() {
    try {
      console.log('🔄 Processing overdue notifications...');
      
      const overdueSubscriptions = await Subscription.findOverdueSubscriptions();
      
      for (const subscription of overdueSubscriptions) {
        const user = await User.findById(subscription.ownerId);
        if (!user || !user.notificationPreferences.emailReminders) {
          continue;
        }

        const daysOverdue = subscription.daysOverdue;
        
        // Send final warning if not sent yet
        const lastReminder = subscription.reminderHistory[subscription.reminderHistory.length - 1];
        if (!lastReminder || lastReminder.type !== 'overdue_warning') {
          await this.sendPaymentReminder(user, subscription, -daysOverdue, 'overdue_warning');
        }
      }

      console.log('✅ Overdue notifications processed');
    } catch (error) {
      console.error('❌ Error processing overdue notifications:', error);
    }
  }

  // Record reminder sent in subscription
  async recordReminderSent(subscriptionId, reminderType, daysUntilDue) {
    try {
      await Subscription.findByIdAndUpdate(subscriptionId, {
        $push: {
          reminderHistory: {
            type: reminderType,
            sentAt: new Date(),
            daysUntilDue: daysUntilDue
          }
        },
        lastReminderSent: new Date(),
        $inc: { reminderCount: 1 }
      });
    } catch (error) {
      console.error('❌ Error recording reminder:', error);
    }
  }

  // Email template helper methods
  getPaymentReminderSubject(reminderType, daysUntilDue) {
    switch (reminderType) {
      case 'two_weeks':
        return 'Payment Due in 14 Days - Home Management System';
      case 'one_week':
        return 'Payment Due in 7 Days - Home Management System';
      case 'final_day':
        return 'URGENT: Payment Due Today - Home Management System';
      case 'overdue_warning':
        return 'FINAL WARNING: Payment Overdue - Account at Risk';
      default:
        return `Payment Reminder - ${Math.abs(daysUntilDue)} days ${daysUntilDue >= 0 ? 'remaining' : 'overdue'}`;
    }
  }

  getStatusChangeSubject(newStatus) {
    switch (newStatus) {
      case 'frozen':
        return 'Account Frozen - Home Management System';
      case 'active':
        return 'Account Reactivated - Home Management System';
      case 'warning':
        return 'Account Warning - Home Management System';
      default:
        return 'Account Status Update - Home Management System';
    }
  }

  getPaymentReminderTemplate(user, subscription, daysUntilDue, reminderType) {
    const isOverdue = daysUntilDue < 0;
    const urgencyClass = isOverdue ? 'urgent' : (daysUntilDue <= 7 ? 'warning' : 'info');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .urgent { border-left: 5px solid #e74c3c; background-color: #fdf2f2; }
          .warning { border-left: 5px solid #f39c12; background-color: #fef9e7; }
          .info { border-left: 5px solid #3498db; background-color: #ebf3fd; }
          .button { background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
          </div>
          <div class="content ${urgencyClass}">
            <h2>Hello ${user.firstName || user.name},</h2>
            <p>
              ${isOverdue 
                ? `Your subscription payment is <strong>${Math.abs(daysUntilDue)} days overdue</strong>.` 
                : `Your subscription payment is due in <strong>${daysUntilDue} days</strong>.`
              }
            </p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <h3>Payment Details:</h3>
              <p><strong>Amount Due:</strong> $${subscription.config.monthlyFee}</p>
              <p><strong>Due Date:</strong> ${new Date(subscription.nextBillingPeriod.dueDate).toLocaleDateString()}</p>
              <p><strong>Billing Period:</strong> ${new Date(subscription.nextBillingPeriod.startDate).toLocaleDateString()} - ${new Date(subscription.nextBillingPeriod.endDate).toLocaleDateString()}</p>
            </div>
            ${isOverdue ? `
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="color: #721c24; margin: 0 0 10px 0;">⚠️ Important Notice</h4>
                <p style="color: #721c24; margin: 0;">Your account may be frozen if payment is not received promptly. Please make your payment immediately to avoid service interruption.</p>
              </div>
            ` : ''}
            <a href="${process.env.FRONTEND_URL}/payment" class="button">Make Payment Now</a>
            <p>If you have already made this payment, please disregard this notice.</p>
          </div>
          <div class="footer">
            <p>Home Management System | Contact: ${process.env.SUPPORT_EMAIL || 'support@homemanagement.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getStatusChangeTemplate(user, oldStatus, newStatus, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-change { padding: 15px; border-radius: 5px; margin: 15px 0; }
          .frozen { background-color: #fdf2f2; border: 1px solid #f5c6cb; }
          .active { background-color: #d4edda; border: 1px solid #c3e6cb; }
          .warning { background-color: #fef9e7; border: 1px solid #ffeaa7; }
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName || user.name},</h2>
            <p>Your account status has been updated.</p>
            <div class="status-change ${newStatus}">
              <h3>Status Change:</h3>
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            ${newStatus === 'frozen' ? `
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="color: #721c24;">Account Frozen</h4>
                <p style="color: #721c24;">Your account has been temporarily frozen. You will not be able to access certain features until this is resolved.</p>
                <p style="color: #721c24;">Please contact support or make any outstanding payments to reactivate your account.</p>
              </div>
            ` : ''}
            ${newStatus === 'active' ? `
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4 style="color: #155724;">Account Reactivated</h4>
                <p style="color: #155724;">Your account has been reactivated. You now have full access to all features.</p>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Home Management System | Contact: ${process.env.SUPPORT_EMAIL || 'support@homemanagement.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentConfirmationTemplate(user, subscription, paymentAmount, paymentDate) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .confirmation { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Confirmed</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName || user.name},</h2>
            <p>Thank you! Your payment has been successfully processed.</p>
            <div class="confirmation">
              <h3>Payment Details:</h3>
              <p><strong>Amount Paid:</strong> $${paymentAmount}</p>
              <p><strong>Payment Date:</strong> ${new Date(paymentDate).toLocaleDateString()}</p>
              <p><strong>Next Due Date:</strong> ${new Date(subscription.nextBillingPeriod.dueDate).toLocaleDateString()}</p>
            </div>
            <p>Your account is now up to date. Thank you for your prompt payment!</p>
          </div>
          <div class="footer">
            <p>Home Management System | Contact: ${process.env.SUPPORT_EMAIL || 'support@homemanagement.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Initialize cron jobs for automated notifications
  initializeCronJobs() {
    // Run payment reminders daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.processScheduledReminders();
    });

    // Run overdue notifications daily at 10 AM
    cron.schedule('0 10 * * *', () => {
      this.processOverdueNotifications();
    });

    console.log('📅 Notification cron jobs initialized');
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;