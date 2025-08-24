const express = require('express');
const router = express.Router();

console.log('🔧 RequestManagement routes loaded');

// Test route to verify mounting
router.get('/test', (req, res) => {
  console.log('🔧 Test route hit!');
  res.json({ message: 'RequestManagement routes are working!' });
});

const {
  getMyRequests,
  getOwnerRequests,
  getRequestById,
  cancelRequest,
  updateRequestStatus,
  addMessage,
  markMessagesAsRead,
  setupAdvancePayment,
  rejectRequest
} = require('../controllers/requestManagement.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Tenant routes
router.get('/my-requests', (req, res, next) => {
  console.log('🔧 /my-requests route hit');
  next();
}, authMiddleware, getMyRequests);
router.patch('/my-requests/:requestId/cancel', authMiddleware, cancelRequest);

// Owner routes
router.get('/owner-requests', authMiddleware, getOwnerRequests);
router.patch('/owner-requests/:requestId/status', authMiddleware, updateRequestStatus);
router.post('/owner-requests/:requestId/advance-payment', authMiddleware, setupAdvancePayment);
router.post('/owner-requests/:requestId/reject', authMiddleware, rejectRequest);

// Shared routes (tenant and owner)
router.get('/:requestId', authMiddleware, getRequestById);
router.post('/:requestId/messages', authMiddleware, addMessage);
router.patch('/:requestId/messages/read', authMiddleware, markMessagesAsRead);

module.exports = router;