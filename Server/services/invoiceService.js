const mongoose = require('mongoose');
const Rent = require('../models/Rent');
const Invoice = require('../models/Invoice');
const Property = require('../models/Property');
const User = require('../models/User');
const UserLedgerSummary = require('../models/UserLedgerSummary');
const RentBalance = require('../models/RentBalance');
const PaymentService = require('./paymentService');
const cron = require('node-cron');

class InvoiceService {
  /**
   * Generate first monthly invoice immediately after advance payment success
   * This creates the first invoice for the current month when a tenant moves in
   */
  static async generateFirstMonthlyInvoiceAfterAdvance(requestId) {
    try {
      console.log('🧾 Generating first monthly invoice after advance payment success...');
      
      const Request = require('../models/Request');
      const request = await Request.findById(requestId)
        .populate('propertyId', 'title address price listingType ownerId')
        .populate('tenantId', 'firstName lastName email')
        .populate('ownerId', 'firstName lastName email');
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.propertyId.listingType !== 'For Rent') {
        console.log('🧾 Property is not for rent, skipping monthly invoice generation');
        return null;
      }
      
      // Check if rent object already exists
      let rent = await Rent.findOne({ requestId: request._id });
      
      if (!rent) {
        // Create rent object for the tenant
        rent = new Rent({
          propertyId: request.propertyId._id,
          ownerId: request.ownerId._id,
          tenants: [request.tenantId._id],
          requestId: request._id,
          term: {
            type: 'month_to_month',
            startDate: new Date(),
            endDate: null,
            noticeDays: 30
          },
          rent: {
            amount: request.propertyId.price || 0,
            currency: 'BDT',
            dueDay: 1, // Due on 1st of each month
            graceDays: 5
          },
          securityDeposit: {
            amount: request.advancePayment?.amount || 0
          },
          billing: {
            frequency: 'monthly',
            nextInvoiceDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            autoGenerate: true
          },
          status: 'Active'
        });
        
        await rent.save();
        console.log(`🧾 Created rent object ${rent._id} for request ${requestId}`);
      }
      
      // Calculate current month billing period
      const currentDate = new Date();
      const billingPeriod = {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      };
      
      // Check if invoice already exists for this period
      const existingInvoice = await Invoice.findOne({
        rentId: rent._id,
        'period.start': billingPeriod.start,
        'period.end': billingPeriod.end
      });
      
      if (existingInvoice) {
        console.log(`🧾 Invoice already exists for rent ${rent._id} for current period`);
        return existingInvoice;
      }
      
      // Generate invoice for the tenant
      const invoiceData = {
        rentId: rent._id,
        propertyId: rent.propertyId._id,
        billTo: request.tenantId._id,
        billFrom: rent.ownerId._id,
        period: billingPeriod,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), // Due next month
        lineItems: [{
          type: 'rent',
          description: `Monthly rent for ${request.propertyId.title}`,
          quantity: 1,
          unitPrice: rent.rent.amount,
          amount: rent.rent.amount,
          taxable: false
        }],
        subtotal: rent.rent.amount,
        total: rent.rent.amount,
        balance: rent.rent.amount,
        currency: rent.rent.currency || 'BDT',
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
      
      console.log(`🧾 Generated first monthly invoice ${invoice.invoiceNo} for tenant ${request.tenantId._id}`);
      return invoice;
      
    } catch (error) {
      console.error('🧾 Error generating first monthly invoice after advance payment:', error);
      throw error;
    }
  }

  /**
   * Generate monthly rent invoices for all active rent contracts
   * This should be run on the 1st of each month
   */
  static async generateMonthlyRentInvoices() {
    try {
      console.log('🧾 Starting monthly rent invoice generation...');
      
      // Get all active rent contracts that are due for invoicing
      const activeRents = await Rent.findDueForInvoicing()
        .populate('propertyId', 'title address ownerUserId')
        .populate('tenants', 'firstName lastName email')
        .populate('ownerId', 'firstName lastName email');
      
      console.log(`🧾 Found ${activeRents.length} rent contracts due for invoicing`);
      
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
      
      for (const rent of activeRents) {
        try {
          // Calculate billing period based on rent frequency
          const currentDate = new Date();
          const billingPeriod = this.calculateBillingPeriod(currentDate, rent.billing.frequency);
          
          // Check if invoice already exists for this billing period
          const existingInvoice = await Invoice.findOne({
            rentId: rent._id,
            'period.start': billingPeriod.start,
            'period.end': billingPeriod.end
          });
          
          if (existingInvoice) {
            console.log(`🧾 Invoice already exists for rent ${rent._id} for current period`);
            results.skipped++;
            continue;
          }
          
          // Generate invoice for each tenant
          for (const tenant of rent.tenants) {
            const invoiceData = {
              rentId: rent._id,
              propertyId: rent.propertyId._id,
              billTo: tenant._id,
              billFrom: rent.ownerId._id,
              period: {
                start: billingPeriod.start,
                end: billingPeriod.end
              },
              dueDate: this.calculateDueDate(currentDate, rent.rent.dueDay, rent.rent.graceDays),
              lineItems: [{
                type: 'rent',
                description: `Monthly rent for ${rent.propertyId.title}`,
                quantity: 1,
                unitPrice: rent.rent.amount / rent.tenants.length,
                amount: rent.rent.amount / rent.tenants.length,
                taxable: false
              }],
              subtotal: rent.rent.amount / rent.tenants.length,
              total: rent.rent.amount / rent.tenants.length,
              balance: rent.rent.amount / rent.tenants.length,
              currency: rent.rent.currency || 'BDT',
              status: 'open',
              auto: {
                generated: true,
                source: 'rent_billing',
                generatedAt: new Date()
              }
            };
            
            const invoice = new Invoice(invoiceData);
            await invoice.save();
            
            // Create corresponding payment object
            await PaymentService.createPaymentForInvoice(invoice);
            
            // Update rent balance
            await this.updateRentBalance(rent._id, tenant._id, invoice.total, 'debit');
            
            // Update user ledger summary
            await this.updateUserLedgerSummary(tenant._id, invoice.total, 'expense');
            await this.updateUserLedgerSummary(rent.ownerId._id, invoice.total, 'income');
            
            console.log(`🧾 Generated invoice ${invoice.invoiceNo} for tenant ${tenant._id}`);
          }
          
          // Update rent's next invoice date
          rent.billing.lastInvoiceDate = currentDate;
          rent.billing.nextInvoiceDate = this.calculateNextInvoiceDate(currentDate, rent.billing.frequency);
          await rent.save();
          
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
          amount: transfer.agreedPrice,
          currency: transfer.currency,
          category: 'Purchase'
        }],
        totalAmount: transfer.agreedPrice,
        currency: transfer.currency,
        status: 'Pending',
        createdBy: userId
      };
      
      // Subtract any deposit already paid
      if (transfer.downPayment && transfer.downPayment.amount > 0) {
        invoiceData.lineItems.push({
          description: 'Deposit credit',
          amount: -transfer.downPayment.amount,
          currency: transfer.currency,
          category: 'Credit'
        });
        invoiceData.totalAmount -= transfer.downPayment.amount;
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
   * Calculate billing period based on frequency
   */
  static calculateBillingPeriod(currentDate, frequency) {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let end;
    
    switch (frequency) {
      case 'monthly':
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarterStart = Math.floor(currentDate.getMonth() / 3) * 3;
        end = new Date(currentDate.getFullYear(), quarterStart + 3, 0);
        break;
      case 'yearly':
        end = new Date(currentDate.getFullYear(), 11, 31);
        break;
      default:
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }
    
    return { start, end };
  }
  
  /**
   * Calculate due date for invoice
   */
  static calculateDueDate(currentDate, dueDay, graceDays = 0) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
    dueDate.setDate(dueDate.getDate() + graceDays);
    return dueDate;
  }
  
  /**
   * Calculate next invoice date based on frequency
   */
  static calculateNextInvoiceDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
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
   * Initialize cron jobs for invoice-related tasks
   */
  static initializeCronJobs() {
    const cron = require('node-cron');
    
    // Schedule monthly rent invoice generation - Run on the 1st day of each month at 00:01 AM
    cron.schedule('1 0 1 * *', async () => {
      console.log('🧾 Running scheduled monthly rent invoice generation...');
      try {
        await this.generateMonthlyRentInvoices();
        console.log('🧾 Scheduled monthly rent invoice generation completed successfully');
      } catch (error) {
        console.error('🧾 Error in scheduled monthly rent invoice generation:', error);
      }
    });
    
    // Schedule daily check for overdue invoices - Run every day at 00:05 AM
    cron.schedule('5 0 * * *', async () => {
      console.log('🧾 Running scheduled check for overdue invoices...');
      try {
        await this.markOverdueInvoices();
        console.log('🧾 Scheduled overdue invoice check completed successfully');
      } catch (error) {
        console.error('🧾 Error in scheduled overdue invoice check:', error);
      }
    });
    
    console.log('🧾 Invoice service cron jobs initialized');
  }
}

module.exports = InvoiceService;