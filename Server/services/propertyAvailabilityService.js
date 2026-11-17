/**
 * Authoritative Property Availability & Public Discovery Service
 * Enforces separation between listingType ('For Rent' / 'For Sale') and availability state:
 * - 'Available'
 * - 'Processing' (unit temporarily reserved during offer review/agreement completion/advance payment)
 * - 'Rented' (active tenancy confirmed with advance payment verified)
 * - 'Sold' (sale transaction completed)
 * - 'Unavailable' (offline/maintenance)
 *
 * Enforces the authoritative 24-hour public visibility rule for confirmed rentals.
 */

const RENTED_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const { isPropertySalesEnabled } = require('../utils/featureFlags');

/**
 * Generates the authoritative MongoDB filter for public property discovery
 * (used by Property Explorer, All Properties, Rent, Buy, Map, and Search endpoints).
 *
 * @param {Object} queryParams - Express req.query object
 * @returns {Object} MongoDB query filter
 */
const getPublicPropertiesFilter = (queryParams = {}) => {
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - RENTED_VISIBILITY_WINDOW_MS);

  // Base public visibility clause
  // 1. Available properties
  // 2. Processing (and legacy Reserved) properties (under active reservation)
  // 3. Rented properties within their 24-hour confirmation window
  // 4. Sold properties for sales listings
  const publicVisibilityConditions = [
    { status: 'Available' },
    { status: { $in: ['Processing', 'Reserved'] } },
    {
      status: 'Rented',
      rentedAt: { $gte: twentyFourHoursAgo }
    },
    {
      listingType: 'For Sale',
      status: 'Sold'
    }
  ];

  const filter = {
    isDeleted: { $ne: true }
  };

  // Specific availability / status filter passed by user
  const requestedStatus = queryParams.availability || queryParams.status;
  if (requestedStatus && requestedStatus !== 'All') {
    const s = requestedStatus.trim();
    if (s.toLowerCase() === 'available') {
      filter.status = 'Available';
    } else if (s.toLowerCase() === 'processing' || s.toLowerCase() === 'reserved') {
      filter.status = { $in: ['Processing', 'Reserved'] };
    } else if (s.toLowerCase() === 'rented') {
      filter.status = 'Rented';
      filter.rentedAt = { $gte: twentyFourHoursAgo };
    } else if (s.toLowerCase() === 'sold') {
      filter.status = 'Sold';
    } else {
      filter.status = s;
    }
  } else {
    filter.$or = publicVisibilityConditions;
  }

  // Listing Type filter (supports Buy, Sale, For Sale, Rent, For Rent)
  if (queryParams.listingType && queryParams.listingType !== 'All') {
    const lt = queryParams.listingType.trim().toLowerCase();
    if (lt === 'buy' || lt === 'sale' || lt === 'for sale' || lt === 'forsale') {
      filter.listingType = 'For Sale';
    } else if (lt === 'rent' || lt === 'for rent' || lt === 'forrent') {
      filter.listingType = 'For Rent';
    } else {
      filter.listingType = queryParams.listingType;
    }
  }

  // Property Type filter
  if (queryParams.propertyType && queryParams.propertyType !== 'all') {
    filter.propertyType = queryParams.propertyType;
  }

  return filter;
};

/**
 * Enriches a property document/object with canonical availability metadata.
 *
 * @param {Object} property - Mongoose property doc or plain JS object
 * @returns {Object} Enriched plain object with authoritative availability fields
 */
const enrichPropertyWithAvailability = (property) => {
  if (!property) return property;
  const prop = typeof property.toObject === 'function' ? property.toObject() : { ...property };

  const rawStatus = prop.status || 'Available';
  const now = Date.now();

  let effectiveAvailability = 'Available';
  let isPubliclyVisible = true;
  let is24hVisible = false;
  let canApply = false;
  let availabilityReason = '';
  let visibilityExpiresAt = null;

  if (['Processing', 'Reserved'].includes(rawStatus)) {
    effectiveAvailability = 'Processing';
    isPubliclyVisible = true;
    canApply = false;
    availabilityReason = 'Under active reservation. Approved applicant is completing agreement details and advance payment.';
  } else if (rawStatus === 'Rented') {
    effectiveAvailability = 'Rented';
    canApply = false;
    
    // Check 24-hour public visibility window
    if (prop.rentedAt) {
      const rentedTime = new Date(prop.rentedAt).getTime();
      const elapsed = now - rentedTime;
      if (elapsed < RENTED_VISIBILITY_WINDOW_MS) {
        isPubliclyVisible = true;
        is24hVisible = true;
        visibilityExpiresAt = new Date(rentedTime + RENTED_VISIBILITY_WINDOW_MS);
        availabilityReason = 'Property recently rented. Listing remains visible for 24 hours.';
      } else {
        isPubliclyVisible = false;
        is24hVisible = false;
        availabilityReason = 'Property is currently rented.';
      }
    } else {
      // Legacy rented record without timestamp: exclude from public discovery
      isPubliclyVisible = false;
      is24hVisible = false;
      availabilityReason = 'Property is currently rented.';
    }
  } else if (rawStatus === 'Sold') {
    effectiveAvailability = 'Sold';
    isPubliclyVisible = prop.listingType === 'For Sale';
    canApply = false;
    availabilityReason = 'Property has been sold.';
  } else if (rawStatus === 'Unavailable') {
    effectiveAvailability = 'Unavailable';
    isPubliclyVisible = false;
    canApply = false;
    availabilityReason = prop.unavailableReason || 'Property is currently offline.';
  } else if (rawStatus === 'pending') {
    effectiveAvailability = 'Pending';
    isPubliclyVisible = false;
    canApply = false;
    availabilityReason = 'Property listing is pending review.';
  } else {
    // Available
    effectiveAvailability = 'Available';
    isPubliclyVisible = true;
    canApply = true;
    availabilityReason = prop.listingType === 'For Rent' 
      ? 'Available for lease application.' 
      : 'Available for purchase inquiry.';
  }

  // Feature Flag: If property sales are disabled, disable applications on For Sale properties
  if (!isPropertySalesEnabled() && prop.listingType === 'For Sale') {
    canApply = false;
    availabilityReason = 'Property sales are temporarily paused. Only rental listings are active.';
    prop.salesPaused = true;
  }

  prop.effectiveAvailability = effectiveAvailability;
  prop.isPubliclyVisible = isPubliclyVisible;
  prop.is24hVisible = is24hVisible;
  prop.canApply = canApply;
  prop.availabilityReason = availabilityReason;
  prop.visibilityExpiresAt = visibilityExpiresAt;

  return prop;
};

/**
 * Calculates portfolio summary metrics for the owner dashboard.
 * Correctly distinguishes available, processing reservations, and active rented units.
 *
 * @param {Array} properties - List of owner properties
 * @returns {Object} Metric counts
 */
const calculateOwnerMetrics = (properties = []) => {
  let available = 0;
  let processing = 0;
  let rented = 0;
  let sold = 0;
  let unavailable = 0;

  properties.forEach(p => {
    const s = p.status || 'Available';
    if (s === 'Available') {
      available++;
    } else if (['Processing', 'Reserved'].includes(s)) {
      processing++;
    } else if (s === 'Rented') {
      rented++;
    } else if (s === 'Sold') {
      sold++;
    } else if (s === 'Unavailable') {
      unavailable++;
    }
  });

  return {
    total: properties.length,
    available,
    processing,
    rented,
    sold,
    unavailable
  };
};

module.exports = {
  RENTED_VISIBILITY_WINDOW_MS,
  getPublicPropertiesFilter,
  enrichPropertyWithAvailability,
  calculateOwnerMetrics
};
