const express = require('express');
const router = express.Router();
const { wishlist } = require('../controllers');
const authMiddleware = require('../middleware/auth');

// All wishlist routes require authentication
router.use(authMiddleware);

// Add property to wishlist
router.post('/add', wishlist.addToWishlist);

// Remove property from wishlist
router.delete('/remove/:propertyId', wishlist.removeFromWishlist);

// Get user's wishlist
router.get('/', wishlist.getWishlist);

module.exports = router;