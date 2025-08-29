const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');
const User = require('./models/User');
const OwnershipTransfer = require('./models/OwnershipTransfer');
require('dotenv').config();

async function testOwnershipTransferCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Check all requests to see what types exist
    const allRequests = await Request.find({})
      .populate('propertyId', 'address')
      .populate('tenantId', 'firstName lastName')
      .populate('ownerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`Found ${allRequests.length} total requests:`);
    allRequests.forEach((req, index) => {
      console.log(`${index + 1}. Request ID: ${req._id}`);
      console.log(`   Type: ${req.requestType}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Property: ${req.propertyId?.address || 'N/A'}`);
      console.log(`   Tenant: ${req.tenantId?.firstName} ${req.tenantId?.lastName}`);
      console.log(`   Owner: ${req.ownerId?.firstName} ${req.ownerId?.lastName}`);
      console.log(`   Created: ${req.createdAt}`);
      console.log(`   Linked Transfer ID: ${req.ownershipTransferId || 'None'}`);
      console.log('---');
    });

    // Check all ownership transfers
    const allTransfers = await OwnershipTransfer.find({})
      .populate('propertyId', 'address')
      .populate('buyerId', 'firstName lastName')
      .populate('sellerId', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log(`\nFound ${allTransfers.length} ownership transfers:`);
    allTransfers.forEach((transfer, index) => {
      console.log(`${index + 1}. Transfer ID: ${transfer._id}`);
      console.log(`   Status: ${transfer.status}`);
      console.log(`   Property: ${transfer.propertyId?.address || 'N/A'}`);
      console.log(`   Buyer: ${transfer.buyerId?.firstName} ${transfer.buyerId?.lastName}`);
      console.log(`   Seller: ${transfer.sellerId?.firstName} ${transfer.sellerId?.lastName}`);
      console.log(`   Agreed Price: ${transfer.agreedPrice}`);
      console.log(`   Down Payment: ${transfer.downPayment?.amount || 0}`);
      console.log(`   Request ID: ${transfer.requestId || 'None'}`);
      console.log(`   Created: ${transfer.createdAt}`);
      console.log('---');
    });

    // Check request types breakdown
    const requestTypes = await Request.aggregate([
      { $group: { _id: '$requestType', count: { $sum: 1 } } }
    ]);
    
    console.log('\nRequest types breakdown:');
    requestTypes.forEach(type => {
      console.log(`${type._id}: ${type.count}`);
    });

    // Check request statuses breakdown
    const requestStatuses = await Request.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\nRequest statuses breakdown:');
    requestStatuses.forEach(status => {
      console.log(`${status._id}: ${status.count}`);
    });

    // Check if there are any paid/completed requests
    const paidRequests = await Request.find({ status: 'Paid/Completed' })
      .populate('propertyId', 'address')
      .populate('tenantId', 'firstName lastName');
    
    console.log(`\nPaid/Completed requests: ${paidRequests.length}`);
    paidRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.requestType} - ${req.propertyId?.address} - ${req.tenantId?.firstName} ${req.tenantId?.lastName}`);
    });

  } catch (error) {
    console.error('Error testing ownership transfer:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testOwnershipTransferCreation();