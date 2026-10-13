const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * Generate a random 6-digit numeric OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send password reset email via Resend
 */
const sendResetEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check in User model first, then Admin model
    let account = await User.findOne({ email: normalizedEmail });
    let accountType = 'user';

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      accountType = 'admin';
    }

    if (!account) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate 6-digit OTP code valid for 15 minutes
    const resetOtp = generateOtp();
    const resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);

    account.resetOtp = resetOtp;
    account.resetOtpExpires = resetOtpExpires;
    await account.save();

    const recipientName = account.name || account.firstName || (account.email ? account.email.split('@')[0] : 'User');

    // Send email via Resend API
    const emailResult = await sendPasswordResetEmail({
      to: account.email,
      resetCode: resetOtp,
      userName: recipientName
    });

    console.log(`🔐 Generated password reset OTP for ${account.email}: ${resetOtp}`);

    if (!emailResult.success) {
      // In development / testing mode with Resend free account
      return res.status(200).json({
        message: 'Password reset code generated. ' + (emailResult.error ? `(Resend status: ${emailResult.error})` : ''),
        sent: false,
        devCode: process.env.NODE_ENV !== 'production' ? resetOtp : undefined,
        note: 'If using an unverified domain on Resend free tier, testing emails can only be delivered to your registered Resend account email.'
      });
    }

    res.json({
      message: 'Password reset code has been sent to your email address.',
      sent: true
    });
  } catch (err) {
    console.error('Error in sendResetEmail:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

/**
 * Verify reset code and set new password
 */
const verifyResetCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, verification code, and new password are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Search in User then Admin
    let account = await User.findOne({ email: normalizedEmail });
    let isUser = true;

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      isUser = false;
    }

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (!account.resetOtp || !account.resetOtpExpires) {
      return res.status(400).json({ message: 'No password reset was requested for this account' });
    }

    if (new Date() > account.resetOtpExpires) {
      return res.status(400).json({ message: 'The verification code has expired. Please request a new one.' });
    }

    if (account.resetOtp.trim() !== code.toString().trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check and try again.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isUser) {
      account.password = hashedPassword;
    } else {
      account.hashedPassword = hashedPassword;
    }

    // Clear reset OTP fields
    account.resetOtp = null;
    account.resetOtpExpires = null;
    await account.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Error in verifyResetCode:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

/**
 * Legacy: Get security question for a user
 */
const getSecurityQuestion = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email ? email.trim().toLowerCase() : '' });
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

/**
 * Legacy: Verify security answer and reset password
 */
const resetPassword = async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;

  try {
    const user = await User.findOne({ email: email ? email.trim().toLowerCase() : '' });
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
  sendResetEmail,
  verifyResetCode,
  getSecurityQuestion,
  resetPassword
};