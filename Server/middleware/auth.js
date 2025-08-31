const jwt = require('jsonwebtoken');
const User = require('../models/User');

<<<<<<< Updated upstream
const authMiddleware = (req, res, next) => {
=======
const authMiddleware = async (req, res, next) => {
>>>>>>> Stashed changes
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
<<<<<<< Updated upstream
    req.user = { userId: decoded.userId, role: decoded.role };
=======
    
    // Fetch current user data to check account status
    const user = await User.findById(decoded.userId).select('accountStatus isFrozen canLogin freezeReason subscriptionStatus role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Check if account is still valid for access
    const loginCheck = user.canUserLogin();
    if (!loginCheck.canLogin) {
      return res.status(403).json({ 
        message: 'Account access denied',
        reason: loginCheck.reason,
        accountStatus: user.accountStatus,
        isFrozen: user.isFrozen,
        requiresReauth: true
      });
    }
    
    req.user = { 
      userId: decoded.userId, 
      role: decoded.role,
      accountStatus: user.accountStatus,
      subscriptionStatus: user.subscriptionStatus
    };
>>>>>>> Stashed changes
    next();
  } catch (err) {
    // Check if the error is due to an expired token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired, please login again', expired: true });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware specifically for checking frozen accounts
const checkAccountStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('accountStatus isFrozen canLogin freezeReason');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const loginCheck = user.canUserLogin();
    if (!loginCheck.canLogin) {
      return res.status(403).json({ 
        message: 'Account access denied',
        reason: loginCheck.reason,
        accountStatus: user.accountStatus,
        isFrozen: user.isFrozen
      });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error checking account status: ' + err.message });
  }
};

// Middleware for subscription-related operations (only for property owners)
const checkSubscriptionAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'Owner') {
      return next(); // Skip subscription check for non-owners
    }
    
    const user = await User.findById(req.user.userId).select('subscriptionStatus hasActiveSubscription isFrozen');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.isFrozen) {
      return res.status(403).json({ 
        message: 'Account is frozen due to subscription issues',
        subscriptionStatus: user.subscriptionStatus,
        requiresPayment: true
      });
    }
    
    if (user.subscriptionStatus === 'overdue') {
      return res.status(402).json({ 
        message: 'Subscription payment is overdue',
        subscriptionStatus: user.subscriptionStatus,
        requiresPayment: true
      });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error checking subscription status: ' + err.message });
  }
};

module.exports = {
  authMiddleware,
  checkAccountStatus,
  checkSubscriptionAccess
};
