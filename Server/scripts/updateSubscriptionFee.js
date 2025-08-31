const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
require('dotenv').config();

const SUBSCRIPTION_FEE = 30000; // New subscription fee amount

async function updateSubscriptionFee() {
  try {
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('📊 Connected to MongoDB');

    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log(`🧾 Updating subscription fees for period: ${currentMonthStart.toDateString()} to ${currentMonthEnd.toDateString()}`);

    // Find all subscription invoices for the current month
    const subscriptionInvoices = await Invoice.find({
      'lineItems.type': 'subscription',
      'period.start': { $gte: currentMonthStart },
      'period.end': { $lte: currentMonthEnd },
      status: { $in: ['draft', 'open', 'overdue'] } // Only update unpaid invoices
    });

    console.log(`🧾 Found ${subscriptionInvoices.length} subscription invoices to update`);

    let updated = 0;
    let errors = [];

    for (const invoice of subscriptionInvoices) {
      try {
        // Update subscription line item amount
        const subscriptionLineItem = invoice.lineItems.find(item => item.type === 'subscription');
        if (subscriptionLineItem) {
          const oldAmount = subscriptionLineItem.amount;
          subscriptionLineItem.unitPrice = SUBSCRIPTION_FEE;
          subscriptionLineItem.amount = SUBSCRIPTION_FEE * subscriptionLineItem.quantity;
          
          // Recalculate invoice totals
          invoice.subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
          invoice.total = invoice.subtotal + invoice.totalFees + invoice.tax - invoice.totalDiscounts;
          invoice.balance = invoice.total - invoice.paidAmount;
          
          await invoice.save();
          
          console.log(`✅ Updated invoice ${invoice.invoiceNo}: ${oldAmount} → ${subscriptionLineItem.amount}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating invoice ${invoice.invoiceNo}:`, error.message);
        errors.push({ invoiceNo: invoice.invoiceNo, error: error.message });
      }
    }

    console.log(`\n✅ Subscription fee update completed:`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log(`   - ${err.invoiceNo}: ${err.error}`));
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
updateSubscriptionFee();