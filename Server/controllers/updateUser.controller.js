const User = require('../models/User');

const updateUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, email, name } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        message: 'First name, last name, and email are required' 
      });
    }

    // Check if email is already taken by another user
    const existingEmail = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already exists',
        field: 'email'
      });
    }

    // Check if username is already taken by another user
    const existingName = await User.findOne({ 
      name, 
      _id: { $ne: userId } 
    });
    if (existingName) {
      return res.status(400).json({ 
        message: 'Username already exists',
        field: 'name'
      });
    }

    // Update user information
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        name: name || `${firstName} ${lastName}`
      },
      { new: true, runValidators: true }
    ).select('-password -securityAnswer');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    // Handle duplicate key error from MongoDB
    if (err.code === 11000) {
      const dupField = Object.keys(err.keyPattern)[0];
      let message = '';
      if (dupField === 'email') message = 'Email already exists';
      else if (dupField === 'name') message = 'Username already exists';
      else message = 'Duplicate value';
      return res.status(400).json({ message, field: dupField });
    }
    console.error('Update user error:', err);
    res.status(500).json({ 
      message: 'Server error: ' + err.message 
    });
  }
};

module.exports = updateUser; 