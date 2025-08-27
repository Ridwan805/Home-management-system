const OwnershipTransfer = require('../models/OwnershipTransfer');
const Property = require('../models/Property');
const Request = require('../models/Request');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a new ownership transfer
const createOwnershipTransfer = async (req, res) => {
  try {
    const {
      propertyId,
      buyerId,
      requestId,
      agreedPrice,
      currency,
      closing
    } = req.body;
    const sellerId = req.user.userId;

    // Validate property exists and is owned by user
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.ownerUserId?.toString() !== sellerId) {
      return res.status(403).json({ message: 'Not authorized to sell this property' });
    }

    // Check property is available for sale
    if (property.status === 'Sold') {
      return res.status(400).json({ 
        message: 'Property is already sold' 
      });
    }

    if (property.status === 'Rented') {
      return res.status(400).json({ 
        message: 'Cannot sell property that is currently rented' 
      });
    }

    // Validate buyer exists
    const buyer = await User.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Validate request if provided
    if (requestId) {
      const request = await Request.findById(requestId);
      if (!request || request.propertyId.toString() !== propertyId) {
        return res.status(400).json({ message: 'Invalid request for this property' });
      }
      if (request.status !== 'Paid/Completed') {
        return res.status(400).json({ message: 'Request must be completed before creating ownership transfer' });
      }
      if (request.tenantId.toString() !== buyerId) {
        return res.status(400).json({ message: 'Request buyer does not match provided buyer' });
      }
    }

    // Check for existing pending ownership transfer
    const existingTransfer = await OwnershipTransfer.findOne({ 
      propertyId, 
      status: 'Pending' 
    });
    if (existingTransfer) {
      return res.status(400).json({ message: 'Property already has a pending ownership transfer' });
    }

    // Create ownership transfer
    const newTransfer = new OwnershipTransfer({
      propertyId,
      buyerId,
      sellerId,
      requestId,
      agreedPrice,
      currency: currency || 'BDT',
      closing: {
        date: closing?.date ? new Date(closing.date) : null,
        documents: closing?.documents || [],
        notes: closing?.notes || ''
      },
      status: 'Pending'
    });

    await newTransfer.save();

    // Link request to ownership transfer if provided
    if (requestId) {
      await Request.findByIdAndUpdate(requestId, { ownershipTransferId: newTransfer._id });
    }

    // Update property status to Reserved
    await property.reserve(sellerId);

    const populatedTransfer = await OwnershipTransfer.findById(newTransfer._id)
      .populate('propertyId', 'address city state images')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .populate('requestId');

    res.status(201).json({
      success: true,
      message: 'Ownership transfer created successfully',
      transfer: populatedTransfer
    });
  } catch (error) {
    console.error('Error creating ownership transfer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create ownership transfer',
      error: error.message 
    });
  }
};

// Get all ownership transfers (with filtering)
const getOwnershipTransfers = async (req, res) => {
  try {
    const { status, propertyId, buyerId, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Build filter based on user role
    let filter = {};
    
    if (userRole === 'Tenant') {
      filter.buyerId = userId;
    } else if (userRole === 'Owner') {
      filter.sellerId = userId;
    }
    // Admin can see all transfers (no additional filter)

    // Add optional filters
    if (status) filter.status = status;
    if (propertyId) filter.propertyId = propertyId;
    if (buyerId && userRole === 'Admin') filter.buyerId = buyerId;

    const skip = (page - 1) * limit;

    const transfers = await OwnershipTransfer.find(filter)
      .populate('propertyId', 'address city state images')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .populate('requestId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OwnershipTransfer.countDocuments(filter);

    res.json({
      success: true,
      transfers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching ownership transfers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ownership transfers',
      error: error.message 
    });
  }
};

// Get ownership transfer by ID
const getOwnershipTransferById = async (req, res) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const transfer = await OwnershipTransfer.findById(transferId)
      .populate('propertyId')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .populate('requestId')
      .populate('history.actor', 'firstName lastName');

    if (!transfer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ownership transfer not found' 
      });
    }

    // Check authorization
    const isBuyer = transfer.buyerId._id.toString() === userId;
    const isSeller = transfer.sellerId._id.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this ownership transfer' 
      });
    }

    res.json({
      success: true,
      transfer
    });
  } catch (error) {
    console.error('Error fetching ownership transfer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ownership transfer',
      error: error.message 
    });
  }
};

// Close ownership transfer (complete the sale)
const closeOwnershipTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { closingDate, documents, notes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const transfer = await OwnershipTransfer.findById(transferId).populate('propertyId');
    if (!transfer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ownership transfer not found' 
      });
    }

    // Check authorization (seller, buyer, or admin can close)
    const isBuyer = transfer.buyerId.toString() === userId;
    const isSeller = transfer.sellerId.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to close this ownership transfer' 
      });
    }

    // Check current status
    if (transfer.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot close ownership transfer in status: ${transfer.status}` 
      });
    }

    // Update closing details
    if (closingDate) transfer.closing.date = new Date(closingDate);
    if (documents) transfer.closing.documents = documents;
    if (notes) transfer.closing.notes = notes;

    // Close transfer using instance method
    await transfer.close(userId);

    // Update property ownership and status
    const property = transfer.propertyId;
    await property.sell(transfer.buyerId, userId);

    const updatedTransfer = await OwnershipTransfer.findById(transferId)
      .populate('propertyId')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ownership transfer closed successfully',
      transfer: updatedTransfer
    });
  } catch (error) {
    console.error('Error closing ownership transfer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to close ownership transfer',
      error: error.message 
    });
  }
};

// Cancel ownership transfer
const cancelOwnershipTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { reason, note } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const transfer = await OwnershipTransfer.findById(transferId).populate('propertyId');
    if (!transfer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ownership transfer not found' 
      });
    }

    // Check authorization (seller, buyer, or admin can cancel)
    const isBuyer = transfer.buyerId.toString() === userId;
    const isSeller = transfer.sellerId.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to cancel this ownership transfer' 
      });
    }

    // Check current status
    if (transfer.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel ownership transfer in status: ${transfer.status}` 
      });
    }

    // Cancel transfer using instance method
    await transfer.cancel(userId, reason, note);

    // Update property status back to Available
    const property = transfer.propertyId;
    await property.makeAvailable(userId);

    const updatedTransfer = await OwnershipTransfer.findById(transferId)
      .populate('propertyId')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ownership transfer canceled successfully',
      transfer: updatedTransfer
    });
  } catch (error) {
    console.error('Error canceling ownership transfer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel ownership transfer',
      error: error.message 
    });
  }
};

// Update ownership transfer details
const updateOwnershipTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { agreedPrice, closing } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const transfer = await OwnershipTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ownership transfer not found' 
      });
    }

    // Check authorization (seller, buyer, or admin can update)
    const isBuyer = transfer.buyerId.toString() === userId;
    const isSeller = transfer.sellerId.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this ownership transfer' 
      });
    }

    // Check current status (can only update pending transfers)
    if (transfer.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot update ownership transfer in status: ${transfer.status}` 
      });
    }

    // Update fields
    if (agreedPrice !== undefined) transfer.agreedPrice = agreedPrice;
    if (closing) {
      if (closing.date) transfer.closing.date = new Date(closing.date);
      if (closing.documents) transfer.closing.documents = closing.documents;
      if (closing.notes !== undefined) transfer.closing.notes = closing.notes;
    }

    // Add history entry
    transfer.history.push({
      event: 'Transfer details updated',
      actor: userId,
      timestamp: new Date(),
      details: { agreedPrice, closing }
    });

    await transfer.save();

    const updatedTransfer = await OwnershipTransfer.findById(transferId)
      .populate('propertyId')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ownership transfer updated successfully',
      transfer: updatedTransfer
    });
  } catch (error) {
    console.error('Error updating ownership transfer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update ownership transfer',
      error: error.message 
    });
  }
};

// Get ownership history for a property
const getPropertyOwnershipHistory = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validate property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }

    // Check authorization (current owner, admin, or involved parties can view)
    const isCurrentOwner = property.ownerUserId?.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isCurrentOwner && !isAdmin) {
      // Check if user was involved in any transfer for this property
      const userTransfers = await OwnershipTransfer.find({
        propertyId,
        $or: [{ buyerId: userId }, { sellerId: userId }]
      });
      
      if (userTransfers.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to view ownership history for this property' 
        });
      }
    }

    const transfers = await OwnershipTransfer.find({ propertyId })
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      property: {
        id: property._id,
        address: property.address,
        currentOwner: property.ownerUserId
      },
      transfers
    });
  } catch (error) {
    console.error('Error fetching property ownership history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch property ownership history',
      error: error.message 
    });
  }
};

module.exports = {
  createOwnershipTransfer,
  getOwnershipTransfers,
  getOwnershipTransferById,
  closeOwnershipTransfer,
  cancelOwnershipTransfer,
  updateOwnershipTransfer,
  getPropertyOwnershipHistory
};