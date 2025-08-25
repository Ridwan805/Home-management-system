const mongoose = require('mongoose');
const Request = require('./Server/models/Request');
const Payment = require('./Server/models/Payment');

async function testPaymentData() {
  try {
    await mongoose.connect('mongodb+srv://ridwanurrahman214:2lEtQG0Kg817AFRC@home-management-system.dd9wynn.mongodb.net/User?retryWrites=true&w=majority');
    
    console.log('Connected to database');
    
    // Find a request with payment data
    const request = await Request.findOne({
      'advancePayment.paymentId': { $exists: true, $ne: null }
    }).select('_id advancePayment tenantId ownerId');
    
    console.log('Request with payment:', JSON.stringify(request, null, 2));
    
    if (request && request.advancePayment && request.advancePayment.paymentId) {
      // Find the corresponding payment record
      const payment = await Payment.findOne({
        paymentId: request.advancePayment.paymentId
      });
      
      console.log('Payment record:', JSON.stringify(payment, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPaymentData();