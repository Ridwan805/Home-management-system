// Server/controllers/notifications.controller.js
const NotificationService = require('../services/notificationService');

// Get user notifications with filtering, search, and pagination
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { limit = 20, page = 1, filter = 'all', category = 'all', search = '' } = req.query;
    
    const result = await NotificationService.getUserNotifications(userId, {
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      filter,
      category,
      search
    });
    
    res.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      page: result.page,
      pages: result.pages,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { notificationId } = req.params;
    
    const notification = await NotificationService.markAsRead(userId, notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    
    const result = await NotificationService.markAllAsRead(userId);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result?.modifiedCount || 0,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

// Delete a single notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { notificationId } = req.params;

    const result = await NotificationService.deleteNotification(userId, notificationId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);
    res.json({
      success: true,
      message: 'Notification removed',
      unreadCount
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const unreadCount = await NotificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount
};