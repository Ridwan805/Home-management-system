const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Request = require('../models/Request');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const User = require('../models/User');

// Generate PDF and redirect to success page
const generatePDFAndRedirect = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    console.log('🔍 Looking for payment with session ID:', session_id);
    
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

    console.log('✅ Payment found:', {
      id: payment._id,
      amount: payment.amount,
      status: payment.status
    });

    // Prepare receipt data
    const receiptData = {
      paymentId: payment._id,
      sessionId: payment.stripeDetails?.sessionId || payment.sessionId,
      propertyTitle: payment.requestId?.propertyId?.title || 'Property',
      propertyAddress: payment.requestId?.propertyId?.address || 'Address not available',
      amount: payment.amount,
      currency: payment.currency || 'BDT',
      paymentDate: payment.createdAt,
      paymentMethod: payment.paymentMethod || 'Credit/Debit Card',
      paymentStatus: payment.status,
      transactionId: payment.transactionId || payment.stripeDetails?.sessionId || payment.sessionId,
      paymentType: payment.paymentType || 'Payment',
      payerName: payment.requestId?.tenantId?.name || 'Tenant',
      payeeName: payment.requestId?.ownerId?.name || 'Owner',
      paymentDescription: `Payment for ${payment.requestId?.propertyId?.title || 'property'}`,
      generatedAt: new Date()
    };

    // Generate HTML content for the receipt
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt - ${receiptData.paymentId}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .container {
                background: white;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                padding: 40px;
                max-width: 600px;
                width: 100%;
                text-align: center;
            }
            .header {
                border-bottom: 3px solid #667eea;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 10px;
            }
            .receipt-title {
                font-size: 24px;
                color: #333;
                margin-bottom: 10px;
            }
            .payment-id {
                font-size: 14px;
                color: #666;
                font-family: monospace;
            }
            .status {
                display: inline-block;
                padding: 8px 20px;
                background: #28a745;
                color: white;
                border-radius: 20px;
                font-weight: bold;
                margin: 20px 0;
            }
            .amount-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .amount-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }
            .amount-value {
                font-size: 32px;
                font-weight: bold;
                color: #28a745;
            }
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 20px 0;
                text-align: left;
            }
            .detail-item {
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .detail-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            .detail-value {
                font-size: 14px;
                color: #333;
                font-weight: 500;
            }
            .download-section {
                margin: 30px 0;
                padding: 20px;
                background: #e3f2fd;
                border-radius: 10px;
            }
            .download-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 10px;
            }
            .download-btn:hover {
                transform: translateY(-2px);
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏠 Home Management System</div>
                <div class="receipt-title">Payment Receipt</div>
                <div class="payment-id">Receipt ID: ${receiptData.paymentId}</div>
            </div>

            <div class="status">✅ ${receiptData.paymentStatus}</div>

            <div class="amount-section">
                <div class="amount-label">Total Amount Paid</div>
                <div class="amount-value">${receiptData.amount.toLocaleString()} ${receiptData.currency}</div>
            </div>

            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Property</div>
                    <div class="detail-value">${receiptData.propertyTitle}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Type</div>
                    <div class="detail-value">${receiptData.paymentType}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Method</div>
                    <div class="detail-value">${receiptData.paymentMethod}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Transaction ID</div>
                    <div class="detail-value">${receiptData.transactionId}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payer</div>
                    <div class="detail-value">${receiptData.payerName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Date</div>
                    <div class="detail-value">${new Date(receiptData.paymentDate).toLocaleDateString()}</div>
                </div>
            </div>

            <div class="detail-item" style="grid-column: 1 / -1; margin: 20px 0;">
                <div class="detail-label">Property Address</div>
                <div class="detail-value">${receiptData.propertyAddress}</div>
            </div>

            <div class="download-section">
                <h3>Download Your Receipt</h3>
                <p>Click the button below to download your payment receipt as a PDF file.</p>
                <a href="/api/pdf/download-receipt?session_id=${receiptData.sessionId}" class="download-btn" download>
                    📄 Download PDF Receipt
                </a>
            </div>

            <div class="footer">
                <p>This is an official receipt from Home Management System</p>
                <p>Generated on: ${new Date(receiptData.generatedAt).toLocaleString()}</p>
                <p>For support, please contact our customer service team.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(htmlContent);
    console.log('✅ Receipt page generated successfully');
    
  } catch (error) {
    console.error('❌ Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt: ' + error.message
    });
  }
};

// Generate PDF on server side and send as download
const generatePDFServerSide = async (req, res) => {
  let browser;
  
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    console.log('🔍 Generating server-side PDF for session:', session_id);
    
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
      paymentDate: payment.createdAt,
      paymentMethod: payment.paymentMethod || 'Credit/Debit Card',
      paymentStatus: payment.status,
      transactionId: payment.transactionId || payment.stripeDetails?.sessionId || payment.sessionId,
      paymentType: payment.paymentType || 'Payment',
      payerName: payment.requestId?.tenantId?.name || 'Tenant',
      payeeName: payment.requestId?.ownerId?.name || 'Owner',
      paymentDescription: `Payment for ${payment.requestId?.propertyId?.title || 'property'}`,
      generatedAt: new Date()
    };

    // Generate clean HTML for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #667eea;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 10px;
            }
            .receipt-title {
                font-size: 20px;
                margin-bottom: 10px;
            }
            .payment-id {
                font-size: 12px;
                color: #666;
                font-family: monospace;
            }
            .status {
                text-align: center;
                padding: 10px;
                background: #28a745;
                color: white;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
            .amount-section {
                text-align: center;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .amount-value {
                font-size: 28px;
                font-weight: bold;
                color: #28a745;
            }
            .details {
                margin: 20px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-label {
                font-weight: bold;
                color: #666;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🏠 Home Management System</div>
            <div class="receipt-title">Payment Receipt</div>
            <div class="payment-id">Receipt ID: ${receiptData.paymentId}</div>
        </div>

        <div class="status">✅ ${receiptData.paymentStatus}</div>

        <div class="amount-section">
            <div>Total Amount Paid</div>
            <div class="amount-value">${receiptData.amount.toLocaleString()} ${receiptData.currency}</div>
        </div>

        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Property:</span>
                <span>${receiptData.propertyTitle}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Type:</span>
                <span>${receiptData.paymentType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span>${receiptData.paymentMethod}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Transaction ID:</span>
                <span>${receiptData.transactionId}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payer:</span>
                <span>${receiptData.payerName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span>${new Date(receiptData.paymentDate).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Property Address:</span>
                <span>${receiptData.propertyAddress}</span>
            </div>
        </div>

        <div class="footer">
            <p>This is an official receipt from Home Management System</p>
            <p>Generated on: ${new Date(receiptData.generatedAt).toLocaleString()}</p>
            <p>For support, please contact our customer service team.</p>
        </div>
    </body>
    </html>
    `;

    // Launch Puppeteer
    console.log('🚀 Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();
    
    // Set headers for file download
    const filename = `payment-receipt-${receiptData.paymentId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    res.send(pdfBuffer);
    console.log('✅ PDF generated and sent successfully');
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF: ' + error.message
    });
  }
};

// Create a test payment record for testing PDF generation
const createTestPayment = async (req, res) => {
  try {
    console.log('🧪 Creating test payment record...');
    
    // Create a test payment record with a known session ID
    const testSessionId = 'cs_test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // First create a test request record
    const testRequest = await Request.create({
      propertyId: '507f1f77bcf86cd799439011', // Mock ObjectId
      ownerId: '507f1f77bcf86cd799439013', // Mock ObjectId
      tenantId: '507f1f77bcf86cd799439012', // Mock ObjectId
      requestType: 'Buy',
      payload: {
        familyMembers: [{
          name: 'John Doe',
          relation: 'Self',
          age: 30
        }],
        belongings: {
          items: ['Furniture', 'Electronics'],
          hasPets: false,
          petDetails: '',
          hasVehicle: false,
          vehicleDetails: ''
        },
        occupation: {
          employmentType: 'employed',
          role: 'Software Engineer',
          yearsOfExperience: 5,
          companyName: 'Test Company',
          companyAddress: 'Test Address',
          supervisorName: 'Test Supervisor',
          supervisorContact: 'test@example.com'
        },
        identity: {
          nidFileUrl: 'https://example.com/test-nid.jpg',
          tinFileUrl: 'https://example.com/test-tin.jpg',
          personalPhotoUrl: 'https://example.com/test-photo.jpg'
        },
        financials: {
          monthlyIncome: 50000,
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          creditScore: 750,
          additionalIncome: 10000,
          incomeSource: 'Freelancing'
        },
        letterToOwner: 'This is a test letter to the owner for PDF generation testing purposes. I am interested in this property and would like to proceed with the rental process.'
      },
      consent: {
        agreed: true,
        version: 'v1.0',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent'
      },
      status: 'Paid/Completed'
    });
    
    // Create a test payment record
    const testPayment = await Payment.create({
      requestId: testRequest._id,
      propertyId: testRequest.propertyId,
      payerId: testRequest.tenantId,
      payeeId: testRequest.ownerId,
      type: 'advance_payment',
      status: 'completed',
      method: 'stripe',
      amount: 50000,
      currency: 'BDT',
      description: 'Test advance payment for PDF generation',
      stripeDetails: {
        sessionId: testSessionId,
        paymentIntentId: 'pi_test_' + Date.now(),
        chargeId: 'ch_test_' + Date.now()
      },
      paidAt: new Date()
    });
    
    console.log('✅ Test payment created:', {
      sessionId: testSessionId,
      paymentId: testPayment._id,
      requestId: testRequest._id
    });
    
    res.json({
      success: true,
      message: 'Test payment created successfully',
      data: {
        sessionId: testSessionId,
        paymentId: testPayment._id,
        requestId: testRequest._id
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating test payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test payment: ' + error.message
    });
  }
};

module.exports = {
  generatePDFAndRedirect,
  generatePDFServerSide,
  createTestPayment
};