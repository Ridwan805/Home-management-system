const express = require('express');
const router = express.Router();

const {
  getMyRequests,
  getOwnerRequests,
  getRequestById,
  getRequestMessages,
  cancelRequest,
  updateRequestStatus,
  addMessage,
  markMessagesAsRead,
  setupAdvancePayment,
  rejectRequest,
  approveRequest,
  completeOfferForm,
  acceptOffer,
  getOfferDetails
} = require('../controllers/requestManagement.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Tenant routes
router.get('/my-requests', authMiddleware, getMyRequests);
router.patch('/my-requests/:requestId/cancel', authMiddleware, cancelRequest);
router.post('/my-requests/:requestId/complete-form', authMiddleware, completeOfferForm);
router.post('/my-requests/:requestId/accept-offer', authMiddleware, acceptOffer);
router.get('/my-requests/:requestId/offer', authMiddleware, getOfferDetails);

// Owner routes
router.get('/owner-requests', authMiddleware, getOwnerRequests);
router.post('/owner-requests/:requestId/approve', authMiddleware, approveRequest);
router.patch('/owner-requests/:requestId/status', authMiddleware, updateRequestStatus);
router.post('/owner-requests/:requestId/advance-payment', authMiddleware, setupAdvancePayment);
router.post('/owner-requests/:requestId/reject', authMiddleware, rejectRequest);

// Shared routes (tenant and owner)
router.get('/:requestId', authMiddleware, getRequestById);
router.get('/:requestId/messages', authMiddleware, getRequestMessages);
router.post('/:requestId/messages', authMiddleware, addMessage);
router.patch('/:requestId/messages/read', authMiddleware, markMessagesAsRead);

module.exports = router;