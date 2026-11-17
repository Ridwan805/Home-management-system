const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Rent = require('../models/Rent');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { sendMessageNotificationEmail } = require('../services/emailService');
const InvoiceService = require('../services/invoiceService');
const stripePaymentService = require('../services/stripePaymentService');
const socketService = require('../services/socketService');

/**
 * Helper to calculate unread message count for a specific participant
 * @param {Array} messages 
 * @param {string|ObjectId} userId 
 * @returns {number}
 */
const computeUnreadMessagesCount = (messages, userId) => {
  if (!Array.isArray(messages) || !userId) return 0;
  const targetIdStr = userId.toString();
  return messages.filter(msg => {
    const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
    // Messages sent by self are never unread for self
    if (senderIdStr === targetIdStr) return false;
    // Check per-user readBy list
    if (msg.readBy && msg.readBy.some(id => (id?._id || id)?.toString() === targetIdStr)) {
      return false;
    }
    // Backward compatibility for legacy single-boolean read status
    if ((!msg.readBy || msg.readBy.length === 0) && msg.isRead) {
      return false;
    }
    return true;
  }).length;
};

// Get all requests for the authenticated tenant
const getMyRequests = async (req, res) => {
  try {
    const tenantId = (req.user.userId || req.user._id || req.user.id)?.toString();
    const { status } = req.query;
    
    // Build query object
    const query = { tenantId };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    console.log('🔍 Fetching tenant requests with query:', query);
    
    const requests = await Request.find(query)
      .populate('propertyId', 'title address city state pricing.rent pricing.sale listingType images price specifications')
      .populate('ownerId', 'firstName lastName email phoneNumber name')
      .populate('advancePayment.verifiedBy', 'firstName lastName')
      .populate('fullPayment.verifiedBy', 'firstName lastName')
      .populate('messages.senderId', 'firstName lastName email role')
      .sort({ createdAt: -1 });
    
    // Fetch linked payment records for each request and compute messaging metadata
    const requestsWithPayments = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();
        
        // Add accurate unread and total messages count for tenant
        requestObj.unreadMessagesCount = computeUnreadMessagesCount(request.messages, tenantId);
        requestObj.messagesCount = Array.isArray(request.messages) ? request.messages.length : 0;

        // Fetch linked Payment records
        const payments = await Payment.find({ requestId: request._id })
          .populate('payerId', 'firstName lastName email')
          .populate('payeeId', 'firstName lastName email')
          .populate('verifiedBy', 'firstName lastName')
          .sort({ createdAt: -1 });
        
        requestObj.payments = payments;
        return requestObj;
      })
    );
    
    res.status(200).json({
      success: true,
      count: requestsWithPayments.length,
      requests: requestsWithPayments
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
    const ownerId = (req.user.userId || req.user._id || req.user.id)?.toString();

    // Find all properties owned by this owner
    const ownedProperties = await Property.find({
      $or: [
        { ownerUserId: ownerId },
        { owner: ownerId },
        { ownerId: ownerId }
      ]
    }).select('_id');
    const propertyIds = ownedProperties.map(p => p._id);

    const requests = await Request.find({
      $or: [
        { ownerId },
        { propertyId: { $in: propertyIds } }
      ]
    })
      .populate('propertyId', 'title address city state unitNumber floorNumber specifications pricing listingType images price')
      .populate('ownerId', 'firstName lastName email phoneNumber name')
      .populate('tenantId', 'firstName lastName email phoneNumber name')
      .populate('messages.senderId', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    const requestsWithCounts = requests.map(reqDoc => {
      const reqObj = reqDoc.toObject();
      reqObj.unreadMessagesCount = computeUnreadMessagesCount(reqDoc.messages, ownerId);
      reqObj.messagesCount = Array.isArray(reqDoc.messages) ? reqDoc.messages.length : 0;
      return reqObj;
    });

    res.status(200).json({
      success: true,
      count: requestsWithCounts.length,
      requests: requestsWithCounts
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
    const userId = (req.user.userId || req.user._id || req.user.id)?.toString();
    
    const request = await Request.findById(requestId)
      .populate('propertyId', 'title address city state unitNumber floorNumber specifications pricing listingType images price')
      .populate('tenantId', 'firstName lastName email phoneNumber name role')
      .populate('ownerId', 'firstName lastName email phoneNumber name role')
      .populate('messages.senderId', 'firstName lastName role email');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    const tenantIdStr = (request.tenantId?._id || request.tenantId)?.toString();
    const ownerIdStr = (request.ownerId?._id || request.ownerId)?.toString();

    // Check if user is authorized to view this request
    if (tenantIdStr !== userId && ownerIdStr !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    const requestObj = request.toObject();
    requestObj.unreadMessagesCount = computeUnreadMessagesCount(request.messages, userId);
    requestObj.messagesCount = Array.isArray(request.messages) ? request.messages.length : 0;
    
    res.status(200).json({
      success: true,
      request: requestObj
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
    
    const request = await Request.findById(requestId).populate('propertyId', 'price');
    
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
      'Payment Submitted': ['Paid/Completed', 'Approved – Pay Advance', 'AdvancePaid'],
      'AdvancePaid': ['Paid/Completed', 'Canceled', 'Confirmed for Sale', 'Refunded'],
      'Confirmed for Sale': ['Paid/Completed', 'Canceled'],
      'Refunded': []
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
    
    // Handle status-specific logic
    if (oldStatus === 'AdvancePaid' && status === 'Paid/Completed' && request.requestType === 'Rent') {
      // Create Rent object when transitioning from 'AdvancePaid' to 'Paid/Completed' for Rent requests
      try {
        const property = await Property.findById(request.propertyId);
        if (property) {
          const rentData = {
            propertyId: request.propertyId,
            ownerId: request.ownerId,
            tenants: [request.tenantId],
            requestId: request._id,
            term: {
              type: 'fixed',
              startDate: new Date(),
              endDate: null,
              noticeDays: 30
            },
            rent: {
              amount: property.pricing?.rent || property.rent || 0,
              currency: 'BDT',
              dueDay: 1,
              graceDays: 5,
              lateFee: null
            },
            securityDeposit: {
              amount: request.advancePayment?.amount || 0, // Use advance payment as security deposit
              held: 0,
              releasedAt: null,
              deductions: []
            },
            billing: {
              frequency: 'monthly',
              nextInvoiceDate: new Date(),
              autoGenerate: true
            },
            status: 'Active'
          };
          
          const newRent = new Rent(rentData);
          await newRent.save();
          
          // Link rent to request
          request.rentId = newRent._id;
          
          // Update property status to 'Rented' and link to rent
          property.status = 'Rented';
          property.currentRentId = newRent._id;
          property.rentedAt = new Date();
          await property.save();
          
          console.log('✅ Rent object created successfully:', newRent._id);
          console.log('✅ Property status updated to Rented');
          
          // Generate first monthly invoice after owner approval
          try {
            console.log('🧾 Generating first monthly invoice after owner approval...');
            await InvoiceService.generateFirstMonthlyInvoiceAfterAdvance(request._id);
            console.log('✅ First monthly invoice generated successfully after owner approval');
          } catch (invoiceError) {
            console.error('❌ Failed to generate first monthly invoice after owner approval:', {
              error: invoiceError.message,
              stack: invoiceError.stack,
              requestId: request._id
            });
            // Don't fail the whole operation if invoice generation fails
          }
        }
      } catch (rentError) {
        console.error('❌ Error creating Rent object:', rentError);
        // Don't fail the whole operation if rent creation fails
      }
    }
    
    // Handle refund for Buy requests when status changes to 'Refunded'
    if (status === 'Refunded' && request.requestType === 'Buy' && request.advancePayment) {
      try {
        // Find the advance payment record
        const advancePayment = await Payment.findById(request.advancePayment.paymentId);
        if (advancePayment) {
          // Mark payment as refunded
          advancePayment.status = 'Refunded';
          advancePayment.refundedAt = new Date();
          await advancePayment.save();
          
          console.log('✅ Advance payment marked as refunded:', advancePayment._id);
        }
      } catch (refundError) {
        console.error('❌ Error processing refund:', refundError);
        // Don't fail the whole operation if refund processing fails
      }
    }
    
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

// Get messages for a specific request thread
const getRequestMessages = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = (req.user.userId || req.user._id || req.user.id)?.toString();

    const request = await Request.findById(requestId)
      .populate('propertyId', 'title address city state unitNumber floorNumber images pricing listingType price specifications')
      .populate('tenantId', 'firstName lastName email phoneNumber name role')
      .populate('ownerId', 'firstName lastName email phoneNumber name role')
      .populate('messages.senderId', 'firstName lastName role email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const tenantIdStr = (request.tenantId?._id || request.tenantId)?.toString();
    const ownerIdStr = (request.ownerId?._id || request.ownerId)?.toString();

    if (tenantIdStr !== userId && ownerIdStr !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages on this request'
      });
    }

    const unreadCount = computeUnreadMessagesCount(request.messages, userId);

    res.status(200).json({
      success: true,
      requestId: request._id,
      requestRef: request.requestId,
      status: request.status,
      property: request.propertyId,
      tenant: request.tenantId,
      owner: request.ownerId,
      messages: request.messages || [],
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching request messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation messages'
    });
  }
};

// Add a message to the request thread
const addMessage = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message, attachments = [] } = req.body;
    const userId = (req.user.userId || req.user._id || req.user.id)?.toString();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty'
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum length of 2000 characters'
      });
    }

    // Sanitize message: strip script tags to prevent HTML/XSS injection
    const sanitizedMessage = trimmedMessage
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .trim();

    const request = await Request.findById(requestId)
      .populate('propertyId', 'title address city state')
      .populate('tenantId', 'firstName lastName email phoneNumber name role')
      .populate('ownerId', 'firstName lastName email phoneNumber name role');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const tenantIdStr = (request.tenantId?._id || request.tenantId)?.toString();
    const ownerIdStr = (request.ownerId?._id || request.ownerId)?.toString();
    const isTenant = tenantIdStr === userId;
    const isOwner = ownerIdStr === userId;
    const isAdmin = req.user.role === 'admin';

    // Enforce authorization
    if (!isTenant && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message on this request'
      });
    }

    // Clean attachments (if any)
    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(a => typeof a === 'string' && a.length > 0).slice(0, 5)
      : [];

    // Push new message with participant read state
    const newMsgDoc = {
      senderId: userId,
      message: sanitizedMessage,
      timestamp: new Date(),
      readBy: [userId], // sender has read their own message
      isRead: false,
      attachments: validAttachments
    };

    if (!request.messages) {
      request.messages = [];
    }
    request.messages.push(newMsgDoc);

    // Add timeline event
    request.timeline.push({
      event: isTenant ? 'Applicant sent a message' : 'Owner sent a message',
      actor: userId,
      timestamp: new Date(),
      note: sanitizedMessage.length > 50 ? `${sanitizedMessage.substring(0, 50)}...` : sanitizedMessage
    });

    await request.save();

    // Populate sender info for the new message
    await request.populate('messages.senderId', 'firstName lastName role email');

    const newMessage = request.messages[request.messages.length - 1];

    // Notification handling (in-app and optional email, non-blocking)
    const recipientUser = isTenant ? request.ownerId : request.tenantId;
    const recipientId = isTenant ? ownerIdStr : tenantIdStr;
    const senderUser = isTenant ? request.tenantId : request.ownerId;
    const senderName = senderUser 
      ? `${senderUser.firstName || ''} ${senderUser.lastName || ''}`.trim() 
      : (isTenant ? 'Applicant' : 'Property Owner');
    const propertyTitle = request.propertyId?.title || request.propertyId?.address || 'Property Application';

    // 1. In-App Notification & Real-Time Socket Broadcast
    try {
      if (recipientId) {
        const actionUrl = isTenant ? '/request-info' : '/tenant/house-info';
        await NotificationService.createNotification({
          userId: recipientId,
          recipientId,
          recipientRole: isTenant ? 'Owner' : 'Tenant',
          senderId: userId,
          title: isTenant ? `Message from ${senderName}` : `Message from Owner: ${senderName}`,
          message: sanitizedMessage.length > 100 ? `${sanitizedMessage.substring(0, 97)}...` : sanitizedMessage,
          type: 'message',
          relatedEntityType: 'Request',
          relatedEntityId: request._id,
          actionUrl
        });

        const recipientUnreadCount = computeUnreadMessagesCount(request.messages, recipientId);
        socketService.emitNewMessage(recipientId, request._id, newMessage, recipientUnreadCount);
      }
    } catch (notifErr) {
      console.warn('⚠️ In-app notification warning:', notifErr.message);
    }

    // 2. Email Notification (Resend)
    try {
      if (recipientUser && recipientUser.email) {
        const recipientName = `${recipientUser.firstName || ''} ${recipientUser.lastName || ''}`.trim() || 'User';
        const conversationUrl = isTenant
          ? `${process.env.FRONTEND_URL || 'http://localhost:5174'}/request-info`
          : `${process.env.FRONTEND_URL || 'http://localhost:5174'}/tenant/request-info`;

        sendMessageNotificationEmail({
          to: recipientUser.email,
          recipientName,
          senderName,
          propertyTitle,
          messagePreview: sanitizedMessage,
          conversationUrl
        }).catch(err => console.warn('⚠️ Message notification email delivery warning:', err.message));
      }
    } catch (emailErr) {
      console.warn('⚠️ Message notification email setup warning:', emailErr.message);
    }

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
    const userId = (req.user.userId || req.user._id || req.user.id)?.toString();

    const request = await Request.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const tenantIdStr = (request.tenantId?._id || request.tenantId)?.toString();
    const ownerIdStr = (request.ownerId?._id || request.ownerId)?.toString();

    // Check if user is authorized
    if (tenantIdStr !== userId && ownerIdStr !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    let markedCount = 0;
    // Mark messages as read (only messages not sent by current user)
    (request.messages || []).forEach(msg => {
      const msgSenderId = (msg.senderId?._id || msg.senderId)?.toString();
      if (msgSenderId !== userId) {
        if (!Array.isArray(msg.readBy)) {
          msg.readBy = [];
        }
        const alreadyRead = msg.readBy.some(id => (id?._id || id)?.toString() === userId);
        if (!alreadyRead) {
          msg.readBy.push(userId);
          markedCount++;
        }
        msg.isRead = true; // backward compatibility
        msg.readAt = new Date();
      }
    });

    if (markedCount > 0) {
      await request.save();
    }

    // Also mark in-app message notifications for this request as read
    try {
      await Notification.updateMany(
        { $or: [{ recipientId: userId }, { userId }], relatedEntityId: request._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      const unreadCount = await Notification.countDocuments({
        $or: [{ recipientId: userId }, { userId }],
        isRead: false
      });
      socketService.emitUnreadCount(userId, unreadCount);
      socketService.emitMessagesRead(userId, request._id);
    } catch (notifErr) {
      console.warn('⚠️ Could not update in-app notifications on message read:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      markedCount
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

    // Ensure authoritative Invoice and Payment records exist before payment
    try {
      const { invoice, payment } = await stripePaymentService.ensureInvoiceAndPaymentRecord({
        purpose: request.requestType === 'Buy' ? 'PURCHASE_BOOKING_DEPOSIT' : 'RENTAL_ADVANCE',
        requestId: request._id,
        propertyId: request.propertyId,
        payerId: request.tenantId,
        payeeId: request.ownerId,
        amount: parseFloat(amount),
        currency: (currency || 'BDT').toUpperCase(),
        dueDate: new Date(dueDate),
        description: `${request.requestType === 'Buy' ? 'Purchase Booking Deposit' : 'Advance Rental Security Deposit'} for Request ${request.requestId || request._id}`
      });

      request.advancePayment.paymentId = payment?.paymentId;
      request.advancePayment.invoiceId = invoice?._id;
    } catch (paymentErr) {
      console.error('Error creating invoice and pending payment record:', paymentErr);
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

// Approve rental application and issue formal offer (DOES NOT activate tenancy)
const approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const request = await Request.findById(requestId)
      .populate('propertyId')
      .populate('tenantId', 'firstName lastName email phoneNumber name address');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const property = request.propertyId;
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Associated property record not found'
      });
    }

    // 1. Verify owner authorization
    const isOwner = request.ownerId?.toString() === userId.toString() ||
                    property.ownerUserId?.toString() === userId.toString() ||
                    property.owner?.toString() === userId.toString() ||
                    property.ownerId?.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to approve applications for this property'
      });
    }

    // 2. Validate application is pending
    if (['Approved', 'Paid/Completed', 'AdvancePaid'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'This application has already been approved'
      });
    }

    if (['Rejected', 'Canceled', 'Withdrawn', 'Expired'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve an application with status "${request.status}"`
      });
    }

    // 3. Verify property availability & prevent assigning occupied unit
    if (property.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'This property is no longer available'
      });
    }

    const unitNumber = property.unitNumber || property.specifications?.unitNumber || '';

    // Check for conflicting active rent
    const conflictingRent = await Rent.findOne({
      propertyId: property._id,
      status: 'Active',
      isDeleted: { $ne: true }
    });

    if (conflictingRent) {
      return res.status(400).json({
        success: false,
        message: 'This property/unit already has an active tenancy. Cannot approve another tenant.'
      });
    }

    // Check for conflicting active reservation from another request
    const now = new Date();
    const conflictingReservation = await Request.findOne({
      _id: { $ne: request._id },
      propertyId: property._id,
      'reservation.status': 'Active',
      'reservation.expiresAt': { $gt: now }
    });

    if (conflictingReservation) {
      return res.status(400).json({
        success: false,
        message: `This property/unit is temporarily reserved under another offer until ${new Date(conflictingReservation.reservation.expiresAt).toLocaleString()}`
      });
    }

    // 4. Construct formal offer parameters
    const isRental = request.requestType !== 'Buy';
    const rentAmount = Number(req.body.monthlyRent || property.pricing?.rent || property.pricing?.monthlyRent || property.price || 0);
    const depositAmount = Number(req.body.securityDeposit || property.pricing?.securityDeposit || rentAmount);
    const advanceAmount = Number(req.body.advanceAmount || (isRental ? depositAmount : ((property.price || property.pricing?.sale || 0) * 0.1)));
    const currency = req.body.currency || property.pricing?.currency || 'BDT';
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    const dueDay = Number(req.body.dueDay) || 1;
    const noticeDays = Number(req.body.noticeDays) || 60; // 60 days standard move-out notice
    const refundTerms = req.body.refundTerms || 'Security deposit is fully refundable at tenancy conclusion subject to final inspection and resolution of outstanding utility dues or damages.';
    const specialTerms = req.body.specialTerms || '';
    const instructions = req.body.instructions || 'Please review the agreement terms, provide emergency contact details, and pay the advance deposit to activate your tenancy before the reservation deadline.';

    // Authoritative deadline: default 72 hours from now
    const paymentDeadline = req.body.paymentDeadline ? new Date(req.body.paymentDeadline) : new Date(Date.now() + 72 * 60 * 60 * 1000);

    // 5. Update Offer & Reservation objects
    request.offer = {
      status: 'Sent',
      monthlyRent: rentAmount,
      securityDeposit: depositAmount,
      advanceAmount,
      currency,
      startDate,
      endDate,
      dueDay,
      noticeDays,
      refundTerms,
      specialTerms,
      instructions,
      paymentDeadline,
      formCompleted: false,
      acceptanceConsent: false
    };

    request.reservation = {
      propertyId: property._id,
      unitNumber,
      status: 'Active',
      reservedAt: now,
      expiresAt: paymentDeadline
    };

    // Update request status to 'Approved – Pay Advance' (DO NOT activate tenancy or create Rent)
    request.status = 'Approved – Pay Advance';

    // Update advancePayment config for Stripe checkout
    request.advancePayment = {
      amount: advanceAmount,
      currency,
      dueDate: paymentDeadline,
      instructions,
      note: req.body.note || 'Advance payment required to confirm reservation and activate tenancy.',
      status: 'pending',
      createdAt: now,
      createdBy: userId,
      canPayAgain: true
    };

    request.timeline.push({
      event: 'Offer Issued & Unit Temporarily Reserved',
      actor: userId,
      timestamp: now,
      note: `Formal offer issued with advance amount ৳${advanceAmount.toLocaleString()}. Payment deadline: ${paymentDeadline.toLocaleString()}. Unit reserved.`
    });

    // Ensure authoritative Invoice and Payment records exist before payment
    try {
      const { invoice, payment } = await stripePaymentService.ensureInvoiceAndPaymentRecord({
        purpose: request.requestType === 'Buy' ? 'PURCHASE_BOOKING_DEPOSIT' : 'RENTAL_ADVANCE',
        requestId: request._id,
        propertyId: property._id,
        payerId: request.tenantId._id || request.tenantId,
        payeeId: userId,
        amount: advanceAmount,
        currency: currency.toUpperCase(),
        dueDate: paymentDeadline,
        description: `${request.requestType === 'Buy' ? 'Purchase Booking Deposit' : 'Advance Rental Security Deposit'} for Application ${request.requestId || request._id}`
      });
      request.advancePayment.paymentId = payment?.paymentId;
      request.advancePayment.invoiceId = invoice?._id;
    } catch (paymentErr) {
      console.warn('Warning creating invoice and pending payment record:', paymentErr.message);
    }

    await request.save();

    // 6. Update Property status to 'Processing' (temporary reservation until payment deadline)
    property.status = 'Processing';
    property.state = 'Processing';
    property.reservedAt = now;
    property.reservedBy = request.tenantId._id || request.tenantId;
    if (!property.stateHistory) property.stateHistory = [];
    property.stateHistory.push({
      state: 'Processing',
      status: 'Processing',
      timestamp: now,
      note: `Unit reserved under offer for application ${request.requestId || request._id} until ${paymentDeadline.toISOString()}`,
      updatedBy: userId
    });
    await property.save();

    // Notify tenant of application approval & advance payment requirement
    try {
      const tenantRecipientId = request.tenantId?._id || request.tenantId;
      await NotificationService.createNotification({
        recipientId: tenantRecipientId,
        recipientRole: 'Tenant',
        senderId: userId,
        type: 'request_status',
        title: `Application Approved: ${property.title || property.address || 'Property'}`,
        message: `Your application has been approved! Please complete the advance deposit of ৳${Number(request.offer?.advancePaymentAmount || request.advancePayment?.amount || 0).toLocaleString()} by ${new Date(paymentDeadline).toLocaleDateString()}.`,
        relatedEntityType: 'Request',
        relatedEntityId: request._id,
        actionUrl: '/tenant/request-info'
      });
    } catch (notifErr) {
      console.warn('⚠️ Notification error on approval:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved and formal offer issued. Unit temporarily reserved until payment deadline. Tenancy will activate upon verified advance payment.',
      request,
      offer: request.offer,
      reservation: request.reservation
    });
  } catch (error) {
    console.error('Error approving request and issuing offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to issue offer: ' + error.message
    });
  }
};

// Complete agreement form (for tenant)
const completeOfferForm = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    const { emergencyContact, occupants, employmentDetails, additionalNotes } = req.body;

    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.tenantId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (request.status !== 'Approved – Pay Advance' || !request.offer) {
      return res.status(400).json({ success: false, message: 'No active offer for this request' });
    }

    if (request.offer.paymentDeadline && new Date() > new Date(request.offer.paymentDeadline)) {
      return res.status(400).json({ success: false, message: 'The offer payment deadline has expired' });
    }

    if (!emergencyContact || !emergencyContact.name || !emergencyContact.phone) {
      return res.status(400).json({ success: false, message: 'Emergency contact name and phone number are required' });
    }

    request.offer.formCompleted = true;
    request.offer.formData = {
      emergencyContact,
      occupants: occupants || {},
      employmentDetails: employmentDetails || {},
      additionalNotes: additionalNotes || ''
    };
    if (request.offer.status === 'Sent') {
      request.offer.status = 'Awaiting Advance';
    }

    request.timeline.push({
      event: 'Agreement Form Completed',
      actor: userId,
      timestamp: new Date(),
      note: 'Emergency contact and tenancy details submitted by tenant.'
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Agreement form completed successfully',
      offer: request.offer
    });
  } catch (error) {
    console.error('Error completing agreement form:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Accept offer terms & legal agreement (for tenant)
const acceptOffer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    const { version = '1.0', consent = true } = req.body;

    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.tenantId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (request.status !== 'Approved – Pay Advance' || !request.offer) {
      return res.status(400).json({ success: false, message: 'No active offer for this request' });
    }

    if (request.offer.paymentDeadline && new Date() > new Date(request.offer.paymentDeadline)) {
      return res.status(400).json({ success: false, message: 'The offer payment deadline has expired' });
    }

    if (!request.offer.formCompleted) {
      return res.status(400).json({ success: false, message: 'Please complete the agreement details form before accepting terms' });
    }

    if (!consent) {
      return res.status(400).json({ success: false, message: 'Explicit agreement consent is required' });
    }

    request.offer.acceptedAt = new Date();
    request.offer.acceptedVersion = version;
    request.offer.acceptedBy = userId;
    request.offer.acceptanceConsent = true;
    request.offer.status = 'Awaiting Advance';

    request.timeline.push({
      event: 'Offer Terms Accepted',
      actor: userId,
      timestamp: new Date(),
      note: `Tenant accepted agreement version ${version} and terms.`
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Offer accepted successfully. You may now proceed with the advance payment.',
      offer: request.offer
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get offer details & countdown
const getOfferDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const request = await Request.findById(requestId)
      .populate('propertyId', 'title address unitNumber pricing price images specifications listingType')
      .populate('ownerId', 'firstName lastName email phoneNumber');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const isTenant = request.tenantId.toString() === userId.toString();
    const isOwner = request.ownerId._id.toString() === userId.toString();

    if (!isTenant && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const isExpired = request.offer?.paymentDeadline ? new Date() > new Date(request.offer.paymentDeadline) : false;

    return res.status(200).json({
      success: true,
      offer: request.offer,
      reservation: request.reservation,
      isExpired,
      request
    });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reject request with reason (for owners)
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason = 'Application rejected by property owner' } = req.body;
    const userId = req.user.userId;
    
    const request = await Request.findById(requestId).populate('propertyId');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    const property = request.propertyId;
    const isOwner = request.ownerId?.toString() === userId.toString() ||
                    (property && (
                      property.ownerUserId?.toString() === userId.toString() ||
                      property.owner?.toString() === userId.toString() ||
                      property.ownerId?.toString() === userId.toString()
                    ));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this request'
      });
    }
    
    if (['Approved', 'Paid/Completed'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved request'
      });
    }
    
    const oldStatus = request.status;
    request.status = 'Rejected';
    
    request.timeline.push({
      event: 'Request rejected',
      actor: userId,
      timestamp: new Date(),
      note: `Reason: ${reason ? reason.trim() : 'Application rejected by property owner'}`
    });
    
    await request.save();

    // Notify tenant of application rejection
    try {
      const tenantRecipientId = request.tenantId?._id || request.tenantId;
      await NotificationService.createNotification({
        recipientId: tenantRecipientId,
        recipientRole: 'Tenant',
        senderId: userId,
        type: 'request_status',
        title: `Application Update: ${property?.title || property?.address || 'Property'}`,
        message: `Your application was not approved. Note: ${reason ? reason.trim() : 'Application rejected by property owner.'}`,
        relatedEntityType: 'Request',
        relatedEntityId: request._id,
        actionUrl: '/tenant/request-info'
      });
    } catch (notifErr) {
      console.warn('⚠️ Notification error on rejection:', notifErr.message);
    }
    
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
};