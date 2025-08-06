const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Load .env file
dotenv.config();

// Check for MONGO_URL or MONGO_URI
const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
console.log('MongoDB URI:', mongoUri);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// ✅ Ensure MongoDB connection string is present
if (!mongoUri) {
  console.error('❌ MongoDB connection string is not defined. Check your .env file for MONGO_URL or MONGO_URI.');
  process.exit(1);
}

async function seed() {
  try {
    // Use either MONGO_URL or MONGO_URI
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    const existingAdmins = await Admin.find({});
    if (existingAdmins.length > 0) {
      console.log('✅ Admins already exist. Skipping...');
      return process.exit(0);
    }

    const admins = [
      {
        email: 'admin1@dwell.com',
        hashedPassword: await bcrypt.hash('admin1pass', 10),
        isActive: true,
        role: 'admin',
        permissions: ['manage_users', 'manage_properties', 'handle_reports'],
      },
      {
        email: 'admin2@dwell.com',
        hashedPassword: await bcrypt.hash('admin2pass', 10),
        isActive: true,
        role: 'admin',
        permissions: ['manage_users', 'manage_properties', 'handle_reports'],
      },
    ];

    await Admin.insertMany(admins);
    console.log('✅ Admins seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed admins:', err);
    process.exit(1);
  }
}

seed();
