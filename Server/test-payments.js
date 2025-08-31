// Test script to check payment functionality
require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const Request = require('./models/Request');

async function testPayments() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to database');
    
    // Check for existing payments
    const totalPayments = await Payment.countDocuments();
    console.log(`📊 Total payments in database: ${totalPayments}`);
    
    // Check pending payments
    const pendingPayments = await Payment.find({ status: 'pending' }).limit(5);
    console.log(`⏳ Pending payments: ${pendingPayments.length}`);
    
    if (pendingPayments.length > 0) {
      console.log('Pending payment details:');
      pendingPayments.forEach(payment => {
        console.log(`- Payment ID: ${payment.paymentId}, Amount: ${payment.amount}, Type: ${payment.type}`);
      });
    }
    
    // Check completed payments
    const completedPayments = await Payment.find({ status: 'completed' }).limit(5);
    console.log(`✅ Completed payments: ${completedPayments.length}`);
    
    // Check requests with pending payments
    const pendingRequests = await Request.find({
      $or: [
        { 'advancePayment.status': 'pending' },
        { 'fullPayment.status': 'pending' }
      ]
    }).limit(3);
    
    console.log(`📋 Requests with pending payments: ${pendingRequests.length}`);
    
    if (pendingRequests.length > 0) {
      console.log('Request payment details:');
      pendingRequests.forEach(request => {
        console.log(`- Request ID: ${request.requestId}`);
        if (request.advancePayment?.status === 'pending') {
          console.log(`  - Advance payment: ${request.advancePayment.status}, Session: ${request.advancePayment.stripeSessionId || 'N/A'}`);
        }
        if (request.fullPayment?.status === 'pending') {
          console.log(`  - Full payment: ${request.fullPayment.status}, Session: ${request.fullPayment.stripeSessionId || 'N/A'}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testPayments();