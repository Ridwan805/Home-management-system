const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { collection: 'Owner' });

module.exports = mongoose.model('Owner', ownerSchema);
