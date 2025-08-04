const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { 
  getUserProperties, 
  createProperty, 
  getAllProperties,
  getTopProperties,
  getPropertyById,
  updateProperty,
  deleteProperty
} = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', getAllProperties);
router.get('/top', getTopProperties);
router.get('/:id', getPropertyById);

// Protected routes
router.get('/user', authMiddleware, getUserProperties);
router.post('/', authMiddleware, createProperty);
router.put('/:id', authMiddleware, updateProperty);
router.delete('/:id', authMiddleware, deleteProperty);

module.exports = router;