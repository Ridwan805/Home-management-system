const User = require('../models/User');
const Payment = require('../models/Payment');
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

<<<<<<< Updated upstream
    // Generate subscription invoice for new owners
    if (savedUser.role === 'Owner') {
      try {
        await generateSubscriptionInvoiceForNewOwner(savedUser._id);
        console.log('Subscription invoice generated for new owner:', savedUser._id);
      } catch (invoiceError) {
        console.error('Error generating subscription invoice for new owner:', invoiceError.message);
        // Don't fail registration if invoice generation fails
=======
    // Create default payment record for new owners
    if (role === 'Owner') {
      try {
        const defaultPayment = new Payment({
          type: 'monthly_rent', // Using existing enum value
          status: 'pending',
          method: 'stripe', // Default method
          amount: 12000,
          currency: 'BDT',
          payerId: savedUser._id,
          description: `Initial Subscription Fee - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from registration
          billingPeriod: {
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
            isRecurring: true,
            recurringFrequency: 'monthly'
          },
          metadata: {
            subscriptionPayment: true,
            initialPayment: true
          },
          tags: ['subscription', 'monthly_fee', 'initial']
        });
        
        await defaultPayment.save();
        console.log('Created default payment for new owner:', defaultPayment.paymentId);
      } catch (paymentError) {
        console.error('Error creating default payment:', paymentError.message);
        // Don't fail registration if payment creation fails
>>>>>>> Stashed changes
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
