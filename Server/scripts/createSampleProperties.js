const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
require('dotenv').config();

async function createSampleProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Check if properties already exist
    const existingProperties = await Property.countDocuments();
    if (existingProperties > 0) {
      console.log(`Found ${existingProperties} existing properties. Skipping creation.`);
      return;
    }

    // Find an owner user
    let owner = await User.findOne({ role: 'Owner' });
    if (!owner) {
      // Create a sample owner if none exists
      const bcrypt = require('bcryptjs');
      owner = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'owner@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Owner',
        phoneNumber: '+1234567890'
      });
      await owner.save();
      console.log('Created sample owner user');
    }

    console.log(`Creating sample properties for Owner: ${owner.firstName} ${owner.lastName}`);

    // Create sample properties
    const sampleProperties = [
      {
        owner: owner._id,
        ownerUserId: owner._id,
        address: '123 Main Street, Downtown',
        propertyType: 'apartment_unit',
        listingType: 'For Rent',
        status: 'Available',
        specifications: {
          bedrooms: 2,
          bathrooms: 1,
          squareFootage: 850,
          furnishing: 'Semi-Furnished',
          facing: 'North',
          parkingSpots: 1
        },
        // Legacy fields for backward compatibility
        bedrooms: 2,
        bathrooms: 1,
        squareFootage: 850,
        pricing: {
          rent: 25000,
          deposit: 50000,
          currency: 'BDT'
        },
        location: {
          address: '123 Main Street',
          city: 'Dhaka',
          state: 'Dhaka Division',
          zipCode: '1000',
          country: 'Bangladesh'
        },
        amenities: ['WiFi', 'Air Conditioning', 'Parking', 'Gym'],
        description: 'Beautiful 2-bedroom apartment in the heart of downtown. Recently renovated with modern amenities and great city views.',
        contactInfo: {
          phone: owner.phoneNumber,
          email: owner.email,
          preferredContactMethod: 'both'
        }
      },
      {
        owner: owner._id,
        ownerUserId: owner._id,
        address: '456 Oak Avenue, Suburbs',
        propertyType: 'house',
        listingType: 'For Sale',
        status: 'Available',
        specifications: {
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 1500,
          furnishing: 'Unfurnished',
          facing: 'South',
          parkingSpots: 2
        },
        // Legacy fields for backward compatibility
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1500,
        pricing: {
          sale: 8500000,
          currency: 'BDT'
        },
        location: {
          address: '456 Oak Avenue',
          city: 'Chittagong',
          state: 'Chittagong Division',
          zipCode: '4000',
          country: 'Bangladesh'
        },
        amenities: ['Garden', 'Garage', 'Fireplace', 'Basement'],
        description: 'Spacious 3-bedroom house with a large garden. Perfect for families looking for a quiet neighborhood.',
        contactInfo: {
          phone: owner.phoneNumber,
          email: owner.email,
          preferredContactMethod: 'both'
        }
      },
      {
        owner: owner._id,
        ownerUserId: owner._id,
        address: '789 Pine Street, Midtown',
        propertyType: 'condo',
        listingType: 'For Rent',
        status: 'Available',
        specifications: {
          bedrooms: 1,
          bathrooms: 1,
          squareFootage: 600,
          furnishing: 'Fully Furnished',
          facing: 'East',
          parkingSpots: 1
        },
        // Legacy fields for backward compatibility
        bedrooms: 1,
        bathrooms: 1,
        squareFootage: 600,
        pricing: {
          rent: 18000,
          deposit: 36000,
          currency: 'BDT'
        },
        location: {
          address: '789 Pine Street',
          city: 'Sylhet',
          state: 'Sylhet Division',
          zipCode: '3100',
          country: 'Bangladesh'
        },
        amenities: ['WiFi', 'Air Conditioning', 'Balcony', 'Concierge'],
        description: 'Modern 1-bedroom condo with stunning city views. Fully furnished and move-in ready.',
        contactInfo: {
          phone: owner.phoneNumber,
          email: owner.email,
          preferredContactMethod: 'both'
        }
      }
    ];

    const createdProperties = await Property.insertMany(sampleProperties);
    console.log(`✅ Created ${createdProperties.length} sample properties successfully.`);
    
    // Log the created properties
    createdProperties.forEach((property, index) => {
      console.log(`${index + 1}. ${property.address} - ${property.listingType} - $${property.pricing.rent || property.pricing.sale}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating sample properties:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createSampleProperties();
}

module.exports = createSampleProperties;