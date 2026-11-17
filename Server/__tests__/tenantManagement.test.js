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
jest.mock('../models/Request');
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
const Request = require('../models/Request');
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

    Request.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(null)
    });
    Request.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null)
      })
    });
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

    it('correctly resolves owner identity when req.user is a Mongoose model instance with _id', async () => {
      req.user = {
        _id: new mongoose.Types.ObjectId(ownerUserId),
        role: 'Owner'
      };

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
        sort: jest.fn().mockResolvedValue([])
      });

      Notice.countDocuments.mockResolvedValue(0);

      await getOwnerTenants(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.summary.totalTenants).toBe(1);
      expect(jsonResponse.tenants).toHaveLength(1);
      expect(jsonResponse.tenants[0].fullName).toBe('Alice Walker');
    });
  });

  describe('POST /api/owner/tenants (createTenant - Workflow Enforcement)', () => {
    it('disallows manual tenant creation with 403 Forbidden', async () => {
      req.body = {
        firstName: 'Bob',
        email: 'bob@example.com',
        propertyId,
        monthlyRent: 20000,
        startDate: '2026-03-01'
      };

      await createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Manual tenant creation is disabled')
        })
      );
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

  describe('Move-Out Notice and Deposit Settlement Workflow', () => {
    const {
      submitMoveOutNotice,
      acknowledgeMoveOut,
      settleDepositAndTerminate
    } = require('../controllers/tenantManagement.controller');

    it('tenant submits move-out notice with >= 60 days notice', async () => {
      req.user = { userId: tenantId, role: 'Tenant' };
      req.params.rentId = rentId;
      const targetDate = new Date(Date.now() + 65 * 24 * 3600 * 1000).toISOString();
      req.body = {
        intendedMoveOutDate: targetDate,
        reason: 'Relocating to another city',
        forwardingAddress: 'Dhaka, Bangladesh'
      };

      const mockRent = {
        _id: rentId,
        tenants: [tenantId],
        ownerId: ownerUserId,
        status: 'Active',
        term: { noticeDays: 60 },
        propertyId: { _id: propertyId, title: 'Palm Heights' },
        save: jest.fn().mockResolvedValue(true)
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRent)
        })
      });
      User.findById.mockResolvedValue({ firstName: 'Alice', lastName: 'Walker' });
      Notification.create.mockResolvedValue({ _id: 'notif-1' });

      await submitMoveOutNotice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRent.moveOut.noticeSubmitted).toBe(true);
      expect(mockRent.moveOut.meetsRequirement).toBe(true);
      expect(mockRent.moveOut.noticeDaysGiven).toBeGreaterThanOrEqual(60);
      expect(mockRent.save).toHaveBeenCalled();
      expect(Notification.create).toHaveBeenCalled();
    });

    it('owner acknowledges notice and schedules handover', async () => {
      req.user = { userId: ownerUserId, role: 'Owner' };
      req.params.rentId = rentId;
      const handoverDate = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
      req.body = {
        handoverScheduledDate: handoverDate,
        notes: 'Handover inspection confirmed at 11 AM.'
      };

      const mockRent = {
        _id: rentId,
        ownerId: ownerUserId,
        moveOut: { noticeSubmitted: true },
        tenants: [{ _id: tenantId }],
        save: jest.fn().mockResolvedValue(true)
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRent)
        })
      });
      Notification.create.mockResolvedValue({ _id: 'notif-2' });

      await acknowledgeMoveOut(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRent.moveOut.ownerAcknowledged).toBe(true);
      expect(mockRent.moveOut.handoverNotes).toBe('Handover inspection confirmed at 11 AM.');
      expect(mockRent.save).toHaveBeenCalled();
    });

    it('owner itemizes deductions, processes refund, terminates tenancy, and releases property', async () => {
      req.user = { userId: ownerUserId, role: 'Owner' };
      req.params.rentId = rentId;
      req.body = {
        deductions: [
          { description: 'Wall repainting & deep cleaning', amount: 5000, category: 'repairs' },
          { description: 'Final water bill dues', amount: 1500, category: 'utilities' }
        ],
        refundAmount: 23500, // 30000 - 6500 = 23500
        method: 'Bank Transfer',
        transactionRef: 'TXN-REFUND-999',
        terminateTenancy: true
      };

      const mockProp = {
        _id: propertyId,
        ownerUserId,
        status: 'Rented',
        currentRentId: rentId,
        stateHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRent = {
        _id: rentId,
        ownerId: ownerUserId,
        propertyId: mockProp,
        status: 'Active',
        securityDeposit: {
          amount: 30000,
          held: 30000,
          deductions: [],
          refundTransactions: []
        },
        moveOut: { noticeSubmitted: true, ownerAcknowledged: true },
        term: {},
        tenants: [{ _id: tenantId }],
        save: jest.fn().mockResolvedValue(true)
      };

      Rent.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRent)
        })
      });
      Notification.create.mockResolvedValue({ _id: 'notif-3' });

      await settleDepositAndTerminate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRent.securityDeposit.deductions).toHaveLength(2);
      expect(mockRent.securityDeposit.refundedAmount).toBe(23500);
      expect(mockRent.securityDeposit.refundStatus).toBe('completed');
      expect(mockRent.status).toBe('Ended');
      expect(mockProp.status).toBe('Available');
      expect(mockProp.currentRentId).toBeNull();
      expect(mockProp.save).toHaveBeenCalled();
      expect(mockRent.save).toHaveBeenCalled();
    });
  });
});
