const Property = require('../models/Property');

// Get all properties (public route)
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'available' })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get top 5 properties for homepage
const getTopProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Get properties for a specific user
const getUserProperties = async (req, res) => {
  try {
    console.log('Fetching properties for user:', req.user.userId);
    console.log('User object from token:', JSON.stringify(req.user, null, 2));
    
    // First check if any properties exist with this owner
    const ownerProperties = await Property.find({ owner: req.user.userId });
    console.log('Properties with owner field:', ownerProperties.length);
    if (ownerProperties.length > 0) {
      console.log('Sample property with owner field:', JSON.stringify(ownerProperties[0], null, 2));
    }
    
    // Then check if any properties exist with this ownerId
    const ownerIdProperties = await Property.find({ ownerId: req.user.userId });
    console.log('Properties with ownerId field:', ownerIdProperties.length);
    if (ownerIdProperties.length > 0) {
      console.log('Sample property with ownerId field:', JSON.stringify(ownerIdProperties[0], null, 2));
    }
    
    // Also check for properties with owner field as string
    const ownerStringProperties = await Property.find({ owner: req.user.userId.toString() });
    console.log('Properties with owner as string:', ownerStringProperties.length);
    
    // Use $or to match either owner or ownerId field, including string versions
    const properties = await Property.find({
      $or: [
        { owner: req.user.userId },
        { owner: req.user.userId.toString() },
        { ownerId: req.user.userId },
        { ownerId: req.user.userId.toString() }
      ]
    }).sort({ createdAt: -1 });
    
    console.log('Found properties total:', properties.length);
    if (properties.length > 0) {
      console.log('Sample property:', JSON.stringify(properties[0], null, 2));
    } else {
      console.log('No properties found for this user');
      
      // Get all properties to check if there are any in the database
      const allProperties = await Property.find({});
      console.log('Total properties in database:', allProperties.length);
      if (allProperties.length > 0) {
        console.log('Sample property from database:', JSON.stringify(allProperties[0], null, 2));
        console.log('Sample property owner field:', allProperties[0].owner);
        console.log('Sample property ownerId field:', allProperties[0].ownerId);
      }
    }
    
    res.json(properties);
  } catch (err) {
    console.error('Error in getUserProperties:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};


const createProperty = async (req, res) => {
  try {
    // Combine fields from req.body and add owner and status
    const propertyData = {
      ...req.body,
      owner: req.user.userId,
      ownerId: req.user.userId, // Also set ownerId for compatibility
      status: 'pending',
    };

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    propertyData.images = imageUrls;

    // Create new Property
    const property = new Property(propertyData);
    await property.save();

    res.status(201).json({
      message: 'Property created successfully and is pending admin approval',
      property
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};


// Get property by ID
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    
    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }
    
    await Property.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Update property status
const updatePropertyStatus = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user owns the property
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    // Only allow status updates
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Validate status values
    const validStatuses = ['Available', 'Not Available', 'Sold', 'Rented', 'pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    res.json({
      message: 'Property status updated successfully',
      property: updatedProperty
    });
  } catch (err) {
    console.error('Error updating property status:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
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
  deleteProperty
};