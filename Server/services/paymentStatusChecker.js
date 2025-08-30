// REACTIVATED: PaymentStatusChecker service reactivated as guard layer
// Reason: Serves as fallback when webhooks fail or are delayed
// Date: Reactivated for redundancy and reliability

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Request = require('../models/Request');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
// Long polling functionality removed

class PaymentStatusChecker {
  // Check payment status directly with Stripe for pending payments
  // This serves as a fallback when webhooks fail
  static async checkPendingPayments() {
    try {
      console.log('🔍 Checking pending payments with Stripe...');
      
      // Find all requests with pending advance payments that have Stripe session IDs
      const pendingAdvanceRequests = await Request.find({
        'advancePayment.status': 'pending',
        'advancePayment.stripeSessionId': { $exists: true, $ne: '' }
      });
      
      // Find all requests with pending full payments that have Stripe session IDs
      const pendingFullRequests = await Request.find({
        'fullPayment.status': 'pending',
        'fullPayment.stripeSessionId': { $exists: true, $ne: '' }
      });
      
      console.log(`Found ${pendingAdvanceRequests.length} pending advance payments and ${pendingFullRequests.length} pending full payments to check`);
      
      // Check advance payments
      for (const request of pendingAdvanceRequests) {
        await this.checkSinglePayment(request, 'advance');
      }
      
      // Check full payments
      for (const request of pendingFullRequests) {
        await this.checkSinglePayment(request, 'full');
      }
      
      return { 
        checkedAdvance: pendingAdvanceRequests.length,
        checkedFull: pendingFullRequests.length,
        total: pendingAdvanceRequests.length + pendingFullRequests.length
      };
    } catch (error) {
      console.error('Error checking pending payments:', error);
      throw error;
    }
  }
  
  // Check a single payment status with Stripe
  static async checkSinglePayment(request, paymentType = 'advance') {
    try {
      const paymentData = paymentType === 'advance' ? request.advancePayment : request.fullPayment;
      const sessionId = paymentData?.stripeSessionId;
      
      if (!sessionId) {
        console.log(`No ${paymentType} session ID for request ${request.requestId}`);
        return;
      }
      
      console.log(`Checking ${paymentType} payment status for session: ${sessionId}`);
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log(`Session status: ${session.payment_status} for ${paymentType} payment of request ${request.requestId}`);
      
      // If payment is completed, update the status
      if (session.payment_status === 'paid') {
        console.log(`✅ ${paymentType} payment completed for request ${request.requestId}, updating status...`);
        await this.updatePaymentStatus(request, session, paymentType);
      } else if (session.status === 'expired') {
        console.log(`⏰ ${paymentType} session expired for request ${request.requestId}`);
        // Optionally handle expired sessions
      }
      
    } catch (error) {
      console.error(`Error checking ${paymentType} payment for request ${request.requestId}:`, error.message);
    }
  }
  
  // Update payment status when Stripe confirms payment
  static async updatePaymentStatus(request, session, paymentType = 'advance') {
    try {
      if (paymentType === 'advance') {
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
      } else if (paymentType === 'full') {
        // Don't create fullPayment object here - it should be created by the webhook handler
        // Just update the request status to indicate full payment is being processed
        request.status = 'Processing Full Payment';
        
        // Add timeline event
        request.timeline.push({
          event: 'Full payment processing via Stripe (Status Check)',
          actor: request.tenantId,
          timestamp: new Date(),
          note: `Full payment session verified - processing payment completion`
        });
      }
      
      await request.save();
      
      // Update payment record
      const paymentTypeForRecord = paymentType === 'advance' ? 'advance_payment' : 'full_payment';
      const payment = await Payment.findOne({ 
        requestId: request._id, 
        type: paymentTypeForRecord 
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
          note: `${paymentType === 'advance' ? 'Advance' : 'Full'} payment completed via Stripe status checker. Changed from ${oldStatus} to completed`,
          updatedBy: request.tenantId
        });
        
        await payment.save();
        console.log(`💾 ${paymentType === 'advance' ? 'Advance' : 'Full'} payment record updated for ${payment.paymentId}`, {
          historyEntries: payment.history.length
        });
      }
      
      // Automatically update property status based on listing type and payment type
      try {
        console.log(`🏠 [STATUS_CHECKER] Updating property status after ${paymentType} payment...`);
        const property = await Property.findById(request.propertyId);
        
        if (property) {
          const listingType = property.listingType;
          let newStatus;
          
          if (listingType === 'For Sale') {
            newStatus = 'Sold';
          } else if (listingType === 'For Rent') {
            newStatus = 'Rented';
          }
          
          if (newStatus) {
            if (paymentType === 'advance') {
              // Update property status to indicate advance payment received, but don't transfer ownership yet
              if (newStatus === 'Sold') {
                // For sale properties, mark as reserved/under contract after advance payment
                property.status = 'Reserved';
                property.stateHistory.push({
                  status: 'Reserved',
                  timestamp: new Date(),
                  note: `Property reserved after advance payment completion for request ${request._id} (via status checker)`,
                  updatedBy: request.tenantId
                });
                await property.save();
              } else if (newStatus === 'Rented') {
                // For rent, we need to create or link to a rent record
                // For now, we'll use null as rentId since the rent record creation is handled elsewhere
                await property.rent(request.tenantId, null, `Automatically set to Rented after advance payment completion for request ${request._id} (via status checker)`);
              }
            } else if (paymentType === 'full') {
              // Full payment completed - finalize the property transfer
              if (newStatus === 'Sold') {
                // Transfer ownership for sale properties
                await property.sell(request.tenantId, `Property sold after full payment completion for request ${request._id} (via status checker)`);
              } else if (newStatus === 'Rented') {
                // Ensure rental status is properly set (should already be set from advance payment)
                if (property.status !== 'Rented') {
                  await property.rent(request.tenantId, null, `Property rented after full payment completion for request ${request._id} (via status checker)`);
                }
              }
            }
            
            console.log('✅ [STATUS_CHECKER] Property status updated successfully', {
              propertyId: property._id,
              listingType,
              newStatus,
              paymentType,
              requestId: request._id
            });
          } else {
            console.log('⚠️ [STATUS_CHECKER] No status update needed for listing type:', listingType);
          }
        } else {
          console.error('❌ [STATUS_CHECKER] Property not found for status update:', request.propertyId);
        }
      } catch (propertyUpdateErr) {
        console.error('❌ [STATUS_CHECKER] Failed to update property status:', {
          error: propertyUpdateErr.message,
          stack: propertyUpdateErr.stack,
          requestId: request._id,
          propertyId: request.propertyId,
          paymentType
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
  static async checkRequestPayment(requestId, paymentType = 'advance') {
    try {
      const request = await Request.findById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      const paymentData = paymentType === 'advance' ? request.advancePayment : request.fullPayment;
      
      if (paymentData?.status !== 'pending') {
        return { 
          status: 'already_processed', 
          currentStatus: paymentData?.status,
          paymentType 
        };
      }
      
      await this.checkSinglePayment(request, paymentType);
      
      // Reload request to get updated status
      const updatedRequest = await Request.findById(requestId);
      const updatedPaymentData = paymentType === 'advance' ? updatedRequest.advancePayment : updatedRequest.fullPayment;
      
      return { 
        status: 'checked', 
        paymentStatus: updatedPaymentData?.status,
        requestStatus: updatedRequest.status,
        paymentType
      };
      
    } catch (error) {
      console.error(`Error checking ${paymentType} payment for request:`, error);
      throw error;
    }
  }
  
  // Convenience method to check full payment specifically
  static async checkFullPayment(requestId) {
    return this.checkRequestPayment(requestId, 'full');
  }
  
  // Convenience method to check advance payment specifically
  static async checkAdvancePayment(requestId) {
    return this.checkRequestPayment(requestId, 'advance');
  }
}


module.exports = PaymentStatusChecker;