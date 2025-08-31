// Server/controllers/admin.controller.js
const Admin = require('../models/Admin');
const Property = require('../models/Property');
const User = require('../models/User');
const Report = require('../models/Report');
<<<<<<< Updated upstream
=======
const Request = require('../models/Request');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
>>>>>>> Stashed changes
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

// Freeze user account
exports.freezeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent freezing admin accounts
    if (user.role === 'Admin') {
      return res.status(403).json({ message: 'Cannot freeze admin accounts' });
    }

    // Check if user has pending payments - only allow freezing if payments are pending
    const pendingPayments = await Payment.find({
      payerId: userId,
      status: 'pending',
      isDeleted: false
    });

    if (pendingPayments.length === 0) {
      return res.status(400).json({ 
        message: 'Cannot freeze user account. User has no pending payments. Accounts can only be frozen when payments are pending.',
        pendingPaymentsCount: 0
      });
    }

    // Update frozen status
    user.frozen = true;
    await user.save();

    res.json({ 
      message: `User ${user.firstName} ${user.lastName} has been frozen successfully due to ${pendingPayments.length} pending payment(s)`,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        frozen: user.frozen
      },
      pendingPaymentsCount: pendingPayments.length
    });
  } catch (err) {
    console.error('Error freezing user:', err);
    res.status(500).json({ message: 'Server error while freezing user' });
  }
};

// Unfreeze user account
exports.unfreezeUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update frozen status
    user.frozen = false;
    await user.save();

    res.json({ 
      message: `User ${user.firstName} ${user.lastName} has been unfrozen successfully`,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        frozen: user.frozen
      }
    });
  } catch (err) {
    console.error('Error unfreezing user:', err);
    res.status(500).json({ message: 'Server error while unfreezing user' });
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

    // Calculate total properties (approved + pending + rejected)
    const totalProperties = await Property.countDocuments();
    
    // For now, we'll use unresolvedReports as totalBookings since we don't have a Booking model
    // This should be updated when a Booking model is implemented
    const totalBookings = unresolvedReports;

    res.json({
      totalUsers,
      totalProperties,
      pendingProperties,
      totalBookings
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
      .sort({ createdAt: -1 });
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
<<<<<<< Updated upstream
=======

// Delete request (Admin only)
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the request with property information
    const request = await Request.findById(id).populate('propertyId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Store property reference before deletion
    const property = request.propertyId;
    const requestStatus = request.status;
    const adminId = req.user?.userId || req.admin?.id;

    // Delete the request from database
    await Request.findByIdAndDelete(id);

    // Reset property status to 'Available' if it was reserved for this request
    if (property && property.status === 'Reserved') {
      try {
        // Check if there are any other active requests for this property
        const otherActiveRequests = await Request.find({
          propertyId: property._id,
          status: { $nin: ['Rejected', 'Canceled', 'Expired', 'Paid/Completed'] }
        });

        // If no other active requests, make property available
        if (otherActiveRequests.length === 0) {
          await property.makeAvailable(adminId, 'Request deleted by admin - property made available again');
          console.log(`Property ${property._id} status reset to Available after request deletion`);
        }
      } catch (error) {
        console.error('Error resetting property status after request deletion:', error);
        // Continue with deletion even if property status update fails
      }
    }

    res.json({ 
      message: 'Request deleted successfully',
      propertyStatusReset: property?.status === 'Reserved'
    });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ message: 'Failed to delete request' });
  }
};

// Get all requests (Admin only)
exports.getAllRequests = async (req, res) => {
  try {
    const { status, requestType, page = 1, limit = 20 } = req.query;
    
    // Build filter
    let filter = {};
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const skip = (page - 1) * limit;

    const requests = await Request.find(filter)
      .populate('propertyId', 'address city state rent buyPrice images status')
      .populate('tenantId', 'firstName lastName email phoneNumber')
      .populate('ownerId', 'firstName lastName email phoneNumber')
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
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Manual property cleanup endpoint for admins
exports.cleanupOrphanedProperties = async (req, res) => {
  try {
    const PropertyCleanupService = require('../services/propertyCleanupService');
    
    console.log('🧹 Admin triggered property cleanup...');
    const result = await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: req.user?.id || 'admin-manual',
      source: 'admin-endpoint'
    });
    
    res.status(200).json({
      success: true,
      message: 'Property cleanup completed successfully',
      data: {
        propertiesChecked: result.propertiesChecked,
        propertiesReset: result.propertiesReset,
        resetProperties: result.resetProperties
      }
    });
  } catch (error) {
    console.error('Error during property cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup orphaned properties',
      error: error.message
    });
  }
};

// Create monthly subscription invoices for all owners
exports.createMonthlyInvoices = async (req, res) => {
  try {
    const { amount = 1200 } = req.body; // Default subscription amount
    
    // Get all active owners
    const owners = await User.find({ 
      role: 'Owner', 
      isBanned: { $ne: true },
      frozen: { $ne: true }
    });

    if (owners.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active owners found' 
      });
    }

    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

    const invoices = [];
    const payments = [];

    // Create invoices and payment records for each owner
    for (const owner of owners) {
      // Create invoice with required fields
      const invoice = new Invoice({
        billTo: owner._id,
        billFrom: owner._id, // For subscription, owner pays to themselves (system)
        // propertyId is optional for subscription invoices
        amount: amount,
        description: `Monthly Subscription - ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        dueDate: dueDate,
        status: 'open',
        lineItems: [{
          type: 'fee',
          description: 'Monthly Subscription Fee',
          quantity: 1,
          unitPrice: amount,
          amount: amount,
          taxable: false
        }],
        subtotal: amount,
        total: amount,
        balance: amount,
        currency: 'BDT',
        auto: {
          generated: true,
          source: 'system',
          generatedAt: new Date()
        },
        metadata: {
          subscriptionPeriod: {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
          },
          createdBy: 'admin',
          isGlobalInvoice: true,
          subscriptionPayment: true
        }
      });

      const savedInvoice = await invoice.save();
      invoices.push(savedInvoice);

      // Create corresponding payment record
      const payment = new Payment({
        payerId: owner._id,
        type: 'other', // Using 'other' as subscription is not in the enum
        method: 'stripe', // Default payment method
        amount: amount,
        description: `Monthly Subscription Payment - ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        status: 'pending',
        dueDate: dueDate,
        invoiceId: savedInvoice._id,
        currency: 'BDT',
        billingPeriod: {
          startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
          endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
          isRecurring: true,
          recurringFrequency: 'monthly'
        },
        metadata: {
          subscriptionPayment: true,
          subscriptionPeriod: {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
          },
          paymentType: 'subscription'
        },
        tags: ['subscription', 'monthly']
      });

      const savedPayment = await payment.save();
      payments.push(savedPayment);
    }

    res.json({
      success: true,
      message: `Successfully created ${invoices.length} monthly invoices`,
      data: {
        invoicesCreated: invoices.length,
        totalAmount: invoices.length * amount,
        dueDate: dueDate,
        period: {
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        }
      }
    });

  } catch (error) {
    console.error('Error creating monthly invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create monthly invoices',
      error: error.message
    });
  }
};

// Get subscription payment statistics
exports.getSubscriptionStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get all subscription payments for current month
    const subscriptionPayments = await Payment.find({
      'metadata.subscriptionPayment': true,
      'metadata.subscriptionPeriod.month': currentMonth,
      'metadata.subscriptionPeriod.year': currentYear
    }).populate('payerId', 'name email');

    // Calculate statistics
    const totalOwners = subscriptionPayments.length;
    const pendingPayments = subscriptionPayments.filter(p => p.status === 'pending').length;
    const completedPayments = subscriptionPayments.filter(p => p.status === 'completed').length;
    const totalRevenue = subscriptionPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        totalOwners,
        pendingPayments,
        completedPayments,
        totalRevenue,
        payments: subscriptionPayments
      }
    });

  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
      error: error.message
    });
  }
};

module.exports = {
  adminLogin: exports.adminLogin,
  getDashboardMetrics: exports.getDashboardMetrics,
  getPendingProperties: exports.getPendingProperties,
  approveProperty: exports.approveProperty,
  getAllUsers: exports.getAllUsers,
  banUser: exports.banUser,
  unbanUser: exports.unbanUser,
  deleteProperty: exports.deleteProperty,
  deleteUser: exports.deleteUser,
  getAllReports: exports.getAllReports,
  deleteReport: exports.deleteReport,
  escalateReport: exports.escalateReport,
  deleteRequest: exports.deleteRequest,
  getAllRequests: exports.getAllRequests,
  cleanupOrphanedProperties: exports.cleanupOrphanedProperties,
  freezeUser: exports.freezeUser,
  unfreezeUser: exports.unfreezeUser,
  createMonthlyInvoices: exports.createMonthlyInvoices,
  getSubscriptionStats: exports.getSubscriptionStats
};
>>>>>>> Stashed changes
