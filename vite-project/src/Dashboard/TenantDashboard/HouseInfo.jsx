import React, { useState, useEffect } from 'react';
import './HouseInfo.css';

const HouseInfo = () => {
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAssignedProperties();
  }, []);

  const fetchAssignedProperties = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('http://localhost:5001/api/properties/my-assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned properties');
      }

      const data = await response.json();
      // Handle the correct response structure from backend
      const allAssignments = [];
      
      // Add rented properties
      if (data.assignments?.rentedProperties) {
        data.assignments.rentedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: 'Rent',
            assignedAt: item.rent.startDate,
            status: item.rent.status,
            owner: item.property.ownerUserId
          });
        });
      }
      
      // Add owned properties
      if (data.assignments?.ownedProperties) {
        data.assignments.ownedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: 'Ownership',
            assignedAt: item.property.updatedAt,
            status: 'Owned',
            owner: item.property.ownerUserId
          });
        });
      }
      
      setAssignedProperties(allAssignments);
    } catch (err) {
      console.error('Error fetching assigned properties:', err);
      setError('Failed to load assigned properties');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="house-info">
        <h2 className="section-title">House Information</h2>
        <div className="loading">Loading your assigned properties...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="house-info">
        <h2 className="section-title">House Information</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="house-info">
      <h2 className="section-title">House Information</h2>
      
      {assignedProperties.length === 0 ? (
        <div className="no-properties">
          <h3>No Properties Assigned</h3>
          <p>You don't have any assigned properties yet. Complete a payment for a property request to see it here.</p>
        </div>
      ) : (
        <div className="properties-grid">
          {assignedProperties.map((property) => (
            <div key={property._id} className="property-card">
              <div className="property-header">
                <h3 className="property-address">{property.address}</h3>
                <span className={`assignment-type ${property.assignmentType?.toLowerCase()}`}>
                  {property.assignmentType}
                </span>
              </div>
              
              <div className="property-details">
                <div className="property-specs">
                  <span>🛏️ {property.bedrooms} bed</span>
                  <span>🚿 {property.bathrooms} bath</span>
                  <span>🏠 {property.propertyType}</span>
                </div>
                
                <div className="property-price">
                  <strong>৳{property.price?.toLocaleString()}</strong>
                  <span className="listing-type">({property.listingType})</span>
                </div>
                
                <div className="assignment-info">
                  <p><strong>Assigned:</strong> {formatDate(property.assignedAt)}</p>
                  <p><strong>Status:</strong> <span className="status-badge">{property.status}</span></p>
                </div>
                
                {property.owner && (
                  <div className="owner-info">
                    <p><strong>Owner:</strong> {property.owner.firstName} {property.owner.lastName}</p>
                    <p><strong>Contact:</strong> {property.owner.email}</p>
                  </div>
                )}
              </div>
              
              <div className="property-actions">
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewDetails(property)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Property Details Modal */}
      {showModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Property Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="property-info-section">
                <h3>Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Address</span>
                    <span className="info-value">{selectedProperty.address}</span>
                  </div>
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
                    <span className="info-label">Price</span>
                    <span className="info-value">৳{selectedProperty.price?.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Listing Type</span>
                    <span className="info-value">{selectedProperty.listingType}</span>
                  </div>
                </div>
              </div>
              
              <div className="property-info-section">
                <h3>Assignment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Assignment Type</span>
                    <span className="info-value">{selectedProperty.assignmentType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Assigned Date</span>
                    <span className="info-value">{formatDate(selectedProperty.assignedAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">{selectedProperty.status}</span>
                  </div>
                </div>
              </div>
              
              {selectedProperty.owner && (
                <div className="property-info-section">
                  <h3>Owner Information</h3>
                  <div className="owner-info">
                    <div className="info-item">
                      <span className="info-label">Name</span>
                      <span className="info-value">{selectedProperty.owner.firstName} {selectedProperty.owner.lastName}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{selectedProperty.owner.email}</span>
                    </div>
                    {selectedProperty.owner.phone && (
                      <div className="info-item">
                        <span className="info-label">Phone</span>
                        <span className="info-value">{selectedProperty.owner.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseInfo;