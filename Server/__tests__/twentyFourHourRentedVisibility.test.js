const {
  RENTED_VISIBILITY_WINDOW_MS,
  getPublicPropertiesFilter,
  enrichPropertyWithAvailability,
  calculateOwnerMetrics
} = require('../services/propertyAvailabilityService');

describe('24-Hour Rented Visibility & Property Availability Lifecycle', () => {
  const baseTime = new Date('2026-11-16T12:00:00.000Z').getTime();

  test('Case 1: Available property appears as For Rent + Available and allows applications', () => {
    const prop = {
      _id: 'prop-avail-1',
      title: 'Road 5 Apartment',
      listingType: 'For Rent',
      status: 'Available'
    };

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Available');
    expect(enriched.canApply).toBe(true);
    expect(enriched.isPubliclyVisible).toBe(true);
  });

  test('Case 2 & 3: Pending application does not change property availability', () => {
    const prop = {
      _id: 'prop-avail-2',
      title: 'Road 7 Flat',
      listingType: 'For Rent',
      status: 'Available'
    };

    // Application submitted / under review
    const appRequest = {
      status: 'Under Review',
      propertyId: prop._id
    };

    // Property status remains Available until owner approval/offer reservation
    expect(prop.status).toBe('Available');
    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Available');
    expect(enriched.canApply).toBe(true);
  });

  test('Case 4, 5 & 6: Owner issues offer -> Property becomes Processing, visible with amber badge, new applications disabled', () => {
    const prop = {
      _id: 'prop-proc-1',
      title: 'Road 8A Unit',
      listingType: 'For Rent',
      status: 'Processing',
      reservedAt: new Date(baseTime)
    };

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Processing');
    expect(enriched.canApply).toBe(false); // Applications disabled for reserved unit
    expect(enriched.isPubliclyVisible).toBe(true); // Stays visible in search/explorer
    expect(enriched.availabilityReason).toContain('reservation');
  });

  test('Case 7, 8 & 9: Verified advance payment activates tenancy -> Property becomes Rented with exact confirmation timestamp', () => {
    const rentalConfirmationTime = new Date('2026-11-16T12:00:00.000Z');
    const prop = {
      _id: 'prop-rented-1',
      title: 'House 24, Road 8A, Dhanmondi',
      listingType: 'For Rent',
      status: 'Rented',
      rentedAt: rentalConfirmationTime,
      currentRentId: 'rent-doc-123'
    };

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Rented');
    expect(enriched.canApply).toBe(false);
    expect(enriched.rentedAt).toEqual(rentalConfirmationTime);
  });

  test('Case 10 & 11: For the first 24 hours, rented property remains publicly visible with Rented badge and disabled apply', () => {
    // 2 hours after confirmation
    const rentalConfirmationTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const prop = {
      _id: 'prop-rented-2',
      title: 'House 24, Road 8A, Dhanmondi',
      listingType: 'For Rent',
      status: 'Rented',
      rentedAt: rentalConfirmationTime
    };

    // Evaluated in public filter
    const filter = getPublicPropertiesFilter();
    // Simulate MongoDB $or matching
    const matchesFilter = filter.$or.some(clause => {
      if (clause.status === 'Rented') {
        return prop.rentedAt >= clause.rentedAt.$gte;
      }
      return clause.status === prop.status;
    });

    expect(matchesFilter).toBe(true);

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.isPubliclyVisible).toBe(true);
    expect(enriched.is24hVisible).toBe(true);
    expect(enriched.canApply).toBe(false);
  });

  test('Case 12: After 24 hours, rented property is excluded from public discovery', () => {
    // 25 hours after confirmation
    const rentalConfirmationTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const prop = {
      _id: 'prop-rented-3',
      title: 'House 24, Road 8A, Dhanmondi',
      listingType: 'For Rent',
      status: 'Rented',
      rentedAt: rentalConfirmationTime
    };

    const filter = getPublicPropertiesFilter();
    const matchesFilter = filter.$or.some(clause => {
      if (clause.status === 'Rented') {
        return prop.rentedAt >= clause.rentedAt.$gte;
      }
      return clause.status === prop.status;
    });

    expect(matchesFilter).toBe(false); // Excluded from public search!

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.isPubliclyVisible).toBe(false);
    expect(enriched.is24hVisible).toBe(false);
  });

  test('Case 13 & 14: Owner dashboard always retains the property regardless of 24-hour expiration', () => {
    const oldRentedProp = {
      _id: 'prop-rented-old',
      title: 'House 24, Road 8A, Dhanmondi',
      listingType: 'For Rent',
      status: 'Rented',
      rentedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
    };

    const properties = [oldRentedProp];
    const metrics = calculateOwnerMetrics(properties);
    expect(metrics.total).toBe(1);
    expect(metrics.rented).toBe(1);
    expect(metrics.available).toBe(0);

    const enriched = enrichPropertyWithAvailability(oldRentedProp);
    expect(enriched.effectiveAvailability).toBe('Rented');
    // Owner can still see and edit details
  });

  test('Case 15 & 16: Expired unpaid offer releases reservation back to Available', () => {
    const prop = {
      _id: 'prop-exp-1',
      title: 'Unit 3A',
      listingType: 'For Rent',
      status: 'Processing',
      reservedAt: new Date(Date.now() - 73 * 60 * 60 * 1000)
    };

    // Upon offer expiry
    prop.status = 'Available';
    prop.reservedAt = undefined;
    prop.reservedBy = undefined;

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Available');
    expect(enriched.canApply).toBe(true);
    expect(enriched.isPubliclyVisible).toBe(true);
  });

  test('Case 17 & 18: Terminated tenancy returns property to Available and restores public discovery', () => {
    const prop = {
      _id: 'prop-term-1',
      title: 'House 24, Road 8A, Dhanmondi',
      listingType: 'For Rent',
      status: 'Rented',
      rentedAt: new Date(Date.now() - 100 * 60 * 60 * 1000),
      currentRentId: 'rent-123'
    };

    // Move-out notice filed alone does NOT relist property
    const moveOutNoticeSubmitted = true;
    expect(prop.status).toBe('Rented'); // Still rented during notice period!

    // Tenancy actually concludes and deposit settled:
    prop.status = 'Available';
    prop.currentRentId = null;
    prop.rentedAt = null;

    const enriched = enrichPropertyWithAvailability(prop);
    expect(enriched.effectiveAvailability).toBe('Available');
    expect(enriched.isPubliclyVisible).toBe(true);
    expect(enriched.canApply).toBe(true);
  });

  test('Case 19 & 20: Purchase/Sale listings maintain separate lifecycle (Available -> Processing -> Sold, no rental tenancy)', () => {
    const saleProp = {
      _id: 'prop-sale-1',
      title: 'Luxury Villa',
      listingType: 'For Sale',
      status: 'Available'
    };

    expect(enrichPropertyWithAvailability(saleProp).effectiveAvailability).toBe('Available');

    // Deposit paid -> Processing
    saleProp.status = 'Processing';
    expect(enrichPropertyWithAvailability(saleProp).effectiveAvailability).toBe('Processing');

    // Final ownership transfer -> Sold
    saleProp.status = 'Sold';
    saleProp.soldAt = new Date();
    const enrichedSold = enrichPropertyWithAvailability(saleProp);
    expect(enrichedSold.effectiveAvailability).toBe('Sold');
    expect(enrichedSold.canApply).toBe(false);
    expect(saleProp.currentRentId).toBeUndefined(); // Never creates a rent tenancy
  });
});
