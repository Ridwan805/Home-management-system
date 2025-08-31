const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Invoice = require('../models/Invoice');
require('dotenv').config();

const ADMIN_SUBSCRIPTION_FEE = 50000; // Admin subscription fee (higher than owner fee)

async function generateAdminSubscriptionInvoices() {
  try {
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('📊 Connected to MongoDB');

    console.log('🧾 Starting admin subscription invoice generation...');

    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 20); // Due on 20th of current month

    console.log(`🧾 Invoice period: ${currentMonthStart.toDateString()} to ${currentMonthEnd.toDateString()}`);
    console.log(`🧾 Due date: ${dueDate.toDateString()}`);

    // Get all active admins
    const admins = await Admin.find({ isActive: true });
    console.log(`🧾 Found ${admins.length} active admins for subscription invoicing`);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const admin of admins) {
      try {
        // Check if invoice already exists for this admin for current period
        const existingInvoice = await Invoice.findOne({
          billTo: admin._id,
          'lineItems.type': 'subscription',
          'period.start': { $gte: currentMonthStart },
          'period.end': { $lte: currentMonthEnd }
        });

        if (existingInvoice) {
          console.log(`🧾 Subscription invoice already exists for admin ${admin.email} for current period`);
          skippedCount++;
          continue;
        }

        // Create invoice for admin
        const invoice = new Invoice({
          billTo: admin._id,
          billFrom: admin._id, // Admin pays to themselves (system)
          propertyId: null, // No specific property for admin subscription
          issuedAt: now,
          dueDate: dueDate,
          period: {
            start: currentMonthStart,
            end: currentMonthEnd
          },
          lineItems: [{
            type: 'subscription',
            description: `Admin Platform Subscription - ${currentMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            quantity: 1,
            unitPrice: ADMIN_SUBSCRIPTION_FEE,
            amount: ADMIN_SUBSCRIPTION_FEE,
            taxable: false,
            taxRate: 0,
            taxAmount: 0
          }],
          subtotal: ADMIN_SUBSCRIPTION_FEE,
          totalDiscounts: 0,
          totalFees: 0,
          tax: 0,
          total: ADMIN_SUBSCRIPTION_FEE,
          paidAmount: 0,
          balance: ADMIN_SUBSCRIPTION_FEE,
          currency: 'BDT',
          status: 'open',
          auto: {
            generated: true,
            source: 'system',
            generatedAt: now
          },
          notes: 'Monthly admin platform subscription fee',
          terms: 'Payment due within 20 days of invoice date'
        });

        await invoice.save();
        console.log(`✅ Created subscription invoice ${invoice.invoiceNo} for admin ${admin.email}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error creating invoice for admin ${admin.email}:`, error.message);
        errors.push({ adminEmail: admin.email, error: error.message });
        failedCount++;
      }
    }

    const result = {
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      errors: errors
    };

    console.log(`🧾 Admin subscription invoice generation completed: ${JSON.stringify(result)}`);
    console.log(`✅ Admin subscription invoice generation completed:`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log(`   - ${err.adminEmail}: ${err.error}`));
    }

  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    console.log('📊 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
generateAdminSubscriptionInvoices();