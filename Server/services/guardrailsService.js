// Server/services/guardrailsService.js
const Request = require('../models/Request');
const Property = require('../models/Property');
const User = require('../models/User');

class GuardrailsService {
  /**
   * Validate and ensure payment status consistency
   * @param {Object} request - The request object to validate
   */
  static async validatePaymentStatus(request) {
    if (!request) return;
    
    try {
      // Assume request object already has the most up-to-date payment status
      // as updated by the webhook handler.
      // This service now primarily ensures consistency within the request object.

      // Check if the request is marked as paid (either advance or full)
      const hasPaidPayment = request.advancePayment?.isPaid || request.fullPayment?.isPaid;

      // If there's a paid payment, ensure consistency
      if (hasPaidPayment) {
        // Ensure isPaid flag is set
        if (!request.isPaid) {
          request.isPaid = true;
          console.log(`✅ Setting isPaid flag for request ${request._id}`);
        }
        
        // Determine if it's advance or full payment based on the request object
        const isFullPayment = request.fullPayment?.isPaid;
        
        // Update request status based on payment type
        if (isFullPayment) {
          if (request.status !== 'Paid/Completed') {
            request.status = 'Paid/Completed';
        
                    console.log(`✅ Setting status to FullyPaid for request ${request._id}`);
                  }
                  
                  // Update fullPayment object
                  if (request.fullPayment) {
                    if (request.fullPayment.status !== 'completed') {
                      request.fullPayment.status = 'completed';
                       console.log(`✅ Setting fullPayment.status to Paid for request ${request._id}`);
                     }
                     
                     if (!request.fullPayment.isPaid) {
                       request.fullPayment.isPaid = true;
                       console.log(`✅ Setting fullPayment.isPaid to true for request ${request._id}`);
                     }
                     
                     if (request.fullPayment.canPayAgain !== false) {
                       request.fullPayment.canPayAgain = false;
                       console.log(`✅ Setting fullPayment.canPayAgain to false for request ${request._id}`);
                     }
                   }
                 } else {
                   // It's an advance payment
                   if (request.status !== 'AdvancePaid' && request.status !== 'Paid/Completed') {
                     request.status = 'AdvancePaid';
                     console.log(`✅ Setting status to AdvancePaid for request ${request._id}`);
                   }
                   
                   // Update advancePayment object
                   if (request.advancePayment) {
                     if (request.advancePayment.status !== 'Paid') {
                       request.advancePayment.status = 'Paid';
                       console.log(`✅ Setting advancePayment.status to Paid for request ${request._id}`);
                     }
                     
                     if (!request.advancePayment.isPaid) {
                       request.advancePayment.isPaid = true;
                       console.log(`✅ Setting advancePayment.isPaid to true for request ${request._id}`);
                     }
                     
                     if (request.advancePayment.canPayAgain !== false) {
                       request.advancePayment.canPayAgain = false;
                       console.log(`✅ Setting advancePayment.canPayAgain to false for request ${request._id}`);
                     }
                   }
                 }
      }
      
      return request;
    } catch (error) {
      console.error('Error in validatePaymentStatus:', error);
      return request;
    }
  }
  
  // Rate limiting for requests per user
  static async checkRequestRateLimit(userId, timeWindow = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const since = new Date(Date.now() - timeWindow);
      const recentRequests = await Request.countDocuments({
        tenantId: userId,
        createdAt: { $gte: since }
      });

      const maxRequestsPerDay = 10; // Configurable limit
      return {
        allowed: recentRequests < maxRequestsPerDay,
        current: recentRequests,
        limit: maxRequestsPerDay,
        resetTime: new Date(Date.now() + timeWindow)
      };
    } catch (error) {
      console.error('Error checking request rate limit:', error);
      return { allowed: true, current: 0, limit: 10 }; // Fail open
    }
  }

  // Validate request data integrity
  static validateRequestData(requestData) {
    const errors = [];

    // Required fields validation
    const requiredFields = ['propertyId', 'tenantId', 'requestType', 'payload'];
    for (const field of requiredFields) {
      if (!requestData[field]) {
        errors.push(`${field} is required`);
      }
    }

    // Request type validation
    const validRequestTypes = ['Rent', 'Buy'];
    if (requestData.requestType && !validRequestTypes.includes(requestData.requestType)) {
      errors.push('Invalid request type');
    }

    // Payload validation for the unified inquiry form
    if (requestData.payload) {
      // Validate family members
      if (!requestData.payload.familyMembers || !Array.isArray(requestData.payload.familyMembers) || requestData.payload.familyMembers.length === 0) {
        errors.push('At least one family member is required');
      } else {
        // Validate each family member
        requestData.payload.familyMembers.forEach((member, index) => {
          if (!member.name) {
            errors.push(`Family member ${index + 1} name is required`);
          }
          if (!member.relation) {
            errors.push(`Family member ${index + 1} relation is required`);
          }
          if (!member.age && member.age !== 0) {
            errors.push(`Family member ${index + 1} age is required`);
          }
        });
      }

      // Validate occupation
      if (!requestData.payload.occupation) {
        errors.push('Occupation information is required');
      } else {
        if (!requestData.payload.occupation.employmentType) {
          errors.push('Employment type is required');
        }
        if (!requestData.payload.occupation.role) {
          errors.push('Occupation role is required');
        }
        if (!requestData.payload.occupation.yearsOfExperience && requestData.payload.occupation.yearsOfExperience !== 0) {
          errors.push('Years of experience is required');
        }
      }

      // Validate financials
      if (!requestData.payload.financials) {
        errors.push('Financial information is required');
      } else {
        if (!requestData.payload.financials.monthlyIncome && requestData.payload.financials.monthlyIncome !== 0) {
          errors.push('Monthly income is required');
        }
      }

      // Validate letter to owner
      if (!requestData.payload.letterToOwner) {
        errors.push('Letter to owner is required');
      } else if (requestData.payload.letterToOwner.length < 20) {
        errors.push('Letter to owner must be at least 20 characters');
      } else if (requestData.payload.letterToOwner.length > 1500) {
        errors.push('Letter to owner must not exceed 1500 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if user can make request for property
  static async canUserRequestProperty(userId, propertyId) {
    try {
      const user = await User.findById(userId);
      const property = await Property.findById(propertyId);

      if (!user || !property) {
        return { allowed: false, reason: 'User or property not found' };
      }

      // Check if user is banned
      if (user.isBanned) {
        return { allowed: false, reason: 'User account is banned' };
      }

      // Check if property is available
      if (property.status !== 'Available') {
          return { allowed: false, reason: 'Property is not available' };
        }
      await property.save();

      // Check if user is the owner of the property
      if (property.owner && property.owner.toString() === userId) {
        return { allowed: false, reason: 'Cannot request your own property' };
      }

      // Check for existing active requests
      const existingRequest = await Request.findOne({
        tenantId: userId,
        propertyId: propertyId,
        status: { $nin: ['Rejected', 'Canceled', 'Expired', 'Paid/Completed'] }
      });

      if (existingRequest) {
        return { allowed: false, reason: 'Active request already exists for this property' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking user property request permission:', error);
      return { allowed: false, reason: 'System error' };
    }
  }

  // Validate status transitions
  static validateStatusTransition(currentStatus, newStatus, userRole) {
    const validTransitions = {
      'Submitted': {
        'owner': ['Under Review', 'Rejected'],
        'admin': ['Under Review', 'Rejected', 'Approved – Pay Advance']
      },
      'Under Review': {
        'owner': ['Info Requested', 'Approved – Pay Advance', 'Rejected'],
        'admin': ['Info Requested', 'Approved – Pay Advance', 'Rejected']
      },
      'Info Requested': {
        'tenant': ['Under Review'],
        'owner': ['Under Review', 'Rejected'],
        'admin': ['Under Review', 'Rejected']
      },
      'Approved – Pay Advance': {
        'tenant': ['Payment Submitted'],
        'owner': ['Rejected'],
        'admin': ['Payment Submitted', 'Rejected']
      },
      'Payment Submitted': {
        'owner': ['Paid/Completed', 'Approved – Pay Advance'],
        'admin': ['Paid/Completed', 'Approved – Pay Advance']
      },
      'Paid/Completed': {
        // Terminal state - no transitions allowed
      },
      'Rejected': {
        // Terminal state - no transitions allowed
      },
      'Canceled': {
        // Terminal state - no transitions allowed
      },
      'Expired': {
        // Terminal state - no transitions allowed
      }
    };

    const allowedTransitions = validTransitions[currentStatus]?.[userRole] || [];
    return {
      allowed: allowedTransitions.includes(newStatus),
      allowedTransitions
    };
  }

  // Validate payment amounts
  static validatePaymentAmount(amount, currency = 'USD') {
    const errors = [];

    if (!amount || amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (amount > 1000000) { // $1M limit
      errors.push('Payment amount exceeds maximum limit');
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
    if (!validCurrencies.includes(currency)) {
      errors.push('Invalid currency');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check for suspicious activity
  static async detectSuspiciousActivity(userId, action, metadata = {}) {
    try {
      const suspiciousIndicators = [];
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const since = new Date(Date.now() - timeWindow);

      // Check for rapid successive actions
      if (action === 'request_creation') {
        const recentRequests = await Request.countDocuments({
          tenantId: userId,
          createdAt: { $gte: since }
        });

        if (recentRequests > 5) {
          suspiciousIndicators.push('Rapid request creation');
        }
      }

      // Check for status manipulation attempts
      if (action === 'status_change') {
        const recentStatusChanges = await Request.countDocuments({
          $or: [{ tenantId: userId }, { ownerId: userId }],
          'timeline.timestamp': { $gte: since },
          'timeline.event': { $regex: /Status changed/ }
        });

        if (recentStatusChanges > 10) {
          suspiciousIndicators.push('Excessive status changes');
        }
      }

      // Check for payment anomalies
      if (action === 'payment_submission' && metadata.amount) {
        if (metadata.amount > 50000) { // Large payment
          suspiciousIndicators.push('Large payment amount');
        }
      }

      return {
        isSuspicious: suspiciousIndicators.length > 0,
        indicators: suspiciousIndicators,
        riskLevel: this.calculateRiskLevel(suspiciousIndicators.length)
      };
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return { isSuspicious: false, indicators: [], riskLevel: 'low' };
    }
  }

  // Calculate risk level based on indicators
  static calculateRiskLevel(indicatorCount) {
    if (indicatorCount >= 3) return 'high';
    if (indicatorCount >= 2) return 'medium';
    if (indicatorCount >= 1) return 'low';
    return 'none';
  }

  // Validate file uploads
  static validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check for potentially malicious filenames
    const dangerousPatterns = [/\.\./, /[<>:"|?*]/, /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i];
    if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
      errors.push('Invalid filename');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Log security events
  static async logSecurityEvent(userId, event, details = {}, riskLevel = 'low') {
    try {
      const logEntry = {
        userId,
        event,
        details,
        riskLevel,
        timestamp: new Date(),
        userAgent: details.userAgent || 'Unknown',
        ipAddress: details.ipAddress || 'Unknown'
      };

      // In production, this should be stored in a dedicated security log collection
      console.log('Security Event:', JSON.stringify(logEntry, null, 2));

      // For high-risk events, could trigger additional actions
      if (riskLevel === 'high') {
        console.warn('HIGH RISK SECURITY EVENT DETECTED:', logEntry);
        // Could send alerts to administrators
      }

      return logEntry;
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
}

module.exports = GuardrailsService;