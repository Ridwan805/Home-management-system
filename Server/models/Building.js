const mongoose = require('mongoose');

// Building Schema - Canonical shared document for multi-unit properties
const buildingSchema = new mongoose.Schema({
  // Identity Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Full Address
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'Bangladesh', trim: true },
    fullAddress: { type: String, required: true, trim: true } // Computed field
  },
  
  // Geographic Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;    // latitude
        },
        message: 'Invalid coordinates format [longitude, latitude]'
      }
    }
  },
  
  // Building Details
  yearBuilt: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear() + 5
  },
  
  developer: {
    name: { type: String, trim: true },
    contact: {
      phone: String,
      email: String,
      website: String
    }
  },
  
  // Shared Amenities
  amenities: {
    elevators: {
      count: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: ['Passenger', 'Service', 'Both'], default: 'Passenger' }
    },
    generator: {
      available: { type: Boolean, default: false },
      capacity: String, // e.g., "100 KVA"
      backupHours: Number
    },
    parking: {
      totalSpots: { type: Number, default: 0, min: 0 },
      coveredSpots: { type: Number, default: 0, min: 0 },
      visitorSpots: { type: Number, default: 0, min: 0 },
      parkingFee: { type: Number, default: 0, min: 0 }
    },
    security: {
      cctv: { type: Boolean, default: false },
      securityGuard: { type: Boolean, default: false },
      accessControl: { type: Boolean, default: false },
      intercom: { type: Boolean, default: false }
    },
    utilities: {
      water: { type: String, enum: ['24/7', 'Scheduled', 'Limited'], default: '24/7' },
      electricity: { type: String, enum: ['24/7', 'Load Shedding', 'Generator Backup'], default: '24/7' },
      gas: { type: String, enum: ['Pipeline', 'Cylinder', 'Not Available'], default: 'Pipeline' },
      internet: { type: Boolean, default: false },
      cable: { type: Boolean, default: false }
    },
    recreational: {
      gym: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      playground: { type: Boolean, default: false },
      rooftop: { type: Boolean, default: false },
      communityHall: { type: Boolean, default: false }
    }
  },
  
  // HOA and Service Rules
  policies: {
    hoa: {
      required: { type: Boolean, default: false },
      monthlyFee: { type: Number, default: 0, min: 0 },
      services: [String] // e.g., ['Cleaning', 'Security', 'Maintenance']
    },
    serviceRules: {
      maintenanceFee: { type: Number, default: 0, min: 0 },
      commonAreaMaintenance: { type: Boolean, default: true },
      utilityBilling: { type: String, enum: ['Individual', 'Shared', 'Included'], default: 'Individual' }
    },
    restrictions: {
      pets: {
        allowed: { type: Boolean, default: true },
        restrictions: String, // e.g., "Small pets only, no dogs above 25kg"
        deposit: { type: Number, default: 0, min: 0 }
      },
      smoking: {
        allowed: { type: Boolean, default: false },
        areas: [String] // e.g., ['Balcony', 'Rooftop']
      },
      visitors: {
        guestPolicy: String,
        overnightGuests: { type: Boolean, default: true },
        visitorParking: { type: Boolean, default: false }
      }
    }
  },
  
  // Media
  media: {
    photos: [{
      url: { type: String, required: true },
      caption: String,
      type: { type: String, enum: ['Exterior', 'Lobby', 'Amenity', 'Common Area', 'Other'], default: 'Other' },
      isPrimary: { type: Boolean, default: false }
    }],
    brochures: [{
      url: { type: String, required: true },
      title: String,
      description: String
    }],
    virtualTour: {
      url: String,
      provider: String // e.g., 'Matterport', 'Custom'
    }
  },
  
  description: {
    type: String,
    maxlength: 2000
  },
  
  // Denormalized Summaries (for performance)
  summaries: {
    unitCounts: {
      total: { type: Number, default: 0, min: 0 },
      available: { type: Number, default: 0, min: 0 },
      rented: { type: Number, default: 0, min: 0 },
      sold: { type: Number, default: 0, min: 0 },
      reserved: { type: Number, default: 0, min: 0 },
      unavailable: { type: Number, default: 0, min: 0 }
    },
    floorCounts: {
      total: { type: Number, default: 0, min: 0 },
      available: { type: Number, default: 0, min: 0 },
      rented: { type: Number, default: 0, min: 0 },
      sold: { type: Number, default: 0, min: 0 },
      reserved: { type: Number, default: 0, min: 0 },
      unavailable: { type: Number, default: 0, min: 0 }
    },
    pricing: {
      rent: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
        average: { type: Number, min: 0 }
      },
      sale: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 },
        average: { type: Number, min: 0 }
      }
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Management Information
  management: {
    company: String,
    contact: {
      name: String,
      phone: String,
      email: String
    },
    emergencyContact: {
      name: String,
      phone: String,
      available24x7: { type: Boolean, default: false }
    }
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['Active', 'Under Construction', 'Maintenance', 'Inactive'],
    default: 'Active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
buildingSchema.index({ location: '2dsphere' }); // Geospatial queries
buildingSchema.index({ 'address.city': 1, 'address.state': 1 }); // Location-based searches
buildingSchema.index({ status: 1, isActive: 1 }); // Status filtering
buildingSchema.index({ name: 'text', description: 'text' }); // Text search
buildingSchema.index({ 'summaries.unitCounts.available': 1 }); // Availability searches
buildingSchema.index({ 'summaries.pricing.rent.min': 1, 'summaries.pricing.rent.max': 1 }); // Price range searches

// Virtual for properties
buildingSchema.virtual('properties', {
  ref: 'Property',
  localField: '_id',
  foreignField: 'buildingId'
});

// Pre-save middleware to compute fullAddress
buildingSchema.pre('save', function(next) {
  if (this.address) {
    this.address.fullAddress = `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
  }
  next();
});

// Instance Methods
buildingSchema.methods.updateSummaries = async function() {
  const Property = mongoose.model('Property');
  
  // Get all properties for this building
  const properties = await Property.find({ buildingId: this._id });
  
  // Reset counts
  this.summaries.unitCounts = {
    total: 0, available: 0, rented: 0, sold: 0, reserved: 0, unavailable: 0
  };
  this.summaries.floorCounts = {
    total: 0, available: 0, rented: 0, sold: 0, reserved: 0, unavailable: 0
  };
  
  const rentPrices = [];
  const salePrices = [];
  
  // Count properties by type and status
  properties.forEach(property => {
    const isUnit = property.propertyType === 'apartment_unit';
    const isFloor = property.propertyType === 'floor';
    
    if (isUnit) {
      this.summaries.unitCounts.total++;
      this.summaries.unitCounts[property.status.toLowerCase()]++;
    } else if (isFloor) {
      this.summaries.floorCounts.total++;
      this.summaries.floorCounts[property.status.toLowerCase()]++;
    }
    
    // Collect pricing data
    if (property.pricing) {
      if (property.pricing.rent && property.listingType === 'For Rent') {
        rentPrices.push(property.pricing.rent);
      }
      if (property.pricing.sale && property.listingType === 'For Sale') {
        salePrices.push(property.pricing.sale);
      }
    }
  });
  
  // Calculate pricing summaries
  if (rentPrices.length > 0) {
    this.summaries.pricing.rent = {
      min: Math.min(...rentPrices),
      max: Math.max(...rentPrices),
      average: rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length
    };
  }
  
  if (salePrices.length > 0) {
    this.summaries.pricing.sale = {
      min: Math.min(...salePrices),
      max: Math.max(...salePrices),
      average: salePrices.reduce((a, b) => a + b, 0) / salePrices.length
    };
  }
  
  this.summaries.lastUpdated = new Date();
  return this.save();
};

buildingSchema.methods.getAvailableUnits = function() {
  const Property = mongoose.model('Property');
  return Property.find({
    buildingId: this._id,
    propertyType: 'apartment_unit',
    status: 'Available'
  });
};

buildingSchema.methods.getAvailableFloors = function() {
  const Property = mongoose.model('Property');
  return Property.find({
    buildingId: this._id,
    propertyType: 'floor',
    status: 'Available'
  });
};

// Static Methods
buildingSchema.statics.findByLocation = function(coordinates, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  });
};

buildingSchema.statics.searchBuildings = function(query, filters = {}) {
  const searchCriteria = {
    isActive: true,
    ...filters
  };
  
  if (query) {
    searchCriteria.$text = { $search: query };
  }
  
  return this.find(searchCriteria)
    .populate('properties', 'propertyType status pricing')
    .sort({ 'summaries.lastUpdated': -1 });
};

const Building = mongoose.model('Building', buildingSchema);

module.exports = Building;