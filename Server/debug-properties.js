const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

const Property = require('./models/Property');

async function debugProperties() {
  try {
    console.log('🔍 Debugging properties in database...\n');
    
    // Get all properties
    const allProperties = await Property.find({});
    console.log(`📊 Total properties in database: ${allProperties.length}\n`);
    
    if (allProperties.length > 0) {
      console.log('📋 All properties:');
      allProperties.forEach((property, index) => {
        console.log(`\n--- Property ${index + 1} ---`);
        console.log(`ID: ${property._id}`);
        console.log(`Address: ${property.address}`);
        console.log(`Price: ${property.price}`);
        console.log(`Status: ${property.status}`);
        console.log(`Owner (ObjectId): ${property.owner}`);
        console.log(`Owner (String): ${property.owner?.toString()}`);
        console.log(`OwnerId: ${property.ownerId}`);
        console.log(`Created: ${property.createdAt}`);
        console.log(`Updated: ${property.updatedAt}`);
      });
    } else {
      console.log('❌ No properties found in database');
    }
    
    // Check for specific user (Ridwan Rahman)
    console.log('\n🔍 Looking for properties owned by Ridwan Rahman...');
    
    // First, let's find the user
    const User = require('./models/User');
    const user = await User.findOne({ 
      $or: [
        { name: 'Ridwan Rahman' },
        { email: 'ridwanurrahman214@gmail.com' }
      ]
    });
    
    if (user) {
      console.log(`✅ Found user: ${user.name} (ID: ${user._id})`);
      
      // Look for properties with this user as owner
      const userProperties = await Property.find({
        $or: [
          { owner: user._id },
          { owner: user._id.toString() },
          { ownerId: user._id },
          { ownerId: user._id.toString() }
        ]
      });
      
      console.log(`📊 Properties found for ${user.name}: ${userProperties.length}`);
      
      if (userProperties.length > 0) {
        userProperties.forEach((property, index) => {
          console.log(`\n--- User Property ${index + 1} ---`);
          console.log(`ID: ${property._id}`);
          console.log(`Address: ${property.address}`);
          console.log(`Price: ${property.price}`);
          console.log(`Status: ${property.status}`);
          console.log(`Owner: ${property.owner}`);
          console.log(`OwnerId: ${property.ownerId}`);
        });
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error debugging properties:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugProperties(); 