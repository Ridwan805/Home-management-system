const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);

const Request = require('./models/Request');
const User = require('./models/User');
const Property = require('./models/Property');

const checkRequests = async () => {
  console.log('🔍 Checking all requests in the database...');
  console.log('=' .repeat(60));
  
  try {
    // Get all requests
    const allRequests = await Request.find({})
      .populate('propertyId', 'address price listingType')
      .populate('tenantId', 'firstName lastName email')
      .populate('ownerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`\n📊 Total requests found: ${allRequests.length}`);
    
    if (allRequests.length === 0) {
      console.log('❌ No requests found in database');
      return;
    }
    
    console.log('\n📋 Request Details:');
    console.log('-' .repeat(60));
    
    allRequests.forEach((request, index) => {
      console.log(`\n${index + 1}. Request ID: ${request._id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Type: ${request.requestType}`);
      console.log(`   Property: ${request.propertyId?.address || 'N/A'}`);
      console.log(`   Property Type: ${request.propertyId?.listingType || 'N/A'}`);
      console.log(`   Tenant: ${request.tenantId ? `${request.tenantId.firstName} ${request.tenantId.lastName}` : 'N/A'}`);
      console.log(`   Owner: ${request.ownerId ? `${request.ownerId.firstName} ${request.ownerId.lastName}` : 'N/A'}`);
      console.log(`   Advance Payment: ${request.advancePayment ? (request.advancePayment.isPaid ? 'PAID' : 'PENDING') : 'NOT SET'}`);
      console.log(`   Full Payment: ${request.fullPayment ? (request.fullPayment.isPaid ? 'PAID' : 'PENDING') : 'NOT SET'}`);
      console.log(`   Created: ${request.createdAt}`);
    });
    
    // Check for purchase requests specifically
    console.log('\n🏠 Purchase Requests Analysis:');
    console.log('-' .repeat(60));
    
    const purchaseRequests = allRequests.filter(req => req.requestType === 'Purchase');
    console.log(`Purchase requests: ${purchaseRequests.length}`);
    
    const saleProperties = allRequests.filter(req => req.propertyId?.listingType === 'For Sale');
    console.log(`Properties for sale: ${saleProperties.length}`);
    
    const confirmedSales = allRequests.filter(req => req.status === 'Confirmed for Sale');
    console.log(`Confirmed for sale: ${confirmedSales.length}`);
    
    const advanceCompleted = allRequests.filter(req => req.status === 'Advance Payment Completed');
    console.log(`Advance payment completed: ${advanceCompleted.length}`);
    
    // Show status distribution
    console.log('\n📈 Status Distribution:');
    const statusCounts = {};
    allRequests.forEach(req => {
      statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Check if we can find a suitable request for testing
    console.log('\n🧪 Finding testable requests...');
    
    const testableRequests = allRequests.filter(req => {
      return req.requestType === 'Purchase' && 
             req.propertyId?.listingType === 'For Sale' &&
             req.tenantId &&
             req.status &&
             req.status !== 'Rejected';
    });
    
    console.log(`Potentially testable requests: ${testableRequests.length}`);
    
    if (testableRequests.length > 0) {
      console.log('\n✅ Testable requests found:');
      testableRequests.forEach((req, index) => {
        console.log(`${index + 1}. ID: ${req._id}, Status: ${req.status}, Tenant: ${req.tenantId.firstName} ${req.tenantId.lastName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking requests:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Request Check Complete!');
};

// Run check if this file is executed directly
if (require.main === module) {
  checkRequests()
    .then(() => {
      console.log('\n✅ Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkRequests };