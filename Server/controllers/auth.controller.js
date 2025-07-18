const User = require('../models/User');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
  const { firstName, lastName, email, name, password, role } = req.body;

  try {
    // 🔍 Check for existing email
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    // 🔐 Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 🧾 Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      name,
      password: hashed,
      role
    });

    await newUser.save();

    // ✅ Respond
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};
