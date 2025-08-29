const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');
const User = require('./models/User');
const OwnershipTransfer = require('./models/OwnershipTransfer');
require('dotenv').config();

async function fixBuyRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find all Buy requests with AdvancePaid status
    const buyRequests = await Request.find({
      requestType: 'Buy',
      status: 'AdvancePaid'
    }).populate('propertyId').populate('tenantId').populate('ownerId');

    console.log(`Found ${buyRequests.length} Buy requests with AdvancePaid status`);

    for (const request of buyRequests) {
      console.log(`\nProcessing request ${request._id}:`);
      console.log(`  Property: ${request.propertyId.address}`);
      console.log(`  Buyer: ${request.tenantId.firstName} ${request.tenantId.lastName}`);
      console.log(`  Owner: ${request.ownerId.firstName} ${request.ownerId.lastName}`);
      
      // Check if ownership transfer already exists
      const existingTransfer = await OwnershipTransfer.findOne({
        requestId: request._id
      });
      
      if (existingTransfer) {
        console.log(`  ✓ Ownership transfer already exists: ${existingTransfer._id}`);
        continue;
      }
      
      // Update request status to trigger ownership transfer creation
      request.status = 'Paid/Completed';
      
      // Add timeline event
      request.timeline.push({
        event: 'Status updated to trigger ownership transfer',
        actor: request.ownerId._id,
        timestamp: new Date(),
        note: 'Automatically updated to fix missing ownership transfers for Buy requests'
      });
      
      // Create ownership transfer manually since we're not going through the controller
      const property = request.propertyId;
      const transferData = {
        propertyId: request.propertyId._id,
        sellerId: request.ownerId._id,
        buyerId: request.tenantId._id,
        agreedPrice: request.payload?.financials?.offerPrice || property.price,
        currency: 'BDT',
        downPayment: {
          amount: request.advancePayment?.amount || 0,
          paidAt: new Date()
        },
        requestId: request._id
      };
      
      const transfer = new OwnershipTransfer(transferData);
      await transfer.save();
      
      // Close the ownership transfer (complete the sale)
      await transfer.close(request.ownerId._id, 'Ownership transfer completed after payment verification');
      
      // Link request to ownership transfer
      request.linkedOwnershipTransferId = transfer._id;
      
      // Add timeline event for ownership transfer
      request.timeline.push({
        event: 'Ownership transfer completed',
        actor: request.ownerId._id,
        timestamp: new Date(),
        note: `Ownership transfer ${transfer._id} completed and property sold to buyer`
      });
      
      // Save the updated request
      await request.save();
      
      console.log(`  ✓ Created ownership transfer: ${transfer._id}`);
      console.log(`  ✓ Updated request status to: ${request.status}`);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('All Buy requests have been processed and ownership transfers created.');
    
  } catch (error) {
    console.error('Error fixing buy requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixBuyRequests();