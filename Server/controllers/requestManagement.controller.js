const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Get all requests for the authenticated tenant
const getMyRequests = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const { status } = req.query;
    
    // Build query object
    const query = { tenantId };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    console.log('🔍 Fetching tenant requests with query:', query);
    
    const requests = await Request.find(query)
      .populate('propertyId', 'address city state rent buyPrice images')
      .populate('ownerId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Error fetching tenant requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

// Get all requests for properties owned by the authenticated owner
const getOwnerRequests = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    
    const requests = await Request.find({ ownerId })
      .populate('propertyId', 'address city state rent buyPrice images')
      .populate('tenantId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Error fetching owner requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

// Get a specific request by ID (with authorization check)
const getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId)
      .populate('propertyId', 'address city state rent buyPrice images')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email')
      .populate('messages.senderId', 'firstName lastName');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is authorized to view this request
    if (request.tenantId._id.toString() !== userId && request.ownerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }
    
    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
};

// Cancel a request (only by tenant and only if status is 'Submitted')
const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId).populate('propertyId');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is the tenant who submitted the request
    if (request.tenantId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }
    
    // Check if request can be canceled
    if (request.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Request can only be canceled when status is "Submitted"'
      });
    }
    
    // Update request status and add timeline event
    request.status = 'Canceled';
    request.timeline.push({
      event: 'Request Canceled',
      actor: userId,
      timestamp: new Date(),
      note: 'Request canceled by tenant'
    });
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Request canceled successfully',
      request
    });
  } catch (error) {
    console.error('Error canceling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request'
    });
  }
};

// Update request status (for owners)
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, note = '', reason = '' } = req.body;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is the property owner
    if (request.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request'
      });
    }
    
    // Validate status transition
    const validTransitions = {
      'Submitted': ['Under Review', 'Rejected'],
      'Under Review': ['Info Requested', 'Approved – Pay Advance', 'Rejected'],
      'Info Requested': ['Under Review', 'Rejected'],
      'Payment Submitted': ['Paid/Completed', 'Approved – Pay Advance']
    };
    
    if (!validTransitions[request.status] || !validTransitions[request.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${request.status}" to "${status}"`
      });
    }
    
    // Update request status
    const oldStatus = request.status;
    request.status = status;
    
    // Add timeline event
    let eventNote = note;
    if (status === 'Rejected' && reason) {
      eventNote = `Rejected: ${reason}`;
    }
    
    request.timeline.push({
      event: `Status changed from "${oldStatus}" to "${status}"`,
      actor: userId,
      timestamp: new Date(),
      note: eventNote
    });
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Request status updated successfully',
      request
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request status'
    });
  }
};

// Add a message to the request thread
const addMessage = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message, attachments = [] } = req.body;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is authorized (tenant or owner)
    if (request.tenantId.toString() !== userId && request.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message on this request'
      });
    }
    
    // Add message to the thread
    request.messages.push({
      senderId: userId,
      message: message.trim(),
      timestamp: new Date(),
      attachments
    });
    
    // Add timeline event
    request.timeline.push({
      event: 'Message sent',
      actor: userId,
      timestamp: new Date(),
      note: `Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`
    });
    
    await request.save();
    
    // Populate the new message with sender info
    await request.populate('messages.senderId', 'firstName lastName');
    
    const newMessage = request.messages[request.messages.length - 1];
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      newMessage
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is authorized
    if (request.tenantId.toString() !== userId && request.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Mark messages as read (messages not sent by current user)
    request.messages.forEach(msg => {
      if (msg.senderId.toString() !== userId) {
        msg.isRead = true;
      }
    });
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
};

// Set up advance payment (for owners when approving)
const setupAdvancePayment = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { amount, currency, dueDate, instructions, note } = req.body;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is the property owner
    if (request.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to set up payment for this request'
      });
    }
    
    // Validate current status allows advance payment setup
    if (!['Under Review', 'Submitted'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot set up advance payment for request in status: ${request.status}`
      });
    }
    
    // Validate advance payment amount doesn't exceed 50% of property price
    const propertyPrice = request.propertyId.price;
    const maxAdvanceAmount = propertyPrice * 0.5;
    const requestedAmount = parseFloat(amount);
    
    if (requestedAmount > maxAdvanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Advance payment cannot exceed 50% of property price. Maximum allowed: BDT ${maxAdvanceAmount.toLocaleString()}`
      });
    }
    
    if (requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Advance payment amount must be greater than 0'
      });
    }
    
    // Set up advance payment on Request
    request.advancePayment = {
      amount: parseFloat(amount),
      currency: currency || 'BDT',
      dueDate: new Date(dueDate),
      instructions: instructions || '',
      note: note || '',
      status: 'pending',
      createdAt: new Date(),
      createdBy: userId
    };
    
    // Update request status
    const oldStatus = request.status;
    request.status = 'Approved – Pay Advance';
    
    // Add timeline event
    request.timeline.push({
      event: `Advance payment set up - Amount: ${amount} ${currency}`,
      actor: userId,
      timestamp: new Date(),
      note: `Due date: ${dueDate}. ${note ? 'Note: ' + note : ''}`
    });

    // Create a pending Payment record linked to this Request
    try {
      const payment = await Payment.create({
        type: 'advance_payment',
        status: 'pending',
        method: 'stripe',
        amount: parseFloat(amount),
        currency: (currency || 'BDT').toUpperCase(),
        requestId: request._id,
        propertyId: request.propertyId,
        payerId: request.tenantId,
        payeeId: request.ownerId,
        description: `Advance payment for Request ${request.requestId}`,
        dueDate: new Date(dueDate)
      });

      // Link paymentId to the Request's advancePayment for easy lookup later
      request.advancePayment.paymentId = payment.paymentId;
    } catch (paymentErr) {
      console.error('Error creating pending Payment record:', paymentErr);
      // Do not fail the whole operation due to Payment creation issues
    }
    
    await request.save();
    
    // TODO: Send notification to tenant
    
    res.status(200).json({
      success: true,
      message: 'Advance payment set up successfully',
      request
    });
  } catch (error) {
    console.error('Error setting up advance payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set up advance payment'
    });
  }
};

// Reject request with reason (for owners)
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check if user is the property owner
    if (request.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this request'
      });
    }
    
    // Validate status transition
    const validStatuses = ['Submitted', 'Under Review', 'Info Requested'];
    if (!validStatuses.includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request in status: ${request.status}`
      });
    }
    
    // Update request status
    const oldStatus = request.status;
    request.status = 'Rejected';
    
    // Add timeline event
    request.timeline.push({
      event: `Request rejected`,
      actor: userId,
      timestamp: new Date(),
      note: `Reason: ${reason.trim()}`
    });
    
    await request.save();
    
    // TODO: Send notification to tenant
    
    res.status(200).json({
      success: true,
      message: 'Request rejected successfully',
      request
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request'
    });
  }
};

module.exports = {
  getMyRequests,
  getOwnerRequests,
  getRequestById,
  cancelRequest,
  updateRequestStatus,
  addMessage,
  markMessagesAsRead,
  setupAdvancePayment,
  rejectRequest
};