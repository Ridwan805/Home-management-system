const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  console.log('🔐 Auth middleware - checking token for:', req.method, req.path);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth failed: No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔑 Token received, length:', token.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    console.log('✅ Auth successful for user:', decoded.userId, 'role:', decoded.role);
    next();
  } catch (err) {
    console.log('❌ Auth failed:', err.message);
    // Check if the error is due to an expired token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired, please login again', expired: true });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
