const express = require('express');
const router = express.Router();
const {
  applyForJob,
  getMyApplications,
  getApplicationById,
  updateApplication,
  withdrawApplication,
  updateApplicationStatus,
  getApplicationStats,
  getApplicationsByJobPost
} = require('../controllers/securityGuardApplication.controller');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Apply for a security guard job (Security Guard only)
router.post('/apply', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  applyForJob
);

// Get my applications (Security Guard only)
router.get('/my-applications', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  getMyApplications
);

// Get application statistics (Security Guard only)
router.get('/stats', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  getApplicationStats
);

// Get applications for a job post (Owner only) - MUST come before /:id route
router.get('/job/:jobPostId', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  getApplicationsByJobPost
);

// Get specific application by ID (Security Guard or Owner)
router.get('/:id', 
  authMiddleware, 
  getApplicationById
);

// Update application (Security Guard only, before review)
router.put('/:id', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  updateApplication
);

// Withdraw application (Security Guard only)
router.delete('/:id', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  withdrawApplication
);

// Update application status (Owner only)
router.patch('/:id/status', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  updateApplicationStatus
);

module.exports = router;