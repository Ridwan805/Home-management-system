const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { 
  getUnifiedDashboardOverview,
  getFinancialOverview
} = require('../controllers/dashboard.controller');

// GET /api/dashboard/overview - Unified Tenant + Owner dashboard metrics & portfolio
router.get('/overview', authMiddleware, getUnifiedDashboardOverview);

// GET /api/dashboard/financials - Verified financial metrics, cash flow, upcoming obligations & ledger
router.get('/financials', authMiddleware, getFinancialOverview);

module.exports = router;
