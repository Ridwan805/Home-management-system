const mongoose = require('mongoose');
const Request = require('./models/Request');
const OwnershipTransfer = require('./models/OwnershipTransfer');
require('dotenv').config();

async function linkTransfersToRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find all ownership transfers that have a requestId but the request doesn't have linkedOwnershipTransferId
    const transfers = await OwnershipTransfer.find({ requestId: { $exists: true, $ne: null } });
    
    console.log(`Found ${transfers.length} ownership transfers with request IDs`);
    
    for (const transfer of transfers) {
      const request = await Request.findById(transfer.requestId);
      
      if (request && !request.ownershipTransferId) {
        console.log(`Linking transfer ${transfer._id} to request ${request._id}`);
        
        request.ownershipTransferId = transfer._id;
        await request.save();
        
        console.log(`✓ Successfully linked transfer to request`);
      } else if (request && request.ownershipTransferId) {
        console.log(`Request ${request._id} already linked to transfer ${request.ownershipTransferId}`);
      } else {
        console.log(`Request ${transfer.requestId} not found`);
      }
    }
    
    console.log('\n=== VERIFICATION ===');
    
    // Verify the links
    const allRequests = await Request.find({ requestType: 'Buy' });
    
    for (const request of allRequests) {
      console.log(`Request ${request._id}:`);
      console.log(`  Status: ${request.status}`);
      console.log(`  Linked Transfer ID: ${request.ownershipTransferId || 'None'}`);
      
      if (request.ownershipTransferId) {
        const transfer = await OwnershipTransfer.findById(request.ownershipTransferId);
        if (transfer) {
          console.log(`  ✓ Transfer exists with status: ${transfer.status}`);
        } else {
          console.log(`  ✗ Transfer not found`);
        }
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error linking transfers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

linkTransfersToRequests();