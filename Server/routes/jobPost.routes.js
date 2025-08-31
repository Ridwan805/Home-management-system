const express = require('express');
const router = express.Router();
const {
  createJobPost,
  getJobPosts,
  getJobPostById,
  updateJobPost,
  hireGuard,
  getJobApplications,
  cancelJobPost,
  fireGuard,
  getTenantAssignedGuards,
  getGuardCurrentJob
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

// Cancel/Delete job post (Owner only)
router.delete('/:id', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  cancelJobPost
);

// Fire a security guard (Owner only)
router.post('/:id/fire', 
  authMiddleware, 
  authorizeRole(['Owner']), 
  fireGuard
);

// Get assigned guards for tenant (Tenant only)
router.get('/tenant/assigned-guards', 
  authMiddleware, 
  authorizeRole(['Tenant']), 
  getTenantAssignedGuards
);

// Get security guard's current job assignment
router.get('/guard/current-job', 
  authMiddleware, 
  authorizeRole(['Security Guard']), 
  getGuardCurrentJob
);

module.exports = router;