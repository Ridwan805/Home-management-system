const express = require('express');
const router = express.Router();
const { 
  getPublishableKey,
  createPaymentSession, 
  createFullPaymentSession,
  handleWebhook, 
  getPaymentStatus,
  uploadPaymentProof,
  updatePaymentStatus,
<<<<<<< Updated upstream
  getReceipt
=======
  getReceipt,
  createInvoicePaymentSession,
  createSubscriptionPaymentSession
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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

// Update payment status
router.put('/payment-status/:paymentId', authMiddleware, updatePaymentStatus);



// Upload payment proof
router.post('/payment-proof/:paymentId', authMiddleware, uploadPaymentProof);

// Get payment receipt
router.get('/receipt/:paymentId', authMiddleware, getReceipt);

<<<<<<< Updated upstream


// Create payment session for subscription payment
router.post('/create-subscription-payment-session', authMiddleware, createSubscriptionPaymentSession);
=======
// Create invoice payment session
router.post('/create-invoice-payment-session', authMiddleware, createInvoicePaymentSession);
>>>>>>> Stashed changes

// Create subscription payment session
router.post('/create-subscription-payment-session', authMiddleware, createSubscriptionPaymentSession);

module.exports = router;