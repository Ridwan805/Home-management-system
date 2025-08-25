const express = require('express');
const router = express.Router();
const { generatePDFAndRedirect, generatePDFServerSide, createTestPayment } = require('../controllers/pdf.controller');

// Generate PDF receipt and redirect (client-side)
router.get('/generate-receipt', generatePDFAndRedirect);

// Generate PDF receipt server-side and force download
router.get('/download-receipt', generatePDFServerSide);



// Route for creating test payment record
router.post('/create-test-payment', createTestPayment);

module.exports = router;