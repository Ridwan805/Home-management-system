const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const Request = require('../models/Request');

// Debug ownership issue endpoint
router.get('/ownership-analysis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 DEBUGGING REQUEST ISSUE FOR USER:', userId);
    
    // Get the current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const analysis = {
      user: {
        id: currentUser._id.toString(),
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
        role: currentUser.role
      },
      properties: {
        owned: [],
        available: [],
        total: 0
      },
      rentals: [],
      ownershipTransfers: [],
      recentRequests: []
    };
    
    // Get all properties
    const allProperties = await Property.find({}).populate('owner ownerUserId');
    analysis.properties.total = allProperties.length;
    
    // Categorize properties
    for (const property of allProperties) {
      const ownerId = property.ownerUserId?._id || property.owner?._id;
      const isOwned = ownerId && ownerId.toString() === currentUser._id.toString();
      
      const propertyInfo = {
        id: property._id.toString(),
        description: property.description || 'No description',
        status: property.status,
        type: property.propertyType,
        listingType: property.listingType,
        ownerId: ownerId ? ownerId.toString() : 'Unknown',
        ownerField: property.owner ? property.owner.toString() : 'null',
        ownerUserIdField: property.ownerUserId ? property.ownerUserId.toString() : 'null'
      };
      
      if (isOwned) {
        analysis.properties.owned.push(propertyInfo);
      } else if (['Available', 'Reserved'].includes(property.status)) {
        analysis.properties.available.push(propertyInfo);
      }
    }
    
    // Get current rents
    const currentRents = await Rent.find({ 
      tenants: currentUser._id,
      status: { $in: ['Active', 'Pending'] }
    }).populate('propertyId');
    
    analysis.rentals = currentRents.map(rent => ({
      propertyId: rent.propertyId._id.toString(),
      propertyDescription: rent.propertyId.description || 'No description',
      status: rent.status,
      startDate: rent.term.startDate,
      endDate: rent.term.endDate
    }));
    
    // Get ownership transfers
    const ownershipTransfers = await OwnershipTransfer.find({
      buyerId: currentUser._id,
      status: { $in: ['Pending', 'Closed'] }
    }).populate('propertyId');
    
    analysis.ownershipTransfers = ownershipTransfers.map(transfer => ({
      propertyId: transfer.propertyId._id.toString(),
      propertyDescription: transfer.propertyId.description || 'No description',
      status: transfer.status,
      agreedPrice: transfer.agreedPrice
    }));
    
    // Get recent requests
    const recentRequests = await Request.find({
      tenantId: currentUser._id
    }).sort({ createdAt: -1 }).limit(10).populate('propertyId');
    
    analysis.recentRequests = recentRequests.map(request => ({
      propertyId: request.propertyId?._id?.toString() || 'Unknown',
      propertyDescription: request.propertyId?.description || 'Property not found',
      status: request.status,
      type: request.requestType,
      createdAt: request.createdAt
    }));
    
    // Add summary
    analysis.summary = {
      ownedProperties: analysis.properties.owned.length,
      availableProperties: analysis.properties.available.length,
      activeRentals: analysis.rentals.length,
      ownershipTransfers: analysis.ownershipTransfers.length,
      recentRequests: analysis.recentRequests.length,
      conclusion: analysis.properties.owned.length > 0 
        ? `User owns ${analysis.properties.owned.length} properties. If getting "Cannot request your own property" error, they are likely trying to request one of their owned properties.`
        : 'User does not own any properties. The ownership error should not occur unless there is a data inconsistency.'
    };
    
    console.log('📊 Analysis completed for user:', userId);
    console.log('   - Owned properties:', analysis.properties.owned.length);
    console.log('   - Available properties:', analysis.properties.available.length);
    
    res.json(analysis);
    
  } catch (error) {
    console.error('❌ Error during ownership analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test ownership check for a specific property
router.post('/test-ownership-check', async (req, res) => {
  try {
    const { userId, propertyId } = req.body;
    
    if (!userId || !propertyId) {
      return res.status(400).json({ error: 'userId and propertyId are required' });
    }
    
    // Get the property with populated owner fields
    const property = await Property.findById(propertyId).populate('owner ownerUserId');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Get the actual owner ID (same logic as request controller)
    const ownerId = property.ownerUserId?._id || property.owner?._id;
    
    const result = {
      propertyId: property._id.toString(),
      propertyDescription: property.description || 'No description',
      propertyStatus: property.status,
      requestingUserId: userId,
      ownerId: ownerId ? ownerId.toString() : 'Unknown',
      ownerField: property.owner ? property.owner.toString() : 'null',
      ownerUserIdField: property.ownerUserId ? property.ownerUserId.toString() : 'null',
      isOwnershipConflict: ownerId && ownerId.toString() === userId,
      canRequest: ownerId && ownerId.toString() !== userId && ['Available', 'Reserved'].includes(property.status)
    };
    
    console.log('🧪 Ownership test result:', result);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error during ownership test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test ownership validation
router.post('/test-ownership', async (req, res) => {
  try {
    const { propertyId, userId } = req.body;
    const Property = require('../models/Property');
    
    // Get property details
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Check ownership
    const isOwner = property.ownerId.toString() === userId.toString();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId: propertyId,
        userId: userId,
        propertyOwnerId: property.ownerId,
        propertyStatus: property.status,
        isOwnershipConflict: isOwner,
        canRequest: !isOwner && property.status === 'Available',
        message: isOwner ? 'Cannot request your own property' : 'Can request this property'
      }
    });
  } catch (error) {
    console.error('Error testing ownership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test ownership',
      error: error.message
    });
  }
});

// Get users for testing
router.get('/users', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}, 'email firstName lastName _id').limit(10);
    res.status(200).json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Check rent records for a property
router.post('/check-rent-records', async (req, res) => {
  try {
    const { propertyId } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }
    
    // Get all rent records for this property
    const rentRecords = await Rent.find({ propertyId }).populate('ownerId tenants');
    
    const result = {
      propertyId,
      totalRentRecords: rentRecords.length,
      rentRecords: rentRecords.map(rent => ({
        rentId: rent._id.toString(),
        ownerId: rent.ownerId ? rent.ownerId._id.toString() : 'null',
        ownerName: rent.ownerId ? `${rent.ownerId.firstName} ${rent.ownerId.lastName}` : 'Unknown',
        tenants: rent.tenants.map(tenant => ({
          tenantId: tenant._id.toString(),
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          tenantEmail: tenant.email
        })),
        status: rent.status,
        startDate: rent.startDate,
        endDate: rent.endDate,
        createdAt: rent.createdAt
      }))
    };
    
    console.log('🏠 Rent records for property:', propertyId);
    console.log('   - Total records:', result.totalRentRecords);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error checking rent records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive user-property relationship analysis
router.post('/analyze-user-property-relationship', async (req, res) => {
  try {
    const { userId, propertyId } = req.body;
    
    if (!userId || !propertyId) {
      return res.status(400).json({ error: 'userId and propertyId are required' });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get property details
    const property = await Property.findById(propertyId).populate('owner ownerUserId');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Check all possible relationships
    const ownerId = property.ownerUserId?._id || property.owner?._id;
    const isOwner = ownerId && ownerId.toString() === userId;
    
    // Check if user is a tenant in any rent for this property
    const rentRecords = await Rent.find({ propertyId }).populate('ownerId tenants');
    const isTenant = rentRecords.some(rent => 
      rent.tenants.some(tenant => tenant._id.toString() === userId)
    );
    
    // Check ownership transfers
    const ownershipTransfers = await OwnershipTransfer.find({
      propertyId,
      $or: [{ buyerId: userId }, { sellerId: userId }]
    });
    
    // Check requests
    const requests = await Request.find({
      propertyId,
      tenantId: userId
    }).sort({ createdAt: -1 });
    
    const analysis = {
      user: {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      },
      property: {
        id: property._id.toString(),
        description: property.description || 'No description',
        status: property.status,
        ownerId: ownerId ? ownerId.toString() : 'Unknown',
        ownerName: property.ownerUserId ? `${property.ownerUserId.firstName} ${property.ownerUserId.lastName}` : 'Unknown'
      },
      relationships: {
        isOwner,
        isTenant,
        hasOwnershipTransfers: ownershipTransfers.length > 0,
        hasRequests: requests.length > 0
      },
      rentRecords: rentRecords.map(rent => ({
        rentId: rent._id.toString(),
        ownerId: rent.ownerId ? rent.ownerId._id.toString() : 'null',
        ownerName: rent.ownerId ? `${rent.ownerId.firstName} ${rent.ownerId.lastName}` : 'Unknown',
        tenants: rent.tenants.map(tenant => ({
          tenantId: tenant._id.toString(),
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          isCurrentUser: tenant._id.toString() === userId
        })),
        status: rent.status,
        startDate: rent.startDate,
        endDate: rent.endDate
      })),
      ownershipTransfers: ownershipTransfers.map(transfer => ({
        transferId: transfer._id.toString(),
        buyerId: transfer.buyerId.toString(),
        sellerId: transfer.sellerId.toString(),
        status: transfer.status,
        agreedPrice: transfer.agreedPrice,
        userRole: transfer.buyerId.toString() === userId ? 'buyer' : 'seller'
      })),
      recentRequests: requests.slice(0, 5).map(request => ({
        requestId: request._id.toString(),
        requestType: request.requestType,
        status: request.status,
        createdAt: request.createdAt
      })),
      conclusion: {
        canRequest: !isOwner && ['Available', 'Reserved'].includes(property.status),
        reason: isOwner ? 'User owns this property' : 
                isTenant ? 'User is already a tenant of this property' :
                !['Available', 'Reserved'].includes(property.status) ? `Property status is ${property.status}` :
                'User can request this property'
      }
    };
    
    console.log('🔍 User-Property Relationship Analysis:');
    console.log('   - User:', analysis.user.name, '(' + analysis.user.role + ')');
    console.log('   - Property Owner:', analysis.property.ownerName);
    console.log('   - Is Owner:', analysis.relationships.isOwner);
    console.log('   - Is Tenant:', analysis.relationships.isTenant);
    console.log('   - Can Request:', analysis.conclusion.canRequest);
    
    res.json(analysis);
    
  } catch (error) {
    console.error('❌ Error analyzing user-property relationship:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test comprehensive ownership validation with corrected data
router.post('/test-corrected-ownership', async (req, res) => {
  try {
    const { tenantId, ownerId, propertyId } = req.body;
    
    if (!tenantId || !ownerId || !propertyId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId, ownerId, and propertyId are required'
      });
    }

    // Test the ownership validation logic from request controller
    const property = await Property.findById(propertyId)
      .populate('ownerUserId', 'firstName lastName email role')
      .populate('owner', 'firstName lastName email role');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Simulate the corrected ownership (temporarily for testing)
    const originalOwnerUserId = property.ownerUserId;
    const originalOwner = property.owner;
    const originalOwnerId = property.ownerId;
    
    // Test with corrected ownership
    property.ownerUserId = ownerId;
    property.owner = ownerId;
    property.ownerId = ownerId;
    
    // Test ownership conflict logic
    const resolvedOwnerId = property.ownerUserId?._id || property.owner?._id || property.ownerId;
    const isOwnershipConflict = resolvedOwnerId?.toString() === tenantId;
    
    // Test rent creation logic
    const rentData = {
      propertyId: property._id,
      tenants: [tenantId],
      ownerId: property.ownerUserId || property.owner || property.ownerId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      monthlyRent: 1000,
      securityDeposit: 2000,
      status: 'Active'
    };
    
    // Restore original values (don't actually save changes)
    property.ownerUserId = originalOwnerUserId;
    property.owner = originalOwner;
    property.ownerId = originalOwnerId;
    
    res.json({
      success: true,
      testScenario: {
        tenantId,
        ownerId,
        propertyId
      },
      originalPropertyData: {
        ownerUserId: originalOwnerUserId,
        owner: originalOwner,
        ownerId: originalOwnerId
      },
      correctedOwnershipTest: {
        isOwnershipConflict,
        canRequest: !isOwnershipConflict,
        resolvedOwnerId: resolvedOwnerId?.toString()
      },
      rentDataTest: {
        tenantId: rentData.tenants[0],
        ownerId: rentData.ownerId?.toString(),
        areTheyDifferent: rentData.tenants[0] !== rentData.ownerId?.toString()
      },
      validation: {
        ownershipConflictFixed: !isOwnershipConflict,
        tenantOwnerSeparation: rentData.tenants[0] !== rentData.ownerId?.toString(),
        allTestsPassed: !isOwnershipConflict && (rentData.tenants[0] !== rentData.ownerId?.toString())
      }
    });
    
  } catch (error) {
    console.error('Error in corrected ownership test:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Manual cleanup endpoint for testing
router.post('/manual-cleanup', async (req, res) => {
  try {
    const PropertyCleanupService = require('../services/propertyCleanupService');
    
    console.log('🧹 Manual cleanup triggered via debug endpoint...');
    const result = await PropertyCleanupService.cleanupOrphanedProperties({
      triggeredBy: 'debug-manual-cleanup',
      dryRun: false
    });
    
    res.status(200).json({
      success: true,
      message: 'Manual cleanup completed successfully',
      data: {
        totalChecked: result.totalChecked,
        orphanedFound: result.orphanedFound,
        fixed: result.fixed,
        errors: result.errors,
        orphanedProperties: result.orphanedProperties
      }
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run manual cleanup',
      error: error.message
    });
  }
});

module.exports = router;