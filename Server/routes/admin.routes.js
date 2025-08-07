// Server/routes/admin.routes.js
const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const isAdmin = require('../middleware/isAdmin');

// Admin authentication
router.post('/admin/login', adminController.adminLogin);

// Dashboard
router.get('/admin/dashboard/stats', isAdmin, adminController.getDashboardMetrics);

// Property management
router.get('/admin/properties/pending', isAdmin, adminController.getPendingProperties);
router.put('/admin/properties/:id/approve', isAdmin, adminController.approveProperty);
router.delete('/admin/properties/:id', isAdmin, adminController.deleteProperty);

// User management
router.get('/admin/users', isAdmin, adminController.getAllUsers);
router.put('/admin/users/:id/ban', isAdmin, adminController.banUser);
router.put('/admin/users/:id/unban', isAdmin, adminController.unbanUser);
router.delete('/admin/users/:id', isAdmin, adminController.deleteUser);

// Report management
router.get('/admin/reports', isAdmin, adminController.getAllReports);
router.delete('/admin/reports/:id', isAdmin, adminController.deleteReport);
router.put('/admin/reports/:id/escalate', isAdmin, adminController.escalateReport);

module.exports = router;
