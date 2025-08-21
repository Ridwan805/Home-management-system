import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PropertyCard.css';

const PropertyCard = ({ property, onEdit, onStatusChange, onViewDetails, onDelete }) => {
  const navigate = useNavigate();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Status options for properties
  const statusOptions = ['Available', 'Not Available', 'Sold', 'Rented'];

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };

    // Add event listener when dropdown is open
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  // Handle view details button click
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(property);
    } else {
      navigate(`/properties/${property._id}`);
    }
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
        <h3>৳{property.price?.toLocaleString()}</h3>
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
          <button className="remove-btn" onClick={(e) => {
            e.stopPropagation();
            onDelete(property._id);
          }}>Remove</button>
          <div className="status-action" style={{ position: "relative" }} ref={dropdownRef}>
            <button
              className={`status-btn status-dropdown-btn ${property.status?.toLowerCase().replace(/ /g, '-')}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusDropdown(!showStatusDropdown);
              }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(option);
                      }}
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
    </div>
  );
};

export default PropertyCard;