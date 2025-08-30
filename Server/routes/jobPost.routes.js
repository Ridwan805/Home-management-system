const express = require('express');
const router = express.Router();
const {
  createJobPost,
  getJobPosts,
  getJobPostById,
  updateJobPost,
  hireGuard,
  getJobApplications,
  cancelJobPost
} = require('../controllers/jobPost.controller');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Create a new job post (Owner only)
router.post('/', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  createJobPost
);

// Get all job posts with filters
router.get('/', 
  authMiddleware, 
  getJobPosts
);

// Get specific job post by ID
router.get('/:id', 
  authMiddleware, 
  getJobPostById
);

// Update job post (Owner only)
router.put('/:id', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  updateJobPost
);

// Hire a security guard (Owner only)
router.post('/hire', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  hireGuard
);

// Get applications for a specific job post (Owner only)
router.get('/:jobPostId/applications', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  getJobApplications
);

// Cancel/Close job post (Owner only)
router.delete('/:id', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  cancelJobPost
);

module.exports = router;