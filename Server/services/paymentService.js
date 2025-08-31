const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Rent = require('../models/Rent');

class PaymentService {
  /**
   * Create a payment object for a given invoice
   * @param {Object} invoice - The invoice object
   * @returns {Object} Created payment object
   */
  static async createPaymentForInvoice(invoice) {
    try {
      // Determine payment type based on invoice line items
      let paymentType = 'monthly_rent';
      let description = `Monthly rent payment for invoice #${invoice.invoiceNo || invoice._id.slice(-6)}`;
      
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        const firstLineItem = invoice.lineItems[0];
        if (firstLineItem.type === 'subscription') {
          paymentType = 'subscription';
          description = `Subscription fee payment for invoice #${invoice.invoiceNo || invoice._id.slice(-6)}`;
        }
      }
      
      const paymentData = {
        invoiceId: invoice._id,
        rentId: invoice.rentId,
        type: paymentType,
        status: 'pending',
        method: 'stripe', // Default to Stripe payment
        provider: 'stripe',
        amount: invoice.total,
        currency: invoice.currency || 'BDT',
        payerId: invoice.billTo,
        receiverId: invoice.billFrom,
        dueDate: invoice.dueDate,
        description: description,
        billingPeriod: {
          startDate: invoice.period?.start,
          endDate: invoice.period?.end,
          isRecurring: true,
          recurringFrequency: 'monthly'
        }
      };

      const payment = new Payment(paymentData);
      await payment.save();

      console.log(`💳 Created ${paymentType} payment object for invoice ${invoice._id}`);
      return payment;
    } catch (error) {
      console.error('❌ Error creating payment for invoice:', error);
      throw error;
    }
  }

  /**
   * Update payment and invoice status after successful payment
   * @param {String} paymentId - Payment ID
   * @param {Object} paymentDetails - Payment details from Stripe
   */
  static async markPaymentAsCompleted(paymentId, paymentDetails = {}) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update payment status
      payment.status = 'completed';
      payment.paidAt = new Date();
      
      // Add Stripe details if provided
      if (paymentDetails.stripePaymentIntentId) {
        payment.stripeDetails = {
          ...(payment.stripeDetails || {}),
          paymentIntentId: paymentDetails.stripePaymentIntentId,
          chargeId: paymentDetails.chargeId || paymentDetails.stripePaymentIntentId,
          receiptUrl: paymentDetails.receiptUrl
        };
      }

      await payment.save();

      // Update corresponding invoice status
      if (payment.invoiceId) {
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          invoice.status = 'paid';
          invoice.balance = 0;
          invoice.paidAmount = invoice.total;
          invoice.paidAt = new Date();
          
          // Add payment reference to invoice
          if (!invoice.payments) {
            invoice.payments = [];
          }
          invoice.payments.push(payment._id);

          await invoice.save();
          console.log(`✅ Updated invoice ${invoice._id} status to paid`);
        }
      }

      console.log(`✅ Payment ${paymentId} marked as completed`);
      return payment;
    } catch (error) {
      console.error('❌ Error marking payment as completed:', error);
      throw error;
    }
  }

  /**
   * Get pending invoices for a tenant
   * @param {String} tenantId - Tenant user ID
   * @returns {Array} Array of pending invoices with payment details
   */
  static async getPendingInvoicesForTenant(tenantId) {
    try {
      const pendingInvoices = await Invoice.find({
        billTo: tenantId,
        status: { $in: ['open', 'overdue'] }
      })
      .populate('propertyId', 'displayName address fullAddress listingType')
      .populate('rentId', 'rent.amount rent.currency')
      .sort({ dueDate: 1 });

      // Get corresponding payment objects
      const invoicesWithPayments = await Promise.all(
        pendingInvoices.map(async (invoice) => {
          const payment = await Payment.findOne({
            invoiceId: invoice._id,
            status: 'pending'
          });
          
          return {
            ...invoice.toObject(),
            payment: payment ? payment.toObject() : null
          };
        })
      );

      return invoicesWithPayments;
    } catch (error) {
      console.error('❌ Error getting pending invoices for tenant:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a tenant
   * @param {String} tenantId - Tenant user ID
   * @returns {Array} Array of completed payments
   */
  static async getPaymentHistoryForTenant(tenantId) {
    try {
      const paymentHistory = await Payment.find({
        payerId: tenantId,
        status: { $in: ['completed', 'paid', 'succeeded'] }
      })
        .select('paymentId amount currency status type method provider paidAt createdAt invoiceId rentId stripeDetails')
        .populate('invoiceId', 'period dueDate lineItems total invoiceNo')
        .populate({
          path: 'invoiceId',
          populate: {
            path: 'propertyId',
            select: 'displayName address fullAddress listingType'
          }
        })
        .populate('rentId', 'propertyId')
        .populate({
          path: 'rentId',
          populate: {
            path: 'propertyId',
            select: 'displayName address'
          }
        })
        .sort({ paidAt: -1, createdAt: -1 });

      return paymentHistory;
    } catch (error) {
      console.error('❌ Error getting payment history for tenant:', error);
      throw error;
    }
  }

  /**
   * Create payment objects for all existing open invoices (one-time setup)
   */
  static async createPaymentsForExistingInvoices() {
    try {
      console.log('🔄 Creating payment objects for existing open invoices...');
      
      const openInvoices = await Invoice.find({
        status: { $in: ['open', 'overdue'] }
      });

      let created = 0;
      let skipped = 0;

      for (const invoice of openInvoices) {
        // Check if payment already exists
        const existingPayment = await Payment.findOne({
          invoiceId: invoice._id
        });

        if (existingPayment) {
          skipped++;
          continue;
        }

        await this.createPaymentForInvoice(invoice);
        created++;
      }

      console.log(`✅ Created ${created} payment objects, skipped ${skipped} existing`);
      return { created, skipped };
    } catch (error) {
      console.error('❌ Error creating payments for existing invoices:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;