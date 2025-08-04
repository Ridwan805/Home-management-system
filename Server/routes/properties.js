const express = require('express');
const router = express.Router();
const { getUserProperties, createProperty, getAllProperties } = require('../controllers/property.controller');
const authMiddleware = require('../middleware/auth');

// Protected routes - require authentication
router.get('/user', authMiddleware, getUserProperties);
router.post('/', authMiddleware, createProperty);

// Public route
router.get('/', getAllProperties);

module.exports = router;