// Server/routes/admin.routes.js
const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const isAdmin = require('../middleware/isAdmin');

// Admin authentication
router.post('/login', adminController.adminLogin);

// Dashboard
router.get('/dashboard/stats', isAdmin, adminController.getDashboardMetrics);

// Property management
router.get('/properties/pending', isAdmin, adminController.getPendingProperties);
router.put('/properties/:id/approve', isAdmin, adminController.approveProperty);
router.delete('/properties/:id', isAdmin, adminController.deleteProperty);

// User management
router.get('/users', isAdmin, adminController.getAllUsers);
router.put('/users/:id/ban', isAdmin, adminController.banUser);
router.put('/users/:id/unban', isAdmin, adminController.unbanUser);
router.delete('/users/:id', isAdmin, adminController.deleteUser);

// Report management
router.get('/reports', isAdmin, adminController.getAllReports);
router.delete('/reports/:id', isAdmin, adminController.deleteReport);
router.put('/reports/:id/escalate', isAdmin, adminController.escalateReport);

module.exports = router;
