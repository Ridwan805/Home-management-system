const mongoose = require('mongoose');
const Property = require('./models/Property');
require('dotenv').config();

console.log('🔍 Testing MongoDB connection...');
console.log('MONGO_URL:', process.env.MONGO_URL);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  console.log('Database:', mongoose.connection.db.databaseName);
  
  try {
    // List all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in database:', collections.map(c => c.name));
    
    // Create a test property
    const testProperty = new Property({
      ownerId: "usr12345",
      address: "999 Test Street, Dhaka",
      propertyType: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      squareFootage: 1000,
      price: 150000,
      description: "Test property for debugging",
      amenities: ["Test"],
      images: ["https://example.com/test.jpg"],
      yearBuilt: 2023,
      contactEmail: "test@example.com",
      contactPhone: "+8809999999999",
      threeDModelUrl: "https://example.com/test3d",
      listingType: "For Sale",
      city: "Dhaka",
      state: "Dhaka",
      zipCode: "9999"
    });
    
    console.log('💾 Attempting to save property...');
    await testProperty.save();
    console.log('✅ Test property saved successfully');
    console.log('Property ID:', testProperty._id);
    
    // Verify the property was saved
    const properties = await Property.find({});
    console.log('📊 Total properties in database:', properties.length);
    console.log('📋 Properties:', properties);
    
    // Check if the collection exists and has documents
    const propertiesCollection = mongoose.connection.db.collection('Properties');
    const count = await propertiesCollection.countDocuments();
    console.log('🔢 Direct collection count:', count);
    
    mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
}); 