const express = require('express');
const router = express.Router();
const { generatePDFAndRedirect } = require('../controllers/pdf.controller');

// Generate PDF receipt and redirect
router.get('/generate-receipt', generatePDFAndRedirect);

module.exports = router;