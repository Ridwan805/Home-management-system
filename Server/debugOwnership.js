const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');
const Request = require('./models/Request');
const Rent = require('./models/Rent');
const OwnershipTransfer = require('./models/OwnershipTransfer');
require('dotenv').config();

async function debugOwnership() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    // Get the current user (from the screenshots, it appears to be user with ID 68931f1f70da4d0dedf29d0d)
    const currentUserId = '68931f1f70da4d0dedf29d0d';
    const currentUser = await User.findById(currentUserId);
    
    console.log('\n=== CURRENT USER ===');
    console.log('ID:', currentUser._id.toString());
    console.log('Name:', currentUser.firstName, currentUser.lastName);
    console.log('Email:', currentUser.email);
    console.log('Role:', currentUser.role);
    
    // Find the property they're trying to request (based on screenshot description)
    const property = await Property.findOne({
      description: { $regex: /house no 63.*road no 74.*mirpur/i }
    }).populate('ownerUserId').populate('owner');
    
    if (property) {
      console.log('\n=== PROPERTY DETAILS ===');
      console.log('Property ID:', property._id.toString());
      console.log('Description:', property.description);
      console.log('Status:', property.status);
      console.log('Property Type:', property.propertyType);
      console.log('Listing Type:', property.listingType);
      
      console.log('\n=== OWNERSHIP DETAILS ===');
      console.log('ownerUserId:', property.ownerUserId?._id?.toString() || 'null');
      console.log('owner (legacy):', property.owner?._id?.toString() || property.owner?.toString() || 'null');
      console.log('ownerId (legacy):', property.ownerId || 'null');
      
      if (property.ownerUserId) {
        console.log('Owner Name:', property.ownerUserId.firstName, property.ownerUserId.lastName);
        console.log('Owner Email:', property.ownerUserId.email);
      }
      
      // Check the ownership logic from request controller
      const ownerId = property.ownerUserId?._id || property.owner?._id;
      console.log('\n=== OWNERSHIP CHECK ===');
      console.log('Resolved Owner ID:', ownerId?.toString() || 'null');
      console.log('Current User ID:', currentUserId);
      console.log('Are they equal?', ownerId?.toString() === currentUserId);
      
      // Check if user has any active rents
      const activeRents = await Rent.find({
        tenants: currentUserId,
        status: 'Active'
      }).populate('propertyId', 'description address');
      
      console.log('\n=== USER\'S ACTIVE RENTS ===');
      console.log('Number of active rents:', activeRents.length);
      activeRents.forEach((rent, index) => {
        console.log(`Rent ${index + 1}:`);
        console.log('  Property ID:', rent.propertyId._id.toString());
        console.log('  Property Description:', rent.propertyId.description);
        console.log('  Rent Status:', rent.status);
      });
      
      // Check if user has any ownership transfers
      const ownershipTransfers = await OwnershipTransfer.find({
        $or: [
          { buyerId: currentUserId },
          { sellerId: currentUserId }
        ]
      }).populate('propertyId', 'description');
      
      console.log('\n=== USER\'S OWNERSHIP TRANSFERS ===');
      console.log('Number of ownership transfers:', ownershipTransfers.length);
      ownershipTransfers.forEach((transfer, index) => {
        console.log(`Transfer ${index + 1}:`);
        console.log('  Property ID:', transfer.propertyId._id.toString());
        console.log('  Property Description:', transfer.propertyId.description);
        console.log('  User Role:', transfer.buyerId.toString() === currentUserId ? 'Buyer' : 'Seller');
        console.log('  Status:', transfer.status);
      });
      
    } else {
      console.log('\n=== PROPERTY NOT FOUND ===');
      console.log('Could not find property with description containing "house no 63, road no 74, mirpur"');
      
      // Let's check all properties to see what's available
      const allProperties = await Property.find({ isDeleted: { $ne: true } })
        .limit(10)
        .populate('ownerUserId', 'firstName lastName email');
      
      console.log('\n=== SAMPLE PROPERTIES ===');
      allProperties.forEach((prop, index) => {
        console.log(`Property ${index + 1}:`);
        console.log('  ID:', prop._id.toString());
        console.log('  Description:', prop.description);
        console.log('  Owner ID:', prop.ownerUserId?._id?.toString() || 'null');
        console.log('  Status:', prop.status);
        console.log('  Type:', prop.propertyType);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugOwnership();