const Rent = require('../models/Rent');
const Property = require('../models/Property');
const Request = require('../models/Request');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

// Create a new rent contract
const createRent = async (req, res) => {
  try {
    const {
      propertyId,
      tenants,
      requestId,
      term,
      rent,
      securityDeposit,
      billing
    } = req.body;
    const currentUserId = req.user.userId;

    // Validate property exists and is owned by user
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Get the actual property owner ID
    const propertyOwnerId = property.ownerUserId?._id || property.ownerUserId || property.owner;
    if (!propertyOwnerId) {
      return res.status(400).json({ message: 'Property owner information is missing' });
    }

    // Only the property owner can create rent contracts
    if (propertyOwnerId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized to create rent for this property' });
    }

    // Check property is available for rent
    if (property.status !== 'Available' && property.status !== 'Reserved') {
      return res.status(400).json({ 
        message: `Property is not available for rent. Current status: ${property.status}` 
      });
    }

    // Validate request if provided
    if (requestId) {
      const request = await Request.findById(requestId);
      if (!request || request.propertyId.toString() !== propertyId) {
        return res.status(400).json({ message: 'Invalid request for this property' });
      }
      if (request.status !== 'Paid/Completed') {
        return res.status(400).json({ message: 'Request must be completed before creating rent' });
      }
    }

    // Check for existing active rent on property
    const existingRent = await Rent.findOne({ 
      propertyId, 
      status: { $in: ['Pending', 'Active'] } 
    });
    if (existingRent) {
      return res.status(400).json({ message: 'Property already has an active rent contract' });
    }

    // Create rent contract
    const newRent = new Rent({
      propertyId,
      ownerId: propertyOwnerId,
      tenants: Array.isArray(tenants) ? tenants : [tenants],
      requestId,
      term: {
        type: term.type || 'fixed',
        startDate: new Date(term.startDate),
        endDate: term.endDate ? new Date(term.endDate) : null,
        noticeDays: term.noticeDays || 30
      },
      rent: {
        amount: rent.amount,
        currency: rent.currency || 'BDT',
        dueDay: rent.dueDay || 1,
        graceDays: rent.graceDays || 5,
        lateFee: rent.lateFee || null
      },
      securityDeposit: {
        amount: securityDeposit.amount || 0,
        held: securityDeposit.held || 0,
        releasedAt: null,
        deductions: []
      },
      billing: {
        frequency: billing?.frequency || 'monthly',
        nextInvoiceDate: billing?.nextInvoiceDate ? new Date(billing.nextInvoiceDate) : new Date(),
        autoGenerate: billing?.autoGenerate !== false
      },
      status: 'Pending'
    });

    await newRent.save();

    // Link request to rent if provided
    if (requestId) {
      await Request.findByIdAndUpdate(requestId, { rentId: newRent._id });
    }

    const populatedRent = await Rent.findById(newRent._id)
      .populate('propertyId', 'address city state')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email')
      .populate('requestId');

    res.status(201).json({
      success: true,
      message: 'Rent contract created successfully',
      rent: populatedRent
    });
  } catch (error) {
    console.error('Error creating rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create rent contract',
      error: error.message 
    });
  }
};

// Get all rents (with filtering)
const getRents = async (req, res) => {
  try {
    const { status, propertyId, tenantId, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    
    if (userRole === 'Tenant') {
      filter.tenants = userId;
    } else if (userRole === 'Owner') {
      filter.ownerId = userId;
    }
    // Admin can see all rents (no additional filter)

    // Add optional filters
    if (status) filter.status = status;
    if (propertyId) filter.propertyId = propertyId;
    if (tenantId && userRole === 'Admin') filter.tenants = tenantId;

    const skip = (page - 1) * limit;

    const rents = await Rent.find(filter)
      .populate('propertyId', 'address city state images')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email')
      .populate('requestId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rent.countDocuments(filter);

    res.json({
      success: true,
      rents,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching rents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rents',
      error: error.message 
    });
  }
};

// Get rent by ID
const getRentById = async (req, res) => {
  try {
    const { rentId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const rent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email')
      .populate('requestId')
      .populate('history.actor', 'firstName lastName');

    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization
    const isOwner = rent.ownerId._id.toString() === userId;
    const isTenant = rent.tenants.some(tenant => tenant._id.toString() === userId);
    const isAdmin = userRole === 'Admin';

    if (!isOwner && !isTenant && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this rent contract' 
      });
    }

    res.json({
      success: true,
      rent
    });
  } catch (error) {
    console.error('Error fetching rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rent contract',
      error: error.message 
    });
  }
};

// Activate rent contract
const activateRent = async (req, res) => {
  try {
    const { rentId } = req.params;
    const userId = req.user.userId;

    const rent = await Rent.findById(rentId).populate('propertyId');
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization (only owner can activate)
    if (rent.ownerId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to activate this rent contract' 
      });
    }

    // Check current status
    if (rent.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot activate rent in status: ${rent.status}` 
      });
    }

    // Activate rent using instance method
    await rent.activate(userId);

    // Update property status
    const property = rent.propertyId;
    await property.rent(rent._id, userId);

    const updatedRent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent contract activated successfully',
      rent: updatedRent
    });
  } catch (error) {
    console.error('Error activating rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to activate rent contract',
      error: error.message 
    });
  }
};

// Terminate rent contract
const terminateRent = async (req, res) => {
  try {
    const { rentId } = req.params;
    const { reason, note } = req.body;
    const userId = req.user.userId;

    const rent = await Rent.findById(rentId).populate('propertyId');
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization (owner or tenant can terminate)
    const isOwner = rent.ownerId.toString() === userId;
    const isTenant = rent.tenants.some(tenant => tenant._id.toString() === userId);

    if (!isOwner && !isTenant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to terminate this rent contract' 
      });
    }

    // Check current status
    if (!['Active', 'Paused'].includes(rent.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot terminate rent in status: ${rent.status}` 
      });
    }

    // Terminate rent using instance method
    await rent.terminate(userId, reason, note);

    // Update property status
    const property = rent.propertyId;
    await property.endRent(userId);

    const updatedRent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent contract terminated successfully',
      rent: updatedRent
    });
  } catch (error) {
    console.error('Error terminating rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to terminate rent contract',
      error: error.message 
    });
  }
};

// Pause rent contract
const pauseRent = async (req, res) => {
  try {
    const { rentId } = req.params;
    const { reason, note } = req.body;
    const userId = req.user.userId;

    const rent = await Rent.findById(rentId);
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization (only owner can pause)
    if (rent.ownerId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to pause this rent contract' 
      });
    }

    // Check current status
    if (rent.status !== 'Active') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot pause rent in status: ${rent.status}` 
      });
    }

    // Pause rent using instance method
    await rent.pause(userId, reason, note);

    const updatedRent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent contract paused successfully',
      rent: updatedRent
    });
  } catch (error) {
    console.error('Error pausing rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to pause rent contract',
      error: error.message 
    });
  }
};

// Resume rent contract
const resumeRent = async (req, res) => {
  try {
    const { rentId } = req.params;
    const { note } = req.body;
    const userId = req.user.userId;

    const rent = await Rent.findById(rentId);
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization (only owner can resume)
    if (rent.ownerId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to resume this rent contract' 
      });
    }

    // Check current status
    if (rent.status !== 'Paused') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot resume rent in status: ${rent.status}` 
      });
    }

    // Resume rent using instance method
    await rent.resume(userId, note);

    const updatedRent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent contract resumed successfully',
      rent: updatedRent
    });
  } catch (error) {
    console.error('Error resuming rent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resume rent contract',
      error: error.message 
    });
  }
};

// Update rent terms
const updateRentTerms = async (req, res) => {
  try {
    const { rentId } = req.params;
    const { rent: rentTerms, securityDeposit, billing } = req.body;
    const userId = req.user.userId;

    const rent = await Rent.findById(rentId);
    if (!rent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rent contract not found' 
      });
    }

    // Check authorization (only owner can update terms)
    if (rent.ownerId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this rent contract' 
      });
    }

    // Update rent terms
    if (rentTerms) {
      if (rentTerms.amount) rent.rent.amount = rentTerms.amount;
      if (rentTerms.dueDay) rent.rent.dueDay = rentTerms.dueDay;
      if (rentTerms.graceDays !== undefined) rent.rent.graceDays = rentTerms.graceDays;
      if (rentTerms.lateFee !== undefined) rent.rent.lateFee = rentTerms.lateFee;
    }

    if (securityDeposit) {
      if (securityDeposit.amount !== undefined) rent.securityDeposit.amount = securityDeposit.amount;
    }

    if (billing) {
      if (billing.frequency) rent.billing.frequency = billing.frequency;
      if (billing.autoGenerate !== undefined) rent.billing.autoGenerate = billing.autoGenerate;
    }

    // Add history entry
    rent.history.push({
      event: 'Rent terms updated',
      actor: userId,
      timestamp: new Date(),
      details: { rentTerms, securityDeposit, billing }
    });

    await rent.save();

    const updatedRent = await Rent.findById(rentId)
      .populate('propertyId')
      .populate('ownerId', 'firstName lastName email')
      .populate('tenants', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Rent terms updated successfully',
      rent: updatedRent
    });
  } catch (error) {
    console.error('Error updating rent terms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update rent terms',
      error: error.message 
    });
  }
};

// Get active rents for invoice generation
const getActiveRentsForInvoicing = async (req, res) => {
  try {
    const activeRents = await Rent.findActiveForInvoicing();
    
    res.json({
      success: true,
      count: activeRents.length,
      rents: activeRents
    });
  } catch (error) {
    console.error('Error fetching active rents for invoicing:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active rents for invoicing',
      error: error.message 
    });
  }
};

module.exports = {
  createRent,
  getRents,
  getRentById,
  activateRent,
  terminateRent,
  pauseRent,
  resumeRent,
  updateRentTerms,
  getActiveRentsForInvoicing
};