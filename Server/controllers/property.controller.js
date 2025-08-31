const Property = require('../models/Property');
const Building = require('../models/Building');
const BuildingSummary = require('../models/BuildingSummary');
const Rent = require('../models/Rent');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const User = require('../models/User');

// Get all properties (public route)
const getAllProperties = async (req, res) => {
  try {
    console.log('Query parameters:', req.query);
    
    // Build filter object (only public statuses)
    const filter = {
      status: { 
        $in: ['Available', 'Sold', 'Rented'] 
      },
      isDeleted: { $ne: true }
    };
    
    // Add listingType filter if provided
    if (req.query.listingType && req.query.listingType !== 'All') {
      filter.listingType = req.query.listingType;
    }

    // Add price range filters if provided
    if (req.query.minPrice) {
      filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
    }
    
    // Add bedroom filters if provided
    if (req.query.minBedrooms) {
      filter.bedrooms = { ...filter.bedrooms, $gte: Number(req.query.minBedrooms) };
    }
    if (req.query.maxBedrooms) {
      filter.bedrooms = { ...filter.bedrooms, $lte: Number(req.query.maxBedrooms) };
    }
    
    // Add location filters if provided
    if (req.query.city) {
      filter.city = { $regex: new RegExp(req.query.city, 'i') };
    }
    if (req.query.state) {
      filter.state = { $regex: new RegExp(req.query.state, 'i') };
    }
    if (req.query.zipCode) {
      filter.zipCode = { $regex: new RegExp(req.query.zipCode, 'i') };
    }
    
    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: properties.length,
      properties
    });
  } catch (err) {
    console.error('Error in getAllProperties:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Get top 5 properties for homepage
const getTopProperties = async (req, res) => {
  try {
    console.log('🔍 getTopProperties called - looking for Available properties...');
    
    const properties = await Property.find({ 
      status: 'Available' 
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`📊 Found ${properties.length} Available properties for homepage`);
    if (properties.length > 0) {
      console.log('Sample property:', JSON.stringify(properties[0], null, 2));
    }
    
    res.json(properties);
  } catch (err) {
    console.error('❌ Error in getTopProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get properties for a specific user
const getUserProperties = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let filter = { isDeleted: { $ne: true } };
    
    if (userRole === 'Owner' || userRole === 'Admin') {
      // Find properties owned by user (including legacy owner/ownerId fields)
      filter.$or = [
        { ownerUserId: userId },
        { owner: userId },
        { ownerId: userId }
      ];
    } else if (userRole === 'Tenant') {
      // Find properties where user is a tenant in active rents
      const activeRents = await Rent.find({ 
        tenants: userId, 
        status: 'Active' 
      }).select('propertyId');
      const propertyIds = activeRents.map(rent => rent.propertyId);
      filter._id = { $in: propertyIds };
    }
    
    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address')
      .sort({ createdAt: -1 });
    
    // Get additional context for each property
    const propertiesWithContext = await Promise.all(properties.map(async (property) => {
      const propertyObj = property.toObject();
      
      // Get active rent details if property is rented
      if (property.currentRentId) {
        const rent = await Rent.findById(property.currentRentId)
          .populate('tenants', 'firstName lastName email');
        propertyObj.activeRent = rent;
      }
      
      // Get ownership transfer history
      const ownershipHistory = await OwnershipTransfer.find({ 
        propertyId: property._id 
      }).sort({ createdAt: -1 }).limit(3);
      propertyObj.recentOwnershipTransfers = ownershipHistory;
      
      return propertyObj;
    }));
    
    res.json({
      success: true,
      count: propertiesWithContext.length,
      properties: propertiesWithContext
    });
  } catch (err) {
    console.error('Error in getUserProperties:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};


const createProperty = async (req, res) => {
  try {
<<<<<<< Updated upstream
    const userId = req.user.userId;
=======
    console.log('🌐 Incoming request: POST /api/properties');
    console.log('Request body buildingId:', req.body.buildingId);
    console.log('Request body address:', req.body.address);
    console.log('Request body keys:', Object.keys(req.body));
    
    const userId = req.user.userId;
    

    console.log('Raw req.body:', req.body);
    
    // Parse JSON fields
    const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : {};
    const pricing = req.body.pricing ? JSON.parse(req.body.pricing) : {};
    const locationData = req.body.location ? JSON.parse(req.body.location) : {};
    const contactInfo = req.body.contactInfo ? JSON.parse(req.body.contactInfo) : {};
    const constraints = req.body.constraints ? JSON.parse(req.body.constraints) : {};
    const amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];
    
    // Exclude 'state' from location to prevent conflict with Property model's state field
    const { state: locationState, ...location } = locationData;
    
    console.log('Parsed location (without state):', location);
    console.log('Location state:', locationState);
>>>>>>> Stashed changes
    
    // Combine fields from req.body and set ownership
    const propertyData = {
      ...req.body,
      ownerUserId: userId,
      owner: userId, // Keep for backward compatibility
      ownerId: userId, // Keep for backward compatibility
<<<<<<< Updated upstream
      status: 'Available', // New properties start as Available
      currentRentId: null
    };
=======
      currentRentId: null,
      
      // Basic property information
      propertyType: req.body.propertyType,
      listingType: req.body.listingType,
      description: req.body.description,
      
      // Building relationship
      buildingId: req.body.buildingId || null,
      floorNumber: req.body.floorNumber ? parseInt(req.body.floorNumber) : null,
      unitNumber: req.body.unitNumber || null,
      
      // Address - always include field for validation to work properly
      address: req.body.address && req.body.address.trim() ? req.body.address.trim() : undefined,
      
      // Structured data
      specifications,
      pricing,
      location: {
        ...location,
        locationState: locationState // Use different field name to avoid Property model conflict
      },
      contactInfo,
      constraints,
      amenities,
      
      // Other fields
      yearBuilt: req.body.yearBuilt ? parseInt(req.body.yearBuilt) : null,
      threeDModelUrl: req.body.threeDModelUrl || '',
      
      // Set status last to prevent conflicts
      status: 'Available' // New properties start as Available
    };
    
    console.log('Final propertyData before save:', propertyData);
    console.log('BuildingId in propertyData:', propertyData.buildingId);
    console.log('Address in propertyData:', propertyData.address);
    console.log('BuildingId type:', typeof propertyData.buildingId);
    console.log('BuildingId truthy check:', !!propertyData.buildingId);
    console.log('BuildingId falsy check (!buildingId):', !propertyData.buildingId);
>>>>>>> Stashed changes

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    propertyData.images = imageUrls;

    // Create new Property
    const property = new Property(propertyData);
    await property.save();

    const populatedProperty = await Property.findById(property._id)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('buildingId', 'name address amenities');

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: populatedProperty
    });
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};


// Get property by ID
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address amenities policies media');
    
    if (!property) {
      return res.status(404).json({ 
        success: false,
        message: 'Property not found' 
      });
    }
    
    res.json({
      success: true,
      property
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + err.message 
    });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }
    
    // Check authorization
    const isOwner = property.ownerUserId?.toString() === userId || 
                   property.owner?.toString() === userId || 
                   property.ownerId?.toString() === userId;
    const isAdmin = userRole === 'Admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this property' 
      });
    }

    // Extract status from update data to handle separately
    const { status, ...updateData } = req.body;
    
    // Update basic property fields
    Object.assign(property, updateData);
    
    // Add history entry for the update
    property.history.push({
      event: 'Property details updated',
      actor: userId,
      timestamp: new Date(),
      details: updateData
    });
    
    await property.save();
    
    const updatedProperty = await Property.findById(id)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address');
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Delete property (soft delete)
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }
    
    // Check authorization
    const isOwner = property.ownerUserId?.toString() === userId || 
                   property.owner?.toString() === userId || 
                   property.ownerId?.toString() === userId;
    const isAdmin = userRole === 'Admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this property' 
      });
    }

    // Check if property can be deleted (no active rent or pending transfers)
    if (property.currentRentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete property with active rent contract' 
      });
    }

    const pendingTransfer = await OwnershipTransfer.findOne({
      propertyId: id,
      status: 'Pending'
    });
    
    if (pendingTransfer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete property with pending ownership transfer' 
      });
    }

    // Soft delete by setting isDeleted flag
    property.isDeleted = true;
    property.deletedAt = new Date();
    property.deletedBy = userId;
    
    // Add history entry
    property.history.push({
      event: 'Property deleted',
      actor: userId,
      timestamp: new Date()
    });
    
    await property.save();
    
    res.json({ 
      success: true, 
      message: 'Property deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Update property status using state machine
const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: 'Property not found' 
      });
    }
    
    // Check authorization
    const isOwner = property.ownerUserId?.toString() === userId || 
                   property.owner?.toString() === userId || 
                   property.ownerId?.toString() === userId;
    const isAdmin = userRole === 'Admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this property status' 
      });
    }

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }

    // Use state machine methods for status transitions
    try {
      switch (status) {
        case 'Available':
          await property.makeAvailable(userId, note);
          break;
        case 'Reserved':
          await property.reserve(userId, note);
          break;
        case 'Unavailable':
          await property.makeUnavailable(userId, note);
          break;
        case 'Sold':
          // Sold status should be set through OwnershipTransfer.close()
          return res.status(400).json({ 
            success: false, 
            message: 'Property status cannot be set to Sold directly. Use ownership transfer process.' 
          });
        case 'Rented':
          // Rented status should be set through Rent.activate()
          return res.status(400).json({ 
            success: false, 
            message: 'Property status cannot be set to Rented directly. Use rent activation process.' 
          });
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid status value' 
          });
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }

    const updatedProperty = await Property.findById(id)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address');
    
    res.json({
      success: true,
      message: 'Property status updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    console.error('Error updating property status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Get property assignments (for owners to see their assigned properties)
const getPropertyAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let query = {};
    
    if (userRole === 'Admin') {
      // Admin can see all assignments
      query = {
        $or: [
          { status: 'Rented', currentRentId: { $ne: null } },
          { status: 'Sold' }
        ],
        isDeleted: { $ne: true }
      };
    } else {
      // Owners can only see their own property assignments
      query = {
        $or: [
          { ownerUserId: userId },
          { owner: userId },
          { ownerId: userId }
        ],
        $and: [
          {
            $or: [
              { status: 'Rented', currentRentId: { $ne: null } },
              { status: 'Sold' }
            ]
          }
        ],
        isDeleted: { $ne: true }
      };
    }
    
    const assignments = await Property.find(query)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('buildingId', 'name address')
      .populate({
        path: 'currentRentId',
        populate: {
          path: 'tenants',
          select: 'firstName lastName email'
        }
      })
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      message: 'Property assignments retrieved successfully',
      count: assignments.length,
      assignments
    });
  } catch (err) {
    console.error('Error getting property assignments:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Get tenant's assigned properties
const getTenantAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find active rents where user is a tenant
    const activeRents = await Rent.find({
      tenants: userId,
      status: 'Active'
    }).populate({
      path: 'propertyId',
      populate: {
        path: 'ownerUserId',
        select: 'firstName lastName email'
      }
    });
    
    // Find properties owned by the user (buyers remain tenants by role)
    const ownedProperties = await Property.find({
      ownerUserId: userId,
      status: 'Sold',
      isDeleted: { $ne: true }
    });
    
    const assignments = {
      rentedProperties: activeRents.map(rent => ({
        property: rent.propertyId,
        rent: {
          _id: rent._id,
          startDate: rent.term.startDate,
          endDate: rent.term.endDate,
          rentAmount: rent.rent.amount,
          status: rent.status
        },
        type: 'rental'
      })),
      ownedProperties: ownedProperties.map(property => ({
        property,
        type: 'ownership'
      }))
    };
    
    res.json({
      success: true,
      message: 'Tenant assignments retrieved successfully',
      totalRented: assignments.rentedProperties.length,
      totalOwned: assignments.ownedProperties.length,
      assignments
    });
  } catch (err) {
    console.error('Error getting tenant assignments:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

// Get properties by building
const getPropertiesByBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { status, propertyType, floorNumber } = req.query;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Build filter
    const filter = { 
      buildingId,
      isDeleted: { $ne: true }
    };

    if (status) {
      filter.status = status;
    }
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    if (floorNumber) {
      filter.floorNumber = Number(floorNumber);
    }

    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .sort({ floorNumber: 1, unitNumber: 1 });

    res.json({
      success: true,
      building: {
        _id: building._id,
        name: building.name,
        address: building.fullAddress
      },
      count: properties.length,
      properties
    });
  } catch (err) {
    console.error('Error in getPropertiesByBuilding:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Get properties by floor
const getPropertiesByFloor = async (req, res) => {
  try {
    const { buildingId, floorNumber } = req.params;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    const properties = await Property.find({
      buildingId,
      floorNumber: Number(floorNumber),
      isDeleted: { $ne: true }
    })
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .sort({ unitNumber: 1 });

    res.json({
      success: true,
      building: {
        _id: building._id,
        name: building.name,
        address: building.fullAddress
      },
      floorNumber: Number(floorNumber),
      count: properties.length,
      properties
    });
  } catch (err) {
    console.error('Error in getPropertiesByFloor:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Get standalone properties (not part of any building)
const getStandaloneProperties = async (req, res) => {
  try {
    const { status, propertyType, city, state } = req.query;

    // Build filter for standalone properties
    const filter = {
      buildingId: null,
      isDeleted: { $ne: true }
    };

    if (status) {
      filter.status = status;
    }
    if (propertyType) {
      filter.propertyType = propertyType;
    }
    if (city) {
      filter['location.city'] = { $regex: new RegExp(city, 'i') };
    }
    if (state) {
      filter['location.state'] = { $regex: new RegExp(state, 'i') };
    }

    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      properties
    });
  } catch (err) {
    console.error('Error in getStandaloneProperties:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Advanced property search
const searchProperties = async (req, res) => {
  try {
    const {
      status,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minSquareFootage,
      maxSquareFootage,
      city,
      state,
      zipCode,
      buildingId,
      hasParking,
      furnishing,
      facing,
      page = 1,
      limit = 20
    } = req.query;

    // Build comprehensive filter
    const filter = { isDeleted: { $ne: true } };

    // Basic filters
    if (status) filter.status = status;
    if (propertyType) filter.propertyType = propertyType;
    if (listingType) filter.listingType = listingType;
    if (buildingId) filter.buildingId = buildingId;

    // Price filters
    if (minPrice || maxPrice) {
      filter['pricing.rent'] = {};
      if (minPrice) filter['pricing.rent'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.rent'].$lte = Number(maxPrice);
    }

    // Specification filters
    if (minBedrooms || maxBedrooms) {
      filter['specifications.bedrooms'] = {};
      if (minBedrooms) filter['specifications.bedrooms'].$gte = Number(minBedrooms);
      if (maxBedrooms) filter['specifications.bedrooms'].$lte = Number(maxBedrooms);
    }

    if (minBathrooms || maxBathrooms) {
      filter['specifications.bathrooms'] = {};
      if (minBathrooms) filter['specifications.bathrooms'].$gte = Number(minBathrooms);
      if (maxBathrooms) filter['specifications.bathrooms'].$lte = Number(maxBathrooms);
    }

    if (minSquareFootage || maxSquareFootage) {
      filter['specifications.squareFootage'] = {};
      if (minSquareFootage) filter['specifications.squareFootage'].$gte = Number(minSquareFootage);
      if (maxSquareFootage) filter['specifications.squareFootage'].$lte = Number(maxSquareFootage);
    }

    // Location filters
    if (city) filter['location.city'] = { $regex: new RegExp(city, 'i') };
    if (state) filter['location.state'] = { $regex: new RegExp(state, 'i') };
    if (zipCode) filter['location.zipCode'] = { $regex: new RegExp(zipCode, 'i') };

    // Feature filters
    if (hasParking === 'true') filter['specifications.parkingSpots'] = { $gt: 0 };
    if (furnishing) filter['specifications.furnishing'] = furnishing;
    if (facing) filter['specifications.facing'] = facing;

    const skip = (Number(page) - 1) * Number(limit);

    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address amenities')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    res.json({
      success: true,
      count: properties.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      properties
    });
  } catch (err) {
    console.error('Error in searchProperties:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

module.exports = {
  getAllProperties,
  getTopProperties,
  getUserProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertyAssignments,
  getTenantAssignments,
  getPropertiesByBuilding,
  getPropertiesByFloor,
  getStandaloneProperties,
  searchProperties
};