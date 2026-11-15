import React from 'react';
import PropertyExplorer from './PropertyExplorer/PropertyExplorer';

/**
 * PropertyFilter serves as the main entrypoint for /properties, /properties?listingType=For%20Sale,
 * and /properties?listingType=For%20Rent, delegating to the premium Map-First PropertyExplorer.
 */
const PropertyFilter = () => {
  return <PropertyExplorer />;
};

export default PropertyFilter;
