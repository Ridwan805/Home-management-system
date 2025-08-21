const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  updateRequestPayload,
  addInternalNote,
  getRequestStats,
  submitPaymentProof
} = require('../controllers/request.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Multer storage for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine subfolder based on file type
    let subfolder = '';
    if (file.fieldname === 'nidFile') {
      subfolder = 'nid';
    } else if (file.fieldname === 'tinFile') {
      subfolder = 'tin';
    } else if (file.fieldname === 'personalPhoto') {
      subfolder = 'personal';
    }
    
    const destinationPath = `tenant_pics/${subfolder}/`;
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only specific file types for identity documents
    if (file.fieldname === 'personalPhoto') {
      // Personal photo must be an image
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Personal photo must be a JPEG, JPG, or PNG image'));
      }
    } else if (file.fieldname === 'nidFile' || file.fieldname === 'tinFile') {
      // NID and TIN can be images or PDFs
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Identity documents must be JPEG, JPG, PNG, or PDF files'));
      }
    } else {
      cb(new Error('Unexpected file field'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// @route   POST /api/requests
// @desc    Create a new request with unified inquiry form
// @access  Private (Tenant only)
const uploader = upload.fields([
  { name: 'nidFile', maxCount: 1 },
  { name: 'tinFile', maxCount: 1 },
  { name: 'personalPhoto', maxCount: 1 }
]);

router.post('/', (req, res, next) => {
  uploader(req, res, function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }
    next();
  });
}, createRequest);

// @route   GET /api/requests
// @desc    Get all requests (filtered by user role)
// @access  Private
router.get('/', getRequests);

// @route   GET /api/requests/stats
// @desc    Get request statistics
// @access  Private
router.get('/stats', getRequestStats);

// @route   GET /api/requests/:requestId
// @desc    Get single request by ID
// @access  Private
router.get('/:requestId', getRequestById);

// @route   PUT /api/requests/:requestId/status
// @desc    Update request status
// @access  Private (Owner/Admin)
router.put('/:requestId/status', updateRequestStatus);

// @route   PUT /api/requests/:requestId/payload
// @desc    Update request payload (for info requests)
// @access  Private (Tenant only)
router.put('/:requestId/payload', updateRequestPayload);

// @route   POST /api/requests/:requestId/notes
// @desc    Add internal note to request
// @access  Private
router.post('/:requestId/notes', addInternalNote);

// @route   POST /api/requests/:requestId/payment-proof
// @desc    Submit payment proof
// @access  Private (Tenant only)
router.post('/:requestId/payment-proof', submitPaymentProof);

module.exports = router;