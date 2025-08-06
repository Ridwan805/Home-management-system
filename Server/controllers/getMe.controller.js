const User = require('../models/User');

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password -securityAnswer');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = getMe;