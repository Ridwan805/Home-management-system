import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  ArrowRight,
  Sparkles,
  Camera,
  Clock,
  CheckCircle2
} from 'lucide-react';
import {
  getPropertyImages,
  formatPropertyPrice,
  getPropertyAddress,
  humanizePropertyType,
  getAvailabilityBadgeInfo
} from './propertyUtils';
import './PropertyResultCard.css';

const PropertyResultCard = ({
  property,
  isSelected = false,
  onSelectProperty = () => {},
  isWishlisted = false,
  onToggleWishlist = () => {}
}) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const images = getPropertyImages(property);
  const primaryImage = images.length > 0 ? images[0] : null;

  const isRent = property.listingType === 'For Rent';
  const badgeInfo = getAvailabilityBadgeInfo(property);
  const bedrooms = property.specifications?.bedrooms ?? property.bedrooms;
  const bathrooms = property.specifications?.bathrooms ?? property.bathrooms;
  const area = property.specifications?.squareFootage ?? property.squareFootage ?? property.size;

  const amenities = Array.isArray(property.amenities) ? property.amenities.slice(0, 2) : [];

  const handleCardClick = () => {
    onSelectProperty(property);
  };

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    navigate(`/properties/${property._id}`);
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    onToggleWishlist(property._id);
  };

  return (
    <article
      className={`property-result-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Property card for ${property.title || property.address}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Left Thumbnail Column */}
      <div className="card-thumb-column">
        {primaryImage && !imgError ? (
          <img
            src={primaryImage}
            alt={property.title || 'Property thumbnail'}
            className="card-thumb-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card-thumb-placeholder">
            <Building2 size={32} className="placeholder-icon" />
            <span className="placeholder-type">{humanizePropertyType(property.propertyType)}</span>
          </div>
        )}

        {/* Listing Type & Availability Badges */}
        <div className="card-badge-stack">
          <span className={`card-type-badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
            {property.listingType || 'For Rent'}
          </span>
          <span className={`card-availability-badge ${badgeInfo.className}`}>
            {badgeInfo.label}
          </span>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`card-wishlist-btn ${isWishlisted ? 'wishlisted' : ''}`}
          onClick={handleHeartClick}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart
            size={16}
            fill={isWishlisted ? '#EF4444' : 'rgba(15, 23, 42, 0.4)'}
            color={isWishlisted ? '#EF4444' : '#FFFFFF'}
          />
        </button>

        {/* Photo Count Pill */}
        {images.length > 1 && (
          <span className="card-photo-count">
            <Camera size={11} />
            <span>{images.length}</span>
          </span>
        )}
      </div>

      {/* Right Content Column */}
      <div className="card-content-column">
        <div className="card-top-row">
          <div className="card-title-price-group">
            <span className="card-property-category">
              {humanizePropertyType(property.propertyType)}
            </span>
            <h3 className="card-property-title">
              {property.title || property.address || 'Residential Property'}
            </h3>
          </div>
          <div className="card-price-tag">
            {formatPropertyPrice(property)}
          </div>
        </div>

        <p className="card-location-row">
          <MapPin size={14} className="location-pin-icon" />
          <span>{getPropertyAddress(property)}</span>
        </p>

        {/* Specs Row */}
        <div className="card-specs-row">
          {bedrooms !== undefined && bedrooms !== null && property.propertyType !== 'land' && (
            <span className="card-spec-item" title={`${bedrooms} Bedrooms`}>
              <Bed size={14} className="spec-icon" />
              <span>{bedrooms} Beds</span>
            </span>
          )}
          {bathrooms !== undefined && bathrooms !== null && property.propertyType !== 'land' && (
            <span className="card-spec-item" title={`${bathrooms} Bathrooms`}>
              <Bath size={14} className="spec-icon" />
              <span>{bathrooms} Baths</span>
            </span>
          )}
          {area && (
            <span className="card-spec-item" title={`${area} sq ft`}>
              <Maximize size={14} className="spec-icon" />
              <span>{area} sqft</span>
            </span>
          )}
        </div>

        {/* Reservation / 24h Rented Notice */}
        {badgeInfo.label === 'Processing' && (
          <div className="card-status-note note-processing">
            <Clock size={12} />
            <span>Under active reservation &bull; Agreement in progress</span>
          </div>
        )}
        {badgeInfo.label === 'Rented' && (
          <div className="card-status-note note-rented">
            <CheckCircle2 size={12} />
            <span>Rented &bull; Visible for 24 hours</span>
          </div>
        )}

        {/* Bottom Row: Amenities & Action */}
        <div className="card-bottom-row">
          <div className="card-amenities-tags">
            {amenities.map((am) => (
              <span key={am} className="card-amenity-pill">
                {am}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="card-view-details-btn"
            onClick={handleDetailsClick}
            aria-label={`View details for ${property.title || property.address}`}
          >
            <span>View Details</span>
            <ArrowRight size={13} className="btn-arrow-icon" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default PropertyResultCard;