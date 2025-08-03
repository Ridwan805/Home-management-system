const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// Middleware stubs (replace with real logic)
function authenticateToken(req, res, next) {
  // Example: req.user = { id: 'userId', role: 'owner' };
  // Replace with JWT/session logic
  return next();
}
function authorizeRole(roles) {
  return (req, res, next) => {
    // Example: roles = ['admin', 'owner']
    // Replace with real role check
    return next();
  };
}

// GET /api/properties - Retrieve all properties with filtering
router.get('/', async (req, res) => {
  try {
    const {
      listingType,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      city,
      state,
      zipCode,
      minYearBuilt,
      maxYearBuilt,
      hasPool,
      hasGarage
    } = req.query;

    // Build query object dynamically
    const query = {};
    if (listingType && listingType !== 'All') query.listingType = listingType;
    if (city) query.city = city;
    if (state) query.state = state;
    if (zipCode) query.zipCode = zipCode;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (minBedrooms || maxBedrooms) {
      query.bedrooms = {};
      if (minBedrooms) query.bedrooms.$gte = Number(minBedrooms);
      if (maxBedrooms) query.bedrooms.$lte = Number(maxBedrooms);
    }
    if (minYearBuilt || maxYearBuilt) {
      query.yearBuilt = {};
      if (minYearBuilt) query.yearBuilt.$gte = Number(minYearBuilt);
      if (maxYearBuilt) query.yearBuilt.$lte = Number(maxYearBuilt);
    }
    // Amenities filtering
    const amenities = [];
    if (hasPool === 'true') amenities.push('Pool');
    if (hasGarage === 'true') amenities.push('Garage');
    if (amenities.length > 0) {
      query.amenities = { $in: amenities };
    }
    const properties = await Property.find(query);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /api/properties/:id - Retrieve a single property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/properties - Create a new property (owner/admin only)
router.post('/', authenticateToken, authorizeRole(['owner', 'admin']), async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      ownerId: req.user.id, // Set ownerId from authenticated user
    };
    const property = new Property(propertyData);
    await property.save();
    res.status(201).json(property);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/properties/:id - Update property (owner/admin only)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    // Only owner or admin can update
    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    Object.assign(property, req.body);
    await property.save(); // updatedAt auto-updated
    res.json(property);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/properties/:id - Delete property (owner/admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    // Only owner or admin can delete
    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await property.deleteOne();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/properties/recommended - Get top 5 latest properties
router.get('/recommended', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 }).limit(5);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;