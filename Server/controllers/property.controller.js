const Property = require('../models/Property');

// Get all properties (public route)
const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
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
    const properties = await Property.find({ ownerId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Create a new property
const createProperty = async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      ownerId: req.user.userId
    };
    
    const property = new Property(propertyData);
    await property.save();
    
    res.status(201).json({
      message: 'Property created successfully',
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
    if (String(property.ownerId) !== String(req.user.userId)) {
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
    if (property.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }
    
    await Property.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
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
  deleteProperty
}; 