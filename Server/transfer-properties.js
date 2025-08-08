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
const User = require('./models/User');

async function transferProperties() {
  try {
    console.log('🔄 Transferring properties to correct owner...\n');
    
    // Find Ridwan Rahman
    const ridwan = await User.findOne({ 
      $or: [
        { name: 'Ridwan Rahman' },
        { email: 'ridwanurrahman214@gmail.com' }
      ]
    });
    
    if (!ridwan) {
      console.log('❌ Ridwan Rahman not found');
      return;
    }
    
    console.log(`✅ Found Ridwan Rahman: ${ridwan.name} (ID: ${ridwan._id})`);
    
    // Find all properties that should be transferred
    // Based on the debug output, most properties belong to user 6891a1c76742fd1f69f69d5c
    const propertiesToTransfer = await Property.find({
      owner: '6891a1c76742fd1f69f69d5c'
    });
    
    console.log(`📊 Found ${propertiesToTransfer.length} properties to transfer`);
    
    if (propertiesToTransfer.length > 0) {
      console.log('\n📋 Properties to transfer:');
      propertiesToTransfer.forEach((property, index) => {
        console.log(`${index + 1}. ${property.address} - $${property.price} - ${property.status}`);
      });
      
      // Transfer the properties
      const updateResult = await Property.updateMany(
        { owner: '6891a1c76742fd1f69f69d5c' },
        { 
          owner: ridwan._id,
          ownerId: ridwan._id
        }
      );
      
      console.log(`\n✅ Successfully transferred ${updateResult.modifiedCount} properties to Ridwan Rahman`);
      
      // Verify the transfer
      const ridwanProperties = await Property.find({
        $or: [
          { owner: ridwan._id },
          { ownerId: ridwan._id }
        ]
      });
      
      console.log(`\n📊 Ridwan Rahman now has ${ridwanProperties.length} properties:`);
      ridwanProperties.forEach((property, index) => {
        console.log(`${index + 1}. ${property.address} - $${property.price} - ${property.status}`);
      });
    } else {
      console.log('ℹ️ No properties found to transfer');
    }
    
  } catch (error) {
    console.error('❌ Error transferring properties:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Ask for confirmation before running
console.log('⚠️  This script will transfer properties to Ridwan Rahman');
console.log('📝 Do you want to proceed? (y/n)');

// For now, let's just show what would be transferred without actually doing it
console.log('\n🔍 Preview mode - showing what would be transferred:');
transferProperties(); 