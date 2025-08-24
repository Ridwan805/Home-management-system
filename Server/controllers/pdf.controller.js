const Request = require('../models/Request');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const User = require('../models/User');

// Generate PDF and redirect to success page
const generatePDFAndRedirect = async (req, res) => {
  try {
    const { session_id, originUrl } = req.query;
    
    console.log('🔍 Redirecting payment success to tenant page for session:', session_id);
    
    // Redirect to tenant page with payment success status
    const redirectUrl = originUrl || 'http://localhost:5173/tenant/request-info';
    const finalUrl = `${redirectUrl}?payment_status=success&session_id=${session_id || ''}`;
    
    console.log('🔄 Redirecting to:', finalUrl);
    return res.redirect(finalUrl);
    
  } catch (error) {
    console.error('❌ Error redirecting after payment:', error);
    // Fallback redirect to tenant page
    const fallbackUrl = 'http://localhost:5173/tenant/request-info?payment_status=success';
    return res.redirect(fallbackUrl);
  }
};

// Get receipt data for display
const getReceiptData = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    console.log('🔍 Getting receipt data for session:', session_id);
    
    // Find the payment record
    const payment = await Payment.findOne({ 'stripeDetails.sessionId': session_id })
      .populate('requestId')
      .populate({
        path: 'requestId',
        populate: {
          path: 'propertyId',
          model: 'Property'
        }
      })
      .populate({
        path: 'requestId',
        populate: {
          path: 'tenantId',
          model: 'User'
        }
      })
      .populate({
        path: 'requestId',
        populate: {
          path: 'ownerId',
          model: 'User'
        }
      });

    if (!payment) {
      console.log('❌ Payment not found for session:', session_id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Prepare receipt data
    const receiptData = {
      paymentId: payment._id,
      sessionId: payment.stripeDetails?.sessionId || payment.sessionId,
      propertyTitle: payment.requestId?.propertyId?.title || 'Property',
      propertyAddress: payment.requestId?.propertyId?.address || 'Address not available',
      amount: payment.amount,
      currency: payment.currency || 'BDT',
      paymentDate: payment.paidAt || payment.createdAt,
      paymentMethod: payment.method || 'Credit/Debit Card',
      paymentStatus: payment.status,
      transactionId: payment.stripeDetails?.paymentIntentId || payment.transactionId || payment.stripeDetails?.sessionId || payment.sessionId,
      paymentType: payment.type === 'advance_payment' ? 'Advance Payment' : 'Payment',
      payerName: payment.requestId?.tenantId?.firstName && payment.requestId?.tenantId?.lastName ? 
        `${payment.requestId.tenantId.firstName} ${payment.requestId.tenantId.lastName}` : 'Tenant',
      payeeName: payment.requestId?.ownerId?.firstName && payment.requestId?.ownerId?.lastName ? 
        `${payment.requestId.ownerId.firstName} ${payment.requestId.ownerId.lastName}` : 'Owner',
      paymentDescription: `Payment for ${payment.requestId?.propertyId?.title || 'property'}`,
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      receiptData: receiptData
    });
    
  } catch (error) {
    console.error('❌ Error getting receipt data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get receipt data: ' + error.message
    });
  }
};

module.exports = {
  generatePDFAndRedirect,
  getReceiptData
};