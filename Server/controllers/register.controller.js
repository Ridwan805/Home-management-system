const User = require('../models/User');
const bcrypt = require('bcrypt');
const { generateSubscriptionInvoiceForNewOwner } = require('../services/invoiceService');

const register = async (req, res) => {
  const { firstName, lastName, email, name, password, role, securityQuestion, securityAnswer, phoneNumber, address } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ name });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, 10);

    const phoneNumberValue = phoneNumber || req.body.phone || '';

    const newUser = new User({
      firstName,
      lastName,
      email,
      name,
      phoneNumber: phoneNumberValue,
      address: address || '',
      password: hashedPassword,
      role, // value provided by client must match allowed enum
      securityQuestion,
      securityAnswer: hashedSecurityAnswer
    });

    const savedUser = await newUser.save();
    console.log('Saved user:', savedUser);

    // Generate subscription invoice for new owners
    if (savedUser.role === 'Owner') {
      try {
        await generateSubscriptionInvoiceForNewOwner(savedUser._id);
        console.log('Subscription invoice generated for new owner:', savedUser._id);
      } catch (invoiceError) {
        console.error('Error generating subscription invoice for new owner:', invoiceError.message);
        // Don't fail registration if invoice generation fails
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        firstName,
        lastName,
        email,
        name,
        phoneNumber: newUser.phoneNumber,
        address: newUser.address,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = register;
