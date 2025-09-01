const mongoose = require('mongoose');
const MaintenanceReport = require('../models/MaintenanceReport');
const User = require('../models/User');
const Property = require('../models/Property');
require('dotenv').config();

async function createSampleMaintenanceReports() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find an owner and tenant
    const owner = await User.findOne({ role: 'Owner' });
    const tenant = await User.findOne({ role: 'Tenant' });
    
    if (!owner || !tenant) {
      console.log('Need both Owner and Tenant users in database');
      return;
    }

    // Find any property and use the first owner we find
    const property = await Property.findOne();
    
    if (!property) {
      console.log('Need at least one property in database');
      return;
    }
    
    // Use the property's owner
    const propertyOwner = await User.findById(property.owner || property.ownerId);
    if (!propertyOwner) {
      console.log('Property owner not found');
      return;
    }

    console.log(`Creating sample reports for Owner: ${propertyOwner.name}, Tenant: ${tenant.name}, Property: ${property.address}`);

    // Create sample maintenance reports
    const sampleReports = [
      {
        reporterId: tenant._id,
        ownerId: propertyOwner._id,
        propertyId: property._id,
        issueType: 'plumbing',
        title: 'Kitchen Sink Leak',
        description: 'The kitchen sink has been leaking for the past few days. Water is dripping from under the sink and causing damage to the cabinet.',
        floor: 2,
        room: 'Kitchen',
        priority: 'high',
        status: 'pending',
        isUrgent: true,
        tenantAvailability: {
          weekdays: ['Monday', 'Tuesday', 'Wednesday'],
          timeSlots: ['9:00 AM - 12:00 PM', '2:00 PM - 5:00 PM']
        }
      },
      {
        reporterId: tenant._id,
        ownerId: propertyOwner._id,
        propertyId: property._id,
        issueType: 'electrical',
        title: 'Bedroom Light Not Working',
        description: 'The main light in the master bedroom stopped working yesterday. The switch seems fine but the bulb is not turning on.',
        floor: 2,
        room: 'Master Bedroom',
        priority: 'medium',
        status: 'in_progress',
        isUrgent: false,
        tenantAvailability: {
          weekdays: ['Thursday', 'Friday'],
          timeSlots: ['10:00 AM - 2:00 PM']
        }
      },
      {
        reporterId: tenant._id,
        ownerId: propertyOwner._id,
        propertyId: property._id,
        issueType: 'heating_cooling',
        title: 'Air Conditioning Not Cooling',
        description: 'The AC unit in the living room is running but not cooling properly. The air coming out is warm.',
        floor: 1,
        room: 'Living Room',
        priority: 'high',
        status: 'resolved',
        isUrgent: true,
        resolvedAt: new Date(),
        resolvedBy: propertyOwner._id,
        resolutionNotes: 'Replaced the AC filter and recharged the refrigerant. System is now working properly.',
        actualCost: 150,
        tenantAvailability: {
          weekdays: ['Monday', 'Wednesday', 'Friday'],
          timeSlots: ['8:00 AM - 12:00 PM']
        }
      }
    ];

    // Insert the sample reports
    const createdReports = await MaintenanceReport.insertMany(sampleReports);
    console.log(`Created ${createdReports.length} sample maintenance reports:`);
    
    createdReports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.title} - Status: ${report.status}`);
    });

    console.log('Sample maintenance reports created successfully!');
    
  } catch (error) {
    console.error('Error creating sample maintenance reports:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createSampleMaintenanceReports();