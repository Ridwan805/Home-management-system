const express = require('express');
const router = express.Router();
const {
  getAdminInvoices,
  getAdminPayments,
  getAdminStats,
  getMySubscription,
  processPayment
} = require('../controllers/adminSubscription.controller');
const { authMiddleware } = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');

// Apply authentication and admin authorization to all routes
router.use(authMiddleware);
router.use(authorizeRole(['admin']));

/**
 * Get admin subscription invoices
 * GET /api/admin/subscription/invoices
 */
router.get('/invoices', getAdminInvoices);

/**
 * Get admin subscription payments
 * GET /api/admin/subscription/payments
 */
router.get('/payments', getAdminPayments);

/**
 * Get admin subscription statistics
 * GET /api/admin/subscription/stats
 */
router.get('/stats', getAdminStats);

/**
 * Get current admin's subscription data
 * GET /api/admin/subscription/my
 */
router.get('/my', getMySubscription);

/**
 * Process payment for admin subscription invoice
 * POST /api/admin/subscription/pay
 */
router.post('/pay', processPayment);

module.exports = router;