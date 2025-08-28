const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const Rent = require('../models/Rent');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');
// Long polling functionality removed

// Create a new request
const createRequest = async (req, res) => {
  try {
    // Ensure tenant_pics directories exist
    const tenantPicsDir = path.join(__dirname, '..', 'tenant_pics');
    const nidDir = path.join(tenantPicsDir, 'nid');
    const tinDir = path.join(tenantPicsDir, 'tin');
    const personalDir = path.join(tenantPicsDir, 'personal');
    
    if (!fs.existsSync(tenantPicsDir)) {
      fs.mkdirSync(tenantPicsDir, { recursive: true });
    }
    if (!fs.existsSync(nidDir)) {
      fs.mkdirSync(nidDir, { recursive: true });
    }
    if (!fs.existsSync(tinDir)) {
      fs.mkdirSync(tinDir, { recursive: true });
    }
    if (!fs.existsSync(personalDir)) {
      fs.mkdirSync(personalDir, { recursive: true });
    }
    
    const { propertyId, requestType, payload, consent } = req.body;
    const tenantId = req.user.userId;
    
    // Parse JSON strings from FormData
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const parsedConsent = typeof consent === 'string' ? JSON.parse(consent) : consent;
    
    // Guardrails: Check rate limiting
    const rateLimitCheck = await GuardrailsService.checkRequestRateLimit(tenantId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        message: `Rate limit exceeded. You can only make ${rateLimitCheck.limit} requests per day. Current: ${rateLimitCheck.current}`,
        resetTime: rateLimitCheck.resetTime
      });
    }
    
    // Guardrails: Validate request data
    const requestData = { propertyId, tenantId, requestType, payload: parsedPayload };
    const validation = GuardrailsService.validateRequestData(requestData);
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
      console.log('Request payload:', JSON.stringify(parsedPayload, null, 2));
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.errors
      });
    }
    
    // Guardrails: Check if user can request this property
    const permissionCheck = await GuardrailsService.canUserRequestProperty(tenantId, propertyId);
    if (!permissionCheck.allowed) {
      return res.status(403).json({ 
        message: permissionCheck.reason
      });
    }
    
    // Guardrails: Detect suspicious activity
    const suspiciousActivity = await GuardrailsService.detectSuspiciousActivity(tenantId, 'request_creation', {
      propertyId,
      requestType,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    if (suspiciousActivity.isSuspicious) {
      await GuardrailsService.logSecurityEvent(tenantId, 'suspicious_request_creation', {
        indicators: suspiciousActivity.indicators,
        propertyId,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress
      }, suspiciousActivity.riskLevel);
      
      if (suspiciousActivity.riskLevel === 'high') {
        return res.status(403).json({ 
          message: 'Request blocked due to suspicious activity. Please contact support.'
        });
      }
    }
    
    // Handle uploaded identity documents
    const identityFiles = {};
    if (req.files) {
      // Map specific file fields to identity document URLs
      if (req.files.nidFile && req.files.nidFile[0]) {
        // Convert file path to URL format
        const relativePath = req.files.nidFile[0].path.replace(/\\/g, '/').replace('tenant_pics/', '');
        identityFiles.nidFileUrl = `/tenant_pics/${relativePath}`;
      }
      if (req.files.tinFile && req.files.tinFile[0]) {
        // Convert file path to URL format
        const relativePath = req.files.tinFile[0].path.replace(/\\/g, '/').replace('tenant_pics/', '');
        identityFiles.tinFileUrl = `/tenant_pics/${relativePath}`;
      }
      if (req.files.personalPhoto && req.files.personalPhoto[0]) {
        // Convert file path to URL format
        const relativePath = req.files.personalPhoto[0].path.replace(/\\/g, '/').replace('tenant_pics/', '');
        identityFiles.personalPhotoUrl = `/tenant_pics/${relativePath}`;
      }
    }
    
    // Validate required identity documents
    if (!identityFiles.nidFileUrl) {
      return res.status(400).json({ message: 'NID card file is required' });
    }
    if (!identityFiles.personalPhotoUrl) {
      return res.status(400).json({ message: 'Personal photo is required' });
    }

    // Validate property exists and get owner info
    const property = await Property.findById(propertyId)
      .populate('ownerUserId')
      .populate('owner'); // Keep for backward compatibility
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.isDeleted) {
      return res.status(400).json({ message: 'Property is no longer available' });
    }

    // Check if property is available for the request type
    if (requestType === 'Rent' && !['Available', 'Reserved'].includes(property.status)) {
      return res.status(400).json({ 
        message: `Property is not available for rent. Current status: ${property.status}` 
      });
    }
    
    if (requestType === 'Purchase' && !['Available', 'Reserved'].includes(property.status)) {
      return res.status(400).json({ 
        message: `Property is not available for purchase. Current status: ${property.status}` 
      });
    }

    // Get the actual owner ID (prioritize new field)
    const ownerId = property.ownerUserId?._id || property.owner?._id;
    if (!ownerId) {
      return res.status(400).json({ message: 'Property owner information is missing' });
    }

    // Check if user is trying to request their own property
    if (ownerId.toString() === tenantId) {
      return res.status(400).json({ message: 'Cannot request your own property' });
    }

    // Check if there's already an active request for this property by this tenant
    const existingRequest = await Request.findOne({
      propertyId,
      tenantId,
      status: { $nin: ['Rejected', 'Canceled', 'Expired', 'Paid/Completed'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have an active request for this property',
        existingRequestId: existingRequest.requestId
      });
    }

    // Create new request with unified inquiry form data
    const newRequest = new Request({
      propertyId,
      ownerId: ownerId,
      tenantId,
      requestType,
      payload: {
        familyMembers: parsedPayload.familyMembers || [],
        belongings: parsedPayload.belongings || {},
        occupation: parsedPayload.occupation || {},
        identity: {
          ...(parsedPayload.identity || {}),
          ...identityFiles
        },
        financials: parsedPayload.financials || {},
        letterToOwner: parsedPayload.letterToOwner || ''
      },
      consent: {
        agreed: parsedConsent.agreed || false,
        version: parsedConsent.version || 'v1.0',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }
    });
    
    console.log('Creating new request:', JSON.stringify(newRequest, null, 2));

    await newRequest.save();

    // Populate the request with related data
    const populatedRequest = await Request.findById(newRequest._id)
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email');

    // Send notification to property owner
    try {
      await NotificationService.createNotification(
        ownerId,
        'info',
        'New Property Request',
        `${populatedRequest.tenantId.firstName} ${populatedRequest.tenantId.lastName} has submitted a ${requestType.toLowerCase()} request for ${property.address}`,
        { requestId: newRequest._id, propertyId, tenantId }
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request creation if notification fails
    }

    res.status(201).json({
      message: 'Request created successfully',
      request: populatedRequest
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all requests (with filtering)
const getRequests = async (req, res) => {
  try {
    const { status, requestType, propertyId, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    
    if (userRole === 'Tenant') {
      filter.tenantId = userId;
    } else if (userRole === 'Owner') {
      filter.ownerId = userId;
    }
    // Admin can see all requests (no additional filter)

    // Add optional filters
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;
    if (propertyId) filter.propertyId = propertyId;

    const skip = (page - 1) * limit;

    const requests = await Request.find(filter)
      .populate('propertyId', 'address price listingType images')
      .populate('tenantId', 'firstName lastName email phoneNumber')
      .populate('ownerId', 'firstName lastName email phoneNumber')
      .populate('timeline.actor', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single request by ID
const getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const request = await Request.findOne({ requestId })
      .populate('propertyId')
      .populate('tenantId', 'firstName lastName email phoneNumber address')
      .populate('ownerId', 'firstName lastName email phoneNumber')
      .populate('timeline.actor', 'firstName lastName')
      .populate('internalNotes.addedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check permissions
    const canView = userRole === 'Admin' || 
                   request.tenantId._id.toString() === userId || 
                   request.ownerId._id.toString() === userId;

    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Filter internal notes for non-admin users
    if (userRole !== 'Admin') {
      request.internalNotes = request.internalNotes.filter(note => !note.isPrivate);
    }

    res.json({ request });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update request status
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, note = '', advancePayment } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const request = await Request.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check permissions for status updates
    const canUpdate = userRole === 'Admin' || 
                     (userRole === 'Owner' && request.ownerId.toString() === userId) ||
                     (userRole === 'Tenant' && request.tenantId.toString() === userId && 
                      ['Canceled'].includes(status));

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Guardrails: Validate status transition with role-based checks
    const transitionValidation = GuardrailsService.validateStatusTransition(request.status, status, userRole.toLowerCase());
    if (!transitionValidation.allowed) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${request.status} to ${status} for ${userRole}`,
        allowedTransitions: transitionValidation.allowedTransitions
      });
    }
    
    // Guardrails: Detect suspicious activity for status changes
    const suspiciousActivity = await GuardrailsService.detectSuspiciousActivity(userId, 'status_change', {
      requestId,
      oldStatus: request.status,
      newStatus: status,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    if (suspiciousActivity.isSuspicious) {
      await GuardrailsService.logSecurityEvent(userId, 'suspicious_status_change', {
        indicators: suspiciousActivity.indicators,
        requestId,
        oldStatus: request.status,
        newStatus: status,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress
      }, suspiciousActivity.riskLevel);
    }
    
    // Store old status for notifications
    const oldStatus = request.status;

    // Handle advance payment data
    if (status === 'Approved – Pay Advance' && advancePayment) {
      request.advancePayment = {
        ...advancePayment,
        verifiedAt: null,
        verifiedBy: null
      };
    }

    // Handle payment verification and contract creation
    if (status === 'Paid/Completed' && userRole === 'Owner') {
      if (request.advancePayment) {
        request.advancePayment.verifiedAt = new Date();
        request.advancePayment.verifiedBy = userId;
        request.advancePayment.verificationNote = note;
      }

      // Create rent contract or ownership transfer based on request type
      const property = await Property.findById(request.propertyId);
      if (property) {
        try {
          if (request.requestType === 'Rent') {
            // Create rent contract
            const rentData = {
              propertyId: request.propertyId,
              tenants: [request.tenantId],
              rent: {
                amount: request.payload?.financials?.monthlyRent || property.price,
                currency: 'BDT',
                dueDay: 1
              },
              term: {
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
                duration: 12,
                unit: 'months'
              },
              deposit: {
                amount: request.advancePayment?.amount || 0,
                currency: 'BDT',
                paidAt: new Date(),
                refundable: true
              }
            };
            
            const rent = new Rent(rentData);
            await rent.save();
            
            // Activate the rent contract
            await rent.activate(userId, 'Rent activated after payment completion');
            
            // Update property status to Rented
            await property.rent(userId, rent._id, 'Property rented after payment completion');
            
            // Link request to rent
            request.linkedRentId = rent._id;
            
            // Add timeline event
            request.timeline.push({
              event: 'Rent contract created and activated',
              actor: userId,
              timestamp: new Date(),
              note: `Rent contract ${rent._id} created and property status changed to Rented`
            });
            
          } else if (request.requestType === 'Purchase') {
            // Create ownership transfer
            const transferData = {
              propertyId: request.propertyId,
              sellerId: request.ownerId,
              buyerId: request.tenantId,
              salePrice: {
                amount: request.payload?.financials?.offerPrice || property.price,
                currency: 'BDT'
              },
              deposit: {
                amount: request.advancePayment?.amount || 0,
                currency: 'BDT',
                paidAt: new Date()
              }
            };
            
            const transfer = new OwnershipTransfer(transferData);
            await transfer.save();
            
            // Close the ownership transfer (complete the sale)
            await transfer.close(userId, 'Ownership transfer completed after payment verification');
            
            // Link request to ownership transfer
            request.linkedOwnershipTransferId = transfer._id;
            
            // Add timeline event
            request.timeline.push({
              event: 'Ownership transfer completed',
              actor: userId,
              timestamp: new Date(),
              note: `Ownership transfer ${transfer._id} completed and property sold to buyer`
            });
          }
        } catch (contractError) {
          console.error('Error creating contract:', contractError);
          return res.status(500).json({ 
            success: false, 
            message: 'Payment verified but failed to create contract: ' + contractError.message 
          });
        }
      }
    }

    // Handle property status changes for various transitions
    if (['Rejected', 'Canceled', 'Expired'].includes(status)) {
      // Request was rejected, canceled, or expired - make property available again
      const property = await Property.findById(request.propertyId);
      if (property && property.status === 'Reserved') {
        try {
          await property.makeAvailable(userId, `Request ${status.toLowerCase()} - property made available again`);
          
          // Add timeline event
          request.timeline.push({
            event: `Property made available due to request ${status.toLowerCase()}`,
            actor: userId,
            timestamp: new Date(),
            note: 'Property status reset to Available'
          });
        } catch (error) {
          console.error('Error making property available:', error);
        }
      }
    }
    
    // Handle property reservation for approved requests
    if (status === 'Approved – Pay Advance' && request.status !== 'Approved – Pay Advance') {
      const property = await Property.findById(request.propertyId);
      if (property && property.status === 'Available') {
        try {
          await property.reserve(userId, 'Property reserved for approved request');
          
          // Add timeline event
          request.timeline.push({
            event: 'Property reserved for approved request',
            actor: userId,
            timestamp: new Date(),
            note: 'Property status changed to Reserved'
          });
        } catch (error) {
          console.error('Error reserving property:', error);
        }
      }
    }

    // Transition status
    await request.transitionStatus(status, userId, note);

    const updatedRequest = await Request.findById(request._id)
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email')
      .populate('timeline.actor', 'firstName lastName');

    // Send notifications based on status change
    try {
      if (oldStatus !== status) {
        // Notify tenant about status changes (except when tenant initiated the change)
        if (userRole !== 'Tenant') {
          await NotificationService.sendRequestStatusNotification(
            updatedRequest.tenantId._id,
            updatedRequest._id,
            oldStatus,
            status,
            note
          );
        }
        
        // Notify owner about status changes (except when owner initiated the change)
        if (userRole !== 'Owner') {
          await NotificationService.sendRequestStatusNotification(
            updatedRequest.ownerId._id,
            updatedRequest._id,
            oldStatus,
            status,
            note
          );
        }
        
        // Special notifications for payment completion
        if (status === 'Paid/Completed') {
          await NotificationService.sendPropertyAssignmentNotification(
            updatedRequest.tenantId._id,
            updatedRequest.propertyId._id,
            updatedRequest.requestType
          );
        }
        
        // Special notifications for advance payment requests
        if (status === 'Approved – Pay Advance') {
          await NotificationService.sendAdvancePaymentRequestNotification(
            updatedRequest.tenantId._id,
            updatedRequest._id,
            updatedRequest.advancePayment
          );
        }
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.json({
      message: 'Request status updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update request payload (for info requests)
const updateRequestPayload = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { payload } = req.body;
    const userId = req.user.userId;

    const request = await Request.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only tenant can update their own request payload
    if (request.tenantId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only update if status allows it
    if (!['Info Requested', 'Under Review'].includes(request.status)) {
      return res.status(400).json({ 
        message: 'Cannot update request in current status',
        currentStatus: request.status
      });
    }

    // Update payload
    request.payload = { ...request.payload, ...payload };
    
    // Add timeline event
    request.timeline.push({
      event: 'Request information updated',
      actor: userId,
      timestamp: new Date(),
      note: 'Tenant updated request information'
    });

    // If status was 'Info Requested', change back to 'Under Review'
    if (request.status === 'Info Requested') {
      request.status = 'Under Review';
    }

    await request.save();

    const updatedRequest = await Request.findById(request._id)
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email');

    res.json({
      message: 'Request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add internal note
const addInternalNote = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { note, isPrivate = true } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const request = await Request.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check permissions
    const canAddNote = userRole === 'Admin' || 
                      request.ownerId.toString() === userId ||
                      request.tenantId.toString() === userId;

    if (!canAddNote) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add note
    request.internalNotes.push({
      note,
      addedBy: userId,
      addedAt: new Date(),
      isPrivate: userRole === 'Admin' ? isPrivate : false // Only admins can add private notes
    });

    await request.save();

    res.json({ message: 'Note added successfully' });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get request statistics
const getRequestStats = async (req, res) => {
  try {
    const { userId, userRole } = req.user;
    
    let matchCondition = {};
    
    // Filter based on user role
    if (userRole === 'Tenant') {
      matchCondition.tenantId = new mongoose.Types.ObjectId(userId);
    } else if (userRole === 'Owner') {
      // For owners, get stats for properties they own
      const properties = await Property.find({ ownerUserId: userId }).select('_id');
      const propertyIds = properties.map(p => p._id);
      matchCondition.propertyId = { $in: propertyIds };
    }
    // Admin can see all stats (no additional filter)
    
    const stats = await Request.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProcessingTime: {
            $avg: {
              $subtract: [
                { $ifNull: ['$updatedAt', new Date()] },
                '$createdAt'
              ]
            }
          }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          avgProcessingTimeHours: {
            $divide: ['$avgProcessingTime', 1000 * 60 * 60]
          },
          _id: 0
        }
      }
    ]);
    
    // Get total counts
    const totalRequests = await Request.countDocuments(matchCondition);
    const activeRequests = await Request.countDocuments({
      ...matchCondition,
      status: { $in: ['Pending', 'Under Review', 'Approved – Pay Advance', 'Payment Submitted'] }
    });
    
    // Get additional stats for different user roles
    let additionalStats = {};
    
    if (userRole === 'Admin') {
      // Admin gets comprehensive stats
      const rentRequests = await Request.countDocuments({ requestType: 'Rent' });
      const purchaseRequests = await Request.countDocuments({ requestType: 'Purchase' });
      const completedRequests = await Request.countDocuments({ status: 'Paid/Completed' });
      
      additionalStats = {
        requestTypeBreakdown: {
          rent: rentRequests,
          purchase: purchaseRequests
        },
        completedRequests,
        completionRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : 0
      };
    }
    
    res.json({
      success: true,
      data: {
        totalRequests,
        activeRequests,
        statusBreakdown: stats,
        ...additionalStats
      }
    });
    
  } catch (error) {
    console.error('Error getting request stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get request statistics' 
    });
  }
};

// Submit payment proof
const submitPaymentProof = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { proofUrl, note } = req.body;
    const userId = req.user.userId;

    const request = await Request.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only tenant can submit payment proof
    if (request.tenantId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only submit if status is 'Approved – Pay Advance'
    if (request.status !== 'Approved – Pay Advance') {
      return res.status(400).json({ 
        message: 'Cannot submit payment proof in current status',
        currentStatus: request.status
      });
    }

    // Update payment proof
    if (request.advancePayment) {
      request.advancePayment.proofUrl = proofUrl;
      request.advancePayment.note = note;
    }

    // Transition to Payment Submitted
    await request.transitionStatus('Payment Submitted', userId, 'Payment proof submitted');

    res.json({ message: 'Payment proof submitted successfully' });
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    res.status(500).json({ message: 'Failed to submit payment proof', error: error.message });
  }
};

// REMOVED: getPaymentStatusPolling function has been removed
// Reason: Long polling functionality replaced by webhook-based payment processing

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  updateRequestPayload,
  addInternalNote,
  getRequestStats,
  submitPaymentProof
};