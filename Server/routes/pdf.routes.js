const express = require('express');
const router = express.Router();
const { generatePDFAndRedirect, getReceiptData } = require('../controllers/pdf.controller');

// Redirect after payment completion
router.get('/generate-receipt', generatePDFAndRedirect);

// Get receipt data for display
router.get('/receipt-data', getReceiptData);

module.exports = router;