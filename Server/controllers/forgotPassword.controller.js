const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Also add this missing import

// Get security question for a user
const getSecurityQuestion = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      securityQuestion: user.securityQuestion,
      message: 'Security question retrieved successfully'
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// Verify security answer and reset password
const resetPassword = async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify security answer
    const isAnswerCorrect = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!isAnswerCorrect) {
      return res.status(400).json({ message: 'Incorrect security answer' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = {
  getSecurityQuestion,
  resetPassword
};