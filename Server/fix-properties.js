const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Find all owner users
      const ownerUsers = await User.find({ role: 'Owner' });
      
      if (ownerUsers.length === 0) {
        console.log('No owner users found');
        process.exit(1);
      }
      
      console.log(`Found ${ownerUsers.length} owner users`);
      
      // Get all properties
      const properties = await Property.find({});
      console.log(`Found ${properties.length} properties`);
      
      // Update each property to ensure it has both owner and ownerId fields
      let updatedCount = 0;
      
      for (const property of properties) {
        // Check if property has a valid owner field
        let needsUpdate = false;
        let updateData = {};
        
        // If owner field is missing or invalid, set it to the first owner user's ID
        if (!property.owner) {
          updateData.owner = ownerUsers[0]._id;
          needsUpdate = true;
        }
        
        // If ownerId field is missing or doesn't match owner field, set it to match owner
        if (!property.ownerId || property.ownerId !== property.owner.toString()) {
          updateData.ownerId = property.owner ? property.owner.toString() : ownerUsers[0]._id.toString();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await Property.updateOne({ _id: property._id }, { $set: updateData });
          updatedCount++;
          console.log(`Updated property ${property._id}`);
        }
      }
      
      console.log(`\nUpdated ${updatedCount} properties`);
      
      // List all properties with their owner and ownerId after update
      const updatedProperties = await Property.find({});
      console.log('\nProperties after update:');
      updatedProperties.forEach(prop => {
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