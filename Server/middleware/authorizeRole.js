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
      
      // Check if user is an admin (admin tokens use 'id' field)
      const admin = await Admin.findOne({ _id: decoded.id });
      if (admin && admin.isActive) {
        if (allowedRoles.includes('admin') || allowedRoles.includes(admin.role)) {
          req.user = admin;
          req.user.userId = admin._id;
          req.userType = 'admin';
          return next();
        }
      }

      // Check if user is a regular user (user tokens use 'userId' field)
      const userId = decoded.userId || decoded.id;
      console.log('🔐 AUTHORIZE ROLE: Looking for user with ID:', userId);
      const user = await User.findOne({ _id: userId });
      console.log('🔐 AUTHORIZE ROLE: Found user:', user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null');
      console.log('🔐 AUTHORIZE ROLE: Allowed roles:', allowedRoles);
      if (user) {
        const userRoleLower = (user.role || '').toLowerCase().replace(/[\s/_-]+/g, '');
        const allowedNormalized = allowedRoles.map(r => (r || '').toLowerCase().replace(/[\s/_-]+/g, ''));
        
        let hasAccess = allowedRoles.includes(user.role) || 
          allowedNormalized.includes('user') ||
          allowedNormalized.includes(userRoleLower);

        // Security Guard and Service Provider are dedicated service roles: strictly check allowed roles
        const isRestrictedWorker = userRoleLower === 'securityguard' || userRoleLower === 'guard' || userRoleLower === 'serviceprovider';
        if (isRestrictedWorker) {
          hasAccess = allowedNormalized.includes(userRoleLower) || allowedRoles.includes(user.role);
        } else {
          // Regular Property Users (Resident / Property Owner, Owner, Tenant)
          // 1. Unified 'Resident / Property Owner'
          if (!hasAccess && (userRoleLower === 'residentpropertyowner' || userRoleLower.includes('resident') || (userRoleLower.includes('property') && userRoleLower.includes('owner')))) {
            hasAccess = allowedNormalized.includes('owner') ||
                        allowedNormalized.includes('propertyowner') ||
                        allowedNormalized.includes('homeowner') ||
                        allowedNormalized.includes('tenant') ||
                        allowedNormalized.includes('renter') ||
                        allowedNormalized.includes('residentpropertyowner') ||
                        allowedNormalized.includes('resident') ||
                        allowedNormalized.includes('user');
          }

          // 2. Historical Owner accounts during migration
          if (!hasAccess && (userRoleLower === 'owner' || userRoleLower === 'propertyowner')) {
            hasAccess = allowedNormalized.includes('owner') ||
                        allowedNormalized.includes('propertyowner') ||
                        allowedNormalized.includes('homeowner') ||
                        allowedNormalized.includes('residentpropertyowner') ||
                        allowedNormalized.includes('user');
          }

          // 3. Historical Tenant accounts during migration
          if (!hasAccess && (userRoleLower === 'tenant' || userRoleLower === 'renter')) {
            hasAccess = allowedNormalized.includes('tenant') ||
                        allowedNormalized.includes('renter') ||
                        allowedNormalized.includes('residentpropertyowner') ||
                        allowedNormalized.includes('resident') ||
                        allowedNormalized.includes('user');
          }
        }

        if (hasAccess) {

          console.log('✅ AUTHORIZE ROLE: Access granted for role:', user.role);
          req.user = user;
          req.user.userId = user._id;
          req.userType = 'user';
          console.log('🔄 AUTHORIZE ROLE: Calling next() middleware');
          return next();
        } else {
          console.log('❌ AUTHORIZE ROLE: Role not allowed. User role:', user.role, 'Allowed:', allowedRoles);
          return res.status(403).json({ message: 'Access denied. Role not allowed.' });
        }
      } else {
        console.log('❌ AUTHORIZE ROLE: User not found in database');
        return res.status(404).json({ message: 'User not found.' });
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