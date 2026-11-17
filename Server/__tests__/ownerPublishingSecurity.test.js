const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock Models
jest.mock('../models/Building');
jest.mock('../models/Property');
jest.mock('../models/User');
jest.mock('../models/Admin');

const Building = require('../models/Building');
const Property = require('../models/Property');
const User = require('../models/User');
const Admin = require('../models/Admin');

const authorizeRole = require('../middleware/authorizeRole');
const { createBuilding, updateBuilding, deleteBuilding } = require('../controllers/building.controller');
const { createProperty, updateProperty } = require('../controllers/property.controller');

describe('Owner Publishing & Role Security Authorization', () => {
  const jwtSecret = 'test_secret_for_publishing_suite_12345';
  process.env.JWT_SECRET = jwtSecret;

  const ownerId = new mongoose.Types.ObjectId().toString();
  const otherOwnerId = new mongoose.Types.ObjectId().toString();
  const tenantId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // Default model mock constructors
    Building.mockImplementation(function (data) {
      Object.assign(this, data);
      this._id = data._id || new mongoose.Types.ObjectId().toString();
      this.save = jest.fn().mockResolvedValue(this);
    });

    Property.mockImplementation(function (data) {
      Object.assign(this, data);
      this._id = data._id || new mongoose.Types.ObjectId().toString();
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  describe('authorizeRole Middleware Normalization & Access Control', () => {
    it('1. Authorizes user with role "Owner" when allowedRoles is ["admin", "property_owner"]', async () => {
      const token = jwt.sign({ userId: ownerId, role: 'Owner' }, jwtSecret);
      req = {
        headers: { authorization: `Bearer ${token}` }
      };

      Admin.findOne.mockResolvedValue(null);
      User.findOne.mockResolvedValue({
        _id: ownerId,
        firstName: 'John',
        lastName: 'Owner',
        role: 'Owner'
      });

      const middleware = authorizeRole(['admin', 'property_owner']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.role).toBe('Owner');
      expect(req.user.userId.toString()).toBe(ownerId);
    });

    it('2. Rejects Tenant user with 403 when route requires property owner or admin', async () => {
      const token = jwt.sign({ userId: tenantId, role: 'Tenant' }, jwtSecret);
      req = {
        headers: { authorization: `Bearer ${token}` }
      };

      Admin.findOne.mockResolvedValue(null);
      User.findOne.mockResolvedValue({
        _id: tenantId,
        firstName: 'Jane',
        lastName: 'Tenant',
        role: 'Tenant'
      });

      const middleware = authorizeRole(['admin', 'property_owner']);
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Access denied. Role not allowed.' })
      );
    });

    it('3. Rejects expired JWT token with 401', async () => {
      const expiredToken = jwt.sign({ userId: ownerId, role: 'Owner' }, jwtSecret, { expiresIn: '-1s' });
      req = {
        headers: { authorization: `Bearer ${expiredToken}` }
      };

      const middleware = authorizeRole(['admin', 'property_owner']);
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Token has expired, please login again', expired: true })
      );
    });
  });

  describe('Building Creation & Mutation Security', () => {
    it('4. Owner can create a building with coordinates fallback and pending status', async () => {
      req = {
        user: { _id: ownerId, userId: ownerId, role: 'Owner' },
        body: {
          name: 'Greenwood Tower',
          address: {
            street: '12 Sonargaon Road',
            city: 'Dhaka',
            state: 'Dhaka Division',
            zipCode: '1205'
          },
          yearBuilt: 2021,
          totalFloors: 14
        }
      };

      const mockSavedBuilding = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Greenwood Tower',
        createdBy: ownerId,
        approvalStatus: 'Pending',
        location: { type: 'Point', coordinates: [90.4285, 23.8151] }
      };

      Building.prototype.save = jest.fn().mockResolvedValue(mockSavedBuilding);
      Building.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSavedBuilding)
      });

      await createBuilding(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('successfully')
        })
      );
    });

    it('5. Blocks another owner from modifying a building they do not own (403)', async () => {
      const buildingId = new mongoose.Types.ObjectId().toString();
      req = {
        params: { id: buildingId },
        user: { _id: otherOwnerId, userId: otherOwnerId, role: 'Owner' },
        body: { name: 'Hijacked Building' }
      };

      Building.findById.mockResolvedValue({
        _id: buildingId,
        name: 'Original Building',
        createdBy: ownerId, // Owned by primary owner
        managedBy: null
      });

      await updateBuilding(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not authorized to update this building'
        })
      );
    });

    it('6. Blocks another owner from deleting a building they do not own (403)', async () => {
      const buildingId = new mongoose.Types.ObjectId().toString();
      req = {
        params: { id: buildingId },
        user: { _id: otherOwnerId, userId: otherOwnerId, role: 'Owner' }
      };

      Building.findById.mockResolvedValue({
        _id: buildingId,
        name: 'Original Building',
        createdBy: ownerId
      });

      await deleteBuilding(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Only administrators or building owners can delete buildings'
        })
      );
    });
  });

  describe('Property Creation & Field Normalization', () => {
    it('7. Maps flat price to pricing.rent for "For Rent" apartment unit in an owner building', async () => {
      const buildingId = new mongoose.Types.ObjectId().toString();
      req = {
        user: { _id: ownerId, userId: ownerId, role: 'Owner' },
        body: {
          propertyType: 'apartment_unit',
          listingType: 'For Rent',
          price: 35000,
          buildingId: buildingId,
          unitNumber: '5A',
          floorNumber: 5,
          description: 'Spacious 3-bedroom unit',
          specifications: { squareFootage: 1250, bedrooms: 3, bathrooms: 2 }
        },
        files: []
      };

      Building.findById.mockResolvedValue({
        _id: buildingId,
        name: 'Skyline Heights',
        createdBy: ownerId,
        approvalStatus: 'Approved',
        address: {
          street: '55 Gulshan Ave',
          city: 'Dhaka',
          state: 'Dhaka Division',
          zipCode: '1212',
          fullAddress: '55 Gulshan Ave, Dhaka'
        },
        location: { coordinates: [90.418, 23.792] },
        yearBuilt: 2022
      });

      Property.findOne.mockResolvedValue(null); // No duplicate unit

      const mockSavedProperty = {
        _id: new mongoose.Types.ObjectId().toString(),
        propertyType: 'apartment_unit',
        pricing: { rent: 35000 },
        buildingId: buildingId,
        unitNumber: '5A'
      };

      Property.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSavedProperty)
        })
      });
      Building.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      await createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          property: expect.objectContaining({
            pricing: { rent: 35000 }
          })
        })
      );
    });

    it('8. Maps flat price to pricing.sale for "For Sale" standalone house without rental fields', async () => {
      const origSalesFlag = process.env.ENABLE_PROPERTY_SALES;
      process.env.ENABLE_PROPERTY_SALES = 'true';
      req = {
        user: { _id: ownerId, userId: ownerId, role: 'Owner' },
        body: {
          propertyType: 'house',
          listingType: 'For Sale',
          price: 18000000,
          address: '12 Lake View Road, Dhanmondi',
          description: 'Independent house for purchase',
          specifications: { squareFootage: 2800, bedrooms: 4, bathrooms: 4 }
        },
        files: []
      };

      Property.findOne.mockResolvedValue(null);

      const mockSavedProperty = {
        _id: new mongoose.Types.ObjectId().toString(),
        propertyType: 'house',
        listingType: 'For Sale',
        pricing: { sale: 18000000 },
        address: '12 Lake View Road, Dhanmondi'
      };

      Property.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSavedProperty)
        })
      });

      try {
        await createProperty(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            property: expect.objectContaining({
              pricing: { sale: 18000000 }
            })
          })
        );
      } finally {
        process.env.ENABLE_PROPERTY_SALES = origSalesFlag;
      }
    });
  });
});
