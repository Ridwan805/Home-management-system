// REACTIVATED: PaymentStatusChecker service reactivated as guard layer
// Reason: Serves as fallback when webhooks fail or are delayed
// Date: Reactivated for redundancy and reliability

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const Payment = require('../models/Payment');
// Long polling functionality removed

class PaymentStatusChecker {
  // Check payment status directly with Stripe for pending payments
  // This serves as a fallback when webhooks fail
  static async checkPendingPayments() {
    try {
      console.log('🔍 Checking pending payments with Stripe...');
      
      // Find all requests with pending advance payments that have Stripe session IDs
      const pendingRequests = await Request.find({
        'advancePayment.status': 'pending',
        'advancePayment.stripeSessionId': { $exists: true, $ne: '' }
      });
      
      console.log(`Found ${pendingRequests.length} pending payments to check`);
      
      for (const request of pendingRequests) {
        await this.checkSinglePayment(request);
      }
      
      return { checked: pendingRequests.length };
    } catch (error) {
      console.error('Error checking pending payments:', error);
      throw error;
    }
  }
  
  // Check a single payment status with Stripe
  static async checkSinglePayment(request) {
    try {
      const sessionId = request.advancePayment.stripeSessionId;
      if (!sessionId) {
        console.log(`No session ID for request ${request.requestId}`);
        return;
      }
      
      console.log(`Checking payment status for session: ${sessionId}`);
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log(`Session status: ${session.payment_status} for request ${request.requestId}`);
      
      // If payment is completed, update the status
      if (session.payment_status === 'paid') {
        console.log(`✅ Payment completed for request ${request.requestId}, updating status...`);
        await this.updatePaymentStatus(request, session);
      } else if (session.status === 'expired') {
        console.log(`⏰ Session expired for request ${request.requestId}`);
        // Optionally handle expired sessions
      }
      
    } catch (error) {
      console.error(`Error checking payment for request ${request.requestId}:`, error.message);
    }
  }
  
  // Update payment status when Stripe confirms payment
  static async updatePaymentStatus(request, session) {
    try {
      // Update request advance payment status
      request.advancePayment.status = 'Paid';
      request.advancePayment.paidAt = new Date();
      request.advancePayment.paymentIntentId = session.payment_intent;
      request.advancePayment.isPaid = true;
      request.advancePayment.canPayAgain = false;
      
      // Update request status
      request.status = 'AdvancePaid';
      
      // Add timeline event
      request.timeline.push({
        event: 'Advance payment completed via Stripe (Status Check)',
        actor: request.tenantId,
        timestamp: new Date(),
        note: `Amount: ${request.advancePayment.amount} ${request.advancePayment.currency} - Verified by status checker`
      });
      
      await request.save();
      
      // Update payment record
      const payment = await Payment.findOne({ 
        requestId: request._id, 
        type: 'advance_payment' 
      }).sort({ createdAt: -1 });
      
      if (payment) {
        const oldStatus = payment.status;
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.stripeDetails = {
          ...(payment.stripeDetails || {}),
          sessionId: session.id,
          paymentIntentId: session.payment_intent
        };
        
        // Manually add to history to ensure it's tracked
        payment.history.push({
          status: 'completed',
          timestamp: new Date(),
          note: `Advance payment completed via Stripe status checker. Changed from ${oldStatus} to completed`,
          updatedBy: request.tenantId
        });
        
        await payment.save();
        console.log(`💾 Payment record updated for ${payment.paymentId}`, {
          historyEntries: payment.history.length
        });
      }
      
      console.log(`✅ Successfully updated payment status for request ${request.requestId}`);
      
      // Long polling notifications removed
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
  
  // Check payment status for a specific request
  static async checkRequestPayment(requestId) {
    try {
      const request = await Request.findById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.advancePayment?.status !== 'pending') {
        return { status: 'already_processed', currentStatus: request.advancePayment?.status };
      }
      
      await this.checkSinglePayment(request);
      
      // Reload request to get updated status
      const updatedRequest = await Request.findById(requestId);
      return { 
        status: 'checked', 
        paymentStatus: updatedRequest.advancePayment?.status,
        requestStatus: updatedRequest.status
      };
      
    } catch (error) {
      console.error('Error checking request payment:', error);
      throw error;
    }
  }
}


module.exports = PaymentStatusChecker;