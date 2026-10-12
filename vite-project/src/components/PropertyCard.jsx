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
        {(property.images?.length > 0 || property.media?.images?.length > 0) ? (
          <img src={apiConfig.getImageUrl(property.images?.[0] || property.media?.images?.[0]?.url)} alt="Property" />
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
        <p className="property-location">
          {(property.location?.city || property.city) && `${property.location?.city || property.city}`}
          {(property.location?.state || property.state) && `, ${property.location?.state || property.state}`}
          {(property.location?.zipCode || property.zipCode) && ` ${property.location?.zipCode || property.zipCode}`}
        </p>
        
        <div className="property-specs">
          <span>🛏️ {property.specifications?.bedrooms || property.bedrooms || 'N/A'} bd</span>
          <span>🚿 {property.specifications?.bathrooms || property.bathrooms || 'N/A'} ba</span>
          <span>📏 {property.specifications?.squareFootage || property.squareFootage || 'N/A'} sqft</span>
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