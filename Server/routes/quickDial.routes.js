const express = require('express');
const router = express.Router();
const {
  getOwnerContact,
  logCallAttempt,
  getEmergencyContacts,
  getAllQuickDialContacts
} = require('../controllers/quickDial.controller');
const authenticateToken = require('../middleware/auth');

// Middleware to ensure user is authenticated
router.use(authenticateToken);

// Middleware to ensure user is tenant or security guard
const ensureTenantOrGuard = (req, res, next) => {
  const userRole = req.user.role;
  if (userRole !== 'Tenant' && userRole !== 'Security Guard') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This feature is only available for tenants and security guards.'
    });
  }
  next();
};

// Apply role check to all routes
router.use(ensureTenantOrGuard);

/**
 * @route GET /api/quick-dial/owner
 * @desc Get owner contact information
 * @access Private (Tenant, Security Guard)
 */
router.get('/owner', getOwnerContact);

/**
 * @route GET /api/quick-dial/emergency
 * @desc Get emergency contact numbers
 * @access Private (Tenant, Security Guard)
 */
router.get('/emergency', getEmergencyContacts);

/**
 * @route GET /api/quick-dial/all
 * @desc Get all quick dial contacts (owner + emergency)
 * @access Private (Tenant, Security Guard)
 */
router.get('/all', getAllQuickDialContacts);

/**
 * @route POST /api/quick-dial/log-call
 * @desc Log a call attempt for analytics
 * @access Private (Tenant, Security Guard)
 */
router.post('/log-call', logCallAttempt);

module.exports = router;