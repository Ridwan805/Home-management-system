const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');
const Payment = require('./models/Payment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testPropertyStatusUpdate() {
  try {
    console.log('🔍 Looking for completed payments that should trigger property status updates...');
    
    // Find requests with completed advance payments
    const completedRequests = await Request.find({
      'advancePayment.status': 'Paid',
      status: 'AdvancePaid'
    }).populate('propertyId').populate('tenantId');
    
    console.log(`Found ${completedRequests.length} completed advance payment requests`);
    
    for (const request of completedRequests) {
      console.log(`\n📋 Processing request: ${request._id}`);
      console.log(`   Property ID: ${request.propertyId._id}`);
      console.log(`   Property Status: ${request.propertyId.status}`);
      console.log(`   Property Listing Type: ${request.propertyId.listingType}`);
      console.log(`   Tenant ID: ${request.tenantId._id}`);
      
      const property = request.propertyId;
      const tenantId = request.tenantId._id;
      const requestId = request._id;
      
      // Check if property status needs updating
      if (property.listingType === 'For Sale' && property.status !== 'Sold') {
        console.log(`   🏠 Property should be SOLD but is currently: ${property.status}`);
        console.log(`   🔧 Attempting to update property status to Sold...`);
        
        try {
          await property.sell(tenantId, tenantId, `Manually triggered: Set to Sold after advance payment completion for request ${requestId}`);
          console.log(`   ✅ Property status updated to Sold successfully`);
        } catch (error) {
          console.log(`   ❌ Failed to update property to Sold:`, error.message);
        }
        
      } else if (property.listingType === 'For Rent' && property.status !== 'Rented') {
        console.log(`   🏠 Property should be RENTED but is currently: ${property.status}`);
        console.log(`   🔧 Attempting to update property status to Rented...`);
        
        try {
          await property.rent(tenantId, null, `Manually triggered: Set to Rented after advance payment completion for request ${requestId}`);
          console.log(`   ✅ Property status updated to Rented successfully`);
        } catch (error) {
          console.log(`   ❌ Failed to update property to Rented:`, error.message);
        }
        
      } else {
        console.log(`   ✅ Property status is already correct: ${property.status}`);
      }
    }
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testPropertyStatusUpdate();