const MaintenanceReport = require('../models/MaintenanceReport');
const Property = require('../models/Property');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/maintenance-reports');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new maintenance report
const createMaintenanceReport = async (req, res) => {
  try {
    const {
      propertyId,
      issueType,
      title,
      description,
      floor,
      room,
      priority,
      isUrgent,
      tenantAvailability
    } = req.body;

    // Validate required fields
    if (!propertyId || !issueType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, issue type, title, and description are required'
      });
    }

    // Verify that the user is a tenant
    const tenant = await User.findById(req.user.userId);
    console.log('🔍 MAINTENANCE REPORT DEBUG: User ID:', req.user.userId);
    console.log('🔍 MAINTENANCE REPORT DEBUG: User from token:', req.user);
    console.log('🔍 MAINTENANCE REPORT DEBUG: User from DB:', tenant);
    console.log('🔍 MAINTENANCE REPORT DEBUG: User role from DB:', tenant?.role);
    console.log('🔍 MAINTENANCE REPORT DEBUG: Role comparison:', tenant?.role, '!==', 'Tenant', '=', tenant?.role !== 'Tenant');
    
    if (!tenant || tenant.role !== 'Tenant') {
      console.log('🔍 MAINTENANCE REPORT DEBUG: Role validation failed!');
      return res.status(403).json({
        success: false,
        message: 'Only tenants can create maintenance reports'
      });
    }
    
    console.log('🔍 MAINTENANCE REPORT DEBUG: Role validation passed!');

    // Verify that the tenant has access to the specified property
    const Rent = require('../models/Rent');
    console.log('🔍 PROPERTY ACCESS DEBUG: Property ID from request:', propertyId);
    console.log('🔍 PROPERTY ACCESS DEBUG: User ID:', req.user.userId);
    
    // First, let's see all rent records for this user
    const allUserRents = await Rent.find({ tenants: req.user.userId });
    console.log('🔍 PROPERTY ACCESS DEBUG: All rent records for user:', allUserRents);
    
    const tenantRent = await Rent.findOne({
      propertyId: propertyId,
      tenants: req.user.userId,
      status: 'Active'
    }).populate('propertyId');
    
    console.log('🔍 PROPERTY ACCESS DEBUG: Tenant rent found:', tenantRent);

    if (!tenantRent || !tenantRent.propertyId) {
      console.log('🔍 PROPERTY ACCESS DEBUG: No active rental found for this property!');
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this property or no active rental found'
      });
    }
    
    console.log('🔍 PROPERTY ACCESS DEBUG: Property access validation passed!');

    const property = tenantRent.propertyId;

    // Get property owner information
    await property.populate('ownerUserId');
    if (!property.ownerUserId) {
      return res.status(404).json({
        success: false,
        message: 'Property owner not found'
      });
    }

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push({
          url: `/uploads/maintenance-reports/${file.filename}`,
          caption: req.body.imageCaption || '',
          uploadedAt: new Date()
        });
      });
    }

    // Parse tenant availability if provided
    let parsedAvailability = null;
    if (tenantAvailability) {
      try {
        parsedAvailability = typeof tenantAvailability === 'string' 
          ? JSON.parse(tenantAvailability) 
          : tenantAvailability;
      } catch (error) {
        console.warn('Failed to parse tenant availability:', error);
      }
    }

    // Create the maintenance report
    const maintenanceReport = new MaintenanceReport({
      reporterId: req.user.userId,
      propertyId,
      ownerId: property.ownerUserId._id,
      issueType,
      title,
      description,
      floor: floor ? parseInt(floor) : undefined,
      room,
      priority: priority || 'medium',
      isUrgent: isUrgent === 'true' || isUrgent === true,
      images,
      tenantAvailability: parsedAvailability
    });

    await maintenanceReport.save();

    // Populate the response with related data
    const populatedReport = await MaintenanceReport.findById(maintenanceReport._id)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Maintenance report created successfully',
      data: populatedReport
    });

  } catch (error) {
    console.error('Error creating maintenance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create maintenance report',
      error: error.message
    });
  }
};

// Get maintenance reports for a tenant
const getTenantReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { reporterId: req.user.userId };
    if (status) {
      query.status = status;
    }

    const reports = await MaintenanceReport.find(query)
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MaintenanceReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: reports.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Error fetching tenant reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance reports',
      error: error.message
    });
  }
};

// Get maintenance reports for an owner
const getOwnerReports = async (req, res) => {
  try {
    const { status, propertyId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { ownerId: req.user.userId };
    if (status) {
      query.status = status;
    }
    if (propertyId) {
      query.propertyId = propertyId;
    }

    const reports = await MaintenanceReport.find(query)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MaintenanceReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: reports.length,
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Error fetching owner reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance reports',
      error: error.message
    });
  }
};

// Get a specific maintenance report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await MaintenanceReport.findById(id)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone')
      .populate('updates.updatedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance report not found'
      });
    }

    // Check if user has permission to view this report
    const userId = req.user.userId;
    if (report.reporterId._id.toString() !== userId && 
        report.ownerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this report'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance report',
      error: error.message
    });
  }
};

// Update maintenance report status (owner only)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, estimatedCost, scheduledDate } = req.body;

    const report = await MaintenanceReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance report not found'
      });
    }

    // Check if user is the owner of the property
    if (report.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the property owner can update report status'
      });
    }

    const oldStatus = report.status;
    
    // Update report fields
    if (status) {
      report.status = status;
    }
    if (estimatedCost !== undefined) {
      report.estimatedCost = estimatedCost;
    }
    if (scheduledDate) {
      report.scheduledDate = new Date(scheduledDate);
    }

    // Add update message
    if (message) {
      const statusChange = status && status !== oldStatus ? {
        from: oldStatus,
        to: status
      } : null;

      await report.addUpdate(message, req.user.userId, statusChange);
    } else {
      await report.save();
    }

    const updatedReport = await MaintenanceReport.findById(id)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance report',
      error: error.message
    });
  }
};

// Resolve maintenance report (owner only)
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes, actualCost } = req.body;

    if (!resolutionNotes) {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes are required'
      });
    }

    const report = await MaintenanceReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance report not found'
      });
    }

    // Check if user is the owner of the property
    if (report.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the property owner can resolve reports'
      });
    }

    await report.resolve(req.user.userId, resolutionNotes, actualCost);

    const resolvedReport = await MaintenanceReport.findById(id)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Report resolved successfully',
      data: resolvedReport
    });

  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve maintenance report',
      error: error.message
    });
  }
};

// Add a comment/update to a maintenance report
const addReportUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Update message is required'
      });
    }

    const report = await MaintenanceReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance report not found'
      });
    }

    // Check if user has permission to update this report
    const userId = req.user.userId;
    if (report.reporterId.toString() !== userId && 
        report.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this report'
      });
    }

    await report.addUpdate(message, req.user.userId);

    const updatedReport = await MaintenanceReport.findById(id)
      .populate('reporterId', 'name email phone')
      .populate('propertyId', 'address unitNumber floorNumber')
      .populate('ownerId', 'name email phone')
      .populate('updates.updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Update added successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Error adding update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add update',
      error: error.message
    });
  }
};

// Get maintenance report statistics for owner dashboard
const getReportStats = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const stats = await MaintenanceReport.aggregate([
      { $match: { ownerId: require('mongoose').Types.ObjectId(ownerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await MaintenanceReport.aggregate([
      { $match: { ownerId: require('mongoose').Types.ObjectId(ownerId), status: { $ne: 'resolved' } } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const issueTypeStats = await MaintenanceReport.aggregate([
      { $match: { ownerId: require('mongoose').Types.ObjectId(ownerId) } },
      {
        $group: {
          _id: '$issueType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        priorityStats,
        issueTypeStats
      }
    });

  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report statistics',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  createMaintenanceReport,
  getTenantReports,
  getOwnerReports,
  getReportById,
  updateReportStatus,
  resolveReport,
  addReportUpdate,
  getReportStats
};