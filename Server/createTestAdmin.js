require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Check if test admin already exists
    const existingAdmin = await Admin.findOne({ email: 'testadmin@dwell.com' });
    if (existingAdmin) {
      console.log('Test admin already exists');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('testadmin123', 10);
    
    // Create new admin
    const newAdmin = new Admin({
      email: 'testadmin@dwell.com',
      hashedPassword: hashedPassword,
      role: 'admin',
      isActive: true,
      permissions: ['manage_users', 'manage_properties', 'handle_reports', 'all_user_functions']
    });
    
    await newAdmin.save();
    console.log('Test admin created successfully!');
    console.log('Email: testadmin@dwell.com');
    console.log('Password: testadmin123');
    
  } catch (error) {
    console.error('Error creating test admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestAdmin();