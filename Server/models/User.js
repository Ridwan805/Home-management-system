const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },

  phoneNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  password: String,
  role: {
    type: String,
    enum: ['Owner', 'Tenant', 'Service Provider', 'Security Guard'],
    required: true
  },
  securityQuestion: { type: String, required: true },
  securityAnswer: { type: String, required: true },
<<<<<<< Updated upstream
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
=======
  experience: { type: String, default: '' }, // For Security Guards
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  
  // Account freezing functionality
  accountStatus: {
    type: String,
    enum: ['active', 'frozen', 'suspended', 'pending'],
    default: 'active'
  },
  isFrozen: { type: Boolean, default: false },
  frozenAt: { type: Date },
  frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  freezeReason: { type: String },
  freezeType: {
    type: String,
    enum: ['subscription_overdue', 'manual_admin', 'security_violation', 'other'],
    default: 'subscription_overdue'
  },
  canLogin: { type: Boolean, default: true },
  loginAttempts: { type: Number, default: 0 },
  lastLoginAttempt: { type: Date },
  
  // Subscription-related fields for property owners
  hasActiveSubscription: { type: Boolean, default: false },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'warning', 'overdue', 'frozen', 'cancelled'],
    default: 'active'
  },
  
  // Notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    subscriptionReminders: { type: Boolean, default: true },
    paymentConfirmations: { type: Boolean, default: true }
  },
  
  // Audit trail
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
>>>>>>> Stashed changes
}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ name: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ isFrozen: 1 });
userSchema.index({ subscriptionStatus: 1 });
userSchema.index({ hasActiveSubscription: 1 });

// Instance methods for account management
userSchema.methods.freezeAccount = function(reason, freezeType = 'manual_admin', frozenBy) {
  this.isFrozen = true;
  this.accountStatus = 'frozen';
  this.frozenAt = new Date();
  this.frozenBy = frozenBy;
  this.freezeReason = reason;
  this.freezeType = freezeType;
  this.canLogin = false;
  this.lastModifiedBy = frozenBy;
  
  return this.save();
};

userSchema.methods.unfreezeAccount = function(unfrozenBy) {
  this.isFrozen = false;
  this.accountStatus = 'active';
  this.frozenAt = null;
  this.frozenBy = null;
  this.freezeReason = null;
  this.freezeType = null;
  this.canLogin = true;
  this.loginAttempts = 0;
  this.lastModifiedBy = unfrozenBy;
  
  return this.save();
};

userSchema.methods.canUserLogin = function() {
  if (this.isDeleted) return { canLogin: false, reason: 'Account has been deleted' };
  if (this.isFrozen) return { canLogin: false, reason: this.freezeReason || 'Account is frozen' };
  if (!this.canLogin) return { canLogin: false, reason: 'Login is disabled for this account' };
  if (this.accountStatus === 'suspended') return { canLogin: false, reason: 'Account is suspended' };
  
  return { canLogin: true };
};

userSchema.methods.recordLoginAttempt = function() {
  this.loginAttempts += 1;
  this.lastLoginAttempt = new Date();
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lastLoginAttempt = null;
  return this.save();
};

// Static methods
userSchema.statics.findFrozenUsers = function() {
  return this.find({ isFrozen: true, isDeleted: false });
};

userSchema.statics.findOwners = function() {
  return this.find({ role: 'Owner', isDeleted: false });
};

userSchema.statics.findOwnersWithSubscriptionIssues = function() {
  return this.find({
    role: 'Owner',
    subscriptionStatus: { $in: ['warning', 'overdue', 'frozen'] },
    isDeleted: false
  });
};

module.exports = mongoose.model('User', userSchema);
