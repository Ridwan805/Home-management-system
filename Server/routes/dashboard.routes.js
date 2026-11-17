const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getUnifiedDashboardOverview } = require('../controllers/dashboard.controller');

// GET /api/dashboard/overview - Unified Tenant + Owner dashboard metrics & portfolio
router.get('/overview', authMiddleware, getUnifiedDashboardOverview);

module.exports = router;
