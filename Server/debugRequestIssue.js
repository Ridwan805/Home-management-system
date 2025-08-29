const mongoose = require('mongoose');
const User = require('./models/User');
const Property = require('./models/Property');
const Rent = require('./models/Rent');
const OwnershipTransfer = require('./models/OwnershipTransfer');
const Request = require('./models/Request');

// Connect to MongoDB
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/dwellsync';
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugRequestIssue() {
  try {
    console.log('🔍 DEBUGGING REQUEST ISSUE');
    console.log('=' .repeat(50));
    
    // Get the current user (assuming the problematic user)
    const currentUser = await User.findById('68931f1f70da4d0dedf29d0d');
    if (!currentUser) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 CURRENT USER:');
    console.log('   ID:', currentUser._id.toString());
    console.log('   Name:', currentUser.firstName, currentUser.lastName);
    console.log('   Email:', currentUser.email);
    console.log();
    
    // Get all properties
    const allProperties = await Property.find({}).populate('owner ownerUserId');
    console.log('🏠 ALL PROPERTIES ANALYSIS:');
    console.log('   Total Properties:', allProperties.length);
    console.log();
    
    // Categorize properties
    const ownedProperties = [];
    const availableProperties = [];
    const otherProperties = [];
    
    for (const property of allProperties) {
      const ownerId = property.ownerUserId?._id || property.owner?._id;
      const isOwned = ownerId && ownerId.toString() === currentUser._id.toString();
      
      if (isOwned) {
        ownedProperties.push(property);
      } else if (['Available', 'Reserved'].includes(property.status)) {
        availableProperties.push(property);
      } else {
        otherProperties.push(property);
      }
    }
    
    console.log('📊 PROPERTY BREAKDOWN:');
    console.log('   Properties Owned by User:', ownedProperties.length);
    console.log('   Available Properties (can request):', availableProperties.length);
    console.log('   Other Properties:', otherProperties.length);
    console.log();
    
    // Show owned properties
    if (ownedProperties.length > 0) {
      console.log('🏡 PROPERTIES OWNED BY USER:');
      ownedProperties.forEach((prop, index) => {
        console.log(`   ${index + 1}. ID: ${prop._id}`);
        console.log(`      Description: ${prop.description || 'No description'}`);
        console.log(`      Status: ${prop.status}`);
        console.log(`      Type: ${prop.propertyType}`);
        console.log(`      Owner Field: ${prop.owner}`);
        console.log(`      OwnerUserId Field: ${prop.ownerUserId}`);
        console.log();
      });
    }
    
    // Show available properties user can request
    if (availableProperties.length > 0) {
      console.log('✅ PROPERTIES USER CAN REQUEST:');
      availableProperties.slice(0, 5).forEach((prop, index) => {
        const ownerId = prop.ownerUserId?._id || prop.owner?._id;
        console.log(`   ${index + 1}. ID: ${prop._id}`);
        console.log(`      Description: ${prop.description || 'No description'}`);
        console.log(`      Status: ${prop.status}`);
        console.log(`      Owner ID: ${ownerId}`);
        console.log();
      });
      if (availableProperties.length > 5) {
        console.log(`   ... and ${availableProperties.length - 5} more available properties`);
        console.log();
      }
    }
    
    // Check current rents
    const currentRents = await Rent.find({ 
      tenants: currentUser._id,
      status: { $in: ['Active', 'Pending'] }
    }).populate('propertyId');
    
    console.log('🏠 CURRENT RENTAL SITUATION:');
    console.log('   Active/Pending Rents:', currentRents.length);
    currentRents.forEach((rent, index) => {
      console.log(`   ${index + 1}. Property: ${rent.propertyId.description || rent.propertyId._id}`);
      console.log(`      Status: ${rent.status}`);
      console.log(`      Property ID: ${rent.propertyId._id}`);
      console.log();
    });
    
    // Check ownership transfers
    const ownershipTransfers = await OwnershipTransfer.find({
      buyerId: currentUser._id,
      status: { $in: ['Pending', 'Closed'] }
    }).populate('propertyId');
    
    console.log('🏡 OWNERSHIP TRANSFER SITUATION:');
    console.log('   Pending/Closed Transfers:', ownershipTransfers.length);
    ownershipTransfers.forEach((transfer, index) => {
      console.log(`   ${index + 1}. Property: ${transfer.propertyId.description || transfer.propertyId._id}`);
      console.log(`      Status: ${transfer.status}`);
      console.log(`      Property ID: ${transfer.propertyId._id}`);
      console.log();
    });
    
    // Check recent requests
    const recentRequests = await Request.find({
      tenantId: currentUser._id
    }).sort({ createdAt: -1 }).limit(5).populate('propertyId');
    
    console.log('📋 RECENT REQUESTS:');
    console.log('   Total Recent Requests:', recentRequests.length);
    recentRequests.forEach((request, index) => {
      console.log(`   ${index + 1}. Property: ${request.propertyId?.description || request.propertyId?._id || 'Property not found'}`);
      console.log(`      Status: ${request.status}`);
      console.log(`      Type: ${request.requestType}`);
      console.log(`      Created: ${request.createdAt}`);
      console.log();
    });
    
    console.log('💡 ANALYSIS:');
    console.log('   - User owns', ownedProperties.length, 'properties');
    console.log('   - User can request', availableProperties.length, 'available properties');
    console.log('   - User has', currentRents.length, 'active/pending rents');
    console.log('   - User has', ownershipTransfers.length, 'pending/closed ownership transfers');
    console.log();
    console.log('🎯 CONCLUSION:');
    console.log('   If user is getting "Cannot request your own property" error,');
    console.log('   they are likely trying to request one of their owned properties.');
    console.log('   They should request from the available properties list above.');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugRequestIssue();