const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Property = require('../models/Property');
const PaymentService = require('../services/paymentService');
const stripePaymentService = require('../services/stripePaymentService');
const PDFService = require('../services/pdf/pdfService');
const mongoose = require('mongoose');

class PaymentController {
  /**
   * Get pending invoices for a tenant
   */
  static async getPendingInvoices(req, res) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const pendingInvoices = await PaymentService.getPendingInvoicesForTenant(tenantId);
      
      res.status(200).json({
        success: true,
        data: pendingInvoices,
        message: 'Pending invoices retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting pending invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pending invoices',
        error: error.message
      });
    }
  }

  /**
   * Get payment history for a tenant
   */
  static async getPaymentHistory(req, res) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const paymentHistory = await PaymentService.getPaymentHistoryForTenant(tenantId);
      
      res.status(200).json({
        success: true,
        data: paymentHistory,
        message: 'Payment history retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment history',
        error: error.message
      });
    }
  }

  /**
   * Get all payments for a tenant (both pending and completed)
   */
  static async getAllPayments(req, res) {
    try {
      const { tenantId } = req.params;
      const userId = req.user.userId;
      
      // Use the authenticated user's ID if tenantId is not provided or if user is requesting their own data
      const targetTenantId = tenantId || userId;
      
      if (!targetTenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const [pendingInvoices, paymentHistory] = await Promise.all([
        PaymentService.getPendingInvoicesForTenant(targetTenantId),
        PaymentService.getPaymentHistoryForTenant(targetTenantId)
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          pendingInvoices,
          paymentHistory
        },
        message: 'Payment data retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting all payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment data',
        error: error.message
      });
    }
  }

  /**
   * Get all payments for the authenticated user (no tenantId required)
   */
  static async getMyPayments(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const [pendingInvoices, paymentHistory] = await Promise.all([
        PaymentService.getPendingInvoicesForTenant(userId),
        PaymentService.getPaymentHistoryForTenant(userId)
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          pendingInvoices,
          paymentHistory
        },
        message: 'Payment data retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting my payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment data',
        error: error.message
      });
    }
  }

  /**
   * Update payment status (used by Stripe webhook)
   */
  static async updatePaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const { status, paymentDetails } = req.body;
      
      if (!paymentId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID and status are required'
        });
      }

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      if (status === 'completed' || status === 'paid') {
        await PaymentService.markPaymentAsCompleted(paymentId, paymentDetails);
      } else {
        payment.status = status;
        payment.updatedAt = new Date();
        await payment.save();
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment status',
        error: error.message
      });
    }
  }

  /**
   * Get payment details by ID
   */
  static async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const payment = await Payment.findById(paymentId)
        .populate('invoiceId', 'period dueDate lineItems total')
        .populate('rentId', 'propertyId')
        .populate({
          path: 'rentId',
          populate: {
            path: 'propertyId',
            select: 'title address'
          }
        });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment details retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting payment details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment details',
        error: error.message
      });
    }
  }

  /**
   * Get payments and invoices for properties owned by authenticated owner
   */
  static async getOwnerPayments(req, res) {
    try {
      const ownerId = req.user.userId;
      if (!ownerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Find properties owned by this owner
      const ownedProperties = await Property.find({
        $or: [
          { ownerUserId: ownerId },
          { ownerId: ownerId }
        ],
        isDeleted: { $ne: true }
      }).select('_id title displayName address location price');

      const propertyIds = ownedProperties.map(p => p._id);

      // Find payments related to these properties or where payee/receiver is the owner
      const payments = await Payment.find({
        $or: [
          { propertyId: { $in: propertyIds } },
          { payeeId: ownerId },
          { receiverId: ownerId }
        ],
        isDeleted: { $ne: true }
      })
      .populate('payerId', 'firstName lastName email phoneNumber')
      .populate('propertyId', 'title displayName address location')
      .populate({
        path: 'invoiceId',
        select: 'invoiceNo total balance status dueDate period paymentPurpose'
      })
      .sort({ paidAt: -1, createdAt: -1 });

      // Find invoices issued for these properties
      const invoices = await Invoice.find({
        $or: [
          { propertyId: { $in: propertyIds } },
          { billFrom: ownerId }
        ],
        isDeleted: { $ne: true }
      })
      .populate('billTo', 'firstName lastName email phoneNumber')
      .populate('propertyId', 'title displayName address location')
      .sort({ dueDate: -1, createdAt: -1 });

      // Calculate authoritative financial metrics
      const verifiedPayments = payments.filter(p => ['completed', 'paid', 'succeeded'].includes(p.status));
      const totalCollected = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const openInvoices = invoices.filter(inv => ['open', 'overdue'].includes(inv.status));
      const outstandingBalance = openInvoices.reduce((sum, inv) => sum + (Number(inv.balance || inv.total) || 0), 0);

      const pendingSettlements = payments.filter(p => p.status === 'processing');
      const pendingSettlementAmount = pendingSettlements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      res.status(200).json({
        success: true,
        metrics: {
          totalCollected,
          outstandingBalance,
          verifiedPaymentsCount: verifiedPayments.length,
          openInvoicesCount: openInvoices.length,
          pendingSettlementAmount,
          currency: 'BDT'
        },
        payments,
        invoices
      });
    } catch (error) {
      console.error('Error getting owner payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve owner payments',
        error: error.message
      });
    }
  }

  /**
   * Stream official payment receipt PDF
   */
  static async downloadReceiptPDF(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.userId;
      await PDFService.streamReceiptPDF(paymentId, userId, res);
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to generate receipt PDF'
      });
    }
  }

  /**
   * Process refund via Stripe
   */
  static async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const userId = req.user.userId;

      const result = await stripePaymentService.processRefund({
        paymentId,
        amount,
        reason,
        requestingUserId: userId
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Refund processed successfully via Stripe'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to process refund'
      });
    }
  }

  /**
   * Create payment objects for existing invoices (admin utility)
   */
  static async createPaymentsForExistingInvoices(req, res) {
    try {
      const result = await PaymentService.createPaymentsForExistingInvoices();
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Payment objects created for existing invoices'
      });
    } catch (error) {
      console.error('Error creating payments for existing invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment objects',
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;