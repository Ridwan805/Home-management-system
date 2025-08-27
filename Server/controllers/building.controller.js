const Building = require('../models/Building');
const Property = require('../models/Property');
const BuildingSummary = require('../models/BuildingSummary');

// Get all buildings with optional filters
const getAllBuildings = async (req, res) => {
  try {
    const {
      city,
      state,
      zipCode,
      minUnits,
      maxUnits,
      hasElevator,
      hasGenerator,
      hasParking,
      hasSecurity,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = { status: 'Active' };

    // Location filters
    if (city) {
      filter['address.city'] = { $regex: new RegExp(city, 'i') };
    }
    if (state) {
      filter['address.state'] = { $regex: new RegExp(state, 'i') };
    }
    if (zipCode) {
      filter['address.zipCode'] = { $regex: new RegExp(zipCode, 'i') };
    }

    // Unit count filters
    if (minUnits) {
      filter['summaries.units.total'] = { $gte: Number(minUnits) };
    }
    if (maxUnits) {
      filter['summaries.units.total'] = { ...filter['summaries.units.total'], $lte: Number(maxUnits) };
    }

    // Amenity filters
    if (hasElevator === 'true') {
      filter['amenities.elevators.available'] = true;
    }
    if (hasGenerator === 'true') {
      filter['amenities.generator.available'] = true;
    }
    if (hasParking === 'true') {
      filter['amenities.parking.available'] = true;
    }
    if (hasSecurity === 'true') {
      filter['amenities.security.available'] = true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const buildings = await Building.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('managedBy', 'firstName lastName email')
      .lean();

    const total = await Building.countDocuments(filter);

    res.json({
      success: true,
      count: buildings.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      buildings
    });
  } catch (err) {
    console.error('Error in getAllBuildings:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Get building by ID with properties
const getBuildingById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeProperties = 'true' } = req.query;

    const building = await Building.findById(id)
      .populate('managedBy', 'firstName lastName email');

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    let result = { building };

    if (includeProperties === 'true') {
      const properties = await Property.find({ buildingId: id })
        .populate('ownerUserId', 'firstName lastName email')
        .populate('currentRentId')
        .sort({ floorNumber: 1, unitNumber: 1 });

      result.properties = properties;
      result.propertyCount = properties.length;
    }

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Error in getBuildingById:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Create new building
const createBuilding = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Only Admin can create buildings
    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create buildings'
      });
    }

    const buildingData = {
      ...req.body,
      managedBy: userId,
      createdBy: userId,
      updatedBy: userId
    };

    const building = new Building(buildingData);
    await building.save();

    const populatedBuilding = await Building.findById(building._id)
      .populate('managedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Building created successfully',
      building: populatedBuilding
    });
  } catch (err) {
    console.error('Error creating building:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Update building
const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check authorization (Admin or building manager)
    const isManager = building.managedBy?.toString() === userId;
    const isAdmin = userRole === 'Admin';

    if (!isManager && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this building'
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date()
    };

    Object.assign(building, updateData);
    await building.save();

    const updatedBuilding = await Building.findById(id)
      .populate('managedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Building updated successfully',
      building: updatedBuilding
    });
  } catch (err) {
    console.error('Error updating building:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Delete building (soft delete)
const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Only Admin can delete buildings
    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete buildings'
      });
    }

    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if building has active properties
    const activeProperties = await Property.countDocuments({
      buildingId: id,
      status: { $in: ['Available', 'Reserved', 'Rented'] }
    });

    if (activeProperties > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete building with ${activeProperties} active properties`
      });
    }

    building.status = 'Inactive';
    building.updatedBy = userId;
    building.updatedAt = new Date();
    await building.save();

    res.json({
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting building:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Get building properties by floor
const getBuildingPropertiesByFloor = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    const properties = await Property.find({ buildingId: id })
      .populate('ownerUserId', 'firstName lastName email')
      .populate('currentRentId')
      .sort({ floorNumber: 1, unitNumber: 1 });

    // Group properties by floor
    const propertiesByFloor = properties.reduce((acc, property) => {
      const floor = property.floorNumber || 'Ground';
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(property);
      return acc;
    }, {});

    res.json({
      success: true,
      building: {
        _id: building._id,
        name: building.name,
        address: building.fullAddress
      },
      propertiesByFloor,
      totalProperties: properties.length
    });
  } catch (err) {
    console.error('Error in getBuildingPropertiesByFloor:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Get building summary
const getBuildingSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    let summary = await BuildingSummary.findOne({ buildingId: id });
    
    if (!summary) {
      // Create summary if it doesn't exist
      summary = await BuildingSummary.updateForBuilding(id);
    }

    res.json({
      success: true,
      building: {
        _id: building._id,
        name: building.name,
        address: building.fullAddress
      },
      summary
    });
  } catch (err) {
    console.error('Error in getBuildingSummary:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Update building summaries
const updateBuildingSummaries = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Only Admin can trigger summary updates
    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update building summaries'
      });
    }

    const { buildingId } = req.body;

    if (buildingId) {
      // Update specific building
      const summary = await BuildingSummary.updateForBuilding(buildingId);
      res.json({
        success: true,
        message: 'Building summary updated successfully',
        summary
      });
    } else {
      // Update all buildings
      await BuildingSummary.updateAll();
      res.json({
        success: true,
        message: 'All building summaries updated successfully'
      });
    }
  } catch (err) {
    console.error('Error updating building summaries:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

// Search buildings by location
const searchBuildingsByLocation = async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const buildings = await Building.findByLocation(
      Number(lat),
      Number(lng),
      Number(radius),
      Number(limit)
    );

    res.json({
      success: true,
      count: buildings.length,
      buildings
    });
  } catch (err) {
    console.error('Error in searchBuildingsByLocation:', err);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err.message
    });
  }
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingPropertiesByFloor,
  getBuildingSummary,
  updateBuildingSummaries,
  searchBuildingsByLocation
};