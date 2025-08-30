// Server/services/ownershipTransferService.js
const OwnershipTransfer = require('../models/OwnershipTransfer');
const Property = require('../models/Property');
const Request = require('../models/Request');
const User = require('../models/User');
const Payment = require('../models/Payment');

class OwnershipTransferService {
  /**
   * Automatically transfer property ownership after full payment completion
   * @param {Object} request - The request object with full payment completed
   * @param {Object} session - Stripe session object (optional)
   * @param {Object} payment - Payment record (optional)
   * @returns {Object} - Ownership transfer result
   */
  static async processOwnershipTransfer(request, session = null, payment = null) {
    try {
      console.log('🏠 [OWNERSHIP_TRANSFER] Starting ownership transfer process...', {
        requestId: request._id,
        propertyId: request.propertyId,
        tenantId: request.tenantId,
        requestType: request.requestType,
        status: request.status
      });

      // Validate that this is a Buy request with full payment completed
      if (request.requestType !== 'Buy') {
        throw new Error('Ownership transfer is only applicable for Buy requests');
      }

      if (!request.fullPayment || request.fullPayment.status !== 'completed') {
        throw new Error('Full payment must be completed before ownership transfer');
      }

      // Get property and validate it exists
      const property = await Property.findById(request.propertyId).populate('owner');
      if (!property) {
        throw new Error('Property not found');
      }

      // Get buyer (tenant) and seller (current owner) information
      const buyer = await User.findById(request.tenantId);
      const seller = await User.findById(property.ownerUserId || property.ownerId);
      
      if (!buyer) {
        throw new Error('Buyer not found');
      }
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Find payment records for this request
      const payments = await Payment.find({ requestId: request._id });
      const advancePayment = payments.find(p => p.paymentType === 'advance');
      const fullPayment = payments.find(p => p.paymentType === 'full');
      
      // Check if ownership transfer already exists for this request
      let existingTransfer = await OwnershipTransfer.findOne({ requestId: request._id });
      
      if (existingTransfer && existingTransfer.status === 'Closed') {
        console.log('✅ [OWNERSHIP_TRANSFER] Ownership transfer already completed:', existingTransfer._id);
        return {
          success: true,
          message: 'Ownership transfer already completed',
          ownershipTransferId: existingTransfer._id,
          alreadyCompleted: true
        };
      }

      // Calculate payment amounts
      const advancePaymentAmount = request.advancePayment?.amount || 0;
      const finalPaymentAmount = request.fullPayment?.amount || 0;
      const totalSalePrice = advancePaymentAmount + finalPaymentAmount;

      // Get exchange rate for USD conversion (if available from session)
      const bdtToUsdRate = session?.metadata?.bdtToUsdRate ? parseFloat(session.metadata.bdtToUsdRate) : 120;

      // Prepare property details for comprehensive record
      const propertyDetails = {
        name: property.address || 'Property',
        address: property.address || 'N/A',
        propertyType: property.propertyType || 'N/A',
        squareFootage: property.specifications?.squareFootage || 'N/A',
        bedrooms: property.specifications?.bedrooms || 'N/A',
        bathrooms: property.specifications?.bathrooms || 'N/A'
      };

      // Create or update ownership transfer record
      let ownershipTransfer;
      
      if (existingTransfer) {
        // Update existing transfer
        ownershipTransfer = existingTransfer;
        ownershipTransfer.status = 'Closed';
        ownershipTransfer.closing.date = new Date();
        ownershipTransfer.closing.completedAt = new Date();
        ownershipTransfer.closing.completedBy = buyer._id;
        
        // Update final payment details
        ownershipTransfer.finalPayment = {
          amount: finalPaymentAmount,
          paidAt: new Date(),
          paymentId: fullPayment?._id || null
        };
        
        // Add completion event to history
        ownershipTransfer.history.push({
          event: 'Ownership transfer completed via full payment',
          status: 'Closed',
          timestamp: new Date(),
          note: `Property ownership transferred from ${seller.firstName} ${seller.lastName} to ${buyer.firstName} ${buyer.lastName} after successful full payment completion`,
          updatedBy: buyer._id
        });
      } else {
        // Create new ownership transfer
        ownershipTransfer = new OwnershipTransfer({
          propertyId: property._id,
          buyerId: buyer._id,
          sellerId: seller._id,
          requestId: request._id,
          agreedPrice: totalSalePrice,
          currency: 'BDT',
          status: 'Closed', // Mark as completed since payment is done
          downPayment: {
            amount: advancePaymentAmount,
            paidAt: request.advancePayment?.paidAt || new Date(),
            paymentId: advancePayment?._id || null
          },
          finalPayment: {
            amount: finalPaymentAmount,
            paidAt: new Date(),
            paymentId: fullPayment?._id || null
          },
          closing: {
            date: new Date(),
            completedAt: new Date(),
            completedBy: buyer._id,
            notes: `Property sold via full payment completion. Total: ${totalSalePrice.toLocaleString()} BDT (≈ $${(totalSalePrice / bdtToUsdRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD), Advance: ${advancePaymentAmount.toLocaleString()} BDT, Final: ${finalPaymentAmount.toLocaleString()} BDT. Ownership transferred automatically upon payment completion.`
          },
          notes: `Property: ${propertyDetails.name} - ${propertyDetails.address}. Type: ${propertyDetails.propertyType}, Size: ${propertyDetails.squareFootage} sq ft, Bedrooms: ${propertyDetails.bedrooms}, Bathrooms: ${propertyDetails.bathrooms}. Purchase completed via online payment. Previous owner: ${seller.firstName} ${seller.lastName} (${seller.email}). New owner: ${buyer.firstName} ${buyer.lastName} (${buyer.email}).`,
          history: [{
            event: 'Ownership transfer completed',
            status: 'Closed',
            timestamp: new Date(),
            note: `Property ownership transferred from ${seller.firstName} ${seller.lastName} to ${buyer.firstName} ${buyer.lastName} after successful full payment`,
            updatedBy: buyer._id
          }],
          // Additional metadata for comprehensive tracking
          metadata: {
            stripeSessionId: session?.id || null,
            paymentIntentId: session?.payment_intent || null,
            bdtToUsdRate: bdtToUsdRate,
            propertyDetails: propertyDetails,
            previousOwnerDetails: {
              id: seller._id,
              name: `${seller.firstName} ${seller.lastName}`,
              email: seller.email,
              phone: seller.phone
            },
            newOwnerDetails: {
              id: buyer._id,
              name: `${buyer.firstName} ${buyer.lastName}`,
              email: buyer.email,
              phone: buyer.phone
            },
            transactionMethod: session ? 'Stripe Online Payment' : 'Payment Completion',
            advancePaymentDetails: {
              amount: advancePaymentAmount,
              paidAt: request.advancePayment?.paidAt,
              paymentId: request.advancePayment?.paymentId
            },
            finalPaymentDetails: {
              amount: finalPaymentAmount,
              paidAt: new Date(),
              paymentId: payment?.paymentId || request.fullPayment.paymentId
            }
          }
        });
      }

      // Save the ownership transfer record
      await ownershipTransfer.save();
      console.log('✅ [OWNERSHIP_TRANSFER] OwnershipTransfer record saved successfully:', ownershipTransfer._id);

      // Update property ownership and status using the Property model's sell method
      const previousOwnerId = property.ownerUserId || property.ownerId;
      await property.sell(buyer._id, buyer._id, `Property sold after full payment completion for request ${request._id}`);
      console.log('✅ [OWNERSHIP_TRANSFER] Property ownership updated successfully');

      // Update the request to link it to the ownership transfer
      request.ownershipTransferId = ownershipTransfer._id;
      
      // Add timeline event to request
      request.timeline.push({
        event: 'Ownership transfer completed',
        actor: buyer._id,
        timestamp: new Date(),
        note: `Property ownership transferred from ${seller.firstName} ${seller.lastName} to ${buyer.firstName} ${buyer.lastName}. OwnershipTransfer ID: ${ownershipTransfer._id}`
      });
      
      await request.save();
      console.log('✅ [OWNERSHIP_TRANSFER] Request updated with ownership transfer link');

      // Log comprehensive transfer details
      console.log('📋 [OWNERSHIP_TRANSFER] Comprehensive ownership transfer completed:', {
        ownershipTransferId: ownershipTransfer._id,
        property: {
          id: property._id,
          name: propertyDetails.name,
          address: propertyDetails.address,
          type: propertyDetails.propertyType,
          size: propertyDetails.squareFootage,
          bedrooms: propertyDetails.bedrooms,
          bathrooms: propertyDetails.bathrooms
        },
        seller: {
          id: seller._id,
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.email,
          phone: seller.phone
        },
        buyer: {
          id: buyer._id,
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          phone: buyer.phone
        },
        financial: {
          totalPrice: totalSalePrice,
          currency: 'BDT',
          usdEquivalent: (totalSalePrice / bdtToUsdRate).toFixed(2),
          advancePayment: advancePaymentAmount,
          finalPayment: finalPaymentAmount
        },
        payment: {
          stripeSessionId: session?.id || null,
          paymentIntentId: session?.payment_intent || null,
          method: session ? 'Stripe Online Payment' : 'Payment Completion'
        },
        previousOwnerId: previousOwnerId,
        newOwnerId: buyer._id
      });

      return {
        success: true,
        message: 'Ownership transfer completed successfully',
        ownershipTransferId: ownershipTransfer._id,
        propertyId: property._id,
        previousOwnerId: previousOwnerId,
        newOwnerId: buyer._id,
        totalPrice: totalSalePrice,
        currency: 'BDT',
        transferDetails: {
          seller: {
            id: seller._id,
            name: `${seller.firstName} ${seller.lastName}`,
            email: seller.email
          },
          buyer: {
            id: buyer._id,
            name: `${buyer.firstName} ${buyer.lastName}`,
            email: buyer.email
          },
          property: propertyDetails,
          financial: {
            totalPrice: totalSalePrice,
            advancePayment: advancePaymentAmount,
            finalPayment: finalPaymentAmount,
            currency: 'BDT',
            usdEquivalent: (totalSalePrice / bdtToUsdRate).toFixed(2)
          }
        }
      };

    } catch (error) {
      console.error('❌ [OWNERSHIP_TRANSFER] Error processing ownership transfer:', {
        error: error.message,
        stack: error.stack,
        requestId: request?._id,
        propertyId: request?.propertyId,
        tenantId: request?.tenantId
      });
      
      throw new Error(`Ownership transfer failed: ${error.message}`);
    }
  }

  /**
   * Validate if ownership transfer can be processed
   * @param {Object} request - The request object
   * @returns {Object} - Validation result
   */
  static async validateOwnershipTransfer(request) {
    try {
      const validationErrors = [];

      // Check request type
      if (request.requestType !== 'Buy') {
        validationErrors.push('Request must be of type "Buy"');
      }

      // Check full payment status
      if (!request.fullPayment || !request.fullPayment.isPaid) {
        validationErrors.push('Full payment must be completed');
      }

      // Check property exists
      const property = await Property.findById(request.propertyId);
      if (!property) {
        validationErrors.push('Property not found');
      }

      // Check if property is for sale
      if (property && property.listingType !== 'For Sale') {
        validationErrors.push('Property must be listed for sale');
      }

      // Check buyer exists
      const buyer = await User.findById(request.tenantId);
      if (!buyer) {
        validationErrors.push('Buyer not found');
      }

      // Check seller exists
      const seller = await User.findById(property?.ownerUserId || property?.ownerId);
      if (!seller) {
        validationErrors.push('Seller not found');
      }

      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        property: property,
        buyer: buyer,
        seller: seller
      };

    } catch (error) {
      console.error('❌ [OWNERSHIP_TRANSFER] Validation error:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`]
      };
    }
  }

  /**
   * Get ownership transfer details by request ID
   * @param {String} requestId - The request ID
   * @returns {Object} - Ownership transfer details
   */
  static async getOwnershipTransferByRequest(requestId) {
    try {
      const ownershipTransfer = await OwnershipTransfer.findOne({ requestId })
        .populate('propertyId', 'address city state images propertyType specifications')
        .populate('buyerId', 'firstName lastName email phone')
        .populate('sellerId', 'firstName lastName email phone')
        .populate('requestId');

      return ownershipTransfer;
    } catch (error) {
      console.error('❌ [OWNERSHIP_TRANSFER] Error fetching ownership transfer:', error);
      throw error;
    }
  }

  /**
   * Get all ownership transfers for a property
   * @param {String} propertyId - The property ID
   * @returns {Array} - Array of ownership transfers
   */
  static async getOwnershipTransfersByProperty(propertyId) {
    try {
      const ownershipTransfers = await OwnershipTransfer.find({ propertyId })
        .populate('buyerId', 'firstName lastName email phone')
        .populate('sellerId', 'firstName lastName email phone')
        .populate('requestId')
        .sort({ createdAt: -1 });

      return ownershipTransfers;
    } catch (error) {
      console.error('❌ [OWNERSHIP_TRANSFER] Error fetching ownership transfers:', error);
      throw error;
    }
  }
}

module.exports = OwnershipTransferService;