// Server/routes/notifications.js
const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} = require('../controllers/notifications.controller');

// GET /api/notifications - Get user notifications
router.get('/', auth, getUserNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', auth, getUnreadCount);

// PUT /api/notifications/:notificationId/read - Mark notification as read
router.put('/:notificationId/read', auth, markNotificationAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', auth, markAllNotificationsAsRead);

module.exports = router;