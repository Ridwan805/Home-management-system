const mongoose = require('mongoose');
const { approveRequest, rejectRequest } = require('../controllers/requestManagement.controller');

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

describe('Request Management Approval Controller', () => {
  let req, res;
  const ownerUserId = new mongoose.Types.ObjectId().toString();
  const tenantUserId = new mongoose.Types.ObjectId().toString();
  const propertyId = new mongoose.Types.ObjectId().toString();
  const requestId = new mongoose.Types.ObjectId().toString();
  const rentId = new mongoose.Types.ObjectId().toString();

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
        ownerId: new mongoose.Types.ObjectId().toString(), // Different owner
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

    it('successfully approves application, creates active tenancy, marks property rented, and generates invoice', async () => {
      const mockProp = {
        _id: propertyId,
        ownerUserId,
        title: 'Lakeview Apartment',
        pricing: { rent: 30000, currency: 'BDT' },
        save: jest.fn().mockResolvedValue(true)
      };

      const mockRequest = {
        _id: requestId,
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

      const mockRentInstance = {
        _id: rentId,
        save: jest.fn().mockResolvedValue(true)
      };
      Rent.mockImplementation(() => mockRentInstance);
      Invoice.create.mockResolvedValue({ _id: 'invoice-id-123' });

      req.body = {
        monthlyRent: 30000,
        securityDeposit: 30000,
        startDate: '2026-04-01',
        note: 'Approved for 1-year lease'
      };

      await approveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRentInstance.save).toHaveBeenCalled();
      expect(mockProp.status).toBe('Rented');
      expect(mockProp.currentRentId).toBe(rentId);
      expect(mockProp.save).toHaveBeenCalled();
      expect(mockRequest.status).toBe('Approved');
      expect(mockRequest.rentId).toBe(rentId);
      expect(mockRequest.save).toHaveBeenCalled();
      expect(Invoice.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Rental application approved')
        })
      );
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
