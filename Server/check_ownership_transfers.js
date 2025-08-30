const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');
const User = require('./models/User');
const OwnershipTransfer = require('./models/OwnershipTransfer');
const Payment = require('./models/Payment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkOwnershipTransfers() {
  try {
    console.log('🔍 Checking existing ownership transfers...');
    
    // Check all ownership transfer records
    const transfers = await OwnershipTransfer.find({}).populate('propertyId').populate('buyerId').populate('sellerId');
    console.log(`📊 Found ${transfers.length} ownership transfer records`);
    
    transfers.forEach((transfer, index) => {
      console.log(`\n${index + 1}. Transfer ID: ${transfer._id}`);
      console.log(`   Property: ${transfer.propertyId?.address || 'N/A'}`);
      console.log(`   Buyer: ${transfer.buyerId?.firstName} ${transfer.buyerId?.lastName}`);
      console.log(`   Seller: ${transfer.sellerId?.firstName} ${transfer.sellerId?.lastName}`);
      console.log(`   Status: ${transfer.status}`);
      console.log(`   Agreed Price: ${transfer.agreedPrice} ${transfer.currency}`);
      console.log(`   Request ID: ${transfer.requestId}`);
    });
    
    // Check all requests and their statuses
    console.log('\n🔍 Checking all requests...');
    const requests = await Request.find({}).populate('propertyId', 'address listingType status').populate('tenantId', 'firstName lastName').populate('ownerId', 'firstName lastName');
    console.log(`📊 Found ${requests.length} requests`);
    
    requests.forEach((request, index) => {
      console.log(`\n${index + 1}. Request ID: ${request._id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Type: ${request.requestType}`);
      console.log(`   Property: ${request.propertyId?.address || 'N/A'} (${request.propertyId?.listingType})`);
      console.log(`   Property Status: ${request.propertyId?.status}`);
      console.log(`   Tenant: ${request.tenantId?.firstName} ${request.tenantId?.lastName}`);
      console.log(`   Owner: ${request.ownerId?.firstName} ${request.ownerId?.lastName}`);
      console.log(`   Advance Payment: ${request.advancePayment?.amount || 'N/A'} (${request.advancePayment?.status || 'N/A'})`);
      console.log(`   Full Payment: ${request.fullPayment?.amount || 'N/A'} (${request.fullPayment?.status || 'N/A'})`);
    });
    
    // Check properties and their ownership status
    console.log('\n🏠 Checking all properties...');
    const properties = await Property.find({}).populate('owner').populate('ownerUserId');
    console.log(`📊 Found ${properties.length} properties`);
    
    properties.forEach((property, index) => {
      console.log(`\n${index + 1}. Property ID: ${property._id}`);
      console.log(`   Address: ${property.address}`);
      console.log(`   Status: ${property.status}`);
      console.log(`   Listing Type: ${property.listingType}`);
      console.log(`   Owner: ${property.owner}`);
      console.log(`   Owner User ID: ${property.ownerUserId}`);
      console.log(`   Sale Price: ${property.pricing?.sale || property.buyPrice || 'N/A'}`);
    });
    
    console.log('\n✅ Analysis complete.');
    
  } catch (error) {
    console.error('❌ Error checking ownership transfers:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkOwnershipTransfers();