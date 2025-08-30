import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PropertyCard.css';
import apiConfig from '../config/api';

const PropertyCard = ({ property, onEdit, onViewDetails, onDelete }) => {
  const navigate = useNavigate();

  // Handle view details button click
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(property);
    } else {
      navigate(`/properties/${property._id}`);
    }
  };



  return (
    <div className="property-card">
      <div className="property-image">
        {property.images && property.images.length > 0 ? (
          <img src={`${apiConfig.baseUrl}/api/images/${property.images[0].replace('/uploads/', '')}`} alt="Property" />
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

        </div>
      </div>
    </div>
  );
};

export default PropertyCard;