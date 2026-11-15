const mongoose = require('mongoose');
const {
  getOwnerTenants,
  getTenantDetails,
  createTenant,
  updateTenant,
  recordManualPayment,
  createOrSendNotice
} = require('../controllers/tenantManagement.controller');

// Mock Models
jest.mock('../models/Property');
jest.mock('../models/Rent');
jest.mock('../models/User');
jest.mock('../models/Invoice');
jest.mock('../models/Payment');
jest.mock('../models/Notification');
jest.mock('../models/Notice');
jest.mock('../services/emailService', () => ({
  sendTenantNoticeEmail: jest.fn().mockResolvedValue({ success: true, emailId: 'mock-email-123' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, emailId: 'mock-email-456' })
}));

const Property = require('../models/Property');
const Rent = require('../models/Rent');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Notice = require('../models/Notice');
const { sendTenantNoticeEmail } = require('../services/emailService');

describe('Tenant Management Controller', () => {
  let req, res;
  const ownerUserId = new mongoose.Types.ObjectId().toString();
  const propertyId = new mongoose.Types.ObjectId().toString();
  const tenantId = new mongoose.Types.ObjectId().toString();
  const rentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: ownerUserId, role: 'Owner' },
      query: {},
      params: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('GET /api/owner/tenants (getOwnerTenants)', () => {
    it('returns empty directory if owner has no properties', async () => {
      Property.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await getOwnerTenants(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          summary: {
            totalTenants: 0,
            occupiedApartments: 0,
            outstandingRent: 0,
            activeNotices: 0
          },
          tenants: []
        })
      );
    });

    it('returns owner tenants with computed payment status and metrics', async () => {
      const mockProp = {
        _id: propertyId,
        title: 'Sunset Residences',
        address: '123 Beach Road',
        unitNumber: 'Apt 4B',
        floorNumber: 4,
        propertyType: 'apartment_unit'
      };

      Property.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([mockProp])
      });

      const mockRent = {
        _id: rentId,
        propertyId: mockProp,
        tenants: [
          {
            _id: tenantId,
            firstName: 'Alice',
            lastName: 'Walker',
            email: 'alice@example.com',
            phoneNumber: '01700000000',
            address: '123 Beach Road'
          }
        ],
        rent: { amount: 25000, currency: 'BDT' },
        securityDeposit: { amount: 50000 },
        term: { startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), type: 'fixed' },
        status: 'Active',
        notes: 'Good tenant',
        createdAt: new Date('2026-01-01')
      };

      Rent.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockRent])
      });

      Invoice.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            rentId,
            total: 25000,
            paidAmount: 25000,
            balance: 0,
            status: 'paid',
            dueDate: new Date('2026-02-05')
          }
        ])
      });

      Notice.countDocuments.mockResolvedValue(2);

      await getOwnerTenants(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.summary.totalTenants).toBe(1);
      expect(jsonResponse.summary.occupiedApartments).toBe(1);
      expect(jsonResponse.summary.activeNotices).toBe(2);
      expect(jsonResponse.tenants).toHaveLength(1);
      expect(jsonResponse.tenants[0].fullName).toBe('Alice Walker');
      expect(jsonResponse.tenants[0].paymentStatus).toBe('Paid');
    });
  });

  describe('POST /api/owner/tenants (createTenant)', () => {
    it('rejects if property is not owned by the requesting user', async () => {
      req.body = {
        firstName: 'Bob',
        email: 'bob@example.com',
        propertyId,
        monthlyRent: 20000,
        startDate: '2026-03-01'
      };

      Property.findById.mockResolvedValue({
        _id: propertyId,
        ownerUserId: new mongoose.Types.ObjectId().toString(), // Different owner
        owner: new mongoose.Types.ObjectId().toString()
      });

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'You do not own this property' })
      );
    });

    it('rejects duplicate active tenancy for the same property', async () => {
      req.body = {
        firstName: 'Bob',
        email: 'bob@example.com',
        propertyId,
        monthlyRent: 20000,
        startDate: '2026-03-01'
      };

      Property.findById.mockResolvedValue({
        _id: propertyId,
        ownerUserId: ownerUserId
      });

      Rent.findOne.mockResolvedValue({ _id: 'existing-rent-id', status: 'Active' });

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('already has an active tenant') })
      );
    });

    it('links existing user without duplicate account and creates tenancy', async () => {
      req.body = {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob.smith@example.com',
        phoneNumber: '01800000000',
        propertyId,
        unitNumber: 'Unit 5A',
        monthlyRent: 30000,
        securityDeposit: 60000,
        startDate: '2026-04-01'
      };

      const mockProp = {
        _id: propertyId,
        ownerUserId: ownerUserId,
        save: jest.fn().mockResolvedValue(true)
      };
      Property.findById.mockResolvedValue(mockProp);
      Rent.findOne.mockResolvedValue(null); // No duplicate active rent

      const existingUser = {
        _id: tenantId,
        email: 'bob.smith@example.com',
        role: 'Tenant',
        save: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(existingUser);

      // Rent mock constructor
      const mockRentInstance = {
        _id: rentId,
        save: jest.fn().mockResolvedValue(true)
      };
      Rent.mockImplementation(() => mockRentInstance);

      // Invoice mock constructor
      const mockInvoiceInstance = {
        save: jest.fn().mockResolvedValue(true),
        invoiceNo: 'INV-TEST-001'
      };
      Invoice.mockImplementation(() => mockInvoiceInstance);
      Notification.create.mockResolvedValue({});

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockRentInstance.save).toHaveBeenCalled();
      expect(mockProp.status).toBe('Rented');
      expect(mockProp.currentRentId).toBe(rentId);
      expect(mockProp.save).toHaveBeenCalled();
    });
  });

  describe('POST /api/owner/tenants/:id/payments (recordManualPayment)', () => {
    it('records manual payment and updates invoice status', async () => {
      req.params.id = rentId;
      req.body = {
        amount: 25000,
        paymentMethod: 'cash',
        paymentDate: '2026-04-05',
        rentMonth: 'April 2026',
        referenceNote: 'Cash handed in office'
      };

      const mockProp = {
        _id: propertyId,
        ownerUserId: ownerUserId,
        title: 'Sunset Residences'
      };

      const mockRent = {
        _id: rentId,
        ownerId: ownerUserId,
        propertyId: mockProp,
        tenants: [{ _id: tenantId, firstName: 'Bob', lastName: 'Smith' }]
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRent)
        })
      });

      const mockInvoice = {
        _id: 'inv-123',
        total: 25000,
        paidAmount: 0,
        balance: 25000,
        payments: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Invoice.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockInvoice)
      });

      const mockPaymentInstance = {
        save: jest.fn().mockResolvedValue(true),
        paymentId: 'PAY-TEST-001'
      };
      Payment.mockImplementation(() => mockPaymentInstance);
      Notification.create.mockResolvedValue({});

      await recordManualPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockInvoice.paidAmount).toBe(25000);
      expect(mockInvoice.balance).toBe(0);
      expect(mockInvoice.status).toBe('paid');
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(mockPaymentInstance.save).toHaveBeenCalled();
    });
  });

  describe('POST /api/owner/notices (createOrSendNotice)', () => {
    it('rejects eviction notice without explicit legal acknowledgment', async () => {
      req.body = {
        noticeType: 'eviction_warning',
        recipientType: 'individual',
        tenantId,
        subject: 'Notice to Vacate',
        message: 'Lease violation notice',
        legalDisclaimerAcknowledged: false
      };

      await createOrSendNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Eviction and lease termination notices require explicit acknowledgment')
        })
      );
    });

    it('dispatches notice via in-app and Resend email service with delivery audit trail', async () => {
      req.body = {
        noticeType: 'maintenance',
        recipientType: 'individual',
        tenantId,
        subject: 'Scheduled Water Maintenance',
        message: 'Water will be shut off for 2 hours on Thursday',
        priority: 'high',
        status: 'sent'
      };

      Property.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: propertyId, title: 'Sunset Residences', address: '123 Beach Rd' }])
      });

      User.findById
        .mockResolvedValueOnce({
          _id: tenantId,
          firstName: 'Alice',
          lastName: 'Walker',
          email: 'alice@example.com'
        })
        .mockResolvedValueOnce({
          _id: ownerUserId,
          firstName: 'Owner',
          lastName: 'Manager'
        });

      Notification.create.mockResolvedValue({ _id: 'notif-123' });

      const mockNoticeInstance = {
        save: jest.fn().mockResolvedValue(true),
        noticeId: 'NTC-001'
      };
      Notice.mockImplementation(() => mockNoticeInstance);

      await createOrSendNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tenantId,
          title: '[Notice] Scheduled Water Maintenance'
        })
      );
      expect(sendTenantNoticeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          subject: 'Scheduled Water Maintenance'
        })
      );
      expect(mockNoticeInstance.save).toHaveBeenCalled();
    });
  });

  describe('GET /api/owner/tenants/:id (getTenantDetails)', () => {
    it('returns full tenant dossier with invoices, payments, and notices', async () => {
      req.params.id = rentId;

      const mockProp = { _id: propertyId, ownerUserId, title: 'Sunset Residences' };
      const mockRent = {
        _id: rentId,
        ownerId: { _id: ownerUserId },
        propertyId: mockProp,
        tenants: [{ _id: tenantId, firstName: 'Alice', lastName: 'Walker' }],
        term: { startDate: new Date('2026-01-01') },
        rent: { amount: 25000, currency: 'BDT' },
        securityDeposit: { amount: 50000 },
        status: 'Active'
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockRent)
          })
        })
      });

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            { total: 25000, paidAmount: 25000, balance: 0, status: 'paid' }
          ])
        })
      });

      Payment.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { amount: 25000, paymentMethod: 'cash', status: 'completed' }
        ])
      });

      Notice.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { subject: 'Welcome Notice', status: 'sent' }
        ])
      });

      await getTenantDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(data.financialSummary.totalBilled).toBe(25000);
      expect(data.financialSummary.totalPaid).toBe(25000);
      expect(data.financialSummary.balanceDue).toBe(0);
      expect(data.invoices).toHaveLength(1);
      expect(data.payments).toHaveLength(1);
      expect(data.notices).toHaveLength(1);
    });
  });

  describe('PUT /api/owner/tenants/:id (updateTenant)', () => {
    it('updates rent terms and tenant contact information', async () => {
      req.params.id = rentId;
      req.body = {
        monthlyRent: 28000,
        securityDeposit: 56000,
        status: 'Active',
        notes: 'Updated terms'
      };

      const mockProp = { _id: propertyId, ownerUserId, save: jest.fn().mockResolvedValue(true) };
      const mockRent = {
        _id: rentId,
        ownerId: ownerUserId,
        propertyId: mockProp,
        rent: { amount: 25000 },
        securityDeposit: { amount: 50000, held: 50000 },
        term: {},
        status: 'Active',
        save: jest.fn().mockResolvedValue(true),
        tenants: [tenantId]
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRent)
      });

      await updateTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRent.rent.amount).toBe(28000);
      expect(mockRent.securityDeposit.amount).toBe(56000);
      expect(mockRent.save).toHaveBeenCalled();
    });
  });
});
