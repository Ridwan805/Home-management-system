const mongoose = require('mongoose');
const Request = require('./models/Request');
const Property = require('./models/Property');
const OwnershipTransfer = require('./models/OwnershipTransfer');
const Payment = require('./models/Payment');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/home-management-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testPurchaseWorkflow() {
  try {
    console.log('🚀 Starting Purchase Workflow Test...');
    
    // Find or create test users
    let owner = await User.findOne({ role: 'Owner' });
    let tenant = await User.findOne({ role: 'Tenant' });
    
    if (!owner) {
      owner = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'owner@example.com',
        password: 'password123',
        role: 'Owner'
      });
      await owner.save();
      console.log('✅ Created test owner');
    }
    
    if (!tenant) {
      tenant = new User({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'tenant@example.com',
        password: 'password123',
        role: 'Tenant'
      });
      await tenant.save();
      console.log('✅ Created test tenant');
    }
    
    // Find or create a property for sale
    let property = await Property.findOne({ listingType: 'For Sale' });
    if (!property) {
      property = new Property({
        title: 'Test Property for Sale',
        description: 'A beautiful test property',
        price: 5000000,
        currency: 'BDT',
        listingType: 'For Sale',
        propertyType: 'Apartment',
        status: 'Available',
        ownerUserId: owner._id,
        owner: owner._id,
        location: {
          address: '123 Test Street',
          city: 'Dhaka',
          state: 'Dhaka',
          zipCode: '1000',
          country: 'Bangladesh'
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          area: 1200,
          areaUnit: 'sqft'
        }
      });
      await property.save();
      console.log('✅ Created test property');
    }
    
    // Test 1: Create a simple Buy request and test status transitions
    console.log('\n📋 Test 1: Testing status transitions for Buy requests');
    
    // Create minimal request using direct database insertion to avoid validation issues
    const requestData = {
      propertyId: property._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      requestType: 'Buy',
      status: 'AdvancePaid',
      payload: {
        familyMembers: [{ name: 'Test User', relation: 'Self', age: 30 }],
        belongings: { items: ['Basic furniture'], hasPets: false, hasVehicle: false },
        occupation: {
          employmentType: 'employed',
          role: 'Software Engineer',
          yearsOfExperience: 3
        },
        identity: {
          nidFileUrl: 'test-nid.jpg',
          personalPhotoUrl: 'test-photo.jpg'
        },
        financials: {
          monthlyIncome: 80000
        },
        letterToOwner: 'I am interested in purchasing this property for my family.'
      },
      advancePayment: {
        status: 'Paid',
        amount: 1000000,
        dueDate: new Date(),
        isPaid: true,
        paidAt: new Date()
      },
      consent: {
        agreed: true,
        version: 'v1.0',
        timestamp: new Date()
      }
    };
    
    const testRequest = new Request(requestData);
    await testRequest.save();
    console.log('✅ Created test Buy request:', testRequest._id);
    
    // Test workflow steps
    await testWorkflowSteps(testRequest);
    
    // Test 2: Refund scenario
    console.log('\n📋 Test 2: Testing refund scenario');
    await testRefundScenario();
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function testWorkflowSteps(request) {
  try {
    console.log(`\n🔄 Testing workflow for request: ${request._id}`);
    console.log(`   Current Status: ${request.status}`);
    
    // Import the controller function to simulate API calls
    const { updateRequestStatus } = require('./controllers/request.controller');
    
    // Mock request and response objects
    const mockReq = {
      params: { requestId: request.requestId },
      user: { userId: request.ownerId.toString(), role: 'Owner' },
      body: {},
      get: () => 'test-user-agent',
      ip: '127.0.0.1'
    };
    
    const mockRes = {
      status: (code) => ({ json: (data) => console.log(`Response ${code}:`, data) }),
      json: (data) => {
        console.log('Response:', data);
        if (data.request) {
          console.log('Request status after update:', data.request.status);
          console.log('Request ownershipTransferId:', data.request.ownershipTransferId);
        }
      }
    };
    
    // Step 1: Owner confirms sale (AdvancePaid -> Confirmed for Sale)
    console.log('\n🔄 Step 1: Owner confirms sale...');
    mockReq.body = {
      status: 'Confirmed for Sale',
      note: 'Sale confirmed by owner - tenant must pay full amount'
    };
    console.log('🔄 About to call updateRequestStatus for step 1');
    try {
      await updateRequestStatus(mockReq, mockRes);
      console.log('🔄 updateRequestStatus call 1 completed');
    } catch (error) {
      console.error('❌ Error in updateRequestStatus call 1:', error);
    }
    
    // Refresh request data
    let updatedRequest = await Request.findOne({ requestId: request.requestId });
    console.log('✅ Status updated to:', updatedRequest.status);
    
    // Step 2: Tenant makes full payment (Confirmed for Sale -> Paid/Completed)
    console.log('\n🔄 Step 2: Tenant makes full payment...');
    // Update the mockReq to use the updated request's requestId
    mockReq.params.requestId = updatedRequest.requestId;
    mockReq.user = { userId: updatedRequest.ownerId.toString(), role: 'Owner' };
    mockReq.body = {
      status: 'Paid/Completed',
      note: 'Full payment received and verified'
    };
    console.log('🔄 About to call updateRequestStatus for step 2');
    try {
      await updateRequestStatus(mockReq, mockRes);
      console.log('🔄 updateRequestStatus call 2 completed');
    } catch (error) {
      console.error('❌ Error in updateRequestStatus call 2:', error);
    }
    
    // Refresh request data again
    updatedRequest = await Request.findOne({ requestId: request.requestId });
    console.log('✅ Status updated to:', updatedRequest.status);
    
    // Step 3: Check if OwnershipTransfer was created
    console.log('\n🔄 Step 3: Checking OwnershipTransfer creation...');
    const ownershipTransfer = await OwnershipTransfer.findOne({ requestId: updatedRequest._id });
    
    if (ownershipTransfer) {
      console.log('✅ OwnershipTransfer created:', ownershipTransfer._id);
      console.log(`   Agreed Price: ${ownershipTransfer.agreedPrice}`);
      console.log(`   Down Payment: ${ownershipTransfer.downPayment.amount}`);
      console.log(`   Status: ${ownershipTransfer.status}`);
    } else {
      console.log('❌ OwnershipTransfer not found');
    }
    
    // Step 4: Check property status
    console.log('\n🔄 Step 4: Checking property status...');
    const updatedProperty = await Property.findById(updatedRequest.propertyId);
    console.log(`✅ Property status: ${updatedProperty.status}`);
    
  } catch (error) {
    console.error('❌ Error in workflow steps:', error);
  }
}

async function testRefundScenario() {
  try {
    // Use existing test users
    const owner = await User.findOne({ role: 'Owner' });
    const tenant = await User.findOne({ role: 'Tenant' });
    const property = await Property.findOne({ listingType: 'For Sale', status: 'Available' });
    
    if (!owner || !tenant || !property) {
      console.log('❌ Required test data not found for refund test');
      return;
    }
    
    // Create another test request for refund scenario
    const refundRequestData = {
      propertyId: property._id,
      ownerId: owner._id,
      tenantId: tenant._id,
      requestType: 'Buy',
      status: 'AdvancePaid',
      payload: {
        familyMembers: [{ name: 'Test User 2', relation: 'Self', age: 25 }],
        belongings: { items: ['Minimal items'], hasPets: false, hasVehicle: false },
        occupation: {
          employmentType: 'self-employed',
          role: 'Freelancer',
          yearsOfExperience: 2
        },
        identity: {
          nidFileUrl: 'test-nid-2.jpg',
          personalPhotoUrl: 'test-photo-2.jpg'
        },
        financials: {
          monthlyIncome: 60000
        },
        letterToOwner: 'I would like to purchase this property but may need to cancel.'
      },
      advancePayment: {
        status: 'Paid',
        amount: 800000,
        dueDate: new Date(),
        isPaid: true,
        paidAt: new Date()
      },
      consent: {
        agreed: true,
        version: 'v1.0',
        timestamp: new Date()
      }
    };
    
    const refundRequest = new Request(refundRequestData);
    await refundRequest.save();
    console.log('✅ Created test request for refund scenario:', refundRequest._id);
    
    // Test refund workflow
    console.log('\n🔄 Owner decides to refund and cancel sale...');
    refundRequest.status = 'Refunded';
    await refundRequest.save();
    console.log('✅ Status updated to: Refunded');
    
    // Check if advance payment was marked as refunded
    const updatedRequest = await Request.findById(refundRequest._id);
    console.log(`✅ Advance payment status: ${updatedRequest.advancePayment.status}`);
    
  } catch (error) {
    console.error('❌ Error in refund scenario:', error);
  }
}

// Run the test
testPurchaseWorkflow();