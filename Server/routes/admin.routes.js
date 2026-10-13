// Server/routes/admin.routes.js
const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const isAdmin = require('../middleware/isAdmin');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Admin authentication
router.post('/login', adminController.adminLogin);

// Dashboard
router.get('/dashboard/stats', isAdmin, adminController.getDashboardMetrics);
router.get('/dashboard/recent-activity', isAdmin, adminController.getRecentSystemActivity);

// Property management
router.get('/properties/pending', isAdmin, adminController.getPendingProperties);
router.put('/properties/:id/approve', isAdmin, adminController.approveProperty);
router.delete('/properties/:id', isAdmin, adminController.deleteProperty);

// User management
router.get('/users', isAdmin, adminController.getAllUsers);
router.get('/users/:id/activity', isAdmin, adminController.getUserActivity);
router.put('/users/:id', isAdmin, adminController.updateUserByAdmin);
router.put('/users/:id/reset-password', isAdmin, adminController.adminResetUserPassword);
router.get('/users/tenants-for-guard', 
  (req, res, next) => {
    console.log('🔍 ADMIN ROUTE: tenants-for-guard route hit');
    next();
  },
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  adminController.getTenantsForSecurityGuard
);
router.put('/users/:id/ban', isAdmin, adminController.banUser);
router.put('/users/:id/unban', isAdmin, adminController.unbanUser);
router.delete('/users/:id', isAdmin, adminController.deleteUser);

// Report management
router.get('/reports', isAdmin, adminController.getAllReports);
router.delete('/reports/:id', isAdmin, adminController.deleteReport);
router.put('/reports/:id/escalate', isAdmin, adminController.escalateReport);

// Request management routes
router.get('/requests', isAdmin, adminController.getAllRequests);
router.delete('/requests/:id', isAdmin, adminController.deleteRequest);

// Property cleanup route
router.post('/cleanup-properties', isAdmin, adminController.cleanupOrphanedProperties);

module.exports = router;
