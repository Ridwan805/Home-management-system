import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
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
import './PropertyMapPreview.css';

const PropertyMapPreview = ({
  property,
  onClose = () => {},
  isWishlisted = false,
  onToggleWishlist = () => {}
}) => {
  const navigate = useNavigate();
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Reset image index when property changes
  useEffect(() => {
    setActiveImgIndex(0);
  }, [property?._id]);

  if (!property) return null;

  const images = getPropertyImages(property);
  const hasImages = images.length > 0;
  const currentImg = hasImages ? images[activeImgIndex] : null;

  const isRent = property.listingType === 'For Rent';
  const badgeInfo = getAvailabilityBadgeInfo(property);
  const bedrooms = property.specifications?.bedrooms ?? property.bedrooms;
  const bathrooms = property.specifications?.bathrooms ?? property.bathrooms;
  const area = property.specifications?.squareFootage ?? property.squareFootage ?? property.size;

  const amenities = Array.isArray(property.amenities) ? property.amenities.slice(0, 3) : [];

  const handlePrevImg = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImg = (e) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/properties/${property._id}`);
  };

  const handleHeartClick = (e) => {
    e.stopPropagation();
    onToggleWishlist(property._id);
  };

  return (
    <div className="property-map-preview-card" role="region" aria-label="Selected property preview">
      {/* Close Button */}
      <button
        type="button"
        className="preview-close-btn"
        onClick={onClose}
        aria-label="Close property preview"
      >
        <X size={16} />
      </button>

      {/* Image Carousel Column */}
      <div className="preview-image-column">
        {currentImg ? (
          <img
            src={currentImg}
            alt={property.title || 'Selected property preview'}
            className="preview-img"
          />
        ) : (
          <div className="preview-placeholder">
            <Building2 size={36} className="placeholder-icon" />
            <span className="placeholder-type">{humanizePropertyType(property.propertyType)}</span>
          </div>
        )}

        {/* Listing Type & Availability Tag Stack */}
        <div className="preview-badge-stack">
          <span className={`preview-type-pill ${isRent ? 'pill-rent' : 'pill-sale'}`}>
            {property.listingType || 'For Rent'}
          </span>
          <span className={`preview-availability-pill ${badgeInfo.className}`}>
            {badgeInfo.label}
          </span>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`preview-wishlist-btn ${isWishlisted ? 'wishlisted' : ''}`}
          onClick={handleHeartClick}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart
            size={16}
            fill={isWishlisted ? '#EF4444' : 'rgba(15, 23, 42, 0.4)'}
            color={isWishlisted ? '#EF4444' : '#FFFFFF'}
          />
        </button>

        {/* Carousel Navigation Arrows if multiple images exist */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="preview-carousel-arrow arrow-left"
              onClick={handlePrevImg}
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="preview-carousel-arrow arrow-right"
              onClick={handleNextImg}
              aria-label="Next image"
            >
              <ChevronRight size={16} />
            </button>
            <span className="preview-photo-counter">
              {activeImgIndex + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {/* Details Column */}
      <div className="preview-content-column">
        <div className="preview-header-row">
          <div className="preview-title-wrap">
            <span className="preview-category">
              {humanizePropertyType(property.propertyType)}
            </span>
            <h3 className="preview-title">
              {property.title || property.address || 'Property Details'}
            </h3>
          </div>
          <div className="preview-price">
            {formatPropertyPrice(property)}
          </div>
        </div>

        <p className="preview-address-row">
          <MapPin size={14} className="address-icon" />
          <span>{getPropertyAddress(property)}</span>
        </p>

        {/* Specs Chips */}
        <div className="preview-specs-row">
          {bedrooms !== undefined && bedrooms !== null && property.propertyType !== 'land' && (
            <span className="preview-spec-chip">
              <Bed size={14} />
              <span>{bedrooms} Beds</span>
            </span>
          )}
          {bathrooms !== undefined && bathrooms !== null && property.propertyType !== 'land' && (
            <span className="preview-spec-chip">
              <Bath size={14} />
              <span>{bathrooms} Baths</span>
            </span>
          )}
          {area && (
            <span className="preview-spec-chip">
              <Maximize size={14} />
              <span>{area} sq ft</span>
            </span>
          )}
        </div>

        {/* Amenities Row */}
        {amenities.length > 0 && (
          <div className="preview-amenities-row">
            {amenities.map((am) => (
              <span key={am} className="preview-amenity-tag">
                {am}
              </span>
            ))}
          </div>
        )}

        {/* Status Callout for Processing / Rented */}
        {badgeInfo.label === 'Processing' && (
          <div className="preview-status-callout callout-processing">
            <Clock size={13} />
            <span>Under active reservation &bull; Advance payment pending</span>
          </div>
        )}
        {badgeInfo.label === 'Rented' && (
          <div className="preview-status-callout callout-rented">
            <CheckCircle2 size={13} />
            <span>Rented &bull; Visible for 24 hours</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="preview-footer-row">
          <button
            type="button"
            className="preview-details-btn"
            onClick={handleViewDetails}
          >
            <span>View Full Details</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapPreview;