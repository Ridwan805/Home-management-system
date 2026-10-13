const mongoose = require('mongoose');

// Define valid property statuses
const PROPERTY_STATUSES = ['pending', 'Available', 'Reserved', 'Rented', 'Sold', 'Unavailable', 'rejected'];

// Define valid property types
const PROPERTY_TYPES = [
  'apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 
  'studio', 'duplex', 'penthouse', 'retail', 'office', 'land', 'other'
];

// Define listing types
const LISTING_TYPES = ['For Rent', 'For Sale'];

// Define furnishing options
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

// Define facing directions
const FACING_DIRECTIONS = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest'];

const PropertySchema = new mongoose.Schema({
  // Legacy owner field (kept for backward compatibility)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: String, required: false },
  
  // New canonical ownership field
  ownerUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: function() { return this.owner; }
  },
  
  // Current rent relationship
  currentRentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Rent' 
  },
  
  // Building relationship (null for standalone properties)
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    default: null
  },
  
  // Property type with comprehensive enum
  propertyType: {
    type: String,
    enum: PROPERTY_TYPES,
    required: true
  },
  
  // Floor and unit identification (for building properties)
  floorNumber: {
    type: Number,
    min: -5, // Allow basement floors
    max: 200,
    default: null
  },
  
  unitNumber: {
    type: String,
    trim: true,
    default: null
  },
  
  // Address (for standalone) or unit identifier (for building units)
  address: { 
    type: String, 
    required: function() {
      return !this.buildingId; // Required only for standalone properties
    }
  },
  
  // Property specifications
  specifications: {
    bedrooms: { 
      type: Number, 
      min: 0,
      required: function() {
        return ['apartment_unit', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'].includes(this.propertyType);
      }
    },
    bathrooms: { 
      type: Number, 
      min: 0,
      required: function() {
        return ['apartment_unit', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'].includes(this.propertyType);
      }
    },
    squareFootage: { 
      type: Number, 
      min: 1,
      required: true 
    },
    balcony: {
      hasBalcony: { type: Boolean, default: false },
      balconySize: { type: Number, min: 0 }, // in sq ft
      balconyType: { type: String, enum: ['Open', 'Covered', 'Enclosed'] }
    },
    facing: {
      type: String,
      enum: FACING_DIRECTIONS
    },
    furnishing: {
      type: String,
      enum: FURNISHING_OPTIONS,
      default: 'Unfurnished'
    },
    appliances: {
      airConditioning: { type: Boolean, default: false },
      heating: { type: Boolean, default: false },
      refrigerator: { type: Boolean, default: false },
      washingMachine: { type: Boolean, default: false },
      dishwasher: { type: Boolean, default: false },
      microwave: { type: Boolean, default: false },
      oven: { type: Boolean, default: false },
      other: [String]
    },
    parkingSpots: {
      type: Number,
      min: 0,
      default: 0
    },
    storage: {
      hasStorage: { type: Boolean, default: false },
      storageSize: { type: Number, min: 0 }, // in sq ft
      storageLocation: String // e.g., 'Basement', 'Attic', 'Garage'
    }
  },
  
  // Legacy fields (kept for backward compatibility)
  bedrooms: { 
    type: Number, 
    get: function() { return this.specifications?.bedrooms; },
    set: function(value) { 
      if (!this.specifications) this.specifications = {};
      this.specifications.bedrooms = value;
    }
  },
  bathrooms: { 
    type: Number,
    get: function() { return this.specifications?.bathrooms; },
    set: function(value) { 
      if (!this.specifications) this.specifications = {};
      this.specifications.bathrooms = value;
    }
  },
  squareFootage: { 
    type: Number,
    get: function() { return this.specifications?.squareFootage; },
    set: function(value) { 
      if (!this.specifications) this.specifications = {};
      this.specifications.squareFootage = value;
    }
  },
  
  // Pricing information
  pricing: {
    rent: {
      type: Number,
      min: 0,
      required: function() { return this.listingType === 'For Rent'; }
    },
    sale: {
      type: Number,
      min: 0,
      required: function() { return this.listingType === 'For Sale'; }
    },
    deposit: {
      type: Number,
      min: 0,
      default: 0
    },
    utilities: {
      included: { type: Boolean, default: false },
      estimatedCost: { type: Number, min: 0 }
    }
  },
  
  // Note: price field is now a virtual field, defined after schema
  
  // Property description and features
  description: { type: String, maxlength: 2000 },
  amenities: { type: [String], default: [] },
  
  // Media
  media: {
    images: [{
      url: { type: String, required: true },
      caption: String,
      isPrimary: { type: Boolean, default: false },
      order: { type: Number, default: 0 }
    }],
    virtualTour: {
      url: String,
      provider: String
    },
    floorPlan: {
      url: String,
      description: String
    }
  },
  

  
  // Enhanced status with proper enum
  status: { 
    type: String, 
    enum: PROPERTY_STATUSES, 
    default: 'Available',
    required: true
  },
  
  // Listing information
  listingType: { 
    type: String, 
    enum: LISTING_TYPES, 
    required: true 
  },
  
  // Location details (for standalone properties or additional info)
  location: {
    latitude: { 
      type: Number, 
      min: [-90, 'Latitude must be between -90 and 90'], 
      max: [90, 'Latitude must be between -90 and 90'] 
    },
    longitude: { 
      type: Number, 
      min: [-180, 'Longitude must be between -180 and 180'], 
      max: [180, 'Longitude must be between -180 and 180'] 
    },
    address: { type: String, trim: true },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'Bangladesh' },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    neighborhood: String,
    location_link: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty values
          return /^https?:\/\/(www\.)?(openstreetmap\.org|osm\.org)/.test(v);
        },
        message: 'Location link must be a valid OpenStreetMap URL'
      }
    }
  },
  
  // Legacy location fields (kept for backward compatibility)
  city: { 
    type: String,
    get: function() { return this.location?.city; },
    set: function(value) {
      if (!this.location) this.location = {};
      this.location.city = value;
    }
  },
  state: { 
    type: String,
    get: function() { return this.location?.state; },
    set: function(value) {
      if (!this.location) this.location = {};
      this.location.state = value;
    }
  },
  zipCode: { 
    type: String,
    get: function() { return this.location?.zipCode; },
    set: function(value) {
      if (!this.location) this.location = {};
      this.location.zipCode = value;
    }
  },
  
  // Additional property metadata
  yearBuilt: { type: Number, min: 1800, max: new Date().getFullYear() + 5 },
  
  // Contact information
  contactInfo: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    preferredContactMethod: { type: String, enum: ['phone', 'email', 'both'], default: 'both' }
  },
  
  // Legacy contact fields (kept for backward compatibility)
  contactEmail: { 
    type: String,
    get: function() { return this.contactInfo?.email; },
    set: function(value) {
      if (!this.contactInfo) this.contactInfo = {};
      this.contactInfo.email = value;
    }
  },
  contactPhone: { 
    type: String,
    get: function() { return this.contactInfo?.phone; },
    set: function(value) {
      if (!this.contactInfo) this.contactInfo = {};
      this.contactInfo.phone = value;
    }
  },
  
  // 3D Model and virtual tour
  threeDModelUrl: { type: String, default: '' },
  
  // Availability and scheduling
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableFrom: Date,
    availableUntil: Date,
    showingSchedule: {
      allowedDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
      timeSlots: [{
        start: String, // e.g., '09:00'
        end: String    // e.g., '17:00'
      }]
    }
  },
  
  // Property management
  management: {
    propertyManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maintenanceContact: {
      name: String,
      phone: String,
      email: String
    },
    lastInspection: Date,
    nextInspection: Date
  },
  
  // Legacy tenant assignment fields (kept for backward compatibility)
  assignedTenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  assignmentType: { type: String, enum: ['Rent', 'Buy'] },
  
  // State machine fields
  state: { 
    type: String, 
    enum: PROPERTY_STATUSES,
    default: 'Available',
    get: function() { return this.status; },
    set: function(value) { this.status = value; }
  },
  stateHistory: [{
    state: { type: String, enum: PROPERTY_STATUSES },
    timestamp: { type: Date, default: Date.now },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Legacy state tracking fields (kept for backward compatibility)
  reservedAt: { type: Date },
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: { type: Date },
  rentedAt: { type: Date },
  unavailableReason: { type: String },
  unavailableUntil: { type: Date },
  
  // Validation and constraints
  constraints: {
    petPolicy: {
      allowed: { type: Boolean, default: false },
      deposit: { type: Number, min: 0 },
      restrictions: [String] // e.g., ['No large dogs', 'Cats only']
    },
    smokingPolicy: {
      allowed: { type: Boolean, default: false },
      areas: [String] // e.g., ['Balcony only', 'Designated areas']
    },
    occupancyLimit: {
      maxOccupants: { type: Number, min: 1 },
      maxVehicles: { type: Number, min: 0 }
    }
  }
}, { 
  timestamps: true,
  collection: 'Properties'
});

// Indexes for better query performance
PropertySchema.index({ status: 1 });
PropertySchema.index({ ownerUserId: 1 });
PropertySchema.index({ buildingId: 1 });
PropertySchema.index({ currentRentId: 1 });
PropertySchema.index({ listingType: 1, status: 1 });
PropertySchema.index({ 'location.city': 1, 'location.state': 1 });
PropertySchema.index({ 'pricing.rent': 1 });
PropertySchema.index({ 'pricing.sale': 1 });
PropertySchema.index({ 'specifications.bedrooms': 1, 'specifications.bathrooms': 1 });
PropertySchema.index({ propertyType: 1, status: 1 });
PropertySchema.index({ state: 1 });
PropertySchema.index({ buildingId: 1, floorNumber: 1 });
// Compound index for building-unit uniqueness, but only when both fields are not null
PropertySchema.index(
  { buildingId: 1, unitNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      buildingId: { $ne: null }, 
      unitNumber: { $ne: null, $ne: "" } 
    } 
  }
);
PropertySchema.index({ 'location.coordinates': '2dsphere' });

// Legacy indexes (kept for backward compatibility)
PropertySchema.index({ city: 1, status: 1 });
PropertySchema.index({ price: 1, status: 1 });

// Pre-save middleware to sync legacy and new fields
PropertySchema.pre('save', function(next) {
  // Sync ownerUserId with owner if not set
  if (!this.ownerUserId && this.owner) {
    this.ownerUserId = this.owner;
  }
  
  // Sync owner with ownerUserId if ownerUserId changed
  if (this.isModified('ownerUserId') && this.ownerUserId) {
    this.owner = this.ownerUserId;
  }
  
  // Sync state and status
  if (this.state && this.state !== this.status) {
    this.status = this.state;
  }
  if (this.status && this.status !== this.state) {
    this.state = this.status;
  }
  
  // Sync legacy specification fields
  if (this.specifications) {
    if (this.specifications.bedrooms !== undefined) {
      this.bedrooms = this.specifications.bedrooms;
    }
    if (this.specifications.bathrooms !== undefined) {
      this.bathrooms = this.specifications.bathrooms;
    }
    if (this.specifications.squareFootage !== undefined) {
      this.squareFootage = this.specifications.squareFootage;
    }
  }
  
  // Sync legacy location fields
  if (this.location) {
    if (this.location.city) this.city = this.location.city;
    // Skip syncing location.state to avoid conflict with property status state
    if (this.location.zipCode) this.zipCode = this.location.zipCode;
  }
  
  // Sync legacy contact fields
  if (this.contactInfo) {
    if (this.contactInfo.email) this.contactEmail = this.contactInfo.email;
    if (this.contactInfo.phone) this.contactPhone = this.contactInfo.phone;
  }
  
  // Note: images and price fields are now virtual fields, no sync needed
  
  // Validate building-unit constraints
  if (this.buildingId && this.propertyType === 'apartment_unit' && !this.unitNumber) {
    return next(new Error('Unit number is required for apartment units in buildings'));
  }
  
  if (this.buildingId && ['floor', 'apartment_unit'].includes(this.propertyType) && this.floorNumber === null) {
    return next(new Error('Floor number is required for floor and unit properties in buildings'));
  }
  
  // Validate standalone property constraints
  if (!this.buildingId && ['apartment_unit', 'floor'].includes(this.propertyType)) {
    return next(new Error('Apartment units and floors must be associated with a building'));
  }
  
  next();
});

// Virtual for full address (building + unit)
PropertySchema.virtual('fullAddress').get(function() {
  if (this.buildingId && this.populated('buildingId')) {
    const building = this.buildingId;
    let address = building.address?.fullAddress || building.name;
    
    if (this.propertyType === 'apartment_unit' && this.unitNumber) {
      address += `, Unit ${this.unitNumber}`;
    } else if (this.propertyType === 'floor' && this.floorNumber !== null) {
      address += `, Floor ${this.floorNumber}`;
    }
    
    return address;
  }
  
  return this.address;
});

// Virtual for display name
PropertySchema.virtual('displayName').get(function() {
  if (this.buildingId && this.populated('buildingId')) {
    const building = this.buildingId;
    let name = building.name;
    
    if (this.propertyType === 'apartment_unit' && this.unitNumber) {
      name += ` - Unit ${this.unitNumber}`;
    } else if (this.propertyType === 'floor' && this.floorNumber !== null) {
      name += ` - Floor ${this.floorNumber}`;
    }
    
    return name;
  }
  
  return this.address || `${this.propertyType} Property`;
});

// Virtual for legacy images field (kept for backward compatibility)
PropertySchema.virtual('images')
  .get(function() {
    return this.media?.images?.map(img => img.url) || [];
  })
  .set(function(urls) {
    if (!this.media) this.media = {};
    this.media.images = urls.map((url, index) => ({
      url,
      order: index,
      isPrimary: index === 0
    }));
  });

// Virtual for legacy price field (kept for backward compatibility)
PropertySchema.virtual('price')
  .get(function() {
    return this.listingType === 'For Rent' ? this.pricing?.rent : this.pricing?.sale;
  })
  .set(function(value) {
    if (!this.pricing) this.pricing = {};
    if (this.listingType === 'For Rent') {
      this.pricing.rent = value;
    } else {
      this.pricing.sale = value;
    }
  });

// Instance methods for state transitions
PropertySchema.methods.reserve = function(userId, reason = 'Property reserved', metadata = {}) {
  if (this.status !== 'Available') {
    throw new Error(`Cannot reserve property. Current status: ${this.status}`);
  }
  
  this.status = 'Reserved';
  this.state = 'Reserved';
  this.reservedAt = new Date();
  this.reservedBy = userId;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Reserved',
    triggeredBy: userId,
    reason,
    metadata
  });
  
  return this.save();
};

PropertySchema.methods.rent = function(userId, rentId, reason = 'Property rented', metadata = {}) {
  if (this.status !== 'Reserved' && this.status !== 'Available') {
    throw new Error(`Cannot rent property. Current status: ${this.status}`);
  }
  
  this.status = 'Rented';
  this.state = 'Rented';
  this.currentRentId = rentId;
  this.rentedAt = new Date();
  
  // Clear reservation data
  this.reservedAt = undefined;
  this.reservedBy = undefined;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Rented',
    triggeredBy: userId,
    reason,
    metadata: { ...metadata, rentId }
  });
  
  return this.save();
};

PropertySchema.methods.sell = function(userId, newOwnerId, reason = 'Property sold', metadata = {}) {
  if (this.status === 'Rented') {
    throw new Error('Cannot sell rented property');
  }
  
  const oldOwnerId = this.ownerUserId;
  
  this.status = 'Sold';
  this.state = 'Sold';
  this.soldAt = new Date();
  this.ownerUserId = newOwnerId;
  this.owner = newOwnerId;
  this.currentRentId = null;
  
  // Clear reservation data
  this.reservedAt = undefined;
  this.reservedBy = undefined;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Sold',
    triggeredBy: userId,
    reason,
    metadata: { ...metadata, oldOwnerId, newOwnerId }
  });
  
  return this.save();
};

PropertySchema.methods.makeAvailable = function(userId, reason = 'Property made available', metadata = {}) {
  if (this.status === 'Rented') {
    throw new Error('Cannot make rented property available. End rent first.');
  }
  
  this.status = 'Available';
  this.state = 'Available';
  
  // Clear all status-specific data
  this.reservedAt = undefined;
  this.reservedBy = undefined;
  this.soldAt = undefined;
  this.unavailableReason = undefined;
  this.unavailableUntil = undefined;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Available',
    triggeredBy: userId,
    reason,
    metadata
  });
  
  return this.save();
};

PropertySchema.methods.makeUnavailable = function(userId, reason = 'Property made unavailable', until = null, metadata = {}) {
  this.status = 'Unavailable';
  this.state = 'Unavailable';
  this.unavailableReason = reason;
  this.unavailableUntil = until;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Unavailable',
    triggeredBy: userId,
    reason,
    metadata: { ...metadata, until }
  });
  
  return this.save();
};

PropertySchema.methods.cancelReservation = function(userId, reason = 'Reservation cancelled', metadata = {}) {
  if (this.status !== 'Reserved') {
    throw new Error(`Cannot cancel reservation. Current status: ${this.status}`);
  }
  
  const reservedBy = this.reservedBy;
  
  this.status = 'Available';
  this.state = 'Available';
  
  // Clear reservation data
  this.reservedAt = undefined;
  this.reservedBy = undefined;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Available',
    triggeredBy: userId,
    reason,
    metadata: { ...metadata, previouslyReservedBy: reservedBy }
  });
  
  return this.save();
};

PropertySchema.methods.endRent = function(userId, reason = 'Rent ended', metadata = {}) {
  if (this.status !== 'Rented') {
    throw new Error(`Cannot end rent. Current status: ${this.status}`);
  }
  
  const rentId = this.currentRentId;
  
  this.status = 'Available';
  this.state = 'Available';
  this.currentRentId = null;
  this.rentedAt = undefined;
  
  // Add to state history
  this.stateHistory.push({
    state: 'Available',
    triggeredBy: userId,
    reason,
    metadata: { ...metadata, endedRentId: rentId }
  });
  
  return this.save();
};

// Building relationship methods
PropertySchema.methods.getBuilding = function() {
  if (!this.buildingId) return null;
  return this.model('Building').findById(this.buildingId);
};

PropertySchema.methods.getSiblingProperties = function() {
  if (!this.buildingId) return [];
  return this.model('Property').find({ 
    buildingId: this.buildingId,
    _id: { $ne: this._id }
  });
};

PropertySchema.methods.getFloorProperties = function() {
  if (!this.buildingId || this.floorNumber === null) return [];
  return this.model('Property').find({ 
    buildingId: this.buildingId,
    floorNumber: this.floorNumber,
    _id: { $ne: this._id }
  });
};

// Static methods
PropertySchema.statics.findByOwner = function(ownerId, status = null) {
  const query = { ownerUserId: ownerId };
  if (status) query.status = status;
  return this.find(query).populate('buildingId');
};

PropertySchema.statics.findAvailable = function(listingType = null) {
  const query = { status: 'Available' };
  if (listingType) query.listingType = listingType;
  return this.find(query).populate('buildingId');
};

PropertySchema.statics.findRented = function() {
  return this.find({ status: 'Rented' })
    .populate('currentRentId')
    .populate('buildingId');
};

PropertySchema.statics.findReserved = function() {
  return this.find({ status: 'Reserved' })
    .populate('reservedBy')
    .populate('buildingId');
};

PropertySchema.statics.findByCurrentRent = function(rentId) {
  return this.findOne({ currentRentId: rentId }).populate('buildingId');
};

PropertySchema.statics.findByBuilding = function(buildingId, options = {}) {
  const query = { buildingId };
  
  if (options.status) query.status = options.status;
  if (options.propertyType) query.propertyType = options.propertyType;
  if (options.floorNumber !== undefined) query.floorNumber = options.floorNumber;
  
  return this.find(query).populate('buildingId');
};

PropertySchema.statics.findByFloor = function(buildingId, floorNumber, options = {}) {
  const query = { buildingId, floorNumber };
  
  if (options.status) query.status = options.status;
  if (options.propertyType) query.propertyType = options.propertyType;
  
  return this.find(query).populate('buildingId');
};

PropertySchema.statics.findStandalone = function(options = {}) {
  const query = { buildingId: null };
  
  if (options.status) query.status = options.status;
  if (options.propertyType) query.propertyType = options.propertyType;
  if (options.listingType) query.listingType = options.listingType;
  
  return this.find(query);
};

PropertySchema.statics.searchProperties = function(filters = {}) {
  const query = {};
  
  // Status filter
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }
  
  // Property type filter
  if (filters.propertyType) {
    if (Array.isArray(filters.propertyType)) {
      query.propertyType = { $in: filters.propertyType };
    } else {
      query.propertyType = filters.propertyType;
    }
  }
  
  // Listing type filter
  if (filters.listingType) query.listingType = filters.listingType;
  
  // Price range filter
  if (filters.minPrice || filters.maxPrice) {
    const priceField = filters.listingType === 'For Rent' ? 'pricing.rent' : 'pricing.sale';
    query[priceField] = {};
    if (filters.minPrice) query[priceField].$gte = filters.minPrice;
    if (filters.maxPrice) query[priceField].$lte = filters.maxPrice;
  }
  
  // Bedrooms filter
  if (filters.minBedrooms || filters.maxBedrooms) {
    query['specifications.bedrooms'] = {};
    if (filters.minBedrooms) query['specifications.bedrooms'].$gte = filters.minBedrooms;
    if (filters.maxBedrooms) query['specifications.bedrooms'].$lte = filters.maxBedrooms;
  }
  
  // Bathrooms filter
  if (filters.minBathrooms || filters.maxBathrooms) {
    query['specifications.bathrooms'] = {};
    if (filters.minBathrooms) query['specifications.bathrooms'].$gte = filters.minBathrooms;
    if (filters.maxBathrooms) query['specifications.bathrooms'].$lte = filters.maxBathrooms;
  }
  
  // Square footage filter
  if (filters.minSquareFootage || filters.maxSquareFootage) {
    query['specifications.squareFootage'] = {};
    if (filters.minSquareFootage) query['specifications.squareFootage'].$gte = filters.minSquareFootage;
    if (filters.maxSquareFootage) query['specifications.squareFootage'].$lte = filters.maxSquareFootage;
  }
  
  // Location filter
  if (filters.city) query['location.city'] = new RegExp(filters.city, 'i');
  if (filters.state) query['location.state'] = new RegExp(filters.state, 'i');
  if (filters.zipCode) query['location.zipCode'] = filters.zipCode;
  
  // Building filter
  if (filters.buildingId) query.buildingId = filters.buildingId;
  if (filters.standalone === true) query.buildingId = null;
  if (filters.standalone === false) query.buildingId = { $ne: null };
  
  // Amenities filter
  if (filters.amenities && filters.amenities.length > 0) {
    query.amenities = { $in: filters.amenities };
  }
  
  // Furnishing filter
  if (filters.furnishing) query['specifications.furnishing'] = filters.furnishing;
  
  // Parking filter
  if (filters.minParkingSpots) {
    query['specifications.parkingSpots'] = { $gte: filters.minParkingSpots };
  }
  
  return this.find(query)
    .populate('buildingId')
    .populate('ownerUserId', 'name email')
    .sort(filters.sort || { createdAt: -1 });
};

// Ensure virtuals are included in JSON output
PropertySchema.set('toJSON', { virtuals: true });
PropertySchema.set('toObject', { virtuals: true });

const Property = mongoose.model('Property', PropertySchema, 'Properties');

// Export the model and constants
module.exports = Property;
module.exports.PROPERTY_STATUSES = PROPERTY_STATUSES;
module.exports.PROPERTY_TYPES = PROPERTY_TYPES;
module.exports.LISTING_TYPES = LISTING_TYPES;
module.exports.FURNISHING_OPTIONS = FURNISHING_OPTIONS;
module.exports.FACING_DIRECTIONS = FACING_DIRECTIONS;