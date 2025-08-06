const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Admin = require('../models/Admin');

const register = require('../controllers/register.controller');
const getMe = require('../controllers/getMe.controller');
const updateUser = require('../controllers/updateUser.controller');
const { getSecurityQuestion, resetPassword } = require('../controllers/forgotPassword.controller');
const authMiddleware = require('../middleware/auth');

// ✅ Custom login route handling both users and admins
router.post('/login', async (req, res) => {
  const { name, password } = req.body;

  // First try to find a user by name or email
  const user = await User.findOne({ $or: [{ name }, { email: name }] });
  if (user) {
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        message: `Login Successful! Welcome ${user.firstName || user.name}`,
        token,
        user: {
          id: user._id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    }
  }

  // If user login fails, try admin login
  const admin = await Admin.findOne({ email: name });
  if (admin) {
    const match = await bcrypt.compare(password, admin.hashedPassword);
    if (match && admin.isActive) {
      const token = jwt.sign(
        { id: admin._id, role: 'admin', permissions: admin.permissions },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          name: admin.email.split('@')[0], // Use part of email as name
          email: admin.email,
          role: 'admin',
          permissions: admin.permissions
        }
      });
    } else if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is deactivated' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

// ✅ Other existing routes
router.post('/register', register);
router.get('/me', authMiddleware, getMe);
router.put('/update', authMiddleware, updateUser);
router.post('/forgot-password/question', getSecurityQuestion);
router.post('/forgot-password/reset', resetPassword);

module.exports = router;
