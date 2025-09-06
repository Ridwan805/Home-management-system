const Property = require('../models/Property');
const Building = require('../models/Building');
const BuildingSummary = require('../models/BuildingSummary');
const Rent = require('../models/Rent');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const User = require('../models/User');
const Request = require('../models/Request');

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

    // Build additional filters using $and to combine multiple conditions properly
    const additionalFilters = [];
    
    // Add price range filters if provided (check both pricing.rent and pricing.sale based on listingType)
    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {};
      if (req.query.minPrice) priceFilter.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) priceFilter.$lte = Number(req.query.maxPrice);
      
      // Apply to both pricing fields and legacy price field
      additionalFilters.push({
        $or: [
          { 'pricing.rent': priceFilter },
          { 'pricing.sale': priceFilter },
          { price: priceFilter }
        ]
      });
    }
    
    // Add bedroom filters if provided (check both specifications.bedrooms and legacy bedrooms)
    if (req.query.minBedrooms || req.query.maxBedrooms) {
      const bedroomFilter = {};
      if (req.query.minBedrooms) bedroomFilter.$gte = Number(req.query.minBedrooms);
      if (req.query.maxBedrooms) bedroomFilter.$lte = Number(req.query.maxBedrooms);
      
      additionalFilters.push({
        $or: [
          { 'specifications.bedrooms': bedroomFilter },
          { bedrooms: bedroomFilter }
        ]
      });
    }
    
    // Add search functionality (search across address, city, state, zipCode)
    if (req.query.search) {
      const searchRegex = { $regex: new RegExp(req.query.search, 'i') };
      additionalFilters.push({
        $or: [
          { address: searchRegex },
          { 'location.city': searchRegex },
          { city: searchRegex },
          { 'location.state': searchRegex },
          { state: searchRegex },
          { 'location.zipCode': searchRegex },
          { zipCode: searchRegex }
        ]
      });
    }
    
    // Add location filters if provided (check both location.* and legacy fields)
    if (req.query.city) {
      const cityRegex = { $regex: new RegExp(req.query.city, 'i') };
      additionalFilters.push({
        $or: [
          { 'location.city': cityRegex },
          { city: cityRegex }
        ]
      });
    }
    if (req.query.state) {
      const stateRegex = { $regex: new RegExp(req.query.state, 'i') };
      additionalFilters.push({
        $or: [
          { 'location.state': stateRegex },
          { state: stateRegex }
        ]
      });
    }
    if (req.query.zipCode) {
      const zipRegex = { $regex: new RegExp(req.query.zipCode, 'i') };
      additionalFilters.push({
        $or: [
          { 'location.zipCode': zipRegex },
          { zipCode: zipRegex }
        ]
      });
    }
    
    // Combine all filters using $and if there are additional filters
    if (additionalFilters.length > 0) {
      filter.$and = additionalFilters;
    }
    
    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email phoneNumber')
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
    
    // Convert to JSON to ensure virtual fields are included
    const propertiesWithVirtuals = properties.map(property => {
      const propertyObj = property.toObject({ virtuals: true });
      console.log('Property images:', propertyObj.images);
      return propertyObj;
    });
    
    if (propertiesWithVirtuals.length > 0) {
      console.log('Sample property with virtuals:', JSON.stringify(propertiesWithVirtuals[0], null, 2));
    }
    
    res.json(propertiesWithVirtuals);
  } catch (err) {
    console.error('❌ Error in getTopProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get properties for a specific user
const getUserProperties = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const userRole = req.user.role;
    
    console.log('getUserProperties - User info:', { userId, userRole, userObject: req.user });
    
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
    
    console.log('getUserProperties - Filter:', filter);
    
    const properties = await Property.find(filter)
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .populate('buildingId', 'name address')
      .sort({ createdAt: -1 });
    
    console.log('getUserProperties - Found properties:', properties.length);
    
    // Simplified response without complex async operations for now
    const propertiesWithContext = properties.map(property => {
      const propertyObj = property.toObject();
      return propertyObj;
    });
    
    console.log('getUserProperties - Sending response with', propertiesWithContext.length, 'properties');
    
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


// Check if building-unit-floor combination exists
const checkCombination = async (req, res) => {
  try {
    const { buildingId, floorNumber, unitNumber } = req.query;
    
    // For standalone properties, no combination check is needed
    if (!buildingId) {
      return res.json({
        success: true,
        exists: false,
        message: 'Standalone property - no combination check needed'
      });
    }
    
    // For building properties, buildingId is required
    if (!buildingId) {
      return res.status(400).json({
        success: false,
        message: 'Building ID is required for building properties'
      });
    }
    
    // Build query based on available parameters
    const query = {
      buildingId: buildingId,
      isDeleted: { $ne: true }
    };
    
    // Add floor number if provided (not null/undefined)
    if (floorNumber !== null && floorNumber !== undefined && floorNumber !== '') {
      query.floorNumber = parseInt(floorNumber);
    }
    
    // Add unit number if provided (not null/undefined/empty)
    if (unitNumber !== null && unitNumber !== undefined && unitNumber.trim() !== '') {
      query.unitNumber = unitNumber.trim();
    }
    
    // Check if a property with this combination already exists
    const existingProperty = await Property.findOne(query);
    
    res.json({
      success: true,
      exists: !!existingProperty,
      message: existingProperty ? 'Combination already exists' : 'Combination is available'
    });
  } catch (err) {
    console.error('Error checking combination:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

const createProperty = async (req, res) => {
  try {
    console.log('🌐 Incoming request: POST /api/properties');
    console.log('Request body buildingId:', req.body.buildingId);
    console.log('Request body address:', req.body.address);
    console.log('Request body keys:', Object.keys(req.body));
    
    const userId = req.user._id || req.user.userId || req.user.id;

    console.log('Raw req.body:', req.body);
    
    // Parse JSON fields
    const specifications = req.body.specifications ? JSON.parse(req.body.specifications) : {};
    const pricing = req.body.pricing ? JSON.parse(req.body.pricing) : {};
    const locationData = req.body.location ? JSON.parse(req.body.location) : {};
    const contactInfo = req.body.contactInfo ? JSON.parse(req.body.contactInfo) : {};
    const constraints = req.body.constraints ? JSON.parse(req.body.constraints) : {};
    const amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];
    
    // Handle location_link separately if provided
    if (req.body.location_link) {
      locationData.location_link = req.body.location_link;
    }
    
    // Exclude 'state' from location to prevent conflict with Property model's state field
    const { state: locationState, ...location } = locationData;
    
    console.log('Parsed location (without state):', location);
    console.log('Location state:', locationState);
    
    // Combine fields from req.body and set ownership
    // Check if this is a standalone property
    const isStandaloneProperty = req.body.propertyType === 'house' || req.body.propertyType === 'land' || req.body.propertyType === 'commercial' || req.body.propertyType === 'other';
    
    const propertyData = {
      ownerUserId: userId,
      owner: userId, // Keep for backward compatibility
      ownerId: userId, // Keep for backward compatibility
      currentRentId: null,
      
      // Basic property information
      propertyType: req.body.propertyType,
      listingType: req.body.listingType,
      description: req.body.description,
      
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
      status: 'pending' // New properties start as pending for admin approval
    };
    
    // For building-related properties, add building fields
    if (!isStandaloneProperty) {
      propertyData.buildingId = req.body.buildingId;
      propertyData.floorNumber = req.body.floorNumber ? parseInt(req.body.floorNumber) : null;
      propertyData.unitNumber = req.body.unitNumber || null;
    }
    
    console.log('Final propertyData before save:', propertyData);
    console.log('BuildingId in propertyData:', propertyData.buildingId);
    console.log('Address in propertyData:', propertyData.address);
    console.log('BuildingId type:', typeof propertyData.buildingId);
    console.log('BuildingId truthy check:', !!propertyData.buildingId);
    console.log('BuildingId falsy check (!buildingId):', !propertyData.buildingId);

    // Validate building approval status if buildingId is provided
    if (propertyData.buildingId) {
      const building = await Building.findById(propertyData.buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }
      
      if (building.approvalStatus !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Cannot create property for a building that is not approved. Please wait for admin approval or contact support.'
        });
      }
      
      // Check for duplicate building-unit combination (only if unitNumber is provided and not empty)
      if (propertyData.unitNumber && propertyData.unitNumber.trim() !== '') {
        const existingProperty = await Property.findOne({
          buildingId: propertyData.buildingId,
          unitNumber: propertyData.unitNumber.trim(),
          isDeleted: { $ne: true }
        });
        
        if (existingProperty) {
          return res.status(400).json({
            success: false,
            message: `Unit ${propertyData.unitNumber} already exists in this building. Please choose a different unit number.`
          });
        }
      }
      
      // Check for duplicate building-floor combination (only if floorNumber is not null)
      if (propertyData.floorNumber !== null && propertyData.floorNumber !== undefined) {
        const existingFloorProperty = await Property.findOne({
          buildingId: propertyData.buildingId,
          floorNumber: propertyData.floorNumber,
          propertyType: 'floor',
          isDeleted: { $ne: true }
        });
        
        if (existingFloorProperty) {
          return res.status(400).json({
            success: false,
            message: `Floor ${propertyData.floorNumber} already exists in this building. Please choose a different floor number.`
          });
        }
      }
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
      propertyData.media = {
        images: imageUrls.map((url, index) => ({
          url,
          order: index,
          isPrimary: index === 0
        }))
      };
    }

    // Create new Property
    const property = new Property(propertyData);
    console.log('Property buildingId before save:', property.buildingId);
    console.log('Property address before save:', property.address);
    console.log('BuildingId type:', typeof property.buildingId);
    console.log('BuildingId value check (!property.buildingId):', !property.buildingId);
    
    // Manual validation check
    if (!property.buildingId && !property.address) {
      console.log('ERROR: Standalone property missing address');
    } else if (property.buildingId && !property.address) {
      console.log('OK: Building property without address (should be valid)');
    }
    
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
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      let message = 'A property with this information already exists.';
      
      if (duplicateField === 'unitNumber') {
        message = 'This unit number already exists in the selected building. Please choose a different unit number.';
      } else if (err.message.includes('buildingId_1_unitNumber_1')) {
        message = 'This unit number already exists in the selected building. Please choose a different unit number.';
      }
      
      return res.status(400).json({
        success: false,
        message: message
      });
    }
    
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
      .populate('ownerUserId', 'firstName lastName email phoneNumber')
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
    const userId = req.user._id || req.user.userId || req.user.id;
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
    const { status, location_link, ...updateData } = req.body;
    
    // Handle location_link separately to ensure proper nesting
    if (location_link !== undefined) {
      if (!property.location) {
        property.location = {};
      }
      property.location.location_link = location_link;
    }
    
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
    const userId = req.user._id || req.user.userId || req.user.id;
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
    const userId = req.user._id || req.user.userId || req.user.id;
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

    // Restrict owner status changes to only 'NOT AVAILABLE'
    if (isOwner && !isAdmin) {
      // Owners can only set status to 'NOT AVAILABLE' (Unavailable)
      if (status !== 'Unavailable' && status !== 'Not Available') {
        return res.status(403).json({ 
          success: false, 
          message: 'Owners can only change property status to "NOT AVAILABLE". Other status changes are handled automatically by the system.' 
        });
      }
    }

    // Use state machine methods for status transitions
    try {
      switch (status) {
        case 'Available':
          if (isOwner && !isAdmin) {
            return res.status(403).json({ 
              success: false, 
              message: 'Owners cannot manually set property to Available. This is handled automatically by the system.' 
            });
          }
          await property.makeAvailable(userId, note);
          break;
        case 'Reserved':
          if (isOwner && !isAdmin) {
            return res.status(403).json({ 
              success: false, 
              message: 'Owners cannot manually set property to Reserved. This is handled automatically by the system.' 
            });
          }
          await property.reserve(userId, note);
          break;
        case 'Unavailable':
        case 'Not Available':
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
    const userId = req.user._id || req.user.userId || req.user.id;
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
    const userId = req.user._id || req.user.userId || req.user.id;
    
    // Find approved requests (Paid/Completed status) where user is the tenant
    const approvedRequests = await Request.find({
      tenantId: userId,
      status: 'Paid/Completed'
    }).populate({
      path: 'propertyId',
      populate: {
        path: 'ownerUserId',
        select: 'firstName lastName email'
      }
    }).populate('ownerId', 'firstName lastName email');
    
    // Find properties owned by the user (buyers remain tenants by role)
    const ownedProperties = await Property.find({
      ownerUserId: userId,
      status: 'Sold',
      isDeleted: { $ne: true }
    });
    
    const assignments = {
      rentedProperties: approvedRequests
        .filter(request => request.requestType === 'Rent')
        .map(request => ({
          property: request.propertyId,
          request: {
            _id: request._id,
            requestId: request.requestId,
            status: request.status,
            approvedAt: request.updatedAt,
            requestType: request.requestType
          },
          type: 'rental'
        })),
      ownedProperties: [
        // Include properties purchased through approved requests
        ...approvedRequests
          .filter(request => request.requestType === 'Buy')
          .map(request => ({
            property: request.propertyId,
            request: {
              _id: request._id,
              requestId: request.requestId,
              status: request.status,
              approvedAt: request.updatedAt,
              requestType: request.requestType
            },
            type: 'ownership'
          })),
        // Include existing owned properties
        ...ownedProperties.map(property => ({
          property,
          type: 'ownership'
        }))
      ]
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

// Get detailed property information with ownership history for tenants
const getTenantPropertyDetails = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id || req.user.userId || req.user.id;
    
    // Verify the property exists
    const property = await Property.findById(propertyId)
      .populate('ownerUserId', 'firstName lastName email phoneNumber')
      .populate('buildingId', 'name address amenities policies media');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Check if user has access to this property (either as tenant or owner)
    const hasAccess = await checkTenantPropertyAccess(userId, propertyId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this property'
      });
    }
    
    // Get ownership transfer history for this property
    const OwnershipTransfer = require('../models/OwnershipTransfer');
    const ownershipHistory = await OwnershipTransfer.find({ 
      propertyId: property._id,
      status: 'Closed' // Only completed transfers
    })
    .populate('buyerId', 'firstName lastName email')
    .populate('sellerId', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
    // Get the most recent ownership transfer (previous owner)
    const previousOwner = ownershipHistory.length > 0 ? ownershipHistory[0].sellerId : null;
    
    // Get property state history
    const stateHistory = property.stateHistory || [];
    
    // Get building information if property is part of a building
    let buildingInfo = null;
    if (property.buildingId) {
      buildingInfo = {
        name: property.buildingId.name,
        address: property.buildingId.address,
        amenities: property.buildingId.amenities,
        policies: property.buildingId.policies
      };
    }
    
    // Prepare the response
    const propertyDetails = {
      basicInfo: {
        _id: property._id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        propertyType: property.propertyType,
        listingType: property.listingType,
        status: property.status,
        price: property.pricing?.sale || property.price,
        rent: property.pricing?.rent,
        bedrooms: property.specifications?.bedrooms,
        bathrooms: property.specifications?.bathrooms,
        squareFootage: property.specifications?.squareFootage,
        yearBuilt: property.yearBuilt,
        description: property.description,
        images: property.images
      },
      currentOwner: property.ownerUserId,
      previousOwner: previousOwner,
      ownershipHistory: ownershipHistory.map(transfer => ({
        transferId: transfer._id,
        buyer: transfer.buyerId,
        seller: transfer.sellerId,
        agreedPrice: transfer.agreedPrice,
        currency: transfer.currency,
        transferDate: transfer.closing?.completedAt || transfer.updatedAt,
        status: transfer.status
      })),
      stateHistory: stateHistory,
      buildingInfo: buildingInfo,
      specifications: property.specifications,
      amenities: property.amenities,
      policies: property.policies
    };
    
    res.json({
      success: true,
      message: 'Property details retrieved successfully',
      property: propertyDetails
    });
  } catch (err) {
    console.error('Error getting tenant property details:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Helper function to check if tenant has access to a property
const checkTenantPropertyAccess = async (userId, propertyId) => {
  try {
    // Check if user owns the property
    const ownedProperty = await Property.findOne({
      _id: propertyId,
      ownerUserId: userId,
      isDeleted: { $ne: true }
    });
    
    if (ownedProperty) return true;
    
    // Check if user is a tenant in an active rent for this property
    const Rent = require('../models/Rent');
    const activeRent = await Rent.findOne({
      propertyId: propertyId,
      tenants: userId,
      status: 'Active'
    });
    
    if (activeRent) return true;
    
    // Check if user has an approved request for this property
    const Request = require('../models/Request');
    const approvedRequest = await Request.findOne({
      propertyId: propertyId,
      tenantId: userId,
      status: 'Paid/Completed'
    });
    
    return !!approvedRequest;
  } catch (err) {
    console.error('Error checking tenant property access:', err);
    return false;
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

// Get properties where user is a tenant
const getTenantProperties = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    console.log('🔍 getTenantProperties called for user:', userId);
    
    // Find all active rents where user is a tenant (only rental properties, not owned)
    const activeRents = await Rent.find({
      tenants: userId,
      status: 'Active'
    }).populate('propertyId');
    console.log('🏠 Found active rents:', activeRents.length);
    
    // Extract properties from active rents
    const rentedProperties = activeRents.map(rent => rent.propertyId).filter(property => property);
    console.log('🏘️ Extracted rented properties:', rentedProperties.length);
    
    console.log('✅ Total rental properties for tenant:', rentedProperties.length);
    
    res.json({
      success: true,
      count: rentedProperties.length,
      properties: rentedProperties
    });
  } catch (err) {
    console.error('❌ Error in getTenantProperties:', err);
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
  getTenantPropertyDetails,
  getPropertiesByBuilding,
  getPropertiesByFloor,
  getStandaloneProperties,
  searchProperties,
  checkCombination,
  getTenantProperties
};