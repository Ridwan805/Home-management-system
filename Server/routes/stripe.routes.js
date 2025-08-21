const express = require('express');
const router = express.Router();
const { createPaymentSession, handleWebhook, getPaymentStatus } = require('../controllers/stripe.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Create payment session for advance payment
router.post('/create-payment-session/:requestId', authMiddleware, createPaymentSession);

// Stripe webhook endpoint (no auth middleware for webhooks)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Get payment session status
router.get('/payment-status/:sessionId', authMiddleware, getPaymentStatus);

module.exports = router;