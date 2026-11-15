const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorizeRole = require('../middleware/authorizeRole');
const {
  getOwnerTenants,
  getTenantDetails,
  createTenant,
  updateTenant,
  recordManualPayment,
  getOwnerNotices,
  createOrSendNotice,
  getNoticeDetails
} = require('../controllers/tenantManagement.controller');

// Owner and Admin authorization
const ownerAuth = [authMiddleware, authorizeRole(['Owner', 'Admin'])];

// Tenant Directory & Tenancy routes
router.get('/tenants', ownerAuth, getOwnerTenants);
router.get('/tenants/:id', ownerAuth, getTenantDetails);
router.post('/tenants', ownerAuth, createTenant);
router.put('/tenants/:id', ownerAuth, updateTenant);
router.post('/tenants/:id/payments', ownerAuth, recordManualPayment);

// Notice Management routes
router.get('/notices', ownerAuth, getOwnerNotices);
router.get('/notices/:id', ownerAuth, getNoticeDetails);
router.post('/notices', ownerAuth, createOrSendNotice);

module.exports = router;
