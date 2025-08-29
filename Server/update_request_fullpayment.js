const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateRequestFullPayment() {
  try {
    const requestId = '68b1de89880830fd6cda7e0b';
    
    // Get the request and property details
    const request = await Request.findById(requestId).populate('propertyId');
    if (!request) {
      console.log('Request not found');
      return;
    }
    
    const property = request.propertyId;
    const salePrice = property.salePrice;
    const advanceAmount = request.advancePayment?.amount || 0;
    const fullPaymentAmount = salePrice - advanceAmount;
    
    console.log('Property sale price:', salePrice);
    console.log('Advance payment amount:', advanceAmount);
    console.log('Full payment amount to set:', fullPaymentAmount);
    
    // Update the request with fullPayment details
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        $set: {
          'fullPayment.amount': fullPaymentAmount,
          'fullPayment.currency': 'USD',
          'fullPayment.status': 'pending'
        }
      },
      { new: true }
    );
    
    console.log('✅ Request updated successfully');
    console.log('Full payment details:', updatedRequest.fullPayment);
    
  } catch (error) {
    console.error('❌ Error updating request:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateRequestFullPayment();