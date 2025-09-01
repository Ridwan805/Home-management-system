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
  authorizeRole(['security_guard', 'admin']), 
  createParcelLog
);

// Get all parcel logs (with role-based filtering)
router.get('/', getParcelLogs);

// Get overdue parcels (Security Guard/Admin only)
router.get('/overdue', 
  authorizeRole(['security_guard', 'admin']), 
  getOverdueParcels
);

// Get parcel log by ID
router.get('/:id', getParcelLogById);

// Mark parcel as collected (Resident/Security Guard/Admin)
router.patch('/:id/collect', markParcelCollected);

// Update parcel log (Security Guard/Admin only)
router.put('/:id', 
  authorizeRole(['security_guard', 'admin']), 
  updateParcelLog
);

// Delete parcel log (Admin only)
router.delete('/:id', 
  authorizeRole(['admin']), 
  deleteParcelLog
);

module.exports = router;