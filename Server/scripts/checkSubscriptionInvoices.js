const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
require('dotenv').config();

async function checkSubscriptionInvoices() {
  try {
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('📊 Connected to MongoDB');

    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log(`🧾 Checking subscription invoices for period: ${currentMonthStart.toDateString()} to ${currentMonthEnd.toDateString()}`);

    // Find all subscription invoices for the current month (any status)
    const subscriptionInvoices = await Invoice.find({
      'lineItems.type': 'subscription',
      'period.start': { $gte: currentMonthStart },
      'period.end': { $lte: currentMonthEnd }
    }).populate('billTo', 'name email').populate('billFrom', 'name');

    console.log(`🧾 Found ${subscriptionInvoices.length} subscription invoices`);

    subscriptionInvoices.forEach((invoice, index) => {
      const subscriptionItem = invoice.lineItems.find(item => item.type === 'subscription');
      console.log(`\n${index + 1}. Invoice: ${invoice.invoiceNo}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Bill To: ${invoice.billTo?.name || 'Unknown'}`);
      console.log(`   Current Amount: ${subscriptionItem?.amount || 'N/A'}`);
      console.log(`   Total: ${invoice.total}`);
      console.log(`   Paid Amount: ${invoice.paidAmount}`);
      console.log(`   Balance: ${invoice.balance}`);
      console.log(`   Due Date: ${invoice.dueDate?.toDateString()}`);
    });

    // Also check if we can update any of them
    const updatableInvoices = subscriptionInvoices.filter(invoice => 
      ['draft', 'open'].includes(invoice.status)
    );
    
    console.log(`\n🔄 Updatable invoices (draft/open): ${updatableInvoices.length}`);
    
    if (updatableInvoices.length > 0) {
      console.log('\n📝 Would you like to update these invoices? They can be updated to 30000.');
      updatableInvoices.forEach(invoice => {
        const subscriptionItem = invoice.lineItems.find(item => item.type === 'subscription');
        console.log(`   - ${invoice.invoiceNo}: ${subscriptionItem?.amount} → 30000`);
      });
    }

  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    console.log('\n📊 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
checkSubscriptionInvoices();