const mongoose = require('mongoose');
const User = require('../models/User');
const UserLedgerSummary = require('../models/UserLedgerSummary');
const RentBalance = require('../models/RentBalance');
const Rent = require('../models/Rent');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

/**
 * Migration: Initialize summary models with existing data
 * This migration creates UserLedgerSummary and RentBalance documents based on existing data
 */
async function up() {
  console.log('Starting migration: Initialize summary models...');
  
  try {
    // Initialize UserLedgerSummary for all users
    console.log('Initializing UserLedgerSummary documents...');
    
    const users = await User.find({});
    let userSummaryCount = 0;
    
    for (const user of users) {
      // Check if UserLedgerSummary already exists
      const existingSummary = await UserLedgerSummary.findOne({ userId: user._id });
      if (existingSummary) {
        console.log(`UserLedgerSummary already exists for user ${user._id}`);
        continue;
      }

      // Calculate totals from existing payments and invoices
      const completedPayments = await Payment.find({
        $or: [{ payerId: user._id }, { receiverId: user._id }],
        status: 'Completed'
      });

      const userInvoices = await Invoice.find({
        $or: [{ tenantId: user._id }, { ownerId: user._id }]
      });

      let totalIncome = 0;
      let totalExpenses = 0;
      let pendingPayments = 0;
      let overdueAmount = 0;

      // Calculate income (payments received)
      const receivedPayments = completedPayments.filter(p => 
        p.receiverId && p.receiverId.toString() === user._id.toString()
      );
      totalIncome = receivedPayments.reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate expenses (payments made)
      const madePayments = completedPayments.filter(p => 
        p.payerId && p.payerId.toString() === user._id.toString()
      );
      totalExpenses = madePayments.reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate pending payments from invoices
      const pendingInvoices = userInvoices.filter(inv => 
        inv.tenantId && inv.tenantId.toString() === user._id.toString() && 
        ['Pending', 'Partially Paid'].includes(inv.status)
      );
      pendingPayments = pendingInvoices.reduce((sum, invoice) => {
        const remainingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
        return sum + remainingAmount;
      }, 0);

      // Calculate overdue amount
      const overdueInvoices = userInvoices.filter(inv => 
        inv.tenantId && inv.tenantId.toString() === user._id.toString() && 
        inv.status === 'Overdue'
      );
      overdueAmount = overdueInvoices.reduce((sum, invoice) => {
        const remainingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
        return sum + remainingAmount;
      }, 0);

      // Create UserLedgerSummary
      await UserLedgerSummary.create({
        userId: user._id,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        pendingPayments,
        overdueAmount,
        lastUpdated: new Date()
      });

      userSummaryCount++;
    }
    
    console.log(`Created ${userSummaryCount} UserLedgerSummary documents`);

    // Initialize RentBalance for existing rent contracts
    console.log('Initializing RentBalance documents...');
    
    const rentContracts = await Rent.find({ status: 'Active' });
    let rentBalanceCount = 0;
    
    for (const rent of rentContracts) {
      // Check if rent has tenants
      if (!rent.tenantIds || rent.tenantIds.length === 0) {
        console.log(`Rent contract ${rent._id} has no tenants, skipping...`);
        continue;
      }

      for (const tenantId of rent.tenantIds) {
        // Check if RentBalance already exists
        const existingBalance = await RentBalance.findOne({ 
          rentId: rent._id, 
          tenantId: tenantId 
        });
        if (existingBalance) {
          console.log(`RentBalance already exists for rent ${rent._id} and tenant ${tenantId}`);
          continue;
        }

        // Calculate totals from existing invoices and payments
        const rentInvoices = await Invoice.find({
          rentId: rent._id,
          tenantId: tenantId
        });

        const totalOwed = rentInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        const totalPaid = rentInvoices.reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0);
        const balance = totalOwed - totalPaid;

        // Create RentBalance
        await RentBalance.create({
          rentId: rent._id,
          tenantId: tenantId,
          totalOwed,
          totalPaid,
          balance,
          lastUpdated: new Date()
        });

        rentBalanceCount++;
      }
    }
    
    console.log(`Created ${rentBalanceCount} RentBalance documents`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration
 */
async function down() {
  console.log('Rolling back migration: Initialize summary models...');
  
  try {
    // Remove all UserLedgerSummary documents
    const userSummaryResult = await UserLedgerSummary.deleteMany({});
    console.log(`Removed ${userSummaryResult.deletedCount} UserLedgerSummary documents`);

    // Remove all RentBalance documents
    const rentBalanceResult = await RentBalance.deleteMany({});
    console.log(`Removed ${rentBalanceResult.deletedCount} RentBalance documents`);

    console.log('Rollback completed successfully!');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };