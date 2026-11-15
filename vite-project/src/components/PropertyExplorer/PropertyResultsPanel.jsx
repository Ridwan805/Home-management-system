import React from 'react';
import { ArrowUpDown, RefreshCw, AlertCircle } from 'lucide-react';
import PropertyResultCard from './PropertyResultCard';
import PropertyEmptyState from './PropertyEmptyState';
import { PropertyCardSkeleton } from '../loading';
import './PropertyResultsPanel.css';

const PropertyResultsPanel = ({
  properties = [],
  loading = false,
  error = null,
  onRetry = () => {},
  selectedPropertyId = null,
  onSelectProperty = () => {},
  wishlistIds = [],
  onToggleWishlist = () => {},
  listingType = '',
  selectedCity = '',
  selectedArea = '',
  sortBy = 'newest',
  onSortChange = () => {},
  onResetFilters = () => {},
  onBrowseAll = () => {},
  hasActiveFilters = false
}) => {
  // Title derivation
  const getResultsTitle = () => {
    const loc = selectedArea || selectedCity;
    if (listingType === 'For Rent') {
      return loc ? `Properties for Rent in ${loc}` : 'Properties for Rent in Bangladesh';
    }
    if (listingType === 'For Sale') {
      return loc ? `Properties for Sale in ${loc}` : 'Properties for Sale in Bangladesh';
    }
    return loc ? `Properties in ${loc}` : 'Explore Properties in Bangladesh';
  };

  return (
    <section className="property-results-panel" aria-label="Property listing search results">
      {/* Top Results Header */}
      <div className="results-panel-header">
        <div className="results-header-text-group">
          <h1 className="results-panel-title">{getResultsTitle()}</h1>
          <div className="results-panel-count-pill">
            <span className="count-dot" />
            <span className="count-text">
              {loading ? 'Searching...' : `${properties.length} ${properties.length === 1 ? 'Listing' : 'Listings'}`}
            </span>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="results-sorting-wrap">
          <label htmlFor="results-sort-select" className="sort-label">
            <ArrowUpDown size={14} className="sort-icon" />
            <span>Sort:</span>
          </label>
          <select
            id="results-sort-select"
            className="results-sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort property results"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Main Results Scroll Area */}
      <div className="results-scroll-container">
        {/* Error State */}
        {error && (
          <div className="results-error-card">
            <AlertCircle size={20} className="error-icon" />
            <div className="error-text-wrap">
              <h4 className="error-title">Unable to Load Listings</h4>
              <p className="error-desc">{error}</p>
            </div>
            <button
              type="button"
              className="error-retry-btn"
              onClick={onRetry}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="results-skeletons-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <PropertyCardSkeleton key={`card-skel-${i}`} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && properties.length === 0 && (
          <PropertyEmptyState
            listingType={listingType}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={onResetFilters}
            onBrowseAll={onBrowseAll}
          />
        )}

        {/* Property Cards List */}
        {!loading && !error && properties.length > 0 && (
          <div className="results-cards-list">
            {properties.map((prop) => (
              <PropertyResultCard
                key={prop._id}
                property={prop}
                isSelected={selectedPropertyId === prop._id}
                onSelectProperty={onSelectProperty}
                isWishlisted={wishlistIds.includes(prop._id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PropertyResultsPanel;