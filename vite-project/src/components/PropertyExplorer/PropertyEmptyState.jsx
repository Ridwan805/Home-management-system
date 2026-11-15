import React from 'react';
import { Building2, SearchX, RotateCcw, Compass } from 'lucide-react';
import './PropertyEmptyState.css';

const PropertyEmptyState = ({
  listingType = '',
  hasActiveFilters = false,
  onResetFilters = () => {},
  onBrowseAll = () => {}
}) => {
  const isSale = listingType === 'For Sale';
  const isRent = listingType === 'For Rent';

  let title = 'No Properties Found';
  let description = 'We couldn\'t find any properties matching your current filter criteria.';

  if (isSale) {
    title = 'No Properties for Sale Found';
    description = hasActiveFilters
      ? 'No properties for sale currently match your specific filters. Try loosening your price or bedroom filters.'
      : 'There are currently no active properties listed for sale on the platform.';
  } else if (isRent) {
    title = 'No Rental Properties Found';
    description = hasActiveFilters
      ? 'No rental properties currently match your specific filters. Try broadening your location or price range.'
      : 'There are currently no active rental properties listed on the platform.';
  }

  return (
    <div className="property-empty-state-wrap">
      <div className="empty-state-icon-circle">
        {hasActiveFilters ? <SearchX size={36} /> : <Building2 size={36} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>

      <div className="empty-state-actions-row">
        {hasActiveFilters && (
          <button
            type="button"
            className="empty-action-btn btn-reset"
            onClick={onResetFilters}
          >
            <RotateCcw size={15} />
            <span>Reset Filters</span>
          </button>
        )}
        <button
          type="button"
          className="empty-action-btn btn-browse-all"
          onClick={onBrowseAll}
        >
          <Compass size={15} />
          <span>Browse All Properties</span>
        </button>
      </div>
    </div>
  );
};

export default PropertyEmptyState;