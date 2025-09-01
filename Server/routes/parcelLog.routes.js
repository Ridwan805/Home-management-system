const express = require('express');
const router = express.Router();
const {
  createParcelLog,
  getParcelLogs,
  getParcelLogById,
  markParcelCollected,
  getOverdueParcels,
  updateParcelLog,
  deleteParcelLog
} = require('../controllers/parcelLog.controller');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create parcel log (Security Guard only)
router.post('/', 
  authorizeRole(['Security Guard', 'admin']), 
  createParcelLog
);

// Get all parcel logs (with role-based filtering)
router.get('/', getParcelLogs);

// Get overdue parcels (Security Guard/Admin only) - Must come before /:id route
router.get('/overdue', 
  authorizeRole(['Security Guard', 'admin']), 
  getOverdueParcels
);

// Get parcel logs for tenant - Must come before /:id route
router.get('/tenant', 
  authorizeRole(['Tenant', 'admin']), 
  getParcelLogs
);

// Get parcel log by ID
router.get('/:id', getParcelLogById);

// Mark parcel as collected (Resident/Security Guard/Admin)
router.patch('/:id/collect', 
  authorizeRole(['Tenant', 'Security Guard', 'admin']), 
  markParcelCollected
);

// Update parcel log (Security Guard/Admin only)
router.put('/:id', 
  authorizeRole(['Security Guard', 'admin']), 
  updateParcelLog
);

// Delete parcel log (Admin only)
router.delete('/:id', 
  authorizeRole(['admin']), 
  deleteParcelLog
);

module.exports = router;