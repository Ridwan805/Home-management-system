const User = require('../models/User');
const Property = require('../models/Property');
const Rent = require('../models/Rent');
const Request = require('../models/Request');
const securityGuardJobs = require('../models/securityguardjobs');

/**
 * Get owner contact information for the current user
 * Works for both tenants and security guards
 */
const getOwnerContact = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('🔍 Getting owner contact for user:', { userId, userRole });
    
    let ownerInfo = null;
    
    if (userRole === 'Tenant') {
      // For tenants, find the property owner through rent or request
      
      // First try to find through active rent
      const activeRent = await Rent.findOne({ 
        tenantId: userId, 
        status: 'active' 
      }).populate('propertyId ownerId');
      
      if (activeRent && activeRent.ownerId) {
        ownerInfo = {
          firstName: activeRent.ownerId.firstName,
          lastName: activeRent.ownerId.lastName,
          phone: activeRent.ownerId.phone,
          email: activeRent.ownerId.email,
          propertyTitle: activeRent.propertyId.title || activeRent.propertyId.displayName
        };
      } else {
        // If no active rent, try to find through recent request
        const recentRequest = await Request.findOne({ 
          tenantId: userId 
        })
        .sort({ createdAt: -1 })
        .populate('propertyId ownerId');
        
        if (recentRequest && recentRequest.ownerId) {
          ownerInfo = {
            firstName: recentRequest.ownerId.firstName,
            lastName: recentRequest.ownerId.lastName,
            phone: recentRequest.ownerId.phone,
            email: recentRequest.ownerId.email,
            propertyTitle: recentRequest.propertyId.title || recentRequest.propertyId.displayName
          };
        }
      }
    } else if (userRole === 'Security Guard') {
      // For security guards, find the property owner through their job assignment
      const guardJob = await securityGuardJobs.findOne({ 
        guardId: userId, 
        status: 'hired' 
      })
      .populate({
        path: 'jobPostId',
        populate: {
          path: 'propertyId',
          populate: {
            path: 'ownerId',
            select: 'firstName lastName phone email'
          }
        }
      });
      
      if (guardJob && guardJob.jobPostId && guardJob.jobPostId.propertyId && guardJob.jobPostId.propertyId.ownerId) {
        const owner = guardJob.jobPostId.propertyId.ownerId;
        ownerInfo = {
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          email: owner.email,
          propertyTitle: guardJob.jobPostId.propertyId.title || guardJob.jobPostId.propertyId.displayName
        };
      }
    }
    
    if (!ownerInfo) {
      return res.status(404).json({
        success: false,
        message: 'Owner contact information not found'
      });
    }
    
    // Don't expose email in the response for security
    const { email, ...safeOwnerInfo } = ownerInfo;
    
    console.log('✅ Owner contact found:', safeOwnerInfo);
    
    res.status(200).json({
      success: true,
      data: safeOwnerInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting owner contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get owner contact information',
      error: error.message
    });
  }
};

/**
 * Log call attempts for analytics and security
 */
const logCallAttempt = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { contactName, phoneNumber, userType, timestamp } = req.body;
    
    console.log('📞 Logging call attempt:', {
      userId,
      userRole,
      contactName,
      phoneNumber: phoneNumber ? phoneNumber.replace(/\d(?=\d{4})/g, '*') : 'N/A', // Mask phone number in logs
      userType,
      timestamp
    });
    
    // Here you could save to a CallLog model if you want to track calls
    // For now, we'll just log it and return success
    
    // Optional: You could create a CallLog model and save the attempt
    /*
    const callLog = new CallLog({
      callerId: userId,
      callerRole: userRole,
      contactName,
      phoneNumber,
      timestamp: new Date(timestamp),
      userType
    });
    await callLog.save();
    */
    
    res.status(200).json({
      success: true,
      message: 'Call attempt logged successfully'
    });
    
  } catch (error) {
    console.error('❌ Error logging call attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log call attempt',
      error: error.message
    });
  }
};

/**
 * Get emergency contacts (could be customized per region/property)
 */
const getEmergencyContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Default emergency contacts for Bangladesh
    const emergencyContacts = [
      { name: 'Police', number: '999', type: 'police', description: 'National Emergency Service' },
      { name: 'Fire Service', number: '199', type: 'fire', description: 'Fire Service and Civil Defence' },
      { name: 'Ambulance', number: '199', type: 'ambulance', description: 'Emergency Medical Service' },
      { name: 'National Emergency', number: '999', type: 'emergency', description: 'General Emergency Hotline' },
      { name: 'Women & Children Helpline', number: '109', type: 'helpline', description: 'Women and Children Helpline' }
    ];
    
    // You could customize this based on the user's location or property
    // For example, get the user's property location and provide local emergency numbers
    
    console.log('🆘 Providing emergency contacts for user:', userId);
    
    res.status(200).json({
      success: true,
      data: emergencyContacts
    });
    
  } catch (error) {
    console.error('❌ Error getting emergency contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emergency contacts',
      error: error.message
    });
  }
};

/**
 * Get all quick dial contacts (owner + emergency) in one request
 */
const getAllQuickDialContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('📞 Getting all quick dial contacts for user:', { userId, userRole });
    
    // Get owner contact
    let ownerInfo = null;
    
    if (userRole === 'Tenant') {
      const activeRent = await Rent.findOne({ 
        tenantId: userId, 
        status: 'active' 
      }).populate('propertyId ownerId');
      
      if (activeRent && activeRent.ownerId) {
        ownerInfo = {
          firstName: activeRent.ownerId.firstName,
          lastName: activeRent.ownerId.lastName,
          phone: activeRent.ownerId.phone,
          propertyTitle: activeRent.propertyId.title || activeRent.propertyId.displayName
        };
      } else {
        const recentRequest = await Request.findOne({ 
          tenantId: userId 
        })
        .sort({ createdAt: -1 })
        .populate('propertyId ownerId');
        
        if (recentRequest && recentRequest.ownerId) {
          ownerInfo = {
            firstName: recentRequest.ownerId.firstName,
            lastName: recentRequest.ownerId.lastName,
            phone: recentRequest.ownerId.phone,
            propertyTitle: recentRequest.propertyId.title || recentRequest.propertyId.displayName
          };
        }
      }
    } else if (userRole === 'Security Guard') {
      const guardJob = await securityGuardJobs.findOne({ 
        guardId: userId, 
        status: 'hired' 
      })
      .populate({
        path: 'jobPostId',
        populate: {
          path: 'propertyId',
          populate: {
            path: 'ownerId',
            select: 'firstName lastName phone'
          }
        }
      });
      
      if (guardJob && guardJob.jobPostId && guardJob.jobPostId.propertyId && guardJob.jobPostId.propertyId.ownerId) {
        const owner = guardJob.jobPostId.propertyId.ownerId;
        ownerInfo = {
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          propertyTitle: guardJob.jobPostId.propertyId.title || guardJob.jobPostId.propertyId.displayName
        };
      }
    }
    
    // Emergency contacts
    const emergencyContacts = [
      { name: 'Police', number: '999', type: 'police' },
      { name: 'Fire Service', number: '199', type: 'fire' },
      { name: 'Ambulance', number: '199', type: 'ambulance' },
      { name: 'National Emergency', number: '999', type: 'emergency' }
    ];
    
    res.status(200).json({
      success: true,
      data: {
        owner: ownerInfo,
        emergency: emergencyContacts
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting quick dial contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quick dial contacts',
      error: error.message
    });
  }
};

module.exports = {
  getOwnerContact,
  logCallAttempt,
  getEmergencyContacts,
  getAllQuickDialContacts
};