const {
  RENTED_VISIBILITY_WINDOW_MS,
  getPublicPropertiesFilter,
  enrichPropertyWithAvailability,
  calculateOwnerMetrics
} = require('../services/propertyAvailabilityService');

describe('Property Availability & 24-Hour Visibility Service', () => {
  describe('getPublicPropertiesFilter', () => {
    test('returns base public visibility clauses including 24-hour rented window', () => {
      const now = Date.now();
      const filter = getPublicPropertiesFilter();

      expect(filter.isDeleted).toEqual({ $ne: true });
      expect(Array.isArray(filter.$or)).toBe(true);

      // Check Available
      const availableClause = filter.$or.find(c => c.status === 'Available');
      expect(availableClause).toBeDefined();

      // Check Processing / Reserved
      const processingClause = filter.$or.find(c => c.status?.$in);
      expect(processingClause.status.$in).toContain('Processing');
      expect(processingClause.status.$in).toContain('Reserved');

      // Check 24-Hour Rented clause
      const rentedClause = filter.$or.find(c => c.status === 'Rented');
      expect(rentedClause).toBeDefined();
      expect(rentedClause.rentedAt?.$gte).toBeInstanceOf(Date);

      // Verify the cutoff timestamp is approximately 24 hours ago
      const cutoffTime = rentedClause.rentedAt.$gte.getTime();
      const expectedCutoff = now - 24 * 60 * 60 * 1000;
      expect(Math.abs(cutoffTime - expectedCutoff)).toBeLessThan(2000);
    });

    test('preserves listingType filter when requested', () => {
      const rentFilter = getPublicPropertiesFilter({ listingType: 'For Rent' });
      expect(rentFilter.listingType).toBe('For Rent');

      const saleFilter = getPublicPropertiesFilter({ listingType: 'For Sale' });
      expect(saleFilter.listingType).toBe('For Sale');
    });

    test('supports explicit status filtering for Available', () => {
      const filter = getPublicPropertiesFilter({ status: 'Available' });
      expect(filter.status).toBe('Available');
      expect(filter.$or).toBeUndefined();
    });

    test('supports explicit status filtering for Processing', () => {
      const filter = getPublicPropertiesFilter({ status: 'Processing' });
      expect(filter.status.$in).toContain('Processing');
      expect(filter.status.$in).toContain('Reserved');
    });

    test('enforces 24-hour cutoff when filtering specifically for Rented', () => {
      const filter = getPublicPropertiesFilter({ status: 'Rented' });
      expect(filter.status).toBe('Rented');
      expect(filter.rentedAt.$gte).toBeInstanceOf(Date);
    });
  });

  describe('enrichPropertyWithAvailability', () => {
    test('enriches Available property with canApply: true and isPubliclyVisible: true', () => {
      const prop = {
        _id: 'prop-1',
        title: 'Apartment 4B',
        listingType: 'For Rent',
        status: 'Available'
      };

      const enriched = enrichPropertyWithAvailability(prop);
      expect(enriched.effectiveAvailability).toBe('Available');
      expect(enriched.canApply).toBe(true);
      expect(enriched.isPubliclyVisible).toBe(true);
      expect(enriched.is24hVisible).toBe(false);
    });

    test('enriches Processing / Reserved property with canApply: false and isPubliclyVisible: true', () => {
      const prop = {
        _id: 'prop-2',
        title: 'Apartment 5A',
        listingType: 'For Rent',
        status: 'Processing',
        reservedAt: new Date()
      };

      const enriched = enrichPropertyWithAvailability(prop);
      expect(enriched.effectiveAvailability).toBe('Processing');
      expect(enriched.canApply).toBe(false);
      expect(enriched.isPubliclyVisible).toBe(true);
      expect(enriched.availabilityReason).toContain('active reservation');
    });

    test('enriches Rented property within 24h as isPubliclyVisible: true and is24hVisible: true', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const prop = {
        _id: 'prop-3',
        title: 'Dhanmondi House',
        listingType: 'For Rent',
        status: 'Rented',
        rentedAt: twoHoursAgo
      };

      const enriched = enrichPropertyWithAvailability(prop);
      expect(enriched.effectiveAvailability).toBe('Rented');
      expect(enriched.canApply).toBe(false);
      expect(enriched.isPubliclyVisible).toBe(true);
      expect(enriched.is24hVisible).toBe(true);
      expect(enriched.visibilityExpiresAt).toBeInstanceOf(Date);
      expect(enriched.availabilityReason).toContain('visible for 24 hours');
    });

    test('enriches Rented property beyond 24h as isPubliclyVisible: false and is24hVisible: false', () => {
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
      const prop = {
        _id: 'prop-4',
        title: 'Old Rented Flat',
        listingType: 'For Rent',
        status: 'Rented',
        rentedAt: twentySixHoursAgo
      };

      const enriched = enrichPropertyWithAvailability(prop);
      expect(enriched.effectiveAvailability).toBe('Rented');
      expect(enriched.canApply).toBe(false);
      expect(enriched.isPubliclyVisible).toBe(false);
      expect(enriched.is24hVisible).toBe(false);
    });

    test('enriches Sold property for sales listing with canApply: false', () => {
      const prop = {
        _id: 'prop-5',
        title: 'Gulshan Penthouse',
        listingType: 'For Sale',
        status: 'Sold',
        soldAt: new Date()
      };

      const enriched = enrichPropertyWithAvailability(prop);
      expect(enriched.effectiveAvailability).toBe('Sold');
      expect(enriched.canApply).toBe(false);
      expect(enriched.isPubliclyVisible).toBe(true);
    });
  });

  describe('calculateOwnerMetrics', () => {
    test('correctly segments portfolio into available, processing, rented, and sold', () => {
      const properties = [
        { status: 'Available' },
        { status: 'Available' },
        { status: 'Processing' },
        { status: 'Reserved' }, // legacy reserved counts under processing
        { status: 'Rented' },
        { status: 'Sold' },
        { status: 'Unavailable' }
      ];

      const metrics = calculateOwnerMetrics(properties);
      expect(metrics.total).toBe(7);
      expect(metrics.available).toBe(2);
      expect(metrics.processing).toBe(2);
      expect(metrics.rented).toBe(1);
      expect(metrics.sold).toBe(1);
      expect(metrics.unavailable).toBe(1);
    });
  });
});
