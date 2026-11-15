const mongoose = require('mongoose');
const {
  approveRequest,
  rejectRequest,
  completeOfferForm,
  acceptOffer,
  getOfferDetails
} = require('../controllers/requestManagement.controller');

// Mock Models
jest.mock('../models/Request');
jest.mock('../models/Property');
jest.mock('../models/Rent');
jest.mock('../models/Invoice');
jest.mock('../models/Payment');
jest.mock('../models/User');

const Request = require('../models/Request');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

describe('Request Management Approval Controller (Offer-First Architecture)', () => {
  let req, res;
  const ownerUserId = new mongoose.Types.ObjectId().toString();
  const tenantUserId = new mongoose.Types.ObjectId().toString();
  const propertyId = new mongoose.Types.ObjectId().toString();
  const requestId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: ownerUserId, role: 'Owner' },
      params: { requestId },
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('POST /owner-requests/:requestId/approve (approveRequest)', () => {
    it('returns 404 if request is not found', async () => {
      Request.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await approveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
    });

    it('returns 403 if requester is not the property owner', async () => {
      const mockRequest = {
        _id: requestId,
        ownerId: new mongoose.Types.ObjectId().toString(),
        propertyId: {
          _id: propertyId,
          ownerUserId: new mongoose.Types.ObjectId().toString()
        },
        tenantId: { _id: tenantUserId }
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRequest)
        })
      });

      await approveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('not authorized') })
      );
    });

    it('returns 400 if property already has an active tenancy', async () => {
      const mockProp = {
        _id: propertyId,
        ownerUserId,
        pricing: { rent: 25000 }
      };
      const mockRequest = {
        _id: requestId,
        ownerId: ownerUserId,
        propertyId: mockProp,
        tenantId: { _id: tenantUserId },
        status: 'Submitted'
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRequest)
        })
      });

      Rent.findOne.mockResolvedValue({ _id: 'conflicting-rent-id', status: 'Active' });

      await approveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('already has an active tenancy') })
      );
    });

    it('CORE RULE: owner approval issues formal offer, temporarily reserves property, and DOES NOT activate tenancy or create Rent/Invoice', async () => {
      const mockProp = {
        _id: propertyId,
        ownerUserId,
        title: 'Lakeview Apartment',
        pricing: { rent: 30000, currency: 'BDT' },
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRequest = {
        _id: requestId,
        requestId: 'REQ-1001',
        ownerId: ownerUserId,
        propertyId: mockProp,
        tenantId: {
          _id: tenantUserId,
          firstName: 'Sarah',
          lastName: 'Connor',
          email: 'sarah@example.com'
        },
        status: 'Submitted',
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockRequest)
        })
      });

      Rent.findOne.mockResolvedValue(null);
      Request.findOne.mockResolvedValue(null);
      Payment.create.mockResolvedValue({ paymentId: 'PAY-123' });

      req.body = {
        monthlyRent: 30000,
        securityDeposit: 30000,
        advanceAmount: 30000,
        startDate: '2026-04-01',
        noticeDays: 60,
        paymentDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        note: 'Approved. Formal offer issued.'
      };

      await approveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // Core check: Rent must NOT be instantiated or saved
      expect(Rent).not.toHaveBeenCalled();
      // Core check: Initial invoice must NOT be generated on owner approval
      expect(Invoice.create).not.toHaveBeenCalled();

      // Property must be Processing (temporarily reserved), NOT Rented
      expect(mockProp.status).toBe('Processing');
      expect(mockProp.save).toHaveBeenCalled();

      // Request must be 'Approved – Pay Advance'
      expect(mockRequest.status).toBe('Approved – Pay Advance');
      expect(mockRequest.offer).toBeDefined();
      expect(mockRequest.offer.status).toBe('Sent');
      expect(mockRequest.offer.monthlyRent).toBe(30000);
      expect(mockRequest.offer.securityDeposit).toBe(30000);
      expect(mockRequest.offer.noticeDays).toBe(60);
      expect(mockRequest.reservation.status).toBe('Active');
      expect(mockRequest.save).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Application approved and formal offer issued')
        })
      );
    });
  });

  describe('Tenant Offer Form & Acceptance', () => {
    it('allows tenant to complete agreement form', async () => {
      const mockRequest = {
        _id: requestId,
        tenantId: tenantUserId,
        status: 'Approved – Pay Advance',
        offer: {
          status: 'Sent',
          paymentDeadline: new Date(Date.now() + 48 * 3600 * 1000)
        },
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRequest)
      });

      req.user = { userId: tenantUserId, role: 'Tenant' };
      req.body = {
        emergencyContact: { name: 'John Connor', phone: '01700000000', relation: 'Son' },
        occupants: { count: 2, notes: '2 adults' }
      };

      await completeOfferForm(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRequest.offer.formCompleted).toBe(true);
      expect(mockRequest.offer.formData.emergencyContact.name).toBe('John Connor');
      expect(mockRequest.save).toHaveBeenCalled();
    });

    it('allows tenant to accept terms after form completion', async () => {
      const mockRequest = {
        _id: requestId,
        tenantId: tenantUserId,
        status: 'Approved – Pay Advance',
        offer: {
          status: 'Awaiting Advance',
          formCompleted: true,
          paymentDeadline: new Date(Date.now() + 48 * 3600 * 1000)
        },
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRequest)
      });

      req.user = { userId: tenantUserId, role: 'Tenant' };
      req.body = { version: '1.0', consent: true };

      await acceptOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRequest.offer.acceptanceConsent).toBe(true);
      expect(mockRequest.offer.acceptedVersion).toBe('1.0');
      expect(mockRequest.save).toHaveBeenCalled();
    });
  });

  describe('PUT /owner-requests/:requestId/reject (rejectRequest)', () => {
    it('returns 400 if application is already approved', async () => {
      const mockRequest = {
        _id: requestId,
        ownerId: ownerUserId,
        status: 'Approved'
      };

      Request.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRequest)
      });

      await rejectRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Cannot reject an already approved request' })
      );
    });
  });
});
