const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  ownerId: { type: String, required: true }, // Should reference User._id
  address: { type: String, required: true },
  propertyType: { type: String, required: true }, // e.g., House, Apartment, Condo, Villa
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true }, // Can be float for half-baths
  squareFootage: { type: Number, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  amenities: { type: [String], default: [] }, // e.g., ["Pool", "Garage"]
  images: { type: [String], default: [] }, // URLs for images
  status: { type: String, default: 'Available' }, // e.g., Available, Sold, Rented, Under Contract
  yearBuilt: { type: Number },
  contactEmail: { type: String },
  contactPhone: { type: String },
  threeDModelUrl: { type: String, default: '' },
  listingType: { type: String, enum: ['For Sale', 'For Rent'], required: true }, // New field for listing type
  city: { type: String }, // New field for city
  state: { type: String }, // New field for state
  zipCode: { type: String }, // New field for zip code
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema); 