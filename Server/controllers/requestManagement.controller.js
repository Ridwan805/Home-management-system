const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Rent = require('../models/Rent');
const Invoice = require('../models/Invoice');
const InvoiceService = require('../services/invoiceService');

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
      .populate('propertyId', 'address city state pricing.rent pricing.sale listingType images')
      .populate('ownerId', 'firstName lastName email')
      .populate('advancePayment.verifiedBy', 'firstName lastName')
      .populate('fullPayment.verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Fetch linked payment records for each request
    const requestsWithPayments = await Promise.all(
      requests.map(async (request) => {
        const requestObj = request.toObject();
        
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
    const ownerId = req.user.userId;

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
      .populate('ownerId', 'firstName lastName email phoneNumber')
      .populate('tenantId', 'firstName lastName email phoneNumber name')
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

// Approve rental application and automatically establish active tenancy
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
    if (['Approved', 'Paid/Completed'].includes(request.status)) {
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

    // 4. Create active tenancy record
    const rentAmount = Number(req.body.monthlyRent || property.pricing?.rent || property.pricing?.monthlyRent || property.price || 0);
    const depositAmount = Number(req.body.securityDeposit || property.pricing?.securityDeposit || rentAmount);
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const newRent = new Rent({
      propertyId: property._id,
      ownerId: userId,
      tenants: [request.tenantId._id || request.tenantId],
      requestId: request._id,
      term: {
        type: 'fixed',
        startDate,
        endDate,
        noticeDays: 30
      },
      rent: {
        amount: rentAmount,
        currency: property.pricing?.currency || 'BDT',
        dueDay: 1,
        graceDays: 5,
        lateFee: { amount: 0, type: 'fixed' }
      },
      securityDeposit: {
        amount: depositAmount,
        held: depositAmount
      },
      billing: {
        frequency: 'monthly',
        nextInvoiceDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        autoGenerate: true
      },
      status: 'Active'
    });

    await newRent.save();

    // 5. Update Property status to Rented and set currentRentId
    property.status = 'Rented';
    property.currentRentId = newRent._id;
    property.rentedAt = new Date();
    await property.save();

    // 6. Update Request status to Approved and link tenancy
    request.status = 'Approved';
    request.rentId = newRent._id;
    request.timeline.push({
      event: 'Application Approved & Tenancy Activated',
      actor: userId,
      timestamp: new Date(),
      note: req.body.note || `Approved by owner. Tenancy created with monthly rent ৳${rentAmount.toLocaleString()}.`
    });
    await request.save();

    // 7. Generate initial invoice for rent tracking
    try {
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() + 7);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      await Invoice.create({
        invoiceNumber,
        rentId: newRent._id,
        propertyId: property._id,
        ownerId: userId,
        tenantId: request.tenantId._id || request.tenantId,
        payerId: request.tenantId._id || request.tenantId,
        type: 'rent',
        billingMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        issueDate: new Date(),
        dueDate: invoiceDueDate,
        items: [{
          description: `First Month Rent - ${property.title || property.address}`,
          amount: rentAmount
        }],
        subtotal: rentAmount,
        tax: 0,
        total: rentAmount,
        balance: rentAmount,
        paidAmount: 0,
        status: 'issued'
      });
    } catch (invErr) {
      console.warn('Initial invoice generation warning:', invErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Rental application approved successfully. Tenancy is now active and listed in Tenant Info.',
      request,
      rent: newRent
    });
  } catch (error) {
    console.error('Error approving request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve application: ' + error.message
    });
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
  rejectRequest,
  approveRequest
};