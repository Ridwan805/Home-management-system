const Request = require('../models/Request');
const Payment = require('../models/Payment');

// Debug endpoint to check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }
    
    const request = await Request.findOne({ _id: requestId })
      .populate('propertyId', 'address title')
      .populate('advancePayment');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Get payment records
    const payments = await Payment.find({ requestId: request._id });
    
    res.status(200).json({
      success: true,
      request: {
        _id: request._id,
        requestId: request.requestId,
        status: request.status,
        isPaid: request.isPaid,
        advancePayment: request.advancePayment,
        fullPayment: request.fullPayment,
        propertyDetails: request.propertyId ? {
          _id: request.propertyId._id,
          address: request.propertyId.address,
          title: request.propertyId.title
        } : null
      },
      payments: payments.map(p => ({
        _id: p._id,
        paymentId: p.paymentId,
        status: p.status,
        amount: p.amount,
        type: p.type,
        paidAt: p.paidAt,
        stripeDetails: p.stripeDetails
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message
    });
  }
};

module.exports = {
  checkPaymentStatus
};