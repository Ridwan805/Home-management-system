const mongoose = require('mongoose');
const Rent = require('../models/Rent');
const Invoice = require('../models/Invoice');
const Property = require('../models/Property');
const User = require('../models/User');
const UserLedgerSummary = require('../models/UserLedgerSummary');
const RentBalance = require('../models/RentBalance');
const cron = require('node-cron');

class InvoiceService {
  /**
   * Generate monthly rent invoices for all active rent contracts
   * This should be run on the 1st of each month
   */
  static async generateMonthlyRentInvoices() {
    try {
      console.log('🧾 Starting monthly rent invoice generation...');
      
      // Get all active rent contracts
      const activeRents = await Rent.find({ 
        status: 'Active',
        'term.endDate': { $gte: new Date() }
      })
      .populate('propertyId', 'title address ownerUserId')
      .populate('tenants', 'name email');
      
      console.log(`🧾 Found ${activeRents.length} active rent contracts`);
      
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      for (const rent of activeRents) {
        try {
          // Check if invoice already exists for this month
          const currentMonth = new Date();
          const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
          
          const existingInvoice = await Invoice.findOne({
            rentId: rent._id,
            'billingPeriod.startDate': { $gte: startOfMonth },
            'billingPeriod.endDate': { $lte: endOfMonth }
          });
          
          if (existingInvoice) {
            console.log(`🧾 Invoice already exists for rent ${rent._id} for current month`);
            results.skipped++;
            continue;
          }
          
          // Generate invoice for each tenant
          for (const tenant of rent.tenants) {
            const invoiceData = {
              rentId: rent._id,
              propertyId: rent.propertyId._id,
              tenantId: tenant._id,
              ownerId: rent.propertyId.ownerUserId,
              type: 'Rent',
              billingPeriod: {
                startDate: startOfMonth,
                endDate: endOfMonth
              },
              dueDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), rent.rent.dueDay || 1),
              lineItems: [{
                description: `Monthly rent for ${rent.propertyId.title}`,
                amount: rent.rent.amount / rent.tenants.length, // Split among tenants
                currency: rent.rent.currency || 'BDT',
                category: 'Rent'
              }],
              totalAmount: rent.rent.amount / rent.tenants.length,
              currency: rent.rent.currency || 'BDT',
              status: 'Pending'
            };
            
            const invoice = new Invoice(invoiceData);
            await invoice.save();
            
            // Update rent balance
            await this.updateRentBalance(rent._id, tenant._id, invoice.totalAmount, 'debit');
            
            // Update user ledger summary
            await this.updateUserLedgerSummary(tenant._id, invoice.totalAmount, 'expense');
            await this.updateUserLedgerSummary(rent.propertyId.ownerUserId, invoice.totalAmount, 'income');
            
            console.log(`🧾 Generated invoice ${invoice._id} for tenant ${tenant._id}`);
          }
          
          results.success++;
          
        } catch (error) {
          console.error(`🧾 Error generating invoice for rent ${rent._id}:`, error);
          results.failed++;
          results.errors.push({
            rentId: rent._id,
            error: error.message
          });
        }
      }
      
      console.log('🧾 Monthly rent invoice generation completed:', results);
      return results;
      
    } catch (error) {
      console.error('🧾 Error in monthly rent invoice generation:', error);
      throw error;
    }
  }
  
  /**
   * Generate invoice for ownership transfer
   */
  static async generateOwnershipTransferInvoice(ownershipTransferId, userId) {
    try {
      const OwnershipTransfer = require('../models/OwnershipTransfer');
      
      const transfer = await OwnershipTransfer.findById(ownershipTransferId)
        .populate('propertyId', 'title address')
        .populate('buyerId', 'name email')
        .populate('sellerId', 'name email');
      
      if (!transfer) {
        throw new Error('Ownership transfer not found');
      }
      
      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({
        ownershipTransferId: transfer._id
      });
      
      if (existingInvoice) {
        return existingInvoice;
      }
      
      const invoiceData = {
        ownershipTransferId: transfer._id,
        propertyId: transfer.propertyId._id,
        tenantId: transfer.buyerId._id, // Buyer is the "tenant" for billing purposes
        ownerId: transfer.sellerId._id,
        type: 'Purchase',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        lineItems: [{
          description: `Property purchase: ${transfer.propertyId.title}`,
          amount: transfer.salePrice.amount,
          currency: transfer.salePrice.currency,
          category: 'Purchase'
        }],
        totalAmount: transfer.salePrice.amount,
        currency: transfer.salePrice.currency,
        status: 'Pending',
        createdBy: userId
      };
      
      // Subtract any deposit already paid
      if (transfer.deposit && transfer.deposit.amount > 0) {
        invoiceData.lineItems.push({
          description: 'Deposit credit',
          amount: -transfer.deposit.amount,
          currency: transfer.deposit.currency,
          category: 'Credit'
        });
        invoiceData.totalAmount -= transfer.deposit.amount;
      }
      
      const invoice = new Invoice(invoiceData);
      await invoice.save();
      
      // Update user ledger summaries
      await this.updateUserLedgerSummary(transfer.buyerId._id, invoice.totalAmount, 'expense');
      await this.updateUserLedgerSummary(transfer.sellerId._id, invoice.totalAmount, 'income');
      
      console.log(`🧾 Generated ownership transfer invoice ${invoice._id}`);
      return invoice;
      
    } catch (error) {
      console.error('🧾 Error generating ownership transfer invoice:', error);
      throw error;
    }
  }
  
  /**
   * Update rent balance for a tenant
   */
  static async updateRentBalance(rentId, tenantId, amount, type) {
    try {
      let balance = await RentBalance.findOne({ rentId, tenantId });
      
      if (!balance) {
        balance = new RentBalance({
          rentId,
          tenantId,
          totalOwed: 0,
          totalPaid: 0,
          balance: 0
        });
      }
      
      if (type === 'debit') {
        balance.totalOwed += amount;
        balance.balance += amount;
      } else if (type === 'credit') {
        balance.totalPaid += amount;
        balance.balance -= amount;
      }
      
      balance.lastUpdated = new Date();
      await balance.save();
      
      return balance;
      
    } catch (error) {
      console.error('🧾 Error updating rent balance:', error);
      throw error;
    }
  }
  
  /**
   * Update user ledger summary
   */
  static async updateUserLedgerSummary(userId, amount, type) {
    try {
      let summary = await UserLedgerSummary.findOne({ userId });
      
      if (!summary) {
        summary = new UserLedgerSummary({
          userId,
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          pendingPayments: 0,
          overdueAmount: 0
        });
      }
      
      if (type === 'income') {
        summary.totalIncome += amount;
        summary.netBalance += amount;
      } else if (type === 'expense') {
        summary.totalExpenses += amount;
        summary.netBalance -= amount;
        summary.pendingPayments += amount;
      }
      
      summary.lastUpdated = new Date();
      await summary.save();
      
      return summary;
      
    } catch (error) {
      console.error('🧾 Error updating user ledger summary:', error);
      throw error;
    }
  }
  
  /**
   * Process invoice payment
   */
  static async processInvoicePayment(invoiceId, paymentAmount, paymentMethod, userId) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      if (invoice.status === 'Paid') {
        throw new Error('Invoice is already paid');
      }
      
      // Update invoice status
      invoice.status = paymentAmount >= invoice.totalAmount ? 'Paid' : 'Partially Paid';
      invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
      invoice.paidAt = invoice.status === 'Paid' ? new Date() : invoice.paidAt;
      
      // Add payment record
      invoice.payments.push({
        amount: paymentAmount,
        method: paymentMethod,
        paidAt: new Date(),
        paidBy: userId
      });
      
      await invoice.save();
      
      // Update rent balance if it's a rent invoice
      if (invoice.rentId) {
        await this.updateRentBalance(invoice.rentId, invoice.tenantId, paymentAmount, 'credit');
      }
      
      // Update user ledger summaries
      const tenant = await UserLedgerSummary.findOne({ userId: invoice.tenantId });
      if (tenant) {
        tenant.pendingPayments = Math.max(0, tenant.pendingPayments - paymentAmount);
        await tenant.save();
      }
      
      console.log(`🧾 Processed payment of ${paymentAmount} for invoice ${invoiceId}`);
      return invoice;
      
    } catch (error) {
      console.error('🧾 Error processing invoice payment:', error);
      throw error;
    }
  }
  
  /**
   * Mark overdue invoices
   */
  static async markOverdueInvoices() {
    try {
      console.log('🧾 Checking for overdue invoices...');
      
      const overdueInvoices = await Invoice.updateMany(
        {
          status: { $in: ['Pending', 'Partially Paid'] },
          dueDate: { $lt: new Date() }
        },
        {
          $set: { status: 'Overdue' }
        }
      );
      
      console.log(`🧾 Marked ${overdueInvoices.modifiedCount} invoices as overdue`);
      
      // Update user ledger summaries for overdue amounts
      const overdueInvoicesList = await Invoice.find({
        status: 'Overdue'
      });
      
      for (const invoice of overdueInvoicesList) {
        const summary = await UserLedgerSummary.findOne({ userId: invoice.tenantId });
        if (summary) {
          const overdueAmount = invoice.totalAmount - (invoice.paidAmount || 0);
          summary.overdueAmount = (summary.overdueAmount || 0) + overdueAmount;
          await summary.save();
        }
      }
      
      return overdueInvoices.modifiedCount;
      
    } catch (error) {
      console.error('🧾 Error marking overdue invoices:', error);
      throw error;
    }
  }
  
  /**
<<<<<<< Updated upstream
   * Initialize cron jobs for automatic invoice generation
=======
   * Generate subscription invoices for all property owners
   * This should be run on the 1st of each month
   */
  static async generateMonthlySubscriptionInvoices() {
    try {
      console.log('🧾 Starting monthly subscription invoice generation...');
      
      // Get all property owners (users with role 'Owner' who have properties)
      const owners = await User.find({ role: 'Owner' });
      
      console.log(`🧾 Found ${owners.length} owners for subscription invoicing`);
      
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      const currentDate = new Date();
      const billingPeriod = {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      };
      
      // Get a random admin to be the payee
      const Admin = require('../models/Admin');
      const admin = await Admin.findOne({ isActive: true });
      if (!admin) {
        throw new Error('No admin found to be the payee for subscription invoices');
      }
      
      // Get a system property for subscription invoices (use any property as placeholder)
      const Property = require('../models/Property');
      let systemProperty = await Property.findOne().limit(1);
      if (!systemProperty) {
        // Create a system property if none exists
        systemProperty = new Property({
          title: 'System Property for Subscription Billing',
          address: 'System Generated',
          propertyType: 'Other',
          listingType: 'For Rent',
          description: 'System property used for subscription billing purposes',
          ownerUserId: admin._id,
          status: 'Not Available',
          pricing: { rentAmount: 0, currency: 'BDT' },
          specifications: { bedrooms: 0, bathrooms: 0, area: 0, areaUnit: 'sqft' },
          location: { city: 'System', state: 'System', country: 'System' }
        });
        await systemProperty.save();
      }
      
      for (const owner of owners) {
        try {
          // Check if subscription invoice already exists for this billing period
          const existingInvoice = await Invoice.findOne({
            billTo: owner._id,
            billFrom: admin._id,
            'period.start': billingPeriod.start,
            'period.end': billingPeriod.end,
            'lineItems.type': 'subscription'
          });
          
          if (existingInvoice) {
            console.log(`🧾 Subscription invoice already exists for owner ${owner._id} for current period`);
            results.skipped++;
            continue;
          }
          
          // Generate subscription invoice
          const subscriptionFee = 500; // Default subscription fee in BDT
          
          const invoiceData = {
            propertyId: systemProperty._id,
            billTo: owner._id,
            billFrom: admin._id,
            period: billingPeriod,
            dueDate: this.calculateDueDate(currentDate, 15, 5), // Due on 15th with 5 days grace
            lineItems: [{
              type: 'subscription',
              description: `Monthly subscription fee for ${billingPeriod.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
              quantity: 1,
              unitPrice: subscriptionFee,
              amount: subscriptionFee,
              taxable: false
            }],
            subtotal: subscriptionFee,
            total: subscriptionFee,
            balance: subscriptionFee,
            currency: 'BDT',
            status: 'open',
            auto: {
              generated: true,
              source: 'system',
              generatedAt: new Date()
            }
          };
          
          const invoice = new Invoice(invoiceData);
          await invoice.save();
          
          // Create corresponding payment object
          await PaymentService.createPaymentForInvoice(invoice);
          
          // Update user ledger summary
          await this.updateUserLedgerSummary(owner._id, invoice.total, 'expense');
          await this.updateUserLedgerSummary(admin._id, invoice.total, 'income');
          
          console.log(`🧾 Generated subscription invoice ${invoice.invoiceNo} for owner ${owner._id}`);
          results.success++;
          
        } catch (error) {
          console.error(`🧾 Error generating subscription invoice for owner ${owner._id}:`, error);
          results.failed++;
          results.errors.push({
            ownerId: owner._id,
            error: error.message
          });
        }
      }
      
      console.log('🧾 Monthly subscription invoice generation completed:', results);
      return results;
      
    } catch (error) {
      console.error('🧾 Error in monthly subscription invoice generation:', error);
      throw error;
    }
  }
  
  /**
   * Generate subscription invoice for a new owner
   */
  static async generateSubscriptionInvoiceForNewOwner(ownerId) {
    try {
      console.log(`🧾 Generating subscription invoice for new owner ${ownerId}...`);
      
      const owner = await User.findById(ownerId);
      if (!owner || owner.role !== 'Owner') {
        throw new Error('Owner not found or invalid role');
      }
      
      // Get a random admin to be the payee
      const Admin = require('../models/Admin');
      const admin = await Admin.findOne({ isActive: true });
      if (!admin) {
        throw new Error('No admin found to be the payee for subscription invoice');
      }
      
      // Get a system property for subscription invoices (use any property as placeholder)
      const Property = require('../models/Property');
      let systemProperty = await Property.findOne().limit(1);
      if (!systemProperty) {
        // Create a system property if none exists
        systemProperty = new Property({
          title: 'System Property for Subscription Billing',
          address: 'System Generated',
          propertyType: 'Other',
          listingType: 'For Rent',
          description: 'System property used for subscription billing purposes',
          ownerUserId: admin._id,
          status: 'Not Available',
          pricing: { rentAmount: 0, currency: 'BDT' },
          specifications: { bedrooms: 0, bathrooms: 0, area: 0, areaUnit: 'sqft' },
          location: { city: 'System', state: 'System', country: 'System' }
        });
        await systemProperty.save();
      }
      
      const currentDate = new Date();
      const billingPeriod = {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      };
      
      // Check if subscription invoice already exists for this billing period
      const existingInvoice = await Invoice.findOne({
        billTo: owner._id,
        billFrom: admin._id,
        'period.start': billingPeriod.start,
        'period.end': billingPeriod.end,
        'lineItems.type': 'subscription'
      });
      
      if (existingInvoice) {
        console.log(`🧾 Subscription invoice already exists for owner ${ownerId} for current period`);
        return existingInvoice;
      }
      
      // Generate subscription invoice
      const subscriptionFee = 500; // Default subscription fee in BDT
      
      const invoiceData = {
        propertyId: systemProperty._id,
        billTo: owner._id,
        billFrom: admin._id,
        period: billingPeriod,
        dueDate: this.calculateDueDate(currentDate, 15, 5), // Due on 15th with 5 days grace
        lineItems: [{
          type: 'subscription',
          description: `Monthly subscription fee for ${billingPeriod.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          unitPrice: subscriptionFee,
          amount: subscriptionFee,
          taxable: false
        }],
        subtotal: subscriptionFee,
        total: subscriptionFee,
        balance: subscriptionFee,
        currency: 'BDT',
        status: 'open',
        auto: {
          generated: true,
          source: 'system',
          generatedAt: new Date()
        }
      };
      
      const invoice = new Invoice(invoiceData);
      await invoice.save();
      
      // Create corresponding payment object
      await PaymentService.createPaymentForInvoice(invoice);
      
      // Update user ledger summary
      await this.updateUserLedgerSummary(owner._id, invoice.total, 'expense');
      await this.updateUserLedgerSummary(admin._id, invoice.total, 'income');
      
      console.log(`🧾 Generated subscription invoice ${invoice.invoiceNo} for new owner ${ownerId}`);
      return invoice;
      
    } catch (error) {
      console.error(`🧾 Error generating subscription invoice for new owner ${ownerId}:`, error);
      throw error;
    }
  }

  /**
   * Generate subscription invoices for all active admins
   * Called by scheduled job on the 1st of each month
   */
  static async generateAdminSubscriptionInvoices() {
    try {
      console.log('🧾 Starting admin subscription invoice generation...');
      
      const Admin = require('../models/Admin');
      
      // Get current date for billing period
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Calculate billing period (current month)
      const periodStart = new Date(year, month, 1);
      const periodEnd = new Date(year, month + 1, 0); // Last day of current month
      
      // Calculate due date (20th of current month)
      const dueDate = new Date(year, month, 20);
      
      console.log(`🧾 Invoice period: ${periodStart.toDateString()} to ${periodEnd.toDateString()}`);
      console.log(`🧾 Due date: ${dueDate.toDateString()}`);
      
      // Find all active admins
      const admins = await Admin.find({ isActive: true });
      console.log(`🧾 Found ${admins.length} active admins for subscription invoicing`);
      
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors = [];
      
      for (const admin of admins) {
        try {
          // Check if invoice already exists for this admin and period
          const existingInvoice = await Invoice.findOne({
            billTo: admin._id,
            'billingPeriod.start': { $gte: periodStart, $lt: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000) },
            'lineItems.type': 'subscription'
          });
          
          if (existingInvoice) {
            console.log(`⏭️ Skipping admin ${admin.email} - invoice already exists`);
            skippedCount++;
            continue;
          }
          
          // Generate unique invoice number
          const invoiceNumber = `INV-${year}${String(month + 1).padStart(2, '0')}-${Math.floor(Math.random() * 900000) + 100000}`;
          
          // Create invoice for admin
          const invoice = new Invoice({
            invoiceNo: invoiceNumber,
            billFrom: admin._id, // Admin bills themselves
            billTo: admin._id,   // Admin is billed
            propertyId: null,    // No property for admin subscriptions
            amount: 50000,       // Admin subscription fee
            status: 'draft',
            dueDate: dueDate,
            billingPeriod: {
              start: periodStart,
              end: periodEnd
            },
            lineItems: [{
              description: 'Admin Subscription Fee',
              amount: 50000,
              quantity: 1,
              type: 'subscription'
            }],
            notes: 'Monthly admin subscription fee for platform access and management tools',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await invoice.save();
          console.log(`✅ Created subscription invoice ${invoiceNumber} for admin ${admin.email}`);
          successCount++;
          
        } catch (error) {
          console.error(`❌ Failed to create invoice for admin ${admin.email}:`, error.message);
          errors.push({ admin: admin.email, error: error.message });
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
      return result;
      
    } catch (error) {
      console.error('❌ Error in admin subscription invoice generation:', error);
      throw error;
    }
  }
  
  /**
   * Initialize cron jobs for invoice-related tasks
>>>>>>> Stashed changes
   */
  static initializeCronJobs() {
    // Generate monthly rent invoices on the 1st of each month at 00:01
    cron.schedule('1 0 1 * *', async () => {
      console.log('🧾 Running monthly rent invoice generation cron job...');
      try {
        await this.generateMonthlyRentInvoices();
      } catch (error) {
        console.error('🧾 Error in monthly invoice cron job:', error);
      }
    });
    
<<<<<<< Updated upstream
    // Check for overdue invoices daily at 00:05
=======
    // Schedule monthly subscription invoice generation - Run on the 1st day of each month at 00:02 AM
    cron.schedule('2 0 1 * *', async () => {
      console.log('🧾 Running scheduled monthly subscription invoice generation...');
      try {
        await this.generateMonthlySubscriptionInvoices();
        console.log('🧾 Scheduled monthly subscription invoice generation completed successfully');
      } catch (error) {
        console.error('🧾 Error in scheduled monthly subscription invoice generation:', error);
      }
    });
    
    // Schedule daily check for overdue invoices - Run every day at 00:05 AM
>>>>>>> Stashed changes
    cron.schedule('5 0 * * *', async () => {
      console.log('🧾 Running overdue invoice check cron job...');
      try {
        await this.markOverdueInvoices();
      } catch (error) {
        console.error('🧾 Error in overdue invoice cron job:', error);
      }
    });
    
    console.log('🧾 Invoice service cron jobs initialized');
  }
}

module.exports = InvoiceService;