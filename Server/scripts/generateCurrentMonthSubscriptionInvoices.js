const mongoose = require('mongoose');
const InvoiceService = require('../services/invoiceService');
require('dotenv').config();

/**
 * Script to generate subscription invoices for all existing owners for the current month
 * This is a one-time script to create invoices for the current billing period
 */
async function generateCurrentMonthSubscriptionInvoices() {
  try {
    console.log('🚀 Starting subscription invoice generation for current month...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/home-management');
    console.log('📊 Connected to MongoDB');
    
    // Generate subscription invoices for all owners
    const results = await InvoiceService.generateMonthlySubscriptionInvoices();
    
    console.log('✅ Subscription invoice generation completed:');
    console.log(`   - Success: ${results.success}`);
    console.log(`   - Failed: ${results.failed}`);
    console.log(`   - Skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log('❌ Errors encountered:');
      results.errors.forEach(error => {
        console.log(`   - Owner ${error.ownerId}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating subscription invoices:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
generateCurrentMonthSubscriptionInvoices();