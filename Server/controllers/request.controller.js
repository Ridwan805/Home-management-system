const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

    // Validate status transition
    if (!request.canTransitionTo(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${request.status} to ${status}`,
        validTransitions: Request.getValidStatusTransitions()[request.status]
      });
    }

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
    }

    // Transition status
    await request.transitionStatus(status, userId, note);

    const updatedRequest = await Request.findById(request._id)
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email')
      .populate('timeline.actor', 'firstName lastName');

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