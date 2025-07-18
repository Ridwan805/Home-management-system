const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['Owner', 'Tenant', 'Service Provider', 'Security Guard'],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
