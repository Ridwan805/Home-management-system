import React, { useState } from 'react';
import './PropertyCard.css';

const PropertyCard = ({ property, onEdit, onStatusChange }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Status options for properties
  const statusOptions = ['Available', 'Not Available', 'Sold', 'Rented'];

  // Handle view details button click
  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  // Handle close details modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
  };

  // Handle status change
  const handleStatusUpdate = (status) => {
    onStatusChange(property._id, status);
    setShowStatusDropdown(false);
  };

  return (
    <div className="property-card">
      <div className="property-image">
        {property.images && property.images.length > 0 ? (
          <img src={`http://localhost:5000${property.images[0]}`} alt="Property" />
        ) : (
          <div className="property-placeholder">No Image Available</div>
        )}
        <span className={`status-badge ${property.status?.toLowerCase().replace(/ /g, '-')}`}>
          {property.status}
        </span>
      </div>
      
      <div className="property-info">
        <h3>${property.price?.toLocaleString()}</h3>
        <p className="property-address">{property.address}</p>
        <p className="property-location">{property.city}, {property.state} {property.zipCode}</p>
        
        <div className="property-specs">
          <span>🛏️ {property.bedrooms} bd</span>
          <span>🚿 {property.bathrooms} ba</span>
          <span>📏 {property.squareFootage} sqft</span>
        </div>
        
        <div className="property-type-info">
          <span className="property-type">{property.propertyType}</span>
          <span className="listing-type">{property.listingType}</span>
        </div>
        
        {property.description && (
          <p className="property-description">{property.description}</p>
        )}
        
        <div className="property-actions">
          <button className="view-details-btn" onClick={handleViewDetails}>View Details</button>
          <button className="edit-btn" onClick={() => onEdit(property)}>Edit</button>
          <div className="status-action" style={{ position: "relative" }}>
            <button
              className={`status-btn status-dropdown-btn ${property.status?.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              style={{ fontWeight: 500 }}
            >
              Status: {property.status} <span style={{marginLeft: 6, fontSize: 12}}>▼</span>
            </button>
            {showStatusDropdown && (
              <ul className="status-dropdown-menu">
                {statusOptions.map(option => (
                  <li key={option}>
                    <button
                      className="status-dropdown-option"
                      onClick={() => handleStatusUpdate(option)}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Property Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseDetailsModal}>&times;</button>
            <h2>{property.address}</h2>
            
            {property.images && property.images.length > 0 && (
              <div className="modal-image-gallery">
                {property.images.map((image, index) => (
                  <img key={index} src={`http://localhost:5000${image}`} alt={`Property ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="modal-details-grid">
              <div className="modal-detail-item"><strong>Price:</strong> <span>${property.price?.toLocaleString()}</span></div>
              <div className="modal-detail-item"><strong>Type:</strong> <span>{property.propertyType}</span></div>
              <div className="modal-detail-item"><strong>Bedrooms:</strong> <span>{property.bedrooms}</span></div>
              <div className="modal-detail-item"><strong>Bathrooms:</strong> <span>{property.bathrooms}</span></div>
              <div className="modal-detail-item"><strong>Square Footage:</strong> <span>{property.squareFootage} sqft</span></div>
              <div className="modal-detail-item"><strong>Listing Type:</strong> <span>{property.listingType}</span></div>
              <div className="modal-detail-item"><strong>Status:</strong> <span>{property.status}</span></div>
              {property.yearBuilt && <div className="modal-detail-item"><strong>Year Built:</strong> <span>{property.yearBuilt}</span></div>}
              {property.city && <div className="modal-detail-item"><strong>Location:</strong> <span>{property.city}, {property.state} {property.zipCode}</span></div>}
              {property.contactEmail && <div className="modal-detail-item"><strong>Contact Email:</strong> <span>{property.contactEmail}</span></div>}
              {property.contactPhone && <div className="modal-detail-item"><strong>Contact Phone:</strong> <span>{property.contactPhone}</span></div>}
            </div>

            {property.amenities && property.amenities.length > 0 && (
              <div className="modal-amenities">
                <h3>Amenities:</h3>
                <div className="modal-amenities-list">
                  {property.amenities.map((amenity, index) => (
                    <span key={index} className="modal-amenity-item">{amenity}</span>
                  ))}
                </div>
              </div>
            )}

            {property.description && (
              <div className="modal-description">
                <h3>Description:</h3>
                <p className="modal-description-full">{property.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyCard;