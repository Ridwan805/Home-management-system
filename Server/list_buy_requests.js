const mongoose = require('mongoose');
const Request = require('./models/Request');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function listBuyRequests() {
  try {
    const requests = await Request.find({ 
      requestType: 'Buy'
    }).select('_id requestId propertyId ownerId tenantId status advancePayment fullPayment');
    
    console.log('Buy requests with "Confirmed for Sale" status:');
    console.log('='.repeat(50));
    
    requests.forEach((request, index) => {
      console.log(`${index + 1}. Request:`);
      console.log(`   ID: ${request._id}`);
      console.log(`   Request ID: ${request.requestId}`);
      console.log(`   Property ID: ${request.propertyId}`);
      console.log(`   Owner ID: ${request.ownerId}`);
      console.log(`   Tenant ID: ${request.tenantId}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Advance Payment: ${JSON.stringify(request.advancePayment, null, 2)}`);
      console.log(`   Full Payment: ${JSON.stringify(request.fullPayment, null, 2)}`);
      console.log('-'.repeat(40));
    });
    
    console.log(`\nTotal requests found: ${requests.length}`);
    
  } catch (error) {
    console.error('❌ Error listing requests:', error);
  } finally {
    mongoose.connection.close();
  }
}

listBuyRequests();