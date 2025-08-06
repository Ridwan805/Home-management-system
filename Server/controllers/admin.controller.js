// Server/controllers/admin.controller.js
const Admin = require('../models/Admin');
const Property = require('../models/Property');
const User = require('../models/User');
const Report = require('../models/Report');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, admin.hashedPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: 'admin', permissions: admin.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.email.split('@')[0], // Use part of email as name
        email: admin.email,
        role: 'admin',
        permissions: admin.permissions
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    // Use MongoDB aggregation for efficient counting
    const [totalUsers, activeProperties, pendingProperties, unresolvedReports] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments({ status: 'approved' }),
      Property.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: { $ne: 'resolved' } })
    ]);

    res.json({
      totalUsers,
      activeProperties,
      pendingProperties,
      unresolvedReports
    });
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
  }
};

// Get pending properties
exports.getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'pending' })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(properties);
  } catch (err) {
    console.error('Error fetching pending properties:', err);
    res.status(500).json({ message: 'Failed to fetch pending properties' });
  }
};

// Approve or reject property
exports.approveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'approved' or 'rejected'

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updateData = { status };
    
    // If rejecting, add the reason
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const property = await Property.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (err) {
    console.error('Error approving/rejecting property:', err);
    res.status(500).json({ message: 'Failed to update property status' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role isBanned createdAt')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Ban user
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned: true },
      { new: true }
    ).select('name email role isBanned');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error banning user:', err);
    res.status(500).json({ message: 'Failed to ban user' });
  }
};

// Unban user
exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned: false },
      { new: true }
    ).select('name email role isBanned');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error unbanning user:', err);
    res.status(500).json({ message: 'Failed to unban user' });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ message: 'Failed to delete property' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also delete all properties owned by this user
    await Property.deleteMany({ owner: id });
    
    // Also delete all reports made by or against this user
    await Report.deleteMany({ $or: [{ reportedBy: id }, { reportedUser: id }] });

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'name email')
      .populate('reportedUser', 'name email isBanned')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// Delete report
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ message: 'Failed to delete report' });
  }
};

// Escalate report to legal
exports.escalateReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndUpdate(
      id,
      { status: 'escalated' },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Log to legal_cases collection if it exists
    // This is a placeholder - you would need to create this model
    /*
    await LegalCase.create({
      report: id,
      reportedUser: report.reportedUser,
      description: report.description,
      status: 'pending',
      escalatedBy: req.admin.id,
      escalatedAt: new Date()
    });
    */

    res.json(report);
  } catch (err) {
    console.error('Error escalating report:', err);
    res.status(500).json({ message: 'Failed to escalate report' });
  }
};
