import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ViewDetails.css';
import { toast } from 'react-toastify';

const ViewDetails = () => {

  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch property details');
        }
        
        const data = await response.json();
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const checkWishlistStatus = async () => {
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const token = user.token;

        const response = await fetch('http://localhost:5000/api/wishlist', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const isInList = data.wishlist.some(item => item._id === propertyId);
          setIsInWishlist(isInList);
        }
      } catch (err) {
        console.error('Error checking wishlist status:', err);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
      checkWishlistStatus();
    }
  }, [propertyId]);

  const handleWishlist = async () => {
    try {
      setWishlistLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        toast.error('Please login to add properties to your wishlist');
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;

      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`http://localhost:5000/api/wishlist/remove/${propertyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsInWishlist(false);
          toast.success('Property removed from wishlist');
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || 'Failed to remove from wishlist');
        }
      } else {
        // Add to wishlist
        const response = await fetch('http://localhost:5000/api/wishlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ propertyId })
        });

        if (response.ok) {
          setIsInWishlist(true);
          toast.success('Property added to wishlist');

          navigate('/tenant/wishlist');
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || 'Failed to add to wishlist');
        }
      }
    } catch (err) {
      console.error('Error updating wishlist:', err);
      toast.error('An error occurred while updating wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleApplyToRent = () => {
    // TODO: Implement apply to rent functionality
    console.log('Apply to rent button clicked for property:', propertyId);
  };

  const handleApplyToBuy = () => {
    // TODO: Implement apply to buy functionality
    console.log('Apply to buy button clicked for property:', propertyId);
  };

  const handleBackToProperties = () => {
    navigate('/properties');
  };

  if (loading) {
    return (
      <div className="view-details-container">
        <div className="loading-state">Loading property details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-details-container">
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={handleBackToProperties} className="back-btn">Back to Properties</button>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="view-details-container">
        <div className="error-state">
          <p>Property not found</p>
          <button onClick={handleBackToProperties} className="back-btn">Back to Properties</button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-details-container">
      {/* Header with back button */}
      <div className="view-details-header">
        <button onClick={handleBackToProperties} className="back-btn">
          ← Back to Properties
        </button>
        <h1>Property Details</h1>
      </div>

      {/* Property Images */}
      <div className="property-images-section">
        {property.images && property.images.length > 0 ? (
          <div className="property-image-gallery">
            <img 
              src={`http://localhost:5000${property.images[0]}`} 
              alt="Property" 
              className="main-property-image"
            />
            {property.images.length > 1 && (
              <div className="property-image-thumbnails">
                {property.images.slice(1).map((image, index) => (
                  <img 
                    key={index} 
                    src={`http://localhost:5000${image}`} 
                    alt={`Property ${index + 2}`} 
                    className="property-thumbnail"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="property-image-placeholder">
            No Images Available
          </div>
        )}
      </div>

      {/* Property Information Grid */}
      <div className="property-details-grid">
        {/* Left Column - Main Info */}
        <div className="property-main-info">
          <div className="property-price-section">
            <h2 className="property-price">${property.price?.toLocaleString()}</h2>
            <div className="property-type-badge">
              {property.propertyType} - {property.listingType}
            </div>
          </div>

          <div className="property-address-section">
            <h3>Address</h3>
            <p className="property-address">
              {property.address}, {property.city}, {property.state} {property.zipCode}
            </p>
          </div>

          <div className="property-specs-section">
            <h3>Property Specifications</h3>
            <div className="property-specs-grid">
              <div className="spec-item">
                <span className="spec-icon">🛏️</span>
                <span className="spec-label">Bedrooms</span>
                <span className="spec-value">{property.bedrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🚿</span>
                <span className="spec-label">Bathrooms</span>
                <span className="spec-value">{property.bathrooms}</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">📏</span>
                <span className="spec-label">Square Footage</span>
                <span className="spec-value">{property.squareFootage} sqft</span>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🏷️</span>
                <span className="spec-label">Property Type</span>
                <span className="spec-value">{property.propertyType}</span>
              </div>
              {property.yearBuilt && (
                <div className="spec-item">
                  <span className="spec-icon">🏗️</span>
                  <span className="spec-label">Year Built</span>
                  <span className="spec-value">{property.yearBuilt}</span>
                </div>
              )}
            </div>
          </div>

          {property.description && (
            <div className="property-description-section">
              <h3>Description</h3>
              <p className="property-description">{property.description}</p>
            </div>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="property-amenities-section">
              <h3>Amenities</h3>
              <div className="amenities-list">
                {property.amenities.map((amenity, index) => (
                  <span key={index} className="amenity-tag">{amenity}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Contact & Actions */}
        <div className="property-sidebar">
          <div className="property-status-card">
            <div className="status-badge">
              {property.status}
            </div>
            <p className="status-description">
              This property is currently {property.status.toLowerCase()}
            </p>
          </div>

          <div className="property-contact-card">
            <h3>Contact Information</h3>
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <span className="contact-text">{property.contactEmail}</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <span className="contact-text">{property.contactPhone}</span>
            </div>
          </div>

          <div className="property-actions-card">
            <h3>Actions</h3>
            <button 
            onClick={handleWishlist} 
            className={`action-btn wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}`}
            disabled={wishlistLoading}
          >
            {wishlistLoading ? 'Processing...' : isInWishlist ? '❤️ Remove from Wishlist' : '❤️ Add to Wishlist'}
          </button>
            
            {property.listingType === 'For Rent' ? (
              <button 
                onClick={handleApplyToRent} 
                className="action-btn apply-rent-btn"
              >
                📝 Apply to Rent
              </button>
            ) : (
              <button 
                onClick={handleApplyToBuy} 
                className="action-btn apply-buy-btn"
              >
                💰 Apply to Buy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDetails;