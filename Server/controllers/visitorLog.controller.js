const VisitorLog = require('../models/VisitorLog');
const User = require('../models/User');
const Property = require('../models/Property');
const notificationService = require('../services/notificationService');

// Create a new visitor log (Security Guard)
const createVisitorLog = async (req, res) => {
  try {
    const { visitorName, unitId, expectedTime, visitorPhone, purpose, notes } = req.body;
    const loggedBy = req.user.id; // Security guard ID from auth middleware

    // Validate unit exists
    const unit = await Property.findById(unitId);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Create visitor log
    const visitorLog = new VisitorLog({
      visitorName,
      unitId,
      expectedTime: expectedTime ? new Date(expectedTime) : null,
      visitorPhone,
      purpose,
      notes,
      loggedBy
    });

    await visitorLog.save();
    await visitorLog.populate('unitId', 'unitNumber buildingId');
    await visitorLog.populate('loggedBy', 'name');

    // Notify unit owner/tenant
    try {
      if (unit.ownerId) {
        await notificationService.createNotification({
          userId: unit.ownerId,
          title: 'Visitor Arrival',
          message: `Visitor ${visitorName} has arrived for unit ${unit.unitNumber}.`,
          type: 'visitor',
          relatedId: visitorLog._id
        });
      }
    } catch (notifError) {
      console.error('Failed to send visitor notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Visitor logged successfully',
      data: visitorLog
    });
  } catch (error) {
    console.error('Error creating visitor log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create pre-approved guest (Resident)
const createPreApprovedGuest = async (req, res) => {
  try {
    const { visitorName, expectedTime, visitorPhone, purpose, notes } = req.body;
    const approvedBy = req.user.id;

    // Find user's property/unit
    const userProperty = await Property.findOne({ ownerId: approvedBy });
    if (!userProperty) {
      return res.status(404).json({ message: 'No property found for user' });
    }

    // Create pre-approved visitor log
    const visitorLog = new VisitorLog({
      visitorName,
      unitId: userProperty._id,
      expectedTime: expectedTime ? new Date(expectedTime) : null,
      visitorPhone,
      purpose,
      notes,
      preApproved: true,
      approvedBy,
      loggedBy: approvedBy // Resident logs their own pre-approval
    });

    await visitorLog.save();
    await visitorLog.populate('unitId', 'unitNumber buildingId');
    await visitorLog.populate('approvedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Guest pre-approved successfully',
      data: visitorLog
    });
  } catch (error) {
    console.error('Error creating pre-approved guest:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all visitor logs with filters
const getVisitorLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, unitId, preApproved, date } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let filter = {};

    // If user is not admin/security guard, only show their unit's visitors
    if (userRole !== 'admin' && userRole !== 'security_guard') {
      const userProperty = await Property.findOne({ ownerId: userId });
      if (userProperty) {
        filter.unitId = userProperty._id;
      } else {
        return res.json({ success: true, data: [], pagination: {} });
      }
    } else if (unitId) {
      filter.unitId = unitId;
    }

    if (status) filter.status = status;
    if (preApproved !== undefined) filter.preApproved = preApproved === 'true';
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.createdAt = { $gte: startDate, $lt: endDate };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'unitId', select: 'unitNumber buildingId' },
        { path: 'loggedBy', select: 'name' },
        { path: 'approvedBy', select: 'name' }
      ]
    };

    const result = await VisitorLog.paginate(filter, options);

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
    console.error('Error fetching visitor logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check in visitor (Security Guard)
const checkInVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visitorLog = await VisitorLog.findById(id);
    if (!visitorLog) {
      return res.status(404).json({ message: 'Visitor log not found' });
    }

    if (visitorLog.status !== 'Pending') {
      return res.status(400).json({ message: 'Visitor is not in pending status' });
    }

    visitorLog.status = 'CheckedIn';
    visitorLog.checkInTime = new Date();
    await visitorLog.save();

    await visitorLog.populate('unitId', 'unitNumber buildingId');
    await visitorLog.populate('loggedBy', 'name');
    await visitorLog.populate('approvedBy', 'name');

    res.json({
      success: true,
      message: 'Visitor checked in successfully',
      data: visitorLog
    });
  } catch (error) {
    console.error('Error checking in visitor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check out visitor (Security Guard)
const checkOutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visitorLog = await VisitorLog.findById(id);
    if (!visitorLog) {
      return res.status(404).json({ message: 'Visitor log not found' });
    }

    if (visitorLog.status !== 'CheckedIn') {
      return res.status(400).json({ message: 'Visitor is not checked in' });
    }

    visitorLog.status = 'CheckedOut';
    visitorLog.checkOutTime = new Date();
    await visitorLog.save();

    await visitorLog.populate('unitId', 'unitNumber buildingId');
    await visitorLog.populate('loggedBy', 'name');
    await visitorLog.populate('approvedBy', 'name');

    res.json({
      success: true,
      message: 'Visitor checked out successfully',
      data: visitorLog
    });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get pre-approved guests (Security Guard)
const getPreApprovedGuests = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const preApprovedGuests = await VisitorLog.find({
      preApproved: true,
      status: 'Pending'
    })
    .populate('unitId', 'unitNumber buildingId')
    .populate('approvedBy', 'name')
    .sort({ expectedTime: 1, createdAt: -1 });

    res.json({
      success: true,
      data: preApprovedGuests,
      count: preApprovedGuests.length
    });
  } catch (error) {
    console.error('Error fetching pre-approved guests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get overdue visitors (Admin/Security Guard)
const getOverdueVisitors = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find visitors checked in for more than 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    const overdueVisitors = await VisitorLog.find({
      status: 'CheckedIn',
      checkInTime: { $lt: twelveHoursAgo }
    })
    .populate('unitId', 'unitNumber buildingId')
    .populate('loggedBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ checkInTime: 1 });

    res.json({
      success: true,
      data: overdueVisitors,
      count: overdueVisitors.length
    });
  } catch (error) {
    console.error('Error fetching overdue visitors:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update visitor log (Security Guard/Admin)
const updateVisitorLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { visitorName, visitorPhone, purpose, notes, expectedTime } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'security_guard') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visitorLog = await VisitorLog.findById(id);
    if (!visitorLog) {
      return res.status(404).json({ message: 'Visitor log not found' });
    }

    if (visitorName) visitorLog.visitorName = visitorName;
    if (visitorPhone) visitorLog.visitorPhone = visitorPhone;
    if (purpose) visitorLog.purpose = purpose;
    if (notes) visitorLog.notes = notes;
    if (expectedTime) visitorLog.expectedTime = new Date(expectedTime);

    await visitorLog.save();
    await visitorLog.populate('unitId', 'unitNumber buildingId');
    await visitorLog.populate('loggedBy', 'name');
    await visitorLog.populate('approvedBy', 'name');

    res.json({
      success: true,
      message: 'Visitor log updated successfully',
      data: visitorLog
    });
  } catch (error) {
    console.error('Error updating visitor log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete visitor log (Admin only)
const deleteVisitorLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const visitorLog = await VisitorLog.findByIdAndDelete(id);
    if (!visitorLog) {
      return res.status(404).json({ message: 'Visitor log not found' });
    }

    res.json({
      success: true,
      message: 'Visitor log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting visitor log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createVisitorLog,
  createPreApprovedGuest,
  getVisitorLogs,
  checkInVisitor,
  checkOutVisitor,
  getPreApprovedGuests,
  getOverdueVisitors,
  updateVisitorLog,
  deleteVisitorLog
};