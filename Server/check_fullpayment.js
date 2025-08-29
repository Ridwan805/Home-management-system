const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');

const checkFullPayment = async () => {
  try {
    const request = await Request.findById('68b2118aba54b3f37b74d622')
      .populate('tenantId')
      .populate('propertyId');
    
    console.log('Full request data:');
    console.log('fullPayment field:', request.fullPayment);
    console.log('fullPayment type:', typeof request.fullPayment);
    console.log('fullPayment isPaid:', request.fullPayment?.isPaid);
    console.log('fullPayment check result:', !!(request.fullPayment && request.fullPayment.isPaid));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFullPayment();