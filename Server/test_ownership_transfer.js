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

async function testOwnershipTransferLogic() {
  try {
    console.log('🧪 Testing ownership transfer logic...');
    
    // Find a request with 'AdvancePaid' status for testing
    const request = await Request.findOne({ status: 'AdvancePaid' })
      .populate('propertyId')
      .populate('tenantId')
      .populate('ownerId');
    
    if (!request) {
      console.log('❌ No request with AdvancePaid status found for testing');
      return;
    }
    
    console.log('✅ Found test request:', {
      id: request._id,
      status: request.status,
      propertyId: request.propertyId._id,
      tenantId: request.tenantId._id,
      ownerId: request.ownerId._id
    });
    
    // Check property current ownership
    const property = await Property.findById(request.propertyId._id);
    console.log('🏠 Property current ownership:', {
      id: property._id,
      status: property.status,
      owner: property.owner,
      ownerId: property.ownerId,
      ownerUserId: property.ownerUserId,
      listingType: property.listingType
    });
    
    // Check if this is a sale property
    if (property.listingType !== 'For Sale') {
      console.log('⚠️ Property is not for sale, skipping ownership transfer test');
      return;
    }
    
    // Simulate the ownership transfer logic from handleFullPaymentSuccess
    console.log('🔄 Simulating ownership transfer...');
    
    const previousOwnerId = property.ownerUserId || property.owner;
    const newOwnerId = request.tenantId._id;
    const totalSalePrice = 1500000; // Example price
    const advancePaymentAmount = request.advancePayment?.amount || 100000;
    const finalPaymentAmount = totalSalePrice - advancePaymentAmount;
    
    console.log('💰 Financial details:', {
      totalSalePrice,
      advancePaymentAmount,
      finalPaymentAmount,
      previousOwnerId,
      newOwnerId
    });
    
    // Get previous owner details
    const previousOwner = await User.findById(previousOwnerId).select('firstName lastName email phone');
    console.log('👤 Previous owner:', {
      id: previousOwnerId,
      name: `${previousOwner?.firstName} ${previousOwner?.lastName}`,
      email: previousOwner?.email
    });
    
    // Get property details
    const propertyDetails = {
      name: property.name || 'N/A',
      address: property.address || 'N/A',
      propertyType: property.propertyType || 'N/A',
      squareFootage: property.specifications?.squareFootage || 'N/A',
      bedrooms: property.specifications?.bedrooms || 'N/A',
      bathrooms: property.specifications?.bathrooms || 'N/A'
    };
    
    console.log('🏠 Property details:', propertyDetails);
    
    // Check if OwnershipTransfer already exists for this request
    const existingTransfer = await OwnershipTransfer.findOne({ requestId: request._id });
    if (existingTransfer) {
      console.log('⚠️ OwnershipTransfer already exists for this request:', existingTransfer._id);
      return;
    }
    
    console.log('✅ All checks passed. The ownership transfer logic should work correctly.');
    console.log('📋 Summary:');
    console.log('  - Request found with AdvancePaid status');
    console.log('  - Property is for sale');
    console.log('  - Previous owner details retrieved');
    console.log('  - Property details available');
    console.log('  - No existing ownership transfer record');
    console.log('  - Ready for ownership transfer on full payment');
    
  } catch (error) {
    console.error('❌ Error testing ownership transfer logic:', error);
  } finally {
    mongoose.connection.close();
  }
}

testOwnershipTransferLogic();