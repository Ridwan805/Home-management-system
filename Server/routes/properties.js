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
router.get('/user', authMiddleware, propertyController.getUserProperties);

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

// GET /api/properties/:id (get property by ID)
router.get('/:id', propertyController.getPropertyById);

// PUT /api/properties/:id (update property)
router.put('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    // If new images were uploaded, add them to the existing ones
    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
      // If we're updating images, we need to get the existing ones first
      const property = await Property.findById(req.params.id);
      if (property) {
        req.body.images = [...(property.images || []), ...imageUrls];
      } else {
        req.body.images = imageUrls;
      }
    }
    await propertyController.updateProperty(req, res);
  } catch (err) {
    res.status(500).json({ message: 'Error updating property: ' + err.message });
  }
});

// DELETE /api/properties/:id (delete property)
router.delete('/:id', authMiddleware, propertyController.deleteProperty);

// PATCH /api/properties/:id (update property status)
router.patch('/:id', authMiddleware, propertyController.updatePropertyStatus);

module.exports = router;