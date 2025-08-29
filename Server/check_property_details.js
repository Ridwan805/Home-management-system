const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkPropertyDetails() {
  try {
    const requestId = '68b1de89880830fd6cda7e0b';
    
    // Get the request and property details
    const request = await Request.findById(requestId);
    if (!request) {
      console.log('Request not found');
      return;
    }
    
    console.log('Request details:');
    console.log('- Property ID:', request.propertyId);
    console.log('- Advance Payment:', request.advancePayment);
    
    const property = await Property.findById(request.propertyId);
    if (!property) {
      console.log('Property not found');
      return;
    }
    
    console.log('\nProperty details:');
    console.log('- Sale Price:', property.salePrice, typeof property.salePrice);
    console.log('- Rent Price:', property.rentPrice, typeof property.rentPrice);
    console.log('- Listing Type:', property.listingType);
    console.log('- Property Type:', property.propertyType);
    
    const salePrice = property.salePrice;
    const advanceAmount = request.advancePayment?.amount || 0;
    
    console.log('\nCalculation:');
    console.log('- Sale Price:', salePrice, typeof salePrice);
    console.log('- Advance Amount:', advanceAmount, typeof advanceAmount);
    console.log('- Full Payment Amount:', salePrice - advanceAmount);
    console.log('- Is NaN?', isNaN(salePrice - advanceAmount));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkPropertyDetails();