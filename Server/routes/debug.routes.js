const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debug.controller');
const authMiddleware = require('../middleware/auth');

// Debug route to check payment status
router.get('/payment-status/:requestId', authMiddleware, debugController.checkPaymentStatus);

module.exports = router;