// Server/models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  permissions: {
    type: [String],
    default: ['manage_users', 'manage_properties', 'handle_reports', 'all_user_functions']
  },
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null }
});

module.exports = mongoose.model('Admin', adminSchema);
