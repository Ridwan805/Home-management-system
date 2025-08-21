const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: String, required: false },
  address: { type: String, required: true },
  propertyType: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  squareFootage: { type: Number, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  amenities: { type: [String], default: [] },
  images: { type: [String], default: [] },
  status: { type: String, default: 'Available' },
  yearBuilt: { type: Number },
  contactEmail: { type: String },
  contactPhone: { type: String },
  threeDModelUrl: { type: String, default: '' },
  listingType: { type: String, enum: ['For Sale', 'For Rent'], required: true },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  
  // Tenant assignment fields
  assignedTenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  assignmentType: { type: String, enum: ['Rent', 'Buy'] }
}, { 
  timestamps: true,
  collection: 'Properties'
});

module.exports = mongoose.model('Property', PropertySchema);