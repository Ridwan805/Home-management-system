const ParcelLog = require('../models/ParcelLog');
const User = require('../models/User');
const Property = require('../models/Property');
const notificationService = require('../services/notificationService');

// Create parcel log
const createParcelLog = async (req, res) => {
  try {
    console.log('🎯 PARCEL LOG: Creating parcel log with data:', req.body);
    const { recipientId, senderName, description } = req.body;
    const loggedBy = req.user.id; // Security guard ID from auth middleware
    console.log('🎯 PARCEL LOG: Logged by user ID:', loggedBy);

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create parcel log
    const parcelLog = new ParcelLog({
      recipientId,
      senderName,
      description,
      loggedBy
    });

    await parcelLog.save();
    await parcelLog.populate('recipientId', 'name email phone');
    await parcelLog.populate('loggedBy', 'name');

    // Send notification to recipient
    try {
      await notificationService.createNotification({
        userId: recipientId,
        title: 'New Parcel Received',
        message: `A parcel from ${senderName} has been received and is waiting for collection.`,
        type: 'parcel',
        relatedId: parcelLog._id
      });
    } catch (notifError) {
      console.error('Failed to send parcel notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Parcel logged successfully',
      data: parcelLog
    });
  } catch (error) {
    console.error('Error creating parcel log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all parcel logs (Security Guard - all, Resident - own only)
const getParcelLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, recipientId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let filter = {};

    // If user is not admin/security guard, only show their own parcels
    if (userRole !== 'admin' && userRole !== 'security_guard') {
      filter.recipientId = userId;
    } else if (recipientId) {
      filter.recipientId = recipientId;
    }

    if (status) {
      filter.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { timestamp: -1 },
      populate: [
        { path: 'recipientId', select: 'name email phone' },
        { path: 'loggedBy', select: 'name' }
      ]
    };

    const result = await ParcelLog.paginate(filter, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching parcel logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get parcel log by ID
const getParcelLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    console.log('🎯 PARCEL LOG BY ID: Requested ID:', id);
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ PARCEL LOG BY ID: Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid parcel log ID format' });
    }

    const parcelLog = await ParcelLog.findById(id)
      .populate('recipientId', 'name email phone')
      .populate('loggedBy', 'name');
    
    console.log('🎯 PARCEL LOG BY ID: Found parcel log:', !!parcelLog);

    if (!parcelLog) {
      return res.status(404).json({ message: 'Parcel log not found' });
    }

    // Check if user has permission to view this parcel
    if (userRole !== 'admin' && userRole !== 'security_guard' && 
        parcelLog.recipientId._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: parcelLog
    });
  } catch (error) {
    console.error('Error fetching parcel log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark parcel as collected (Resident)
const markParcelCollected = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const parcelLog = await ParcelLog.findById(id);
    if (!parcelLog) {
      return res.status(404).json({ message: 'Parcel log not found' });
    }

    // Check if user has permission to mark as collected
    if (userRole !== 'admin' && userRole !== 'security_guard' && 
        parcelLog.recipientId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (parcelLog.status === 'Collected') {
      return res.status(400).json({ message: 'Parcel already marked as collected' });
    }

    parcelLog.status = 'Collected';
    parcelLog.collectedAt = new Date();
    await parcelLog.save();

    await parcelLog.populate('recipientId', 'name email phone');
    await parcelLog.populate('loggedBy', 'name');

    res.json({
      success: true,
      message: 'Parcel marked as collected',
      data: parcelLog
    });
  } catch (error) {
    console.error('Error marking parcel as collected:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get overdue parcels (Admin/Security Guard)
const getOverdueParcels = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find parcels older than 48 hours and still pending
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const overdueParcels = await ParcelLog.find({
      status: 'Pending',
      timestamp: { $lt: fortyEightHoursAgo }
    })
    .populate('recipientId', 'name email phone')
    .populate('loggedBy', 'name')
    .sort({ timestamp: 1 });

    res.json({
      success: true,
      data: overdueParcels,
      count: overdueParcels.length
    });
  } catch (error) {
    console.error('Error fetching overdue parcels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update parcel log (Security Guard/Admin)
const updateParcelLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { senderName, description } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parcelLog = await ParcelLog.findById(id);
    if (!parcelLog) {
      return res.status(404).json({ message: 'Parcel log not found' });
    }

    if (senderName) parcelLog.senderName = senderName;
    if (description) parcelLog.description = description;

    await parcelLog.save();
    await parcelLog.populate('recipientId', 'name email phone');
    await parcelLog.populate('loggedBy', 'name');

    res.json({
      success: true,
      message: 'Parcel log updated successfully',
      data: parcelLog
    });
  } catch (error) {
    console.error('Error updating parcel log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete parcel log (Admin only)
const deleteParcelLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parcelLog = await ParcelLog.findByIdAndDelete(id);
    if (!parcelLog) {
      return res.status(404).json({ message: 'Parcel log not found' });
    }

    res.json({
      success: true,
      message: 'Parcel log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting parcel log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createParcelLog,
  getParcelLogs,
  getParcelLogById,
  markParcelCollected,
  getOverdueParcels,
  updateParcelLog,
  deleteParcelLog
};