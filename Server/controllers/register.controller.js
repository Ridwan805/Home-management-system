const User = require('../models/User');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
  const { firstName, lastName, email, name, password, role } = req.body;

  try {
    // Check existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Check existing username
    const existingUsername = await User.findOne({ name });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      name,
      password: hashed,
      role: role || 'user' // Default role if not specified
    });

    await newUser.save();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        firstName,
        lastName,
        email,
        name,
        role: newUser.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = register;