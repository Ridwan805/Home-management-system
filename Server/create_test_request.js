const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');

async function createTestRequest() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/home-management');
    console.log('✅ Connected to database');

    // Find users
    const tenant = await User.findOne({ role: 'Tenant' });
    const owner = await User.findOne({ role: 'Owner' });
    
    if (!tenant || !owner) {
      console.log('❌ Missing required users');
      console.log('Tenant found:', !!tenant);
      console.log('Owner found:', !!owner);
      return;
    }
    
    console.log('✅ Found users:');
    console.log('   - Tenant:', tenant.email);
    console.log('   - Owner:', owner.email);

    // Find or create a property
    let property = await Property.findOne({ ownerId: owner._id });
    
    if (!property) {
      console.log('🏠 Creating test property...');
      property = new Property({
        title: 'Test Property for Payment',
        description: 'A test property for payment functionality testing',
        address: '123 Test Street, Dhanmondi, Dhaka',
        location: {
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1000',
          country: 'Bangladesh'
        },
        specifications: {
          squareFootage: 1200,
          bedrooms: 2,
          bathrooms: 1
        },
        propertyType: 'house',
        listingType: 'For Rent',
        pricing: {
          rent: 25000,
          deposit: 50000
        },
        owner: owner._id,
        status: 'Available'
      });
      await property.save();
      console.log('✅ Created test property:', property._id);
    } else {
      console.log('✅ Found existing property:', property._id);
    }

    // Create a test request
    console.log('📝 Creating test request...');
    const testRequest = new Request({
      tenantId: tenant._id,
      ownerId: owner._id,
      propertyId: property._id,
      requestType: 'Rent',
      status: 'Approved – Pay Advance',
      payload: {
        familyMembers: [{
          name: 'Test Tenant',
          relation: 'Self',
          age: 30
        }],
        belongings: {
          items: ['Furniture', 'Electronics'],
          hasPets: false,
          hasVehicle: false
        },
        occupation: {
          employmentType: 'employed',
          role: 'Software Developer',
          yearsOfExperience: 5,
          companyName: 'Test Company'
        },
        identity: {
          nidFileUrl: 'test-nid.jpg',
          personalPhotoUrl: 'test-photo.jpg'
        },
        financials: {
          monthlyIncome: 50000
        },
        letterToOwner: 'This is a test request for payment functionality testing. Please approve for testing purposes.'
      },
      consent: {
        agreed: true,
        version: 'v1.0',
        timestamp: new Date()
      },
      advancePayment: {
        status: 'pending',
        amount: 25000,
        currency: 'BDT',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isPaid: false,
        canPayAgain: true,
        instructions: 'Please pay the advance amount to proceed with the rental.'
      },
      timeline: [
        {
          event: 'Request created',
          actor: tenant._id,
          timestamp: new Date(),
          note: 'Test request created for payment testing'
        },
        {
          event: 'Request approved',
          actor: owner._id,
          timestamp: new Date(),
          note: 'Request approved for payment testing'
        }
      ]
    });

    await testRequest.save();
    console.log('✅ Created test request:', testRequest._id);
    console.log('   - Request ID:', testRequest.requestId);
    console.log('   - Status:', testRequest.status);
    console.log('   - Advance Payment (Security Deposit):', testRequest.advancePayment.amount, testRequest.advancePayment.currency);

    console.log('\n🎉 Test data created successfully!');
    console.log('You can now test the payment functionality with:');
    console.log('   - Tenant email:', tenant.email);
    console.log('   - Request ID:', testRequest._id);
    console.log('   - Advance payment amount:', testRequest.advancePayment.amount, 'BDT');

  } catch (error) {
    console.error('❌ Error creating test request:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the script
createTestRequest();