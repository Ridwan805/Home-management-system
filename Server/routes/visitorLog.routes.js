const express = require('express');
const router = express.Router();
const {
  createVisitorLog,
  createPreApprovedGuest,
  getVisitorLogs,
  checkInVisitor,
  checkOutVisitor,
  getPreApprovedGuests,
  getOverdueVisitors,
  updateVisitorLog,
  deleteVisitorLog
} = require('../controllers/visitorLog.controller');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create visitor log (Security Guard only)
router.post('/', 
  authorizeRole(['security_guard', 'admin']), 
  createVisitorLog
);

// Create pre-approved guest (Resident only)
router.post('/pre-approve', 
  authorizeRole(['homeowner', 'tenant', 'admin']), 
  createPreApprovedGuest
);

// Get all visitor logs (with role-based filtering)
router.get('/', getVisitorLogs);

// Get pre-approved guests (Security Guard/Admin only)
router.get('/pre-approved', 
  authorizeRole(['security_guard', 'admin']), 
  getPreApprovedGuests
);

// Get overdue visitors (Security Guard/Admin only)
router.get('/overdue', 
  authorizeRole(['security_guard', 'admin']), 
  getOverdueVisitors
);

// Check in visitor (Security Guard/Admin only)
router.patch('/:id/checkin', 
  authorizeRole(['security_guard', 'admin']), 
  checkInVisitor
);

// Check out visitor (Security Guard/Admin only)
router.patch('/:id/checkout', 
  authorizeRole(['security_guard', 'admin']), 
  checkOutVisitor
);

// Update visitor log (Security Guard/Admin only)
router.put('/:id', 
  authorizeRole(['security_guard', 'admin']), 
  updateVisitorLog
);

// Delete visitor log (Admin only)
router.delete('/:id', 
  authorizeRole(['admin']), 
  deleteVisitorLog
);

module.exports = router;