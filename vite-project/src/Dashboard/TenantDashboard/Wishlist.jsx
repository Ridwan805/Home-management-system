import React, { useState, useEffect } from 'react';
import './Wishlist.css';

const Wishlist = () => {
  // Mock data for wishlist properties - in a real app, this would come from an API
  const [wishlistProperties, setWishlistProperties] = useState([
    {
      id: 1,
      address: '456 Park Avenue, Apt 7C, Cityville, State 12345',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      squareFootage: 1100,
      price: 1500,
      listingType: 'For Rent',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      status: 'Available',
      dateAdded: '2023-06-10'
    },
    {
      id: 2,
      address: '789 Ocean Drive, Unit 12, Beachtown, State 54321',
      propertyType: 'Condo',
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1400,
      price: 2200,
      listingType: 'For Rent',
      image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0',
      status: 'Available',
      dateAdded: '2023-06-15'
    },
    {
      id: 3,
      address: '123 Mountain View Road, Hillside, State 67890',
      propertyType: 'House',
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2200,
      price: 350000,
      listingType: 'For Sale',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
      status: 'Pending',
      dateAdded: '2023-06-05'
    }
  ]);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setShowPropertyModal(true);
  };

  const handleRemoveFromWishlist = (propertyId) => {
    setWishlistProperties(wishlistProperties.filter(property => property.id !== propertyId));
    if (selectedProperty && selectedProperty.id === propertyId) {
      setShowPropertyModal(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Available':
        return 'status-available';
      case 'Pending':
        return 'status-pending';
      case 'Sold':
      case 'Rented':
        return 'status-unavailable';
      default:
        return '';
    }
  };

  return (
    <div className="wishlist">
      <h2 className="section-title">My Wishlist</h2>
      
      {wishlistProperties.length === 0 ? (
        <div className="empty-wishlist">
          <p>Your wishlist is empty.</p>
          <p>Browse properties and add them to your wishlist to keep track of your favorite listings.</p>
        </div>
      ) : (
        <div className="wishlist-properties">
          {wishlistProperties.map(property => (
            <div key={property.id} className="property-card">
              <div className="property-image">
                <img src={property.image} alt={property.address} />
                <span className={`property-status ${getStatusClass(property.status)}`}>
                  {property.status}
                </span>
              </div>
              <div className="property-content">
                <h3 className="property-price">
                  {formatCurrency(property.price)}
                  {property.listingType === 'For Rent' && <span className="rent-period">/month</span>}
                </h3>
                <p className="property-address">{property.address}</p>
                <div className="property-features">
                  <span>{property.bedrooms} Beds</span>
                  <span>{property.bathrooms} Baths</span>
                  <span>{property.squareFootage} sq ft</span>
                  <span>{property.propertyType}</span>
                </div>
                <div className="property-actions">
                  <button 
                    className="btn-primary view-details-btn"
                    onClick={() => handleViewDetails(property)}
                  >
                    View Details
                  </button>
                  <button 
                    className="btn-secondary remove-btn"
                    onClick={() => handleRemoveFromWishlist(property.id)}
                  >
                    Remove
                  </button>
                </div>
                <p className="date-added">Added on {formatDate(property.dateAdded)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      {showPropertyModal && selectedProperty && (
        <div className="property-modal-overlay">
          <div className="property-modal">
            <div className="modal-header">
              <h3>Property Details</h3>
              <button 
                className="close-btn"
                onClick={() => setShowPropertyModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-property-image">
                <img src={selectedProperty.image} alt={selectedProperty.address} />
                <span className={`property-status ${getStatusClass(selectedProperty.status)}`}>
                  {selectedProperty.status}
                </span>
              </div>
              
              <div className="modal-property-details">
                <h3 className="property-price">
                  {formatCurrency(selectedProperty.price)}
                  {selectedProperty.listingType === 'For Rent' && <span className="rent-period">/month</span>}
                </h3>
                <p className="property-address">{selectedProperty.address}</p>
                
                <div className="property-info-grid">
                  <div className="info-item">
                    <span className="info-label">Property Type</span>
                    <span className="info-value">{selectedProperty.propertyType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Bedrooms</span>
                    <span className="info-value">{selectedProperty.bedrooms}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Bathrooms</span>
                    <span className="info-value">{selectedProperty.bathrooms}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Square Footage</span>
                    <span className="info-value">{selectedProperty.squareFootage} sq ft</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Listing Type</span>
                    <span className="info-value">{selectedProperty.listingType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">{selectedProperty.status}</span>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button className="btn-primary">Contact Owner</button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleRemoveFromWishlist(selectedProperty.id)}
                  >
                    Remove from Wishlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wishlist;