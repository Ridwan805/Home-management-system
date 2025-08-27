// Server/middleware/authorizeRole.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Middleware to authorize users based on roles
module.exports = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user is an admin
      const admin = await Admin.findOne({ _id: decoded.id });
      if (admin && admin.isActive) {
        if (allowedRoles.includes('admin') || allowedRoles.includes(admin.role)) {
          req.user = admin;
          req.userType = 'admin';
          return next();
        }
      }

      // Check if user is a regular user
      const user = await User.findOne({ _id: decoded.id });
      if (user) {
        if (allowedRoles.includes('user') || allowedRoles.includes(user.role)) {
          req.user = user;
          req.userType = 'user';
          return next();
        }
      }

      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired, please login again', expired: true });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};