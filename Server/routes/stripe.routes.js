const express = require('express');
const router = express.Router();
const { 
  getPublishableKey,
  createPaymentSession, 
  createFullPaymentSession,
  handleWebhook, 
  getPaymentStatus,
  generateReceipt,
  uploadPaymentProof
} = require('../controllers/stripe.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Get Stripe publishable key
router.get('/publishable-key', getPublishableKey);

// Create payment session for advance payment
router.post('/create-payment-session/:requestId', authMiddleware, createPaymentSession);

// Create payment session for full payment
router.post('/create-full-payment-session/:requestId', authMiddleware, createFullPaymentSession);

// Webhook is now handled directly in index.js with proper raw body parsing
// router.post('/webhook', express.raw({type: 'application/json'}), handleWebhook);

// Get payment status
router.get('/payment-status/:sessionId', authMiddleware, getPaymentStatus);

// Generate and download payment receipt
router.get('/receipt/:paymentId', authMiddleware, generateReceipt);

// Upload payment proof
router.post('/payment-proof/:paymentId', authMiddleware, uploadPaymentProof);

module.exports = router;