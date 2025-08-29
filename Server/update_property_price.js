const mongoose = require('mongoose');
const Property = require('./models/Property');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updatePropertyPrice() {
  try {
    const propertyId = '68b1dd99207069e7e2b11681';
    const salePrice = 1500000; // Set a reasonable sale price (1.5M BDT)
    
    console.log('Updating property with ID:', propertyId);
    console.log('Setting sale price to:', salePrice);
    
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      {
        $set: {
          salePrice: salePrice
        }
      },
      { new: true }
    );
    
    if (!updatedProperty) {
      console.log('Property not found');
      return;
    }
    
    console.log('✅ Property updated successfully');
    console.log('New sale price:', updatedProperty.salePrice);
    console.log('Property type:', updatedProperty.propertyType);
    console.log('Listing type:', updatedProperty.listingType);
    
  } catch (error) {
    console.error('❌ Error updating property:', error);
  } finally {
    mongoose.connection.close();
  }
}

updatePropertyPrice();