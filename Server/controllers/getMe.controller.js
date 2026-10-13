const User = require('../models/User');
const Admin = require('../models/Admin');

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    if (req.user.role === 'admin') {
      const admin = await Admin.findById(userId).select('-hashedPassword');
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      return res.json({
        _id: admin._id,
        name: admin.email.split('@')[0],
        email: admin.email,
        role: 'admin',
        permissions: admin.permissions
      });
    }

    const user = await User.findById(userId).select('-password -securityAnswer');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = getMe;

