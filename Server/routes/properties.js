const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  createProperty,
  getPropertyAssignments,
  getTenantAssignments
} = require('../controllers/property.controller');

// Simple role guard using decoded token placed by auth middleware
function authorizeRole(roles) {
  return (req, res, next) => {
    // If no specific role data on token, continue (owner flows rely on ownership checks below)
    if (!roles || roles.length === 0) return next();
    try {
      const tokenRole = req.user?.role;
      if (!tokenRole) return res.status(403).json({ error: 'Forbidden' });
      const allowed = roles.map(r => String(r).toLowerCase());
      const normalized = String(tokenRole).toLowerCase();
      if (!allowed.includes(normalized)) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save into Server/uploads regardless of where the process was started
    cb(null, path.resolve(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

// GET /api/properties - Retrieve all properties with filtering directed from propertyfilter.jsx and propertylisting.jsx
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
    // Only show public statuses //goes to controller/property.controller.js for filtering
    query.status = { $in: ['Available', 'Sold', 'Rented'] };
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
    const publicStatuses = ['Available', 'Sold', 'Rented'];
    const safe = properties.filter(p => publicStatuses.includes(p.status));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /api/properties/top - Retrieve latest 5 Available properties for homepage
router.get('/top', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'Available' })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /api/properties/user - Retrieve properties for the logged-in owner
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.userId; // set by middleware/auth.js
    const properties = await Property.find({
      $or: [
        { owner: userId },
        { ownerId: userId }
      ]
    }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
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

// POST /api/properties - Create a new property (owner/admin only) with file uploads
router.post(
  '/',
  auth,
  authorizeRole(['owner', 'admin']),
  upload.array('images', 10),
  createProperty
);

// PATCH /api/properties/:id - Update property (owner/admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    // Only owner or admin can update
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId) && req.user.role !== 'admin') {
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

// PUT /api/properties/:id/status - Update only status (owner only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const validStatuses = ['Available', 'Not Available', 'Sold', 'Rented', 'pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status value' });
    property.status = status;
    await property.save();
    res.json({ message: 'Property status updated successfully', property });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// DELETE /api/properties/:id - Delete property (owner/admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    // Only owner or admin can delete
    if (String(property.owner) !== String(req.user.userId) && String(property.ownerId) !== String(req.user.userId) && req.user.role !== 'admin') {
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

// GET /api/properties/assignments - Get property assignments for owners
router.get('/assignments', auth, authorizeRole(['owner', 'admin']), getPropertyAssignments);

// GET /api/properties/my-assignments - Get tenant's assigned properties
router.get('/my-assignments', auth, authorizeRole(['tenant', 'admin']), getTenantAssignments);

module.exports = router;