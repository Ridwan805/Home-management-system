import React, { useState, useEffect } from 'react';
import './HouseInfo.css';

const HouseInfo = () => {
  // In a real app, this would be fetched from an API
  const [property, setProperty] = useState({
    id: '123456',
    address: '123 Main Street, Apt 4B, Cityville, State 12345',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 950,
    rent: 1200,
    leaseStart: '2023-01-01',
    leaseEnd: '2023-12-31',
    amenities: [
      'Air Conditioning',
      'In-unit Washer/Dryer',
      'Dishwasher',
      'Hardwood Floors',
      'Balcony',
      'Fitness Center',
      'Swimming Pool',
      'Pet Friendly'
    ],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0'
    ],
    owner: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567'
    },
    description: 'Modern and spacious apartment in a prime location. Recently renovated with high-end finishes and appliances. The building features excellent amenities including a fitness center and swimming pool. Close to public transportation, shopping, and dining.'
  });

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="house-info">
      <h2 className="section-title">House Information</h2>
      
      {loading ? (
        <div className="loading">Loading property details...</div>
      ) : (
        <div className="property-details">
          <div className="property-images">
            <div className="main-image">
              <img 
                src={property.images[activeImageIndex]} 
                alt={`Property view ${activeImageIndex + 1}`} 
              />
            </div>
            <div className="image-thumbnails">
              {property.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`thumbnail ${index === activeImageIndex ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img src={image} alt={`Thumbnail ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
          
          <div className="property-info-container">
            <div className="property-info-section">
              <h3>Property Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Property ID</span>
                  <span className="info-value">{property.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Property Type</span>
                  <span className="info-value">{property.propertyType}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bedrooms</span>
                  <span className="info-value">{property.bedrooms}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bathrooms</span>
                  <span className="info-value">{property.bathrooms}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Square Footage</span>
                  <span className="info-value">{property.squareFootage} sq ft</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Monthly Rent</span>
                  <span className="info-value">${property.rent}</span>
                </div>
              </div>
            </div>
            
            <div className="property-info-section">
              <h3>Address</h3>
              <p className="property-address">{property.address}</p>
            </div>
            
            <div className="property-info-section">
              <h3>Lease Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Lease Start</span>
                  <span className="info-value">{formatDate(property.leaseStart)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Lease End</span>
                  <span className="info-value">{formatDate(property.leaseEnd)}</span>
                </div>
              </div>
            </div>
            
            <div className="property-info-section">
              <h3>Description</h3>
              <p className="property-description">{property.description}</p>
            </div>
            
            <div className="property-info-section">
              <h3>Amenities</h3>
              <ul className="amenities-list">
                {property.amenities.map((amenity, index) => (
                  <li key={index} className="amenity-item">{amenity}</li>
                ))}
              </ul>
            </div>
            
            <div className="property-info-section">
              <h3>Owner Information</h3>
              <div className="owner-info">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{property.owner.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{property.owner.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{property.owner.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseInfo;