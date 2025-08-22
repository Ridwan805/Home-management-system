// Server/middleware/isAdmin.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findOne({ _id: decoded.id });

    if (!admin || admin.role !== 'admin' || !admin.isActive) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    // Check if the error is due to an expired token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired, please login again', expired: true });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
