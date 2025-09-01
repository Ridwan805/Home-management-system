// Property Cleanup Service
// Handles orphaned properties (properties with Sold/Rented status but no active requests)

const Request = require('../models/Request');
const Property = require('../models/Property');
const mongoose = require('mongoose');
// const propertyStatusLogger = require('../utils/propertyStatusLogger'); // Commented out - file doesn't exist

class PropertyCleanupService {
  /**
   * Check for orphaned properties and reset their status to Available
   * @param {Object} options - Configuration options
   * @param {boolean} options.dryRun - If true, only log what would be changed without making changes
   * @param {string} options.triggeredBy - User ID or system identifier for audit trail
   * @returns {Object} Summary of cleanup results
   */
  static async cleanupOrphanedProperties(options = {}) {
    const { dryRun = false, triggeredBy = 'system-cleanup' } = options;
    
    try {
      console.log(`🧹 Starting orphaned property cleanup (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
      
      // Find all properties with Sold or Rented status
      const soldOrRentedProperties = await Property.find({
        status: { $in: ['Sold', 'Rented'] },
        isDeleted: { $ne: true }
      });
      
      console.log(`Found ${soldOrRentedProperties.length} properties with Sold/Rented status`);
      
      const results = {
        totalChecked: soldOrRentedProperties.length,
        orphanedFound: 0,
        fixed: 0,
        errors: [],
        orphanedProperties: []
      };
      
      for (const property of soldOrRentedProperties) {
        // Check if there are any active requests for this property
        const activeRequests = await Request.find({
          propertyId: property._id,
          status: { $nin: ['Rejected', 'Canceled', 'Expired'] }
        });
        
        // If no active requests found, this property is orphaned
        if (activeRequests.length === 0) {
          results.orphanedFound++;
          results.orphanedProperties.push({
            id: property._id,
            status: property.status,
            listingType: property.listingType,
            address: `${property.address}, ${property.city}, ${property.state}`
          });
          
          console.log(`🔍 Orphaned property found: ${property._id} (${property.status})`);
          
          if (!dryRun) {
            try {
              const previousStatus = property.status;
              
              // Reset property to Available status
              await Property.updateOne(
                { _id: property._id },
                { 
                  status: 'Available',
                  state: 'Available',
                  soldAt: null,
                  rentedAt: null,
                  currentRentId: null,
                  $push: {
                    stateHistory: {
                      state: 'Available',
                      timestamp: new Date(),
                      triggeredBy: new mongoose.Types.ObjectId(), // Use a valid ObjectId
                      reason: 'Automatically reset to Available - no active requests found during cleanup'
                    }
                  }
                }
              );
              
              // Log the status update
              // await propertyStatusLogger.logStatusUpdate({
              //   propertyId: property._id.toString(),
              //   previousStatus,
              //   newStatus: 'Available',
              //   trigger: 'orphaned-property-cleanup',
              //   triggeredBy,
              //   source: 'PropertyCleanupService.cleanupOrphanedProperties',
              //   metadata: {
              //     listingType: property.listingType,
              //     address: `${property.address}, ${property.city}, ${property.state}`,
              //     dryRun: false
              //   }
              // });
              
              results.fixed++;
              
            } catch (error) {
              results.errors.push({
                propertyId: property._id,
                error: error.message
              });
              
              // Log the error
              // await propertyStatusLogger.logError({
              //   propertyId: property._id.toString(),
              //   operation: 'reset-orphaned-property',
              //   error: error.message,
              //   source: 'PropertyCleanupService.cleanupOrphanedProperties'
              // });
            }
          }
        }
      }
      
      console.log(`\n📊 Cleanup Summary:`);
      console.log(`   - Total properties checked: ${results.totalChecked}`);
      console.log(`   - Orphaned properties found: ${results.orphanedFound}`);
      if (!dryRun) {
        console.log(`   - Properties fixed: ${results.fixed}`);
        console.log(`   - Errors encountered: ${results.errors.length}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Error during property cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Check if a specific property is orphaned
   * @param {string} propertyId - Property ID to check
   * @returns {boolean} True if property is orphaned
   */
  static async isPropertyOrphaned(propertyId) {
    try {
      const property = await Property.findById(propertyId);
      if (!property || property.isDeleted) {
        return false;
      }
      
      // Only check properties with Sold/Rented status
      if (!['Sold', 'Rented'].includes(property.status)) {
        return false;
      }
      
      // Check for active requests
      const activeRequests = await Request.find({
        propertyId: propertyId,
        status: { $nin: ['Rejected', 'Canceled', 'Expired'] }
      });
      
      return activeRequests.length === 0;
      
    } catch (error) {
      console.error('Error checking if property is orphaned:', error);
      return false;
    }
  }
  
  /**
   * Reset a specific orphaned property to Available status
   * @param {string} propertyId - Property ID to reset
   * @param {string} triggeredBy - User ID or system identifier
   * @returns {boolean} True if successfully reset
   */
  static async resetOrphanedProperty(propertyId, triggeredBy = 'system') {
    try {
      const property = await Property.findById(propertyId);
      if (!property) {
        return false;
      }
      
      const isOrphaned = await this.isPropertyOrphaned(propertyId);
      if (!isOrphaned) {
        return false;
      }
      
      const previousStatus = property.status;
      
      await Property.updateOne(
        { _id: propertyId },
        { 
          status: 'Available',
          state: 'Available',
          soldAt: null,
          rentedAt: null,
          currentRentId: null,
          $push: {
            stateHistory: {
              state: 'Available',
              timestamp: new Date(),
              triggeredBy: new mongoose.Types.ObjectId(),
              reason: 'Reset to Available - property was orphaned'
            }
          }
        }
      );
      
      // Log the status update
      // await propertyStatusLogger.logStatusUpdate({
      //   propertyId: propertyId.toString(),
      //   previousStatus,
      //   newStatus: 'Available',
      //   trigger: 'orphaned-property-reset',
      //   triggeredBy,
      //   source: 'PropertyCleanupService.resetOrphanedProperty',
      //   metadata: {
      //     listingType: property.listingType,
      //     address: `${property.address}, ${property.city}, ${property.state}`
      //   }
      // });
      
      return true;
      
    } catch (error) {
      // Log the error
      // await propertyStatusLogger.logError({
      //   propertyId: propertyId.toString(),
      //   operation: 'reset-orphaned-property',
      //   error: error.message,
      //   source: 'PropertyCleanupService.resetOrphanedProperty'
      // });
      
      return false;
    }
  }
}

module.exports = PropertyCleanupService;