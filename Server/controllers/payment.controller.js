const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const PaymentService = require('../services/paymentService');
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
   * Get subscription invoices for an owner
   */
  static async getOwnerInvoices(req, res) {
    try {
      const userId = req.user.userId || req.user._id || req.user.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      // Find subscription invoices for the owner
      const invoices = await Invoice.find({
        billTo: userId,
        'lineItems.type': 'subscription'
      })
      .sort({ createdAt: -1 })
      .populate('billTo', 'firstName lastName email')
      .lean();

      res.status(200).json({
        success: true,
        invoices: invoices,
        message: 'Owner invoices retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting owner invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve owner invoices',
        error: error.message
      });
    }
  }

  /**
   * Get payment history for an owner
   */
  static async getOwnerPayments(req, res) {
    try {
      const userId = req.user.userId || req.user._id || req.user.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      // Find payments for subscription invoices belonging to the owner
      const payments = await Payment.find({
        payerId: userId,
        type: 'subscription'
      })
      .sort({ createdAt: -1 })
      .populate('invoiceId', 'invoiceNumber description dueDate')
      .populate('payerId', 'firstName lastName email')
      .lean();

      res.status(200).json({
        success: true,
        payments: payments,
        message: 'Owner payment history retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting owner payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve owner payment history',
        error: error.message
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
        message: `Created ${result.created} payment objects, skipped ${result.skipped} existing`
      });
    } catch (error) {
      console.error('Error creating payments for existing invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payments for existing invoices',
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;