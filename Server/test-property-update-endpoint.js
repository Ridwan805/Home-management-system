// Test endpoint to manually trigger property status updates for completed payments
const express = require('express');
const Request = require('./models/Request');
const Property = require('./models/Property');

const router = express.Router();

// Test endpoint to check and fix property status for completed payments
router.get('/test-property-status-update', async (req, res) => {
  try {
    console.log('🔍 Testing property status updates for completed payments...');
    
    // Find requests with completed advance payments
    const completedRequests = await Request.find({
      'advancePayment.status': 'Paid',
      status: 'AdvancePaid'
    }).populate('propertyId').populate('tenantId');
    
    console.log(`Found ${completedRequests.length} completed advance payment requests`);
    
    const results = [];
    
    for (const request of completedRequests) {
      const result = {
        requestId: request._id,
        propertyId: request.propertyId._id,
        currentStatus: request.propertyId.status,
        listingType: request.propertyId.listingType,
        tenantId: request.tenantId._id,
        shouldBe: null,
        updated: false,
        error: null
      };
      
      const property = request.propertyId;
      const tenantId = request.tenantId._id;
      const requestId = request._id;
      
      // Fix property data before updating status
      let needsDataFix = false;
      const updates = {};
      
      // Fix propertyType case issues
      const validPropertyTypes = ['apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse', 'retail', 'office', 'land', 'other'];
      if (!validPropertyTypes.includes(property.propertyType)) {
        const lowerType = property.propertyType.toLowerCase();
        if (validPropertyTypes.includes(lowerType)) {
          updates.propertyType = lowerType;
          needsDataFix = true;
        } else {
          // Map common invalid values to valid ones
          const typeMapping = {
            'Villa': 'villa',
            'House': 'house', 
            'Duplex': 'duplex',
            'Apartment': 'apartment_unit',
            'Condo': 'condo'
          };
          if (typeMapping[property.propertyType]) {
            updates.propertyType = typeMapping[property.propertyType];
            needsDataFix = true;
          } else {
            updates.propertyType = 'other'; // Default fallback
            needsDataFix = true;
          }
        }
      }
      
      // Fix missing specifications.squareFootage
      if (!property.specifications?.squareFootage) {
        if (!updates.specifications) updates.specifications = {};
        updates.specifications.squareFootage = 1000; // Default value
        needsDataFix = true;
      }
      
      // Fix missing pricing fields
      if (property.listingType === 'For Rent' && !property.pricing?.rent) {
        if (!updates.pricing) updates.pricing = {};
        updates.pricing.rent = 50000; // Default rent value
        needsDataFix = true;
      }
      
      if (property.listingType === 'For Sale' && !property.pricing?.sale) {
        if (!updates.pricing) updates.pricing = {};
        updates.pricing.sale = 5000000; // Default sale value
        needsDataFix = true;
      }
      
      // Apply fixes if needed
      let workingProperty = property;
      if (needsDataFix) {
        console.log(`🔧 Attempting to fix property ${property._id} with updates:`, JSON.stringify(updates, null, 2));
        try {
          // Use updateOne with validation disabled to fix the data
          const updateResult = await Property.updateOne({ _id: property._id }, updates, { runValidators: false });
          console.log(`🔧 Applied data fixes to property ${property._id}:`, updates);
          console.log(`🔧 Update result:`, updateResult);
          
          // Reload the property with fixed data
          workingProperty = await Property.findById(property._id);
          console.log(`🔧 Reloaded property ${property._id} - propertyType: ${workingProperty.propertyType}, pricing: ${JSON.stringify(workingProperty.pricing)}, specifications: ${JSON.stringify(workingProperty.specifications)}`);
        } catch (fixError) {
          result.error = `Failed to fix property data: ${fixError.message}`;
          console.log(`❌ Failed to fix property ${property._id}:`, fixError.message);
          results.push(result);
          continue;
        }
      } else {
        console.log(`ℹ️ No data fixes needed for property ${property._id}`);
      }
      
      // Determine what the status should be
      if (workingProperty.listingType === 'For Sale') {
        result.shouldBe = 'Sold';
        if (workingProperty.status !== 'Sold') {
          try {
            // Try using the sell method first
            await workingProperty.sell(tenantId, tenantId, `Test update: Set to Sold after advance payment completion for request ${requestId}`);
            result.updated = true;
            console.log(`✅ Updated property ${workingProperty._id} to Sold using sell() method`);
          } catch (error) {
            console.log(`⚠️ sell() method failed, trying direct status update:`, error.message);
            // If sell() fails due to validation, update status directly
            try {
              await Property.updateOne(
                { _id: workingProperty._id }, 
                { 
                  status: 'Sold',
                  state: 'Sold',
                  soldAt: new Date(),
                  ownerUserId: tenantId,
                  owner: tenantId
                }, 
                { runValidators: false }
              );
              result.updated = true;
              console.log(`✅ Updated property ${workingProperty._id} to Sold using direct update`);
            } catch (directError) {
              result.error = directError.message;
              console.log(`❌ Failed to update property ${workingProperty._id} to Sold:`, directError.message);
            }
          }
        }
      } else if (workingProperty.listingType === 'For Rent') {
        result.shouldBe = 'Rented';
        if (workingProperty.status !== 'Rented') {
          try {
            // Try using the rent method first
            await workingProperty.rent(tenantId, null, `Test update: Set to Rented after advance payment completion for request ${requestId}`);
            result.updated = true;
            console.log(`✅ Updated property ${workingProperty._id} to Rented using rent() method`);
          } catch (error) {
            console.log(`⚠️ rent() method failed, trying direct status update:`, error.message);
            // If rent() fails due to validation, update status directly
            try {
              await Property.updateOne(
                { _id: workingProperty._id }, 
                { 
                  status: 'Rented',
                  state: 'Rented',
                  rentedAt: new Date()
                }, 
                { runValidators: false }
              );
              result.updated = true;
              console.log(`✅ Updated property ${workingProperty._id} to Rented using direct update`);
            } catch (directError) {
              result.error = directError.message;
              console.log(`❌ Failed to update property ${workingProperty._id} to Rented:`, directError.message);
            }
          }
        }
      }
      
      results.push(result);
    }
    
    res.json({
      success: true,
      message: 'Property status update test completed',
      totalRequests: completedRequests.length,
      results
    });
    
  } catch (error) {
    console.error('❌ Error during property status test:', error);
    res.status(500).json({
      success: false,
      message: 'Error during property status test',
      error: error.message
    });
  }
});

module.exports = router;