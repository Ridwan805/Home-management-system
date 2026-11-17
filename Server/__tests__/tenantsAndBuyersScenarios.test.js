const mongoose = require('mongoose');
const { getOwnerTenants, getTenantDetails } = require('../controllers/tenantManagement.controller');

// Mock Models
jest.mock('../models/Property');
jest.mock('../models/Rent');
jest.mock('../models/User');
jest.mock('../models/Invoice');
jest.mock('../models/Payment');
jest.mock('../models/Notification');
jest.mock('../models/Notice');
jest.mock('../models/Request');
jest.mock('../services/emailService', () => ({
  sendTenantNoticeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
}));

const Property = require('../models/Property');
const Rent = require('../models/Rent');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Request = require('../models/Request');
const Notice = require('../models/Notice');

describe('Tenants & Buyers Synchronization — 6 Required Test Scenarios', () => {
  let req, res;
  const ownerId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: ownerId, role: 'Owner' },
      query: {},
      params: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    Notice.countDocuments = jest.fn().mockResolvedValue(0);
    Invoice.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    });
  });

  // =========================================================================
  // CASE 1: One user renting one property
  // =========================================================================
  it('Case 1: One user renting one property returns 1 tenant record with rental details', async () => {
    const prop1Id = new mongoose.Types.ObjectId().toString();
    const tenant1Id = new mongoose.Types.ObjectId().toString();
    const rent1Id = new mongoose.Types.ObjectId().toString();

    Property.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: prop1Id, title: 'House 24', address: 'Road 8A, Dhanmondi', listingType: 'For Rent', pricing: { rent: 65000 } }
      ])
    });

    const mockRent = {
      _id: rent1Id,
      propertyId: { _id: prop1Id, title: 'House 24', address: 'Road 8A, Dhanmondi', unitNumber: 'Unit 2A', pricing: { rent: 65000 } },
      tenants: [{ _id: tenant1Id, firstName: 'Karim', lastName: 'Chowdhury', email: 'karim@example.com', phoneNumber: '01711111111' }],
      status: 'Active',
      rent: { amount: 65000, currency: 'BDT' },
      securityDeposit: { amount: 130000, held: 130000 },
      advancePaymentVerified: true,
      createdAt: new Date('2026-01-01')
    };

    Rent.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockRent])
        })
      })
    });

    Request.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });
    Request.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        })
      })
    });

    Request.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
          })
        })
      })
    });

    Payment.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    });

    await getOwnerTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.summary.totalClients).toBe(1);
    expect(data.summary.totalTenants).toBe(1);
    expect(data.summary.propertyBuyers).toBe(0);
    expect(data.tenants).toHaveLength(1);

    const record = data.tenants[0];
    expect(record.relationshipId).toBe(`rent_${rent1Id}`);
    expect(record.clientType).toBe('tenant');
    expect(record.listingType).toBe('For Rent');
    expect(record.fullName).toBe('Karim Chowdhury');
    expect(record.monthlyRent).toBe(65000);
    expect(record.purchasePrice).toBe(0);
    expect(record.purchaseStatus).toBeNull();
    expect(record.leaseStatus).toBe('Active');
  });

  // =========================================================================
  // CASE 2: One user renting two properties
  // =========================================================================
  it('Case 2: One user renting two properties returns 2 distinct records without colliding', async () => {
    const prop1Id = new mongoose.Types.ObjectId().toString();
    const prop2Id = new mongoose.Types.ObjectId().toString();
    const tenant1Id = new mongoose.Types.ObjectId().toString();
    const rent1Id = new mongoose.Types.ObjectId().toString();
    const rent2Id = new mongoose.Types.ObjectId().toString();

    Property.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: prop1Id, title: 'House 24', address: 'Road 8A, Dhanmondi' },
        { _id: prop2Id, title: 'Apartment 5B', address: 'Gulshan 2' }
      ])
    });

    const tenantUser = { _id: tenant1Id, firstName: 'Karim', lastName: 'Chowdhury', email: 'karim@example.com' };

    const mockRent1 = {
      _id: rent1Id,
      propertyId: { _id: prop1Id, title: 'House 24', address: 'Road 8A, Dhanmondi', unitNumber: '2A' },
      tenants: [tenantUser],
      status: 'Active',
      rent: { amount: 65000 },
      createdAt: new Date('2026-01-01')
    };

    const mockRent2 = {
      _id: rent2Id,
      propertyId: { _id: prop2Id, title: 'Apartment 5B', address: 'Gulshan 2', unitNumber: '5B' },
      tenants: [tenantUser],
      status: 'Active',
      rent: { amount: 80000 },
      createdAt: new Date('2026-02-01')
    };

    Rent.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockRent1, mockRent2])
        })
      })
    });

    Request.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });
    Request.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        })
      })
    });

    Request.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
          })
        })
      })
    });

    await getOwnerTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.summary.totalClients).toBe(1); // 1 distinct human client
    expect(data.summary.totalTenants).toBe(1);
    expect(data.tenants).toHaveLength(2); // 2 distinct property tenancies!

    const ids = data.tenants.map(t => t.relationshipId);
    expect(ids).toContain(`rent_${rent1Id}`);
    expect(ids).toContain(`rent_${rent2Id}`);
    expect(data.tenants[0].propertyAddress).not.toBe(data.tenants[1].propertyAddress);
  });

  // =========================================================================
  // CASE 3: One user purchasing one property
  // =========================================================================
  it('Case 3: One user purchasing one property returns 1 buyer record with financial reconciliation', async () => {
    const propSaleId = new mongoose.Types.ObjectId().toString();
    const buyerId = new mongoose.Types.ObjectId().toString();
    const requestId = new mongoose.Types.ObjectId().toString();

    Property.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: propSaleId, title: 'Plot 42', address: 'Sector 18, Purbachal', listingType: 'For Sale', pricing: { sale: 18000000 } }
      ])
    });

    // No rents
    Rent.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      })
    });

    const mockRequest = {
      _id: requestId,
      requestId: 'REQ-PURCHASE-001',
      tenantId: { _id: buyerId, firstName: 'Rahim', lastName: 'Ahmed', email: 'rahim@example.com', phoneNumber: '01822222222' },
      propertyId: { _id: propSaleId, title: 'Plot 42', address: 'Sector 18, Purbachal', listingType: 'For Sale', pricing: { sale: 18000000 } },
      status: 'Approved – Pay Advance',
      requestType: 'Buy',
      messages: [],
      createdAt: new Date('2026-03-01')
    };

    Request.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([mockRequest])
          })
        })
      })
    });

    Payment.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    });

    await getOwnerTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];
    expect(data.summary.totalClients).toBe(1);
    expect(data.summary.totalTenants).toBe(0);
    expect(data.summary.propertyBuyers).toBe(1);
    expect(data.tenants).toHaveLength(1);

    const record = data.tenants[0];
    expect(record.relationshipId).toBe(`buy_${requestId}`);
    expect(record.clientType).toBe('buyer');
    expect(record.listingType).toBe('For Sale');
    expect(record.purchasePrice).toBe(18000000);
    expect(record.advancePaid).toBe(0);
    expect(record.remainingBalance).toBe(18000000);
    expect(record.purchaseStatus).toBe('Approved');
    expect(record.paymentStatus).toBe('Pending');
  });

  // =========================================================================
  // CASE 4: One user renting and purchasing properties from the same owner (user xy)
  // =========================================================================
  it('Case 4: One user renting and purchasing from same owner returns 2 separate records for tenant and buyer', async () => {
    const propRentId = new mongoose.Types.ObjectId().toString();
    const propSaleId = new mongoose.Types.ObjectId().toString();
    const userIdXY = new mongoose.Types.ObjectId().toString();
    const rentId = new mongoose.Types.ObjectId().toString();
    const reqId = new mongoose.Types.ObjectId().toString();

    Property.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: propRentId, title: 'House 24', address: 'Road 8A, Dhanmondi', listingType: 'For Rent' },
        { _id: propSaleId, title: 'Plot 42', address: 'Sector 18, Purbachal', listingType: 'For Sale', pricing: { sale: 18000000 } }
      ])
    });

    const userXY = { _id: userIdXY, firstName: 'User', lastName: 'XY', email: 'xy@gmail.com' };

    // 1 Active Rent
    const mockRent = {
      _id: rentId,
      propertyId: { _id: propRentId, title: 'House 24', address: 'Road 8A, Dhanmondi' },
      tenants: [userXY],
      status: 'Active',
      rent: { amount: 65000 },
      createdAt: new Date('2026-01-01')
    };

    Rent.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([mockRent])
        })
      })
    });

    // 1 Purchase Request with verified full payment
    const mockRequest = {
      _id: reqId,
      requestId: 'REQ-1794851849842',
      tenantId: userXY,
      propertyId: { _id: propSaleId, title: 'Plot 42', address: 'Sector 18, Purbachal', listingType: 'For Sale', pricing: { sale: 18000000 } },
      status: 'AdvancePaid',
      requestType: 'Buy',
      messages: [],
      createdAt: new Date('2026-03-01')
    };

    Request.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });
    Request.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        })
      })
    });

    Request.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([mockRequest])
          })
        })
      })
    });

    // Verified Stripe payment of 18,000,000
    Payment.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: 'pay-001',
          requestId: reqId,
          propertyId: propSaleId,
          payerId: userIdXY,
          amount: 18000000,
          status: 'completed'
        }
      ])
    });

    await getOwnerTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];

    // Summary counts
    expect(data.summary.totalClients).toBe(1); // 1 single human user xy
    expect(data.summary.totalTenants).toBe(1);
    expect(data.summary.propertyBuyers).toBe(1);

    // Records array contains BOTH relationships
    expect(data.tenants).toHaveLength(2);

    const rentRecord = data.tenants.find(t => t.relationshipId === `rent_${rentId}`);
    const buyRecord = data.tenants.find(t => t.relationshipId === `buy_${reqId}`);

    expect(rentRecord).toBeDefined();
    expect(rentRecord.clientType).toBe('tenant');
    expect(rentRecord.monthlyRent).toBe(65000);

    expect(buyRecord).toBeDefined();
    expect(buyRecord.clientType).toBe('buyer');
    expect(buyRecord.purchasePrice).toBe(18000000);
    expect(buyRecord.advancePaid).toBe(18000000);
    expect(buyRecord.remainingBalance).toBe(0);
    expect(buyRecord.purchaseStatus).toBe('Fully Paid');
    expect(buyRecord.paymentStatus).toBe('Paid');
  });

  // =========================================================================
  // CASE 5: Two different users associated with the same owner
  // =========================================================================
  it('Case 5: Two different users associated with same owner are cleanly distinguished', async () => {
    const prop1Id = new mongoose.Types.ObjectId().toString();
    const prop2Id = new mongoose.Types.ObjectId().toString();
    const user1Id = new mongoose.Types.ObjectId().toString();
    const user2Id = new mongoose.Types.ObjectId().toString();
    const rent1Id = new mongoose.Types.ObjectId().toString();
    const rent2Id = new mongoose.Types.ObjectId().toString();

    Property.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: prop1Id, title: 'Apt 1A' },
        { _id: prop2Id, title: 'Apt 2B' }
      ])
    });

    const user1 = { _id: user1Id, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' };
    const user2 = { _id: user2Id, firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' };

    Rent.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            { _id: rent1Id, propertyId: { _id: prop1Id, title: 'Apt 1A' }, tenants: [user1], status: 'Active', rent: { amount: 30000 } },
            { _id: rent2Id, propertyId: { _id: prop2Id, title: 'Apt 2B' }, tenants: [user2], status: 'Active', rent: { amount: 35000 } }
          ])
        })
      })
    });

    Request.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });
    Request.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        })
      })
    });

    Request.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
          })
        })
      })
    });

    await getOwnerTenants(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];

    expect(data.summary.totalClients).toBe(2);
    expect(data.summary.totalTenants).toBe(2);
    expect(data.tenants).toHaveLength(2);
    expect(data.tenants[0].email).toBe('alice@example.com');
    expect(data.tenants[1].email).toBe('bob@example.com');
  });

  // =========================================================================
  // CASE 6: Pending purchase, advance paid, fully paid, and completed purchase
  // =========================================================================
  describe('Case 6: Purchase lifecycle states & mathematical reconciliation', () => {
    const propId = new mongoose.Types.ObjectId().toString();
    const buyerId = new mongoose.Types.ObjectId().toString();
    const reqId = new mongoose.Types.ObjectId().toString();
    const agreedPrice = 20000000;

    const setupPurchaseTest = (reqStatus, verifiedAmount, propStatus = 'Available') => {
      Property.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: propId, title: 'Luxury Villa', status: propStatus, listingType: 'For Sale', pricing: { sale: agreedPrice } }
        ])
      });

      Rent.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
          })
        })
      });

      Request.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockResolvedValue([
                {
                  _id: reqId,
                  requestId: 'REQ-LIFECYCLE',
                  tenantId: { _id: buyerId, firstName: 'Buyer', lastName: 'Six', email: 'six@example.com' },
                  propertyId: { _id: propId, title: 'Luxury Villa', status: propStatus, listingType: 'For Sale', pricing: { sale: agreedPrice } },
                  status: reqStatus,
                  requestType: 'Buy',
                  messages: [],
                  createdAt: new Date()
                }
              ])
            })
          })
        })
      });

      const payments = verifiedAmount > 0 ? [
        {
          _id: 'pay-life',
          requestId: reqId,
          propertyId: propId,
          payerId: buyerId,
          amount: verifiedAmount,
          status: 'completed'
        }
      ] : [];

      Payment.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(payments)
      });
    };

    it('6a: Pending/Approved purchase (0 paid) -> Approved, balance = agreed price, deed pending', async () => {
      setupPurchaseTest('Approved', 0);
      await getOwnerTenants(req, res);
      const record = res.json.mock.calls[0][0].tenants[0];

      expect(record.purchaseStatus).toBe('Approved');
      expect(record.advancePaid).toBe(0);
      expect(record.remainingBalance).toBe(agreedPrice);
      expect(record.paymentStatus).toBe('Pending');
      expect(record.deedStatus).toBe('Pending Conveyance');
    });

    it('6b: Advance paid (4M out of 20M) -> Advance Paid, balance = 16M, partially paid', async () => {
      setupPurchaseTest('AdvancePaid', 4000000);
      await getOwnerTenants(req, res);
      const record = res.json.mock.calls[0][0].tenants[0];

      expect(record.purchaseStatus).toBe('Advance Paid');
      expect(record.advancePaid).toBe(4000000);
      expect(record.remainingBalance).toBe(16000000);
      expect(record.paymentStatus).toBe('Partially Paid');
      expect(record.deedStatus).toBe('Pending Conveyance');
    });

    it('6c: Fully paid (20M out of 20M, property still available) -> Fully Paid, balance = 0, awaiting deed', async () => {
      setupPurchaseTest('AdvancePaid', 20000000);
      await getOwnerTenants(req, res);
      const record = res.json.mock.calls[0][0].tenants[0];

      expect(record.purchaseStatus).toBe('Fully Paid');
      expect(record.advancePaid).toBe(20000000);
      expect(record.remainingBalance).toBe(0);
      expect(record.paymentStatus).toBe('Paid');
      expect(record.deedStatus).toBe('Pending Conveyance'); // Not completed yet because deed not transferred!
    });

    it('6d: Completed purchase (property status Sold or request status Completed) -> Completed, deed transferred', async () => {
      setupPurchaseTest('Completed', 20000000, 'Sold');
      await getOwnerTenants(req, res);
      const record = res.json.mock.calls[0][0].tenants[0];

      expect(record.purchaseStatus).toBe('Completed');
      expect(record.advancePaid).toBe(20000000);
      expect(record.remainingBalance).toBe(0);
      expect(record.paymentStatus).toBe('Paid');
      expect(record.deedStatus).toBe('Transferred');
    });

    it('6e: Integrity protection: Unverified payment does not mark purchase completed or paid', async () => {
      // Suppose request status says 'Paid' or 'Approved', but verified payments in Stripe/Payment model is 0
      setupPurchaseTest('Approved', 0);
      await getOwnerTenants(req, res);
      const record = res.json.mock.calls[0][0].tenants[0];

      expect(record.purchaseStatus).not.toBe('Completed');
      expect(record.purchaseStatus).not.toBe('Fully Paid');
      expect(record.remainingBalance).toBe(agreedPrice);
    });
  });
});
