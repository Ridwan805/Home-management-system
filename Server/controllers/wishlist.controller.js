const User = require('../models/User');
const Property = require('../models/Property');

// Add a property to user's wishlist
const addToWishlist = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.user.userId;

    // Validate property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Add to wishlist if not already added
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if property is already in wishlist
    if (user.wishlist.includes(propertyId)) {
      return res.status(400).json({ message: 'Property already in wishlist' });
    }

    // Add property to wishlist
    user.wishlist.push(propertyId);
    await user.save();

    return res.status(200).json({ message: 'Property added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove a property from user's wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.userId;

    // Find user and remove property from wishlist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if property is in wishlist
    if (!user.wishlist.includes(propertyId)) {
      return res.status(400).json({ message: 'Property not in wishlist' });
    }

    // Remove property from wishlist
    user.wishlist = user.wishlist.filter(id => id.toString() !== propertyId);
    await user.save();

    return res.status(200).json({ message: 'Property removed from wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's wishlist with populated property details
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user and populate wishlist with property details
    const user = await User.findById(userId).populate('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist
};