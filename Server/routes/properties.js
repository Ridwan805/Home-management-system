const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const authMiddleware = require('../middleware/authMiddleware');
const propertyController = require('../controllers/property.controller');
const multer = require('multer');
const path = require('path');

// Set up multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Protected routes
router.get('/user', authMiddleware, async (req, res) => {
  try {
    // Make sure we're getting the userId from the authenticated user
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    

    const properties = await Property.find({ ownerId: req.user.userId })
      .sort({ createdAt: -1 });
    
    // Changed this condition since find() returns an empty array if no properties
    if (!properties || properties.length === 0) {
      return res.json([]); // Return empty array instead of 404
    }

    res.json(properties);
  } catch (err) {
    console.error('Error in /user route:', err);
    res.status(500).json({ message: 'Error fetching properties: ' + err.message });
  }
});

router.get('/top', propertyController.getTopProperties);

// GET /api/properties (public route to fetch all properties)
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// POST /api/properties (create property with image upload)
router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    // Collect image URLs
    const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    // Merge image URLs into req.body
    req.body.images = imageUrls;
    await propertyController.createProperty(req, res);
  } catch (err) {
    res.status(500).json({ message: 'Error uploading property: ' + err.message });
  }
});

module.exports = router;