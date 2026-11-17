const { isPropertySalesEnabled } = require('../utils/featureFlags');
const { enrichPropertyWithAvailability } = require('../services/propertyAvailabilityService');

describe('Property Sales Prioritization and Rental Feature Flag Tests', () => {
  const origSalesFlag = process.env.ENABLE_PROPERTY_SALES;

  afterEach(() => {
    process.env.ENABLE_PROPERTY_SALES = origSalesFlag;
  });

  describe('Feature Flag Utility', () => {
    it('returns false when ENABLE_PROPERTY_SALES is "false" or unset', () => {
      process.env.ENABLE_PROPERTY_SALES = 'false';
      expect(isPropertySalesEnabled()).toBe(false);

      delete process.env.ENABLE_PROPERTY_SALES;
      expect(isPropertySalesEnabled()).toBe(false);
    });

    it('returns true only when ENABLE_PROPERTY_SALES is "true"', () => {
      process.env.ENABLE_PROPERTY_SALES = 'true';
      expect(isPropertySalesEnabled()).toBe(true);
    });
  });

  describe('Property Availability Service with Sales Paused', () => {
    it('disables application for "For Sale" properties when sales are disabled', () => {
      process.env.ENABLE_PROPERTY_SALES = 'false';

      const forSaleProp = {
        _id: 'prop-123',
        title: 'Luxury Land',
        listingType: 'For Sale',
        status: 'Available',
        pricing: { sale: 15000000 }
      };

      const enriched = enrichPropertyWithAvailability(forSaleProp);
      expect(enriched.canApply).toBe(false);
      expect(enriched.salesPaused).toBe(true);
      expect(enriched.availabilityReason).toContain('paused');
    });

    it('leaves "For Rent" properties available for application', () => {
      process.env.ENABLE_PROPERTY_SALES = 'false';

      const forRentProp = {
        _id: 'prop-456',
        title: 'Modern Apartment',
        listingType: 'For Rent',
        status: 'Available',
        pricing: { rent: 35000 }
      };

      const enriched = enrichPropertyWithAvailability(forRentProp);
      expect(enriched.canApply).toBe(true);
      expect(enriched.salesPaused).toBeUndefined();
    });
  });
});
