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
  securityAnswer: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
