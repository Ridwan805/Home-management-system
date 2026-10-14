import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBed, 
  FaBath, 
  FaRulerCombined, 
  FaMapMarkerAlt, 
  FaHeart, 
  FaRegHeart, 
  FaArrowRight, 
  FaPhoneAlt, 
  FaTag
} from 'react-icons/fa';
import './PropertyCard.css';
import apiConfig from '../config/api';

const PropertyCard = ({ property, onEdit, onViewDetails, onDelete, onStatusChange }) => {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Check wishlist state from user or localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.wishlist && Array.isArray(user.wishlist)) {
          setIsWishlisted(user.wishlist.includes(property._id));
        }
      }
    } catch {
      // Ignore
    }
  }, [property._id]);

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userData);
      const token = user.token;
      if (!token) {
        navigate('/login');
        return;
      }

      setIsWishlistLoading(true);
      const endpoint = isWishlisted 
        ? apiConfig.getUrl(`/api/wishlist/remove/${property._id}`)
        : apiConfig.getUrl('/api/wishlist/add');

      const response = await fetch(endpoint, {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: isWishlisted ? undefined : JSON.stringify({ propertyId: property._id })
      });

      if (response.ok) {
        const nextState = !isWishlisted;
        setIsWishlisted(nextState);
        // Update local user wishlist cache
        const currentList = Array.isArray(user.wishlist) ? user.wishlist : [];
        const updatedWishlist = nextState 
          ? [...currentList, property._id]
          : currentList.filter(id => id !== property._id);
        user.wishlist = updatedWishlist;
        localStorage.setItem('dwellSyncUser', JSON.stringify(user));
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // Handle view details navigation
  const handleViewDetails = (e) => {
    if (e) e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(property);
    } else {
      navigate(`/properties/${property._id}`);
    }
  };

  // Formatting helpers
  const formatPropertyType = (type) => {
    if (!type) return 'Residential';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const bedrooms = property.specifications?.bedrooms ?? property.bedrooms;
  const bathrooms = property.specifications?.bathrooms ?? property.bathrooms;
  const sqft = property.specifications?.squareFootage ?? property.squareFootage;

  // Address cleaning & fallback
  const city = property.location?.city || property.city || '';
  const state = property.location?.state || property.state || '';
  const zipCode = property.location?.zipCode || property.zipCode || '';
  const formattedAddress = property.address || 'Address on request';

  const locationSubtext = [city, state, zipCode].filter(Boolean).join(', ');

  // Images
  const rawImage = property.images?.[0] || property.media?.images?.[0]?.url;
  const imageUrl = rawImage ? apiConfig.getImageUrl(rawImage) : null;

  const isForRent = property.listingType === 'For Rent';
  const hasOwnerActions = Boolean(onEdit || onDelete || onStatusChange);

  // Top amenities (up to 3)
  const amenitiesList = Array.isArray(property.amenities) ? property.amenities : [];
  const displayAmenities = amenitiesList.slice(0, 3);
  const remainingAmenitiesCount = amenitiesList.length - displayAmenities.length;

  return (
    <div className="property-card" onClick={handleViewDetails}>
      {/* Image Showcase Container */}
      <div className="property-card-image-wrap">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={property.title || formattedAddress} 
            className="property-card-image" 
            loading="lazy"
          />
        ) : (
          <div className="property-card-placeholder">
            <div className="placeholder-icon-wrap">
              <FaTag />
            </div>
            <span>No Photos Available</span>
          </div>
        )}

        {/* Gradient Overlay for Top & Bottom Legibility */}
        <div className="property-card-overlay-top" />
        <div className="property-card-overlay-bottom" />

        {/* Top Badges Bar */}
        <div className="property-card-badges-top">
          <span className={`listing-type-badge ${isForRent ? 'badge-rent' : 'badge-sale'}`}>
            {property.listingType || (isForRent ? 'For Rent' : 'For Sale')}
          </span>
        </div>

        {/* Wishlist Heart Button (Top Right) */}
        <button 
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={handleToggleWishlist}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label="Wishlist"
          disabled={isWishlistLoading}
        >
          {isWishlisted ? <FaHeart className="heart-icon active" /> : <FaRegHeart className="heart-icon" />}
        </button>

        {/* Bottom Badges Bar */}
        <div className="property-card-badges-bottom">
          <span className={`availability-badge ${(property.status || 'available').toLowerCase().replace(/\s+/g, '-')}`}>
            <span className="status-dot" />
            {property.status || 'Available'}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="property-card-body">
        {/* Price Row */}
        <div className="property-card-price-row">
          <div className="price-container">
            <span className="currency-symbol">৳</span>
            <span className="price-number">
              {Number(property.price || 0).toLocaleString('en-US')}
            </span>
            {isForRent && <span className="price-period">/ month</span>}
          </div>

          {property.propertyType && (
            <span className="property-type-pill">
              {formatPropertyType(property.propertyType)}
            </span>
          )}
        </div>

        {/* Property Title / Address */}
        <h3 className="property-card-title" title={formattedAddress}>
          {formattedAddress}
        </h3>

        {/* Location Row */}
        <div className="property-card-location">
          <FaMapMarkerAlt className="location-pin" />
          <span className="location-text">
            {locationSubtext || 'Dhaka, Bangladesh'}
          </span>
        </div>

        {/* Specs Highlights (Beds, Baths, Sqft) */}
        <div className="property-card-specs">
          <div className="spec-item" title="Bedrooms">
            <FaBed className="spec-icon" />
            <span className="spec-val">
              {bedrooms !== undefined && bedrooms !== null && bedrooms !== '' 
                ? `${bedrooms} ${Number(bedrooms) === 1 ? 'Bed' : 'Beds'}` 
                : '—'}
            </span>
          </div>
          <div className="spec-divider" />
          <div className="spec-item" title="Bathrooms">
            <FaBath className="spec-icon" />
            <span className="spec-val">
              {bathrooms !== undefined && bathrooms !== null && bathrooms !== '' 
                ? `${bathrooms} ${Number(bathrooms) === 1 ? 'Bath' : 'Baths'}` 
                : '—'}
            </span>
          </div>
          <div className="spec-divider" />
          <div className="spec-item" title="Square Footage">
            <FaRulerCombined className="spec-icon" />
            <span className="spec-val">
              {sqft ? `${Number(sqft).toLocaleString()} sqft` : '—'}
            </span>
          </div>
        </div>

        {/* Amenities Chips */}
        {displayAmenities.length > 0 && (
          <div className="property-card-amenities">
            {displayAmenities.map((amenity, idx) => (
              <span key={idx} className="amenity-chip">
                {amenity}
              </span>
            ))}
            {remainingAmenitiesCount > 0 && (
              <span className="amenity-chip more-chip">
                +{remainingAmenitiesCount} more
              </span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="property-card-footer">
          {hasOwnerActions ? (
            <div className="owner-actions-wrap" onClick={(e) => e.stopPropagation()}>
              <button className="card-btn btn-view" onClick={handleViewDetails}>
                View
              </button>
              {onEdit && (
                <button className="card-btn btn-edit" onClick={() => onEdit(property)}>
                  Edit
                </button>
              )}
              {onDelete && (
                <button className="card-btn btn-delete" onClick={() => onDelete(property._id)}>
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div className="public-actions-wrap">
              <button className="btn-view-details" onClick={handleViewDetails}>
                <span>View Details</span>
                <FaArrowRight className="arrow-icon" />
              </button>
              {property.contactPhone && (
                <a 
                  href={`tel:${property.contactPhone}`} 
                  className="btn-quick-call" 
                  title={`Call: ${property.contactPhone}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaPhoneAlt />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;