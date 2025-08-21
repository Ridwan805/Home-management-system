const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const NotificationService = require('../services/notificationService');
const GuardrailsService = require('../services/guardrailsService');

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
        identityFiles.nidFileUrl = req.files.nidFile[0].path;
      }
      if (req.files.tinFile && req.files.tinFile[0]) {
        identityFiles.tinFileUrl = req.files.tinFile[0].path;
      }
      if (req.files.personalPhoto && req.files.personalPhoto[0]) {
        identityFiles.personalPhotoUrl = req.files.personalPhoto[0].path;
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
    const property = await Property.findById(propertyId).populate('owner');
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user is trying to request their own property
    if (property.owner._id.toString() === tenantId) {
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
      ownerId: property.owner._id,
      tenantId,
      requestType,
      payload: {
        ...parsedPayload,
        identity: {
          ...parsedPayload.identity,
          ...identityFiles
        }
      },
      consent: {
        ...parsedConsent,
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }
    });

    await newRequest.save();

    // Populate the request with related data
    const populatedRequest = await Request.findById(newRequest._id)
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email');

    // Send notification to property owner
    try {
      await NotificationService.createNotification(
        property.owner._id,
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

    // Handle payment verification
    if (status === 'Paid/Completed' && userRole === 'Owner') {
      if (request.advancePayment) {
        request.advancePayment.verifiedAt = new Date();
        request.advancePayment.verifiedBy = userId;
        request.advancePayment.verificationNote = note;
      }

      // Assign property to tenant when payment is completed
      const property = await Property.findById(request.propertyId);
      if (property) {
        // Update property status based on request type
        const newPropertyStatus = request.requestType === 'Rent' ? 'Rented' : 'Sold';
        property.status = newPropertyStatus;
        
        // Add tenant assignment (we'll add this field to Property model)
        property.assignedTenant = request.tenantId;
        property.assignedAt = new Date();
        property.assignmentType = request.requestType;
        
        await property.save();
        
        // Add timeline event for property assignment
        request.timeline.push({
          event: `Property ${newPropertyStatus.toLowerCase()} to tenant`,
          actor: userId,
          timestamp: new Date(),
          note: `Property status changed to ${newPropertyStatus} and assigned to tenant`
        });
      }
    }

    // Handle property status changes for various transitions
    if (['Rejected', 'Canceled', 'Expired'].includes(status) || 
        (request.status === 'Payment Submitted' && status === 'Approved – Pay Advance')) {
      // Request was rejected, canceled, expired, or payment was rejected
      const property = await Property.findById(request.propertyId);
      if (property && property.assignedTenant && property.assignedTenant.toString() === request.tenantId.toString()) {
        // Clear tenant assignment and reset to available
        property.assignedTenant = undefined;
        property.assignedAt = undefined;
        property.assignmentType = undefined;
        property.status = 'Available';
        await property.save();
        
        // Add timeline event
        const eventMessage = status === 'Approved – Pay Advance' ? 
          'Property assignment reverted due to payment rejection' :
          `Property assignment reverted due to request ${status.toLowerCase()}`;
        
        request.timeline.push({
          event: eventMessage,
          actor: userId,
          timestamp: new Date(),
          note: 'Property status reset to Available'
        });
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
    const userId = req.user.userId;
    const userRole = req.user.role;

    let matchFilter = {};
    if (userRole === 'Tenant') {
      matchFilter.tenantId = new mongoose.Types.ObjectId(userId);
    } else if (userRole === 'Owner') {
      matchFilter.ownerId = new mongoose.Types.ObjectId(userId);
    }

    const stats = await Request.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRequests = await Request.countDocuments(matchFilter);

    res.json({
      totalRequests,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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