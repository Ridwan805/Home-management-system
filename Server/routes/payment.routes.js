const express = require('express');
const PaymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get pending invoices for a tenant
router.get('/tenant/:tenantId/pending-invoices', authMiddleware, PaymentController.getPendingInvoices);

// Get payment history for a tenant
router.get('/tenant/:tenantId/payment-history', authMiddleware, PaymentController.getPaymentHistory);

// Get all payment data for a tenant (pending invoices + payment history)
router.get('/tenant/:tenantId/all', authMiddleware, PaymentController.getAllPayments);

// Get all payment data for the authenticated user (no tenantId required)
router.get('/my-payments', authMiddleware, PaymentController.getMyPayments);

// Get payment details by ID
router.get('/:paymentId', authMiddleware, PaymentController.getPaymentById);

// Update payment status (used by Stripe webhook and internal updates)
router.put('/:paymentId/status', PaymentController.updatePaymentStatus);

// Admin utility: Create payment objects for existing invoices
router.post('/admin/create-for-existing-invoices', authMiddleware, PaymentController.createPaymentsForExistingInvoices);

module.exports = router;