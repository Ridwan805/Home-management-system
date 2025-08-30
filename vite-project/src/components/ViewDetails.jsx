import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ViewDetails.css';
import { toast } from 'react-toastify';
import UnifiedInquiryForm from './UnifiedInquiryForm';
import apiConfig from '../config/api';

const ViewDetails = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiConfig.getUrl(`/api/properties/${propertyId}`));
        
        if (!response.ok) {
          throw new Error('Failed to fetch property details');
        }
        
        const data = await response.json();
        setProperty(data.property);
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const getUserRole = () => {
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role);
        }
      } catch (err) {
        console.error('Error getting user role:', err);
      }
    };

    const checkWishlistStatus = async () => {
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const token = user.token;
        if (!token) return;

        const response = await fetch(apiConfig.getUrl('/api/wishlist'), {
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

    const checkApplicationStatus = async () => {
      try {
        setApplicationLoading(true);
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) return;
        
        const user = JSON.parse(userData);
        const token = user.token;
        if (!token) return;

        const response = await fetch(apiConfig.getUrl('/api/requests'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const hasExistingApplication = data.requests.some(request => 
            request.propertyId._id === propertyId
          );
          setHasApplied(hasExistingApplication);
        }
      } catch (err) {
        console.error('Error checking application status:', err);
      } finally {
        setApplicationLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
      getUserRole();
      checkWishlistStatus();
      checkApplicationStatus();
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
      
      if (!token) {
        toast.error('Please login to add properties to your wishlist');
        navigate('/login');
        return;
      }

      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(apiConfig.getUrl(`/api/wishlist/remove/${propertyId}`), {
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
        const response = await fetch(apiConfig.getUrl('/api/wishlist/add'), {
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
    setRequestType('Rent');
    setShowRequestForm(true);
  };

  const handleApplyToBuy = () => {
    setRequestType('Buy');
    setShowRequestForm(true);
  };

  const handleCloseRequestForm = () => {
    setShowRequestForm(false);
    setRequestType(null);
  };

  const handleSubmitRequest = async (result) => {
    // The form submission is now handled directly in UnifiedInquiryForm component
    // This function is called only on successful submission
    toast.success('Request submitted successfully!');
    handleCloseRequestForm();
    
    // Update application status to reflect the new application
    setHasApplied(true);
    
    // Optionally redirect to My Requests page
    setTimeout(() => {
      navigate('/my-requests');
    }, 2000);
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
              src={`${apiConfig.baseUrl}/api/images/${property.images[0].replace('/uploads/', '')}`} 
              alt="Property" 
              className="main-property-image"
            />
            {property.images.length > 1 && (
              <div className="property-image-thumbnails">
                {property.images.slice(1).map((image, index) => (
                  <img 
                    key={index} 
                    src={`${apiConfig.baseUrl}/api/images/${image.replace('/uploads/', '')}`} 
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
            <h2 className="property-price">৳{property.price?.toLocaleString()}</h2>
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
            <h3>Owner Contact Information</h3>
            {property.ownerUserId ? (
              <>
                <div className="contact-item">
                  <span className="contact-icon">👤</span>
                  <span className="contact-text">{property.ownerUserId.firstName} {property.ownerUserId.lastName}</span>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">📧</span>
                  <span className="contact-text">{property.ownerUserId.email}</span>
                </div>
                {property.ownerUserId.phoneNumber && (
                  <div className="contact-item">
                    <span className="contact-icon">📞</span>
                    <span className="contact-text">{property.ownerUserId.phoneNumber}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="no-contact-info">Owner contact information not available</p>
            )}
          </div>

          <div className="property-actions-card">
            <h3>Actions</h3>
            {userRole && userRole !== 'Owner' && (
              <>
                <button 
                  onClick={handleWishlist} 
                  className={`action-btn wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}`}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading ? 'Processing...' : isInWishlist ? '❤️ Remove from Wishlist' : '❤️ Add to Wishlist'}
                </button>
                
                {property.listingType === 'For Rent' ? (
                  <button 
                    onClick={hasApplied || property.status === 'Rented' ? null : handleApplyToRent} 
                    className={`action-btn apply-rent-btn ${hasApplied ? 'already-applied' : ''} ${property.status === 'Rented' ? 'property-rented' : ''}`}
                    disabled={hasApplied || applicationLoading || property.status === 'Rented'}
                  >
                    {applicationLoading ? 'Checking...' : 
                     property.status === 'Rented' ? '🚫 Property Already Rented' :
                     hasApplied ? '✓ Already Applied to Rent' : '📝 Apply to Rent'}
                  </button>
                ) : (
                  <button 
                    onClick={hasApplied ? null : handleApplyToBuy} 
                    className={`action-btn apply-buy-btn ${hasApplied ? 'already-applied' : ''}`}
                    disabled={hasApplied || applicationLoading}
                  >
                    {applicationLoading ? 'Checking...' : hasApplied ? '✓ Already Applied to Buy' : '💰 Apply to Buy'}
                  </button>
                )}
              </>
            )}
            {userRole === 'Owner' && (
              <p className="owner-message">As an owner, you can view property details but cannot add to wishlist or apply.</p>
            )}
            {!userRole && (
              <p className="login-message">Please <a href="/login">login</a> to add to wishlist or apply.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Unified Inquiry Form Modal */}
      {showRequestForm && (
        <UnifiedInquiryForm
          property={property}
          requestType={requestType}
          onClose={handleCloseRequestForm}
          onSubmit={handleSubmitRequest}
        />
      )}
    </div>
  );
};

export default ViewDetails;