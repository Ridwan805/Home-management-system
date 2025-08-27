const mongoose = require('mongoose');

// BuildingSummary model for denormalized building data
// This model caches aggregated information about buildings to improve query performance
const BuildingSummarySchema = new mongoose.Schema({
  // Reference to the building
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true,
    unique: true
  },
  
  // Unit and floor counts
  counts: {
    totalUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    totalFloors: {
      type: Number,
      default: 0,
      min: 0
    },
    availableUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    availableFloors: {
      type: Number,
      default: 0,
      min: 0
    },
    rentedUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    rentedFloors: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedFloors: {
      type: Number,
      default: 0,
      min: 0
    },
    soldUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    soldFloors: {
      type: Number,
      default: 0,
      min: 0
    },
    unavailableUnits: {
      type: Number,
      default: 0,
      min: 0
    },
    unavailableFloors: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Property type breakdown
  propertyTypes: {
    apartment_unit: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      rented: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      sold: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 }
    },
    floor: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      rented: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      sold: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 }
    },
    retail: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      rented: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      sold: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 }
    },
    office: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      rented: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      sold: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 }
    },
    other: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      rented: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      sold: { type: Number, default: 0 },
      unavailable: { type: Number, default: 0 }
    }
  },
  
  // Pricing information
  pricing: {
    rent: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      },
      average: {
        type: Number,
        min: 0
      },
      median: {
        type: Number,
        min: 0
      }
    },
    sale: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      },
      average: {
        type: Number,
        min: 0
      },
      median: {
        type: Number,
        min: 0
      }
    }
  },
  
  // Specifications summary
  specifications: {
    bedrooms: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      distribution: {
        studio: { type: Number, default: 0 }, // 0 bedrooms
        oneBedroom: { type: Number, default: 0 }, // 1 bedroom
        twoBedroom: { type: Number, default: 0 }, // 2 bedrooms
        threeBedroom: { type: Number, default: 0 }, // 3 bedrooms
        fourPlusBedroom: { type: Number, default: 0 } // 4+ bedrooms
      }
    },
    bathrooms: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      distribution: {
        oneBathroom: { type: Number, default: 0 }, // 1 bathroom
        twoBathroom: { type: Number, default: 0 }, // 2 bathrooms
        threePlusBathroom: { type: Number, default: 0 } // 3+ bathrooms
      }
    },
    squareFootage: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      average: { type: Number, min: 0 }
    },
    parkingSpots: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      totalAvailable: { type: Number, default: 0 }
    }
  },
  
  // Amenities summary
  amenities: {
    common: [String], // Most common amenities across properties
    unique: [String], // Unique amenities in this building
    coverage: {
      // Percentage of properties with each amenity
      airConditioning: { type: Number, min: 0, max: 100, default: 0 },
      heating: { type: Number, min: 0, max: 100, default: 0 },
      balcony: { type: Number, min: 0, max: 100, default: 0 },
      parking: { type: Number, min: 0, max: 100, default: 0 },
      storage: { type: Number, min: 0, max: 100, default: 0 }
    }
  },
  
  // Occupancy and financial metrics
  metrics: {
    occupancyRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    averageRentPerSqFt: {
      type: Number,
      min: 0
    },
    totalMonthlyRentRevenue: {
      type: Number,
      min: 0,
      default: 0
    },
    potentialMonthlyRentRevenue: {
      type: Number,
      min: 0,
      default: 0
    },
    averageDaysOnMarket: {
      type: Number,
      min: 0
    }
  },
  
  // Floor-specific data
  floorData: [{
    floorNumber: {
      type: Number,
      required: true
    },
    totalUnits: {
      type: Number,
      default: 0
    },
    availableUnits: {
      type: Number,
      default: 0
    },
    rentedUnits: {
      type: Number,
      default: 0
    },
    averageRent: {
      type: Number,
      min: 0
    },
    averageSize: {
      type: Number,
      min: 0
    }
  }],
  
  // Last update information
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Update frequency tracking
  updateFrequency: {
    lastPropertyChange: Date,
    lastPriceChange: Date,
    lastStatusChange: Date,
    autoUpdateEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  collection: 'buildingsummaries'
});

// Indexes for performance
BuildingSummarySchema.index({ buildingId: 1 }, { unique: true });
BuildingSummarySchema.index({ 'counts.availableUnits': -1 });
BuildingSummarySchema.index({ 'counts.availableFloors': -1 });
BuildingSummarySchema.index({ 'pricing.rent.min': 1, 'pricing.rent.max': 1 });
BuildingSummarySchema.index({ 'pricing.sale.min': 1, 'pricing.sale.max': 1 });
BuildingSummarySchema.index({ 'metrics.occupancyRate': -1 });
BuildingSummarySchema.index({ lastUpdated: -1 });

// Virtual for total properties
BuildingSummarySchema.virtual('totalProperties').get(function() {
  return this.counts.totalUnits + this.counts.totalFloors;
});

// Virtual for total available properties
BuildingSummarySchema.virtual('totalAvailable').get(function() {
  return this.counts.availableUnits + this.counts.availableFloors;
});

// Virtual for vacancy rate
BuildingSummarySchema.virtual('vacancyRate').get(function() {
  const total = this.totalProperties;
  if (total === 0) return 0;
  return ((this.totalAvailable / total) * 100).toFixed(2);
});

// Instance methods
BuildingSummarySchema.methods.updateFromProperties = async function(properties) {
  // Reset all counts
  this.counts = {
    totalUnits: 0,
    totalFloors: 0,
    availableUnits: 0,
    availableFloors: 0,
    rentedUnits: 0,
    rentedFloors: 0,
    reservedUnits: 0,
    reservedFloors: 0,
    soldUnits: 0,
    soldFloors: 0,
    unavailableUnits: 0,
    unavailableFloors: 0
  };
  
  // Reset property types
  Object.keys(this.propertyTypes).forEach(type => {
    this.propertyTypes[type] = {
      total: 0,
      available: 0,
      rented: 0,
      reserved: 0,
      sold: 0,
      unavailable: 0
    };
  });
  
  const rentPrices = [];
  const salePrices = [];
  const bedrooms = [];
  const bathrooms = [];
  const squareFootages = [];
  const parkingSpots = [];
  
  let totalRentRevenue = 0;
  let potentialRentRevenue = 0;
  
  // Process each property
  properties.forEach(property => {
    // Count by type
    if (property.propertyType === 'apartment_unit') {
      this.counts.totalUnits++;
      if (property.status === 'Available') this.counts.availableUnits++;
      else if (property.status === 'Rented') this.counts.rentedUnits++;
      else if (property.status === 'Reserved') this.counts.reservedUnits++;
      else if (property.status === 'Sold') this.counts.soldUnits++;
      else if (property.status === 'Unavailable') this.counts.unavailableUnits++;
    } else if (property.propertyType === 'floor') {
      this.counts.totalFloors++;
      if (property.status === 'Available') this.counts.availableFloors++;
      else if (property.status === 'Rented') this.counts.rentedFloors++;
      else if (property.status === 'Reserved') this.counts.reservedFloors++;
      else if (property.status === 'Sold') this.counts.soldFloors++;
      else if (property.status === 'Unavailable') this.counts.unavailableFloors++;
    }
    
    // Count by property type and status
    const typeKey = property.propertyType;
    if (this.propertyTypes[typeKey]) {
      this.propertyTypes[typeKey].total++;
      this.propertyTypes[typeKey][property.status.toLowerCase()]++;
    }
    
    // Collect pricing data
    if (property.pricing?.rent) {
      rentPrices.push(property.pricing.rent);
      if (property.status === 'Rented') {
        totalRentRevenue += property.pricing.rent;
      }
      potentialRentRevenue += property.pricing.rent;
    }
    
    if (property.pricing?.sale) {
      salePrices.push(property.pricing.sale);
    }
    
    // Collect specification data
    if (property.specifications?.bedrooms !== undefined) {
      bedrooms.push(property.specifications.bedrooms);
    }
    
    if (property.specifications?.bathrooms !== undefined) {
      bathrooms.push(property.specifications.bathrooms);
    }
    
    if (property.specifications?.squareFootage) {
      squareFootages.push(property.specifications.squareFootage);
    }
    
    if (property.specifications?.parkingSpots) {
      parkingSpots.push(property.specifications.parkingSpots);
    }
  });
  
  // Calculate pricing statistics
  if (rentPrices.length > 0) {
    this.pricing.rent.min = Math.min(...rentPrices);
    this.pricing.rent.max = Math.max(...rentPrices);
    this.pricing.rent.average = rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length;
    this.pricing.rent.median = this._calculateMedian(rentPrices);
  }
  
  if (salePrices.length > 0) {
    this.pricing.sale.min = Math.min(...salePrices);
    this.pricing.sale.max = Math.max(...salePrices);
    this.pricing.sale.average = salePrices.reduce((a, b) => a + b, 0) / salePrices.length;
    this.pricing.sale.median = this._calculateMedian(salePrices);
  }
  
  // Calculate specification statistics
  if (bedrooms.length > 0) {
    this.specifications.bedrooms.min = Math.min(...bedrooms);
    this.specifications.bedrooms.max = Math.max(...bedrooms);
    
    // Calculate bedroom distribution
    this.specifications.bedrooms.distribution = {
      studio: bedrooms.filter(b => b === 0).length,
      oneBedroom: bedrooms.filter(b => b === 1).length,
      twoBedroom: bedrooms.filter(b => b === 2).length,
      threeBedroom: bedrooms.filter(b => b === 3).length,
      fourPlusBedroom: bedrooms.filter(b => b >= 4).length
    };
  }
  
  if (bathrooms.length > 0) {
    this.specifications.bathrooms.min = Math.min(...bathrooms);
    this.specifications.bathrooms.max = Math.max(...bathrooms);
    
    // Calculate bathroom distribution
    this.specifications.bathrooms.distribution = {
      oneBathroom: bathrooms.filter(b => b === 1).length,
      twoBathroom: bathrooms.filter(b => b === 2).length,
      threePlusBathroom: bathrooms.filter(b => b >= 3).length
    };
  }
  
  if (squareFootages.length > 0) {
    this.specifications.squareFootage.min = Math.min(...squareFootages);
    this.specifications.squareFootage.max = Math.max(...squareFootages);
    this.specifications.squareFootage.average = squareFootages.reduce((a, b) => a + b, 0) / squareFootages.length;
  }
  
  if (parkingSpots.length > 0) {
    this.specifications.parkingSpots.min = Math.min(...parkingSpots);
    this.specifications.parkingSpots.max = Math.max(...parkingSpots);
    this.specifications.parkingSpots.totalAvailable = parkingSpots.reduce((a, b) => a + b, 0);
  }
  
  // Calculate metrics
  const totalProperties = this.totalProperties;
  const rentedProperties = this.counts.rentedUnits + this.counts.rentedFloors;
  
  this.metrics.occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0;
  this.metrics.totalMonthlyRentRevenue = totalRentRevenue;
  this.metrics.potentialMonthlyRentRevenue = potentialRentRevenue;
  
  if (squareFootages.length > 0 && rentPrices.length > 0) {
    const avgSqFt = squareFootages.reduce((a, b) => a + b, 0) / squareFootages.length;
    const avgRent = rentPrices.reduce((a, b) => a + b, 0) / rentPrices.length;
    this.metrics.averageRentPerSqFt = avgRent / avgSqFt;
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Helper method to calculate median
BuildingSummarySchema.methods._calculateMedian = function(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
};

// Static methods
BuildingSummarySchema.statics.updateForBuilding = async function(buildingId) {
  const Property = this.model('Property');
  const properties = await Property.find({ buildingId });
  
  let summary = await this.findOne({ buildingId });
  if (!summary) {
    summary = new this({ buildingId });
  }
  
  return summary.updateFromProperties(properties);
};

BuildingSummarySchema.statics.updateAll = async function() {
  const Building = this.model('Building');
  const buildings = await Building.find({});
  
  const updatePromises = buildings.map(building => 
    this.updateForBuilding(building._id)
  );
  
  return Promise.all(updatePromises);
};

BuildingSummarySchema.statics.findWithAvailability = function(minAvailable = 1) {
  return this.find({
    $or: [
      { 'counts.availableUnits': { $gte: minAvailable } },
      { 'counts.availableFloors': { $gte: minAvailable } }
    ]
  }).populate('buildingId');
};

BuildingSummarySchema.statics.findByPriceRange = function(minPrice, maxPrice, listingType = 'rent') {
  const priceField = listingType === 'rent' ? 'pricing.rent' : 'pricing.sale';
  const query = {};
  
  if (minPrice) query[`${priceField}.min`] = { $gte: minPrice };
  if (maxPrice) query[`${priceField}.max`] = { $lte: maxPrice };
  
  return this.find(query).populate('buildingId');
};

// Ensure virtuals are included in JSON output
BuildingSummarySchema.set('toJSON', { virtuals: true });
BuildingSummarySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BuildingSummary', BuildingSummarySchema);