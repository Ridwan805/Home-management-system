import apiConfig from '../../config/api';

/**
 * Safely extracts latitude and longitude coordinates from a property document.
 * Returns [lat, lng] array or null if no valid coordinates exist.
 */
export const getPropertyCoordinates = (property) => {
  if (!property) return null;

  // 1. Direct or nested coordinates from location object
  const lat = property.location?.coordinates?.latitude ?? 
              property.location?.latitude ?? 
              property.latitude ?? 
              null;
  const lng = property.location?.coordinates?.longitude ?? 
              property.location?.longitude ?? 
              property.longitude ?? 
              null;

  if (lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    const nLat = Number(lat);
    const nLng = Number(lng);
    // Sanity check coordinates are within valid world bounds
    if (nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180 && (nLat !== 0 || nLng !== 0)) {
      return [nLat, nLng];
    }
  }

  // 2. OpenStreetMap location_link parsing
  if (property.location?.location_link) {
    try {
      const url = new URL(property.location.location_link);
      const mlat = url.searchParams.get('mlat');
      const mlon = url.searchParams.get('mlon');
      if (mlat && mlon && !isNaN(Number(mlat)) && !isNaN(Number(mlon))) {
        return [Number(mlat), Number(mlon)];
      }
      const hashMatch = url.hash.match(/#map=\d+\/([-\d.]+)\/([-\d.]+)/);
      if (hashMatch && hashMatch.length === 3) {
        return [Number(hashMatch[1]), Number(hashMatch[2])];
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return null;
};

/**
 * Extracts and formats all valid property image URLs.
 */
export const getPropertyImages = (property) => {
  if (!property) return [];
  const list = [];

  if (Array.isArray(property.images) && property.images.length > 0) {
    property.images.forEach(img => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && typeof url === 'string') {
        list.push(apiConfig.getImageUrl(url));
      }
    });
  }

  if (list.length === 0 && property.media?.images && Array.isArray(property.media.images)) {
    property.media.images.forEach(img => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && typeof url === 'string') {
        list.push(apiConfig.getImageUrl(url));
      }
    });
  }

  return list;
};

/**
 * Returns primary image URL or null
 */
export const getPrimaryImage = (property) => {
  const images = getPropertyImages(property);
  return images.length > 0 ? images[0] : null;
};

/**
 * Extracts property price number
 */
export const getPropertyPriceNumber = (property) => {
  if (!property) return 0;
  if (property.listingType === 'For Rent') {
    return property.pricing?.rent ?? property.rentAmount ?? property.price ?? 0;
  }
  return property.pricing?.sale ?? property.price ?? 0;
};

/**
 * Formats property price into a clean BDT string
 */
export const formatPropertyPrice = (property) => {
  if (!property) return '—';
  const price = getPropertyPriceNumber(property);
  if (!price && price !== 0) return 'Price on Request';

  const formatted = `৳${Number(price).toLocaleString('en-US')}`;
  if (property.listingType === 'For Rent') {
    return `${formatted} / mo`;
  }
  return formatted;
};

/**
 * Compact price formatter for map markers
 */
export const formatCompactPrice = (property) => {
  if (!property) return '৳0';
  const price = getPropertyPriceNumber(property);
  if (price >= 10000000) {
    return `৳${(price / 10000000).toFixed(1)}Cr`;
  }
  if (price >= 100000) {
    return `৳${(price / 100000).toFixed(1)}L`;
  }
  if (price >= 1000) {
    return `৳${(price / 1000).toFixed(0)}k`;
  }
  return `৳${price}`;
};

/**
 * Formats full address string
 */
export const getPropertyAddress = (property) => {
  if (!property) return 'Address not available';
  if (property.fullAddress) return property.fullAddress;
  if (property.address) {
    const parts = [property.address];
    if (property.location?.city || property.city) {
      const c = property.location?.city || property.city;
      if (!property.address.includes(c)) parts.push(c);
    }
    return parts.join(', ');
  }
  if (property.location?.address) {
    return property.location.address;
  }
  const city = property.location?.city || property.city || 'Bangladesh';
  return `Residential Unit, ${city}`;
};

/**
 * Formats location subtext (City, Area, Country)
 */
export const getPropertyLocationSubtext = (property) => {
  if (!property) return 'Bangladesh';
  const city = property.location?.city || property.city || '';
  const area = property.location?.state || property.state || '';
  const zip = property.location?.zipCode || property.zipCode || '';
  const parts = [city, area, zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Bangladesh';
};

/**
 * Normalize and humanize property type
 */
export const humanizePropertyType = (type) => {
  if (!type) return 'Residential';
  const map = {
    apartment_unit: 'Apartment',
    house: 'House',
    penthouse: 'Penthouse',
    office: 'Office',
    land: 'Land',
    floor: 'Full Floor',
    condo: 'Condo',
    townhouse: 'Townhouse',
    villa: 'Villa',
    studio: 'Studio',
    duplex: 'Duplex',
    retail: 'Retail Shop',
    other: 'Property'
  };
  return map[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
