const express = require('express');
const router = express.Router();
const {
  createSubscription,
  getSubscription,
  getSubscriptionByOwner,
  getMySubscription,
  getAllSubscriptions,
  processPayment,
  updateSubscriptionConfig,
  freezeSubscription,
  unfreezeSubscription,
  getSubscriptionStats,
  getPaymentHistory,
  getGlobalConfig,
  updateGlobalConfig
} = require('../controllers/subscription.controller');

const { authMiddleware, checkAccountStatus, checkSubscriptionAccess } = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');

// Apply authentication to all routes
router.use(authMiddleware);

// Public routes (authenticated users)
// Get current user's subscription (owners only)
router.get('/my-subscription', authorizeRole(['Owner']), getMySubscription);

// Get subscription by ID (admin or owner)
router.get('/:subscriptionId', getSubscription);

// Get subscription by owner ID (admin or owner)
router.get('/owner/:ownerId', getSubscriptionByOwner);

// Get payment history for a subscription (admin or owner)
router.get('/:subscriptionId/payment-history', getPaymentHistory);

// Payment processing (owners can pay their own, admins can process any)
router.post('/:subscriptionId/payment', processPayment);

// Admin-only routes
// Create new subscription
router.post('/', authorizeRole(['admin']), createSubscription);

// Get all subscriptions with filtering and pagination
router.get('/', authorizeRole(['admin']), getAllSubscriptions);

// Admin-specific routes
router.get('/admin/all', authorizeRole(['admin']), getAllSubscriptions);
router.get('/admin/stats', authorizeRole(['admin']), getSubscriptionStats);
router.get('/admin/config', authorizeRole(['admin']), getGlobalConfig);
router.put('/admin/config', authorizeRole(['admin']), updateGlobalConfig);

// Update subscription configuration
router.put('/:subscriptionId/config', authorizeRole(['admin']), updateSubscriptionConfig);

// Freeze subscription and account
router.post('/:subscriptionId/freeze', authorizeRole(['admin']), freezeSubscription);

// Unfreeze subscription and account
router.post('/:subscriptionId/unfreeze', authorizeRole(['admin']), unfreezeSubscription);

// Get subscription statistics (admin only)
router.get('/admin/statistics', authorizeRole(['admin']), getSubscriptionStats);

module.exports = router;