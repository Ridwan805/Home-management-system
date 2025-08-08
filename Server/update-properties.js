const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Find an owner user to use as reference
      const ownerUser = await User.findOne({ role: 'Owner' });
      
      if (!ownerUser) {
        console.log('No owner user found');
        process.exit(1);
      }
      
      console.log('Found owner user:', ownerUser._id);
      
      // Update properties that don't have owner field
      const updateOwnerResult = await Property.updateMany(
        { owner: { $exists: false } },
        { $set: { owner: ownerUser._id } }
      );
      
      console.log(`Updated ${updateOwnerResult.modifiedCount} properties with missing owner field`);
      
      // Update properties with hardcoded ownerId to use ObjectId
      const updateOwnerIdResult = await Property.updateMany(
        { 
          $or: [
            { ownerId: { $type: 'string' } },
            { ownerId: { $exists: false } },
            { ownerId: null }
          ]
        },
        { 
          $set: { 
            ownerId: ownerUser._id.toString(),
            owner: ownerUser._id 
          } 
        }
      );
      
      console.log(`Updated ${updateOwnerIdResult.modifiedCount} properties with hardcoded ownerId`);
      
      // List all properties with their owner and ownerId
      const properties = await Property.find({});
      console.log('\nAll properties:');
      properties.forEach(prop => {
        console.log(`ID: ${prop._id}, owner: ${prop.owner}, ownerId: ${prop.ownerId}`);
      });
      
      console.log('\nUpdate completed successfully');
    } catch (error) {
      console.error('Error updating properties:', error);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });