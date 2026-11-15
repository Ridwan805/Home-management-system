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
  getNoticeDetails,
  submitMoveOutNotice,
  acknowledgeMoveOut,
  recordHandover,
  settleDepositAndTerminate,
  getMyTenancy
} = require('../controllers/tenantManagement.controller');

// Owner and Admin authorization
const ownerAuth = [authMiddleware, authorizeRole(['Owner', 'Admin'])];

// Tenant self-service tenancy & move-out routes
router.get('/my-tenancy', authMiddleware, getMyTenancy);
router.post('/tenancy/:rentId/move-out-notice', authMiddleware, submitMoveOutNotice);

// Tenant Directory & Tenancy routes
router.get('/tenants', ownerAuth, getOwnerTenants);
router.get('/tenants/:id', ownerAuth, getTenantDetails);
router.post('/tenants', ownerAuth, createTenant);
router.put('/tenants/:id', ownerAuth, updateTenant);
router.post('/tenants/:id/payments', ownerAuth, recordManualPayment);

// Owner Move-Out & Deposit Settlement routes
router.post('/tenants/:rentId/acknowledge-move-out', ownerAuth, acknowledgeMoveOut);
router.post('/tenants/:rentId/record-handover', ownerAuth, recordHandover);
router.post('/tenants/:rentId/settle-deposit', ownerAuth, settleDepositAndTerminate);

// Notice Management routes
router.get('/notices', ownerAuth, getOwnerNotices);
router.get('/notices/:id', ownerAuth, getNoticeDetails);
router.post('/notices', ownerAuth, createOrSendNotice);

module.exports = router;
