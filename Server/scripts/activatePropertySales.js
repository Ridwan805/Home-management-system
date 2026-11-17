const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Property = require('../models/Property');

async function activateSales() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    const updated = await Property.findByIdAndUpdate(
      '6afa89f5d69cbeda59cf3ddb',
      {
        $set: {
          listingType: 'For Sale',
          price: 18000000,
          'pricing.sale': 18000000,
          'pricing.deposit': 0,
          status: 'Available'
        },
        $unset: {
          'pricing.rent': '',
          'pricing.monthlyRent': ''
        }
      },
      { new: true }
    ).lean();

    console.log('Plot 42 re-activated:');
    console.log({
      id: updated._id,
      address: updated.address,
      listingType: updated.listingType,
      price: updated.price,
      pricing: updated.pricing,
      status: updated.status
    });

    process.exit(0);
  } catch (err) {
    console.error('Error activating property sales:', err);
    process.exit(1);
  }
}

activateSales();
