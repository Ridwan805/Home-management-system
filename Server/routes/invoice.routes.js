const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  addLineItem,
  processPayment,
  processCompletedPayment,
  getOverdueInvoices,
  generateMonthlyRentInvoices,
  generateOwnershipTransferInvoice,
  processInvoicePaymentService,
  markOverdueInvoices
} = require('../controllers/invoice.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Get invoices for authenticated user (tenant or owner)
router.get('/', authMiddleware, getInvoices);

// Get specific invoice by ID
router.get('/:invoiceId', authMiddleware, getInvoiceById);

// Create new invoice (owner only)
router.post('/', authMiddleware, createInvoice);

// Update invoice status
router.patch('/:invoiceId/status', authMiddleware, updateInvoiceStatus);

// Add line item to invoice
router.post('/:invoiceId/line-items', authMiddleware, addLineItem);

// Process payment for invoice (create Stripe checkout session)
router.post('/:invoiceId/payment', authMiddleware, processPayment);

// Process completed payment from Stripe webhook
router.post('/:invoiceId/payment/complete', authMiddleware, processCompletedPayment);

// Get overdue invoices
router.get('/status/overdue', authMiddleware, getOverdueInvoices);

// Generate monthly rent invoices (admin/system)
router.post('/generate/monthly-rent', authMiddleware, generateMonthlyRentInvoices);

// Generate ownership transfer invoice
router.post('/generate/ownership-transfer/:transferId', authMiddleware, generateOwnershipTransferInvoice);

// Process invoice payment via service
router.post('/:invoiceId/process-payment', authMiddleware, processInvoicePaymentService);

// Mark overdue invoices (admin/system)
router.post('/mark-overdue', authMiddleware, markOverdueInvoices);

module.exports = router;