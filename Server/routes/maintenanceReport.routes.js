const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  upload,
  createMaintenanceReport,
  getTenantReports,
  getOwnerReports,
  getReportById,
  updateReportStatus,
  resolveReport,
  addReportUpdate,
  getReportStats
} = require('../controllers/maintenanceReport.controller');

// Simple role guard using decoded token placed by auth middleware
function authorizeRole(roles) {
  return (req, res, next) => {
    // If no specific role data on token, continue
    if (!roles || roles.length === 0) return next();
    try {
      const tokenRole = req.user?.role;
      if (!tokenRole) return res.status(403).json({ error: 'Forbidden' });
      const allowed = roles.map(r => String(r).toLowerCase());
      const normalized = String(tokenRole).toLowerCase();
      
      // Debug log to help troubleshoot role issues
      console.log('Role check:', { 
        userRole: tokenRole, 
        normalizedRole: normalized, 
        allowedRoles: allowed, 
        isAllowed: allowed.includes(normalized) 
      });
      
      if (!allowed.includes(normalized)) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

// Create a new maintenance report (tenant only)
router.post(
  '/',
  auth,
  authorizeRole(['Tenant']),
  upload.array('images', 5), // Allow up to 5 images
  createMaintenanceReport
);

// Get maintenance reports for tenant
router.get(
  '/tenant',
  auth,
  authorizeRole(['Tenant']),
  getTenantReports
);

// Get maintenance reports for owner
router.get(
  '/owner',
  auth,
  authorizeRole(['Owner']),
  getOwnerReports
);

// Get report statistics for owner dashboard
router.get(
  '/stats',
  auth,
  authorizeRole(['Owner']),
  getReportStats
);

// Get a specific maintenance report by ID
router.get(
  '/:id',
  auth,
  getReportById
);

// Update maintenance report status (owner only)
router.patch(
  '/:id/status',
  auth,
  authorizeRole(['Owner']),
  updateReportStatus
);

// Resolve maintenance report (owner only)
router.patch(
  '/:id/resolve',
  auth,
  authorizeRole(['Owner']),
  resolveReport
);

// Add update/comment to maintenance report
router.post(
  '/:id/updates',
  auth,
  addReportUpdate
);

module.exports = router;