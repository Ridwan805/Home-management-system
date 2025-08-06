// Server/models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedType: { type: String, enum: ['property', 'user'], required: true },
  reportedId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['spam', 'fraud', 'inappropriate'], required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
