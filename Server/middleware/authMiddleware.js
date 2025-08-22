const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    console.log('🔐 AUTH MIDDLEWARE: Incoming request to:', req.path);
    console.log('🔐 AUTH MIDDLEWARE: Full URL:', req.originalUrl);
    console.log('🔐 AUTH MIDDLEWARE: Method:', req.method);
    console.log('🔐 AUTH MIDDLEWARE: Authorization header:', req.headers.authorization);
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header found');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    console.log('🔐 Token extracted, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully for user:', decoded.userId);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('🔐 AUTH MIDDLEWARE: Error in auth middleware:', err);
    console.error('🔐 AUTH MIDDLEWARE: Error stack:', err.stack);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;