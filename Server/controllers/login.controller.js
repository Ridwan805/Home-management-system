const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { name, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ name }, { email: name }] });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username/email or password' });
    }

    // Check if account is frozen or login is disabled
    const loginCheck = user.canUserLogin();
    if (!loginCheck.canLogin) {
      // Record the failed login attempt
      await user.recordLoginAttempt();
      
      return res.status(403).json({ 
        message: 'Account access denied',
        reason: loginCheck.reason,
        accountStatus: user.accountStatus,
        isFrozen: user.isFrozen,
        freezeReason: user.freezeReason,
        contactSupport: true
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Record failed login attempt
      await user.recordLoginAttempt();
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        accountStatus: user.accountStatus,
        subscriptionStatus: user.subscriptionStatus
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: `Login Successful! Welcome ${user.firstName}`,
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        subscriptionStatus: user.subscriptionStatus,
        hasActiveSubscription: user.hasActiveSubscription
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = login;