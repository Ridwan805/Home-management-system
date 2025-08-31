const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const mongoose = require('mongoose');

// Create subscription for a property owner
const createSubscription = async (req, res) => {
  try {
    const { ownerId, monthlyFee, paymentDeadline, gracePeriodDays } = req.body;
    
    // Verify the user is an owner
    const owner = await User.findById(ownerId);
    if (!owner || owner.role !== 'Owner') {
      return res.status(400).json({ message: 'User must be a property owner' });
    }
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ ownerId });
    if (existingSubscription) {
      return res.status(400).json({ message: 'Subscription already exists for this owner' });
    }
    
    // Get owner's properties
    const properties = await Property.find({ ownerId, isDeleted: false });
    
    // Calculate current billing period
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueDate = new Date(now.getFullYear(), now.getMonth(), paymentDeadline || 5);
    
    // If due date has passed this month, set it for next month
    if (dueDate < now) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    const subscription = new Subscription({
      ownerId,
      currentBillingPeriod: {
        startDate: currentStart,
        endDate: currentEnd,
        amount: monthlyFee || 500,
        dueDate: dueDate,
        isPaid: false
      },
      propertyCount: properties.length,
      properties: properties.map(p => p._id),
      config: {
        monthlyFee: monthlyFee || 500,
        paymentDeadline: paymentDeadline || 5,
        gracePeriodDays: gracePeriodDays || 7
      },
      createdBy: req.user.userId
    });
    
    await subscription.save();
    
    // Update user subscription fields
    await User.findByIdAndUpdate(ownerId, {
      hasActiveSubscription: true,
      subscriptionId: subscription._id,
      subscriptionStatus: 'active'
    });
    
    // Generate next billing period
    await subscription.generateNextBillingPeriod();
    
    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error creating subscription: ' + error.message });
  }
};

// Get subscription details
const getSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await Subscription.findById(subscriptionId)
      .populate('ownerId', 'firstName lastName email name role')
      .populate('properties', 'title address')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Check authorization - admin or owner can view
    if (req.user.role !== 'Admin' && req.user.userId !== subscription.ownerId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json({ subscription });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription: ' + error.message });
  }
};

// Get subscription by owner ID
const getSubscriptionByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    // Check authorization
    if (req.user.role !== 'Admin' && req.user.userId !== ownerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const subscription = await Subscription.findOne({ ownerId })
      .populate('ownerId', 'firstName lastName email name role')
      .populate('properties', 'title address')
      .populate('paymentHistory.paymentId');
    
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found for this owner' });
    }
    
    res.status(200).json({ subscription });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription: ' + error.message });
  }
};

// Get current user's subscription
const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ ownerId: req.user.userId })
      .populate('properties', 'title address')
      .populate('paymentHistory.paymentId');
    
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found' });
    }
    
    res.status(200).json({ subscription });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription: ' + error.message });
  }
};

// Get all subscriptions (admin only)
const getAllSubscriptions = async (req, res) => {
  try {
    const { status, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = { isDeleted: false };
    if (status) {
      filter.status = status;
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let query = Subscription.find(filter)
      .populate('ownerId', 'firstName lastName email name role')
      .populate('properties', 'title address')
      .sort(sort);
    
    // Apply pagination only if page and limit are provided
    if (page && limit) {
      query = query.limit(limit * 1).skip((page - 1) * limit);
      
      const subscriptions = await query;
      const total = await Subscription.countDocuments(filter);
      
      res.status(200).json({
        subscriptions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } else {
      // Return all subscriptions without pagination
      const subscriptions = await query;
      
      res.status(200).json({
        subscriptions
      });
    }
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions: ' + error.message });
  }
};

// Process subscription payment
const processPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paymentMethod, transactionId, amount, receiptUrl } = req.body;
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Check authorization
    if (req.user.role !== 'Admin' && req.user.userId !== subscription.ownerId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if already paid
    if (subscription.currentBillingPeriod.isPaid) {
      return res.status(400).json({ message: 'Current billing period is already paid' });
    }
    
    // Calculate late fee if applicable
    const lateFee = subscription.calculateLateFee();
    const totalAmount = subscription.currentBillingPeriod.amount + lateFee;
    
    // Validate payment amount
    if (amount && amount < totalAmount) {
      return res.status(400).json({ 
        message: 'Payment amount is insufficient',
        required: totalAmount,
        provided: amount
      });
    }
    
    // Create payment record
    const payment = new Payment({
      type: 'monthly_rent', // Using existing payment type
      status: 'completed',
      method: paymentMethod || 'stripe',
      amount: totalAmount,
      currency: subscription.currentBillingPeriod.currency,
      payerId: subscription.ownerId,
      description: `Monthly subscription payment for ${new Date(subscription.currentBillingPeriod.startDate).toLocaleDateString()} - ${new Date(subscription.currentBillingPeriod.endDate).toLocaleDateString()}`,
      metadata: {
        subscriptionId: subscription._id,
        billingPeriod: subscription.currentBillingPeriod,
        lateFee: lateFee
      },
      paidAt: new Date()
    });
    
    if (transactionId) {
      payment.externalRef = transactionId;
    }
    
    if (receiptUrl) {
      payment.receiptData = {
        receiptUrl: receiptUrl,
        amount: totalAmount,
        currency: subscription.currentBillingPeriod.currency,
        paymentDate: new Date(),
        paymentMethod: paymentMethod
      };
    }
    
    await payment.save();
    
    // Mark subscription as paid
    subscription.currentBillingPeriod.lateFee = lateFee;
    await subscription.markAsPaid(payment._id, new Date(), paymentMethod);
    
    // Update user subscription status
    await User.findByIdAndUpdate(subscription.ownerId, {
      subscriptionStatus: 'active',
      lastModifiedBy: req.user.userId
    });
    
    // If account was frozen due to subscription, unfreeze it
    const user = await User.findById(subscription.ownerId);
    if (user.isFrozen && user.freezeType === 'subscription_overdue') {
      await user.unfreezeAccount(req.user.userId);
    }
    
    res.status(200).json({
      message: 'Payment processed successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        lateFee: lateFee,
        paidAt: payment.paidAt
      },
      subscription: {
        status: subscription.status,
        currentBillingPeriod: subscription.currentBillingPeriod
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment: ' + error.message });
  }
};

// Update subscription configuration
const updateSubscriptionConfig = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { monthlyFee, paymentDeadline, gracePeriodDays, lateFeePercentage } = req.body;
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Only admin can update config
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Update configuration
    if (monthlyFee !== undefined) subscription.config.monthlyFee = monthlyFee;
    if (paymentDeadline !== undefined) subscription.config.paymentDeadline = paymentDeadline;
    if (gracePeriodDays !== undefined) subscription.config.gracePeriodDays = gracePeriodDays;
    if (lateFeePercentage !== undefined) subscription.config.lateFeePercentage = lateFeePercentage;
    
    subscription.lastModifiedBy = req.user.userId;
    await subscription.save();
    
    res.status(200).json({
      message: 'Subscription configuration updated successfully',
      config: subscription.config
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error updating subscription: ' + error.message });
  }
};

// Freeze subscription (admin only)
const freezeSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Freeze reason is required' });
    }
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Only admin can freeze
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (subscription.isFrozen) {
      return res.status(400).json({ message: 'Subscription is already frozen' });
    }
    
    // Freeze subscription
    await subscription.freezeAccount(reason, req.user.userId, notes);
    
    // Freeze user account
    const user = await User.findById(subscription.ownerId);
    await user.freezeAccount(reason, 'manual_admin', req.user.userId);
    
    // Update user subscription status
    await User.findByIdAndUpdate(subscription.ownerId, {
      subscriptionStatus: 'frozen',
      lastModifiedBy: req.user.userId
    });
    
    res.status(200).json({
      message: 'Subscription and account frozen successfully',
      subscription: {
        status: subscription.status,
        isFrozen: subscription.isFrozen,
        frozenAt: subscription.frozenAt,
        freezeReason: subscription.freezeReason
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error freezing subscription: ' + error.message });
  }
};

// Unfreeze subscription (admin only)
const unfreezeSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Unfreeze reason is required' });
    }
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Only admin can unfreeze
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!subscription.isFrozen) {
      return res.status(400).json({ message: 'Subscription is not frozen' });
    }
    
    // Unfreeze subscription
    await subscription.unfreezeAccount(reason, req.user.userId, notes);
    
    // Unfreeze user account
    const user = await User.findById(subscription.ownerId);
    await user.unfreezeAccount(req.user.userId);
    
    // Update user subscription status based on payment status
    let newStatus = 'active';
    if (!subscription.currentBillingPeriod.isPaid) {
      const daysOverdue = subscription.daysOverdue;
      if (daysOverdue > subscription.config.gracePeriodDays) {
        newStatus = 'overdue';
      } else if (daysOverdue > 0) {
        newStatus = 'warning';
      }
    }
    
    await User.findByIdAndUpdate(subscription.ownerId, {
      subscriptionStatus: newStatus,
      lastModifiedBy: req.user.userId
    });
    
    res.status(200).json({
      message: 'Subscription and account unfrozen successfully',
      subscription: {
        status: subscription.status,
        isFrozen: subscription.isFrozen
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error unfreezing subscription: ' + error.message });
  }
};

// Get subscription statistics (admin only)
const getSubscriptionStats = async (req, res) => {
  try {
    const statusBreakdown = await Subscription.getSubscriptionStats();
    
    // Get overdue subscriptions count
    const overdueSubscriptions = await Subscription.findOverdueSubscriptions();
    
    // Get subscriptions needing reminders
    const needingReminders = {
      fourteenDays: await Subscription.findSubscriptionsForReminder('14_days'),
      sevenDays: await Subscription.findSubscriptionsForReminder('7_days'),
      oneDay: await Subscription.findSubscriptionsForReminder('1_day')
    };
    
    const totalSubscriptions = await Subscription.countDocuments({ isDeleted: false });
    
    // Format stats for frontend
    const stats = {
      total: totalSubscriptions,
      active: statusBreakdown.active || 0,
      warning: statusBreakdown.warning || 0,
      overdue: statusBreakdown.overdue || 0,
      frozen: statusBreakdown.frozen || 0,
      cancelled: statusBreakdown.cancelled || 0
    };
    
    res.status(200).json({
      stats,
      statusBreakdown,
      overdueCount: overdueSubscriptions.length,
      remindersNeeded: {
        fourteenDays: needingReminders.fourteenDays.length,
        sevenDays: needingReminders.sevenDays.length,
        oneDay: needingReminders.oneDay.length
      },
      totalSubscriptions
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics: ' + error.message });
  }
};

// Get payment history for a subscription
const getPaymentHistory = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Check authorization
    if (req.user.role !== 'Admin' && req.user.userId !== subscription.ownerId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get payment history with pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const paymentHistory = subscription.paymentHistory
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(startIndex, endIndex);
    
    const total = subscription.paymentHistory.length;
    
    res.status(200).json({
      paymentHistory,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      summary: {
        totalPaid: subscription.totalPaid,
        totalOutstanding: subscription.totalOutstanding,
        lastPaymentDate: subscription.lastPaymentDate
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment history: ' + error.message });
  }
};

// Get global subscription configuration (admin only)
const getGlobalConfig = async (req, res) => {
  try {
    // Only admin can access global config
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Get a sample subscription to extract default config
    const sampleSubscription = await Subscription.findOne({ isDeleted: false });
    
    // Default configuration if no subscriptions exist
    const defaultConfig = {
      monthlyFee: 500,
      currency: 'BDT',
      paymentDeadline: 5,
      gracePeriodDays: 7,
      lateFeePercentage: 5,
      autoFreezeAfterDays: 15,
      reminderSchedule: {
        fourteenDays: true,
        sevenDays: true,
        oneDay: true,
        overdue: true,
        finalWarning: true
      }
    };
    
    const config = sampleSubscription ? sampleSubscription.config : defaultConfig;
    
    res.status(200).json({
      config,
      message: 'Global configuration retrieved successfully'
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching global config: ' + error.message });
  }
};

// Update global subscription configuration (admin only)
const updateGlobalConfig = async (req, res) => {
  try {
    const {
      monthlyFee,
      paymentDeadline,
      gracePeriodDays,
      lateFeePercentage,
      autoFreezeAfterDays,
      reminderSchedule
    } = req.body;
    
    // Only admin can update global config
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Validate input
    if (paymentDeadline && (paymentDeadline < 1 || paymentDeadline > 31)) {
      return res.status(400).json({ message: 'Payment deadline must be between 1 and 31' });
    }
    
    if (gracePeriodDays && gracePeriodDays < 0) {
      return res.status(400).json({ message: 'Grace period days cannot be negative' });
    }
    
    if (lateFeePercentage && (lateFeePercentage < 0 || lateFeePercentage > 100)) {
      return res.status(400).json({ message: 'Late fee percentage must be between 0 and 100' });
    }
    
    // Build update object
    const updateFields = {};
    if (monthlyFee !== undefined) updateFields['config.monthlyFee'] = monthlyFee;
    if (paymentDeadline !== undefined) updateFields['config.paymentDeadline'] = paymentDeadline;
    if (gracePeriodDays !== undefined) updateFields['config.gracePeriodDays'] = gracePeriodDays;
    if (lateFeePercentage !== undefined) updateFields['config.lateFeePercentage'] = lateFeePercentage;
    if (autoFreezeAfterDays !== undefined) updateFields['config.autoFreezeAfterDays'] = autoFreezeAfterDays;
    
    if (reminderSchedule) {
      if (reminderSchedule.fourteenDays !== undefined) updateFields['config.reminderSchedule.fourteenDays'] = reminderSchedule.fourteenDays;
      if (reminderSchedule.sevenDays !== undefined) updateFields['config.reminderSchedule.sevenDays'] = reminderSchedule.sevenDays;
      if (reminderSchedule.oneDay !== undefined) updateFields['config.reminderSchedule.oneDay'] = reminderSchedule.oneDay;
      if (reminderSchedule.overdue !== undefined) updateFields['config.reminderSchedule.overdue'] = reminderSchedule.overdue;
      if (reminderSchedule.finalWarning !== undefined) updateFields['config.reminderSchedule.finalWarning'] = reminderSchedule.finalWarning;
    }
    
    updateFields.lastModifiedBy = req.user.userId;
    
    // Update all active subscriptions with new configuration
    const result = await Subscription.updateMany(
      { isDeleted: false },
      { $set: updateFields }
    );
    
    // Get updated configuration
    const updatedSubscription = await Subscription.findOne({ isDeleted: false });
    
    res.status(200).json({
      message: `Global configuration updated successfully. ${result.modifiedCount} subscriptions updated.`,
      config: updatedSubscription.config,
      updatedCount: result.modifiedCount
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error updating global config: ' + error.message });
  }
};

module.exports = {
  createSubscription,
  getSubscription,
  getSubscriptionByOwner,
  getMySubscription,
  getAllSubscriptions,
  processPayment,
  updateSubscriptionConfig,
  freezeSubscription,
  unfreezeSubscription,
  getSubscriptionStats,
  getPaymentHistory,
  getGlobalConfig,
  updateGlobalConfig
};