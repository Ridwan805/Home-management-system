const Request = require('../models/Request');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Generate PDF receipt and redirect
const generatePDFAndRedirect = async (req, res) => {
  try {
    const { session_id } = req.query;
    const { originUrl } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Find payment record by session ID
    const payment = await Payment.findOne({ 'stripeDetails.sessionId': session_id })
      .populate('propertyId')
      .populate('payerId')
      .populate('payeeId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment status to 'Paid' if it's still pending (for localhost development)
    if (payment.status === 'pending') {
      payment.status = 'Paid';
      payment.paidAt = new Date();
      await payment.save();
      
      // Also update the request's advance payment status
      const requestToUpdate = await Request.findById(payment.requestId);
      if (requestToUpdate && requestToUpdate.advancePayment) {
        requestToUpdate.advancePayment.status = 'paid';
        await requestToUpdate.save();
      }
    }

    // Find the related request
    const request = await Request.findById(payment.requestId).populate('propertyId');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Generate HTML receipt that will trigger PDF download and redirect
    const filename = `payment-receipt-${payment.receiptData?.paymentId || payment._id}.pdf`;
    const redirectUrl = originUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Create HTML content with receipt data
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Receipt</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt-container { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .info-row { margin: 8px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .download-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            .redirect-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <h1>PAYMENT RECEIPT</h1>
            </div>
            
            <div class="section">
                <h3>Payment Information</h3>
                <div class="info-row"><strong>Payment ID:</strong> ${payment.receiptData?.paymentId || payment._id}</div>
                <div class="info-row"><strong>Transaction ID:</strong> ${payment.stripeDetails?.paymentIntentId || 'N/A'}</div>
                <div class="info-row"><strong>Amount:</strong> BDT ${payment.amount.toLocaleString()}</div>
                <div class="info-row"><strong>Payment Date:</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}</div>
                <div class="info-row"><strong>Payment Method:</strong> Credit/Debit Card</div>
                <div class="info-row"><strong>Payment Status:</strong> Completed</div>
                <div class="info-row"><strong>Payment Type:</strong> ${payment.type === 'advance_payment' ? 'Advance Payment' : 'Full Payment'}</div>
            </div>
            
            <div class="section">
                <h3>Property Information</h3>
                <div class="info-row"><strong>Property:</strong> ${request.propertyId?.title || 'N/A'}</div>
                <div class="info-row"><strong>Address:</strong> ${request.propertyId?.address || request.propertyId?.location || 'N/A'}</div>
                <div class="info-row"><strong>Property Price:</strong> BDT ${request.propertyId?.price?.toLocaleString() || 'N/A'}</div>
                <div class="info-row"><strong>Listing Type:</strong> ${request.propertyId?.listingType || 'N/A'}</div>
            </div>
            
            <div class="section">
                <h3>Payer Information</h3>
                <div class="info-row"><strong>Name:</strong> ${payment.payerId?.firstName || ''} ${payment.payerId?.lastName || ''}</div>
                <div class="info-row"><strong>Email:</strong> ${payment.payerId?.email || 'N/A'}</div>
            </div>
            
            <div class="section">
                <h3>Property Owner Information</h3>
                <div class="info-row"><strong>Name:</strong> ${payment.payeeId?.firstName || ''} ${payment.payeeId?.lastName || ''}</div>
                <div class="info-row"><strong>Email:</strong> ${payment.payeeId?.email || 'N/A'}</div>
            </div>
            
            <div class="footer">
                <p>This is a computer-generated receipt.</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="redirect-info">
                <p><strong>Your payment was successful!</strong></p>
                <p>The PDF receipt will download automatically, and you'll be redirected back to your dashboard in a few seconds.</p>
                <button class="download-btn" onclick="downloadPDF()">Download PDF Again</button>
                <button class="download-btn" onclick="redirectNow()">Go to Dashboard</button>
            </div>
        </div>
        
        <script>
            function downloadPDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Header
                doc.setFontSize(20);
                doc.text('PAYMENT RECEIPT', 105, 30, { align: 'center' });
                
                let y = 60;
                const lineHeight = 8;
                
                // Payment Information
                doc.setFontSize(14);
                doc.text('Payment Information', 20, y);
                y += lineHeight + 5;
                
                doc.setFontSize(11);
                const paymentInfo = [
                    'Payment ID: ${payment.receiptData?.paymentId || payment._id}',
                    'Transaction ID: ${payment.stripeDetails?.paymentIntentId || 'N/A'}',
                    'Amount: BDT ${payment.amount.toLocaleString()}',
                    'Payment Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}',
                    'Payment Method: Credit/Debit Card',
                    'Payment Status: Completed',
                    'Payment Type: ${payment.type === 'advance_payment' ? 'Advance Payment' : 'Full Payment'}'
                ];
                
                paymentInfo.forEach(info => {
                    doc.text(info, 20, y);
                    y += lineHeight;
                });
                
                y += 10;
                
                // Property Information
                doc.setFontSize(14);
                doc.text('Property Information', 20, y);
                y += lineHeight + 5;
                
                doc.setFontSize(11);
                const propertyInfo = [
                    'Property: ${request.propertyId?.title || 'N/A'}',
                    'Address: ${request.propertyId?.address || request.propertyId?.location || 'N/A'}',
                    'Property Price: BDT ${request.propertyId?.price?.toLocaleString() || 'N/A'}',
                    'Listing Type: ${request.propertyId?.listingType || 'N/A'}'
                ];
                
                propertyInfo.forEach(info => {
                    doc.text(info, 20, y);
                    y += lineHeight;
                });
                
                y += 10;
                
                // Payer Information
                doc.setFontSize(14);
                doc.text('Payer Information', 20, y);
                y += lineHeight + 5;
                
                doc.setFontSize(11);
                const payerInfo = [
                    'Name: ${payment.payerId?.firstName || ''} ${payment.payerId?.lastName || ''}',
                    'Email: ${payment.payerId?.email || 'N/A'}'
                ];
                
                payerInfo.forEach(info => {
                    doc.text(info, 20, y);
                    y += lineHeight;
                });
                
                y += 10;
                
                // Property Owner Information
                doc.setFontSize(14);
                doc.text('Property Owner Information', 20, y);
                y += lineHeight + 5;
                
                doc.setFontSize(11);
                const payeeInfo = [
                    'Name: ${payment.payeeId?.firstName || ''} ${payment.payeeId?.lastName || ''}',
                    'Email: ${payment.payeeId?.email || 'N/A'}'
                ];
                
                payeeInfo.forEach(info => {
                    doc.text(info, 20, y);
                    y += lineHeight;
                });
                
                // Footer
                y += 20;
                doc.setFontSize(10);
                doc.text('This is a computer-generated receipt.', 105, y, { align: 'center' });
                doc.text('Generated on: ${new Date().toLocaleString()}', 105, y + 10, { align: 'center' });
                
                // Save the PDF
                doc.save('${filename}');
            }
            
            function redirectNow() {
                window.location.href = '${redirectUrl}/tenant/request-info?payment=success';
            }
            
            // Auto-download PDF and redirect after 3 seconds
            window.onload = function() {
                setTimeout(function() {
                    downloadPDF();
                    setTimeout(function() {
                        redirectNow();
                    }, 2000);
                }, 1000);
            };
        </script>
    </body>
    </html>
    `;
    
    // Send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
    
    console.log('PDF receipt generated and sent for session:', session_id);
    
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    
    // Fallback redirect on error
    const redirectUrl = req.query.originUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${redirectUrl}/tenant/request-info?payment=success&pdf_error=true`);
  }
};

module.exports = {
  generatePDFAndRedirect
};