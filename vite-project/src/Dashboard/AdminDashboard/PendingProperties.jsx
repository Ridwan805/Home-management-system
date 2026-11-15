import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaHourglass, FaMapMarkerAlt, FaHome, FaMoneyBillWave, FaUser, FaEye, FaBed, FaBath, FaRulerCombined, FaCalendarAlt, FaPhone, FaEnvelope } from 'react-icons/fa';
import API, { authenticatedAxios } from '../../config/api.js';
import { PropertyCardSkeleton } from '../../components/loading';

const PendingProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const navigate = useNavigate();

  const fetchPendingProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authenticatedAxios(
        axios,
        {
          method: 'get',
          url: API.baseUrl + API.endpoints.pendingProperties
        },
        navigate
      );
      
      setProperties(data.properties || data);
      
    } catch (err) {
      console.error('Error fetching pending properties:', err);
      setError('Failed to load pending properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchPendingProperties();
  }, [fetchPendingProperties]);

  const handleApprove = async (id) => {
    try {
      setActionInProgress(true);
      
      await authenticatedAxios(
        axios,
        {
          method: 'put',
          url: API.baseUrl + API.endpoints.approveProperty(id),
          data: { status: 'Available' }
        },
        navigate
      );
      
      // Update the local state to remove the approved property
      setProperties(properties.filter(property => property._id !== id));
      setError(null);
    } catch (err) {
      console.error('Error approving property:', err);
      setError('Failed to approve property. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (id) => {
    try {
      setActionInProgress(true);
      
      await authenticatedAxios(
        axios,
        {
          method: 'put',
          url: API.baseUrl + API.endpoints.approveProperty(id),
          data: { status: 'rejected' }
        },
        navigate
      );
      
      // Update the local state to remove the rejected property
      setProperties(properties.filter(property => property._id !== id));
      setError(null);
    } catch (err) {
      console.error('Error rejecting property:', err);
      setError('Failed to reject property. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="pending-properties">
      <h2>Pending Properties</h2>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(17.5rem, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
          {[1, 2, 3].map((n) => (
            <PropertyCardSkeleton key={n} />
          ))}
        </div>
      ) : error ? (
        <div className="error-message" style={{ backgroundColor: '#fee2e2', padding: '1.25rem', borderRadius: '0.5rem', textAlign: 'center' }}>
          Failed to load pending properties. Please try again later.
          <button 
            className="retry-button" 
            onClick={fetchPendingProperties}
            style={{ 
              marginTop: '0.9375rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1.25rem', 
              borderRadius: '0.25rem', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="pending-properties-list">
          {properties.length === 0 ? (
            <p className="no-properties">No pending properties found.</p>
          ) : (
            properties.map((property) => (
              <div key={property._id} className={`property-card ${actionInProgress ? 'action-in-progress' : ''}`} style={{ position: 'relative', padding: '1.25rem', margin: '0.9375rem 0', borderRadius: '0.5rem', boxShadow: '0 0.125rem 0.5rem rgba(0,0,0,0.1)', backgroundColor: '#fff' }}>
                <div className="property-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9375rem' }}>
                  <h3>{property.displayName || `${property.propertyType} - ${property.address || 'Property'}`}</h3>
                  <div className="property-status">
                    <FaHourglass className="status-icon" />
                    <span className="status-pending">Pending Review</span>
                  </div>
                </div>
                
                <div className="property-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12.5rem, 1fr))', gap: '0.625rem', marginBottom: '0.9375rem' }}>
                  <div className="property-detail-item">
                    <FaUser className="detail-icon" />
                    <p><strong>Owner:</strong> {property.ownerUserId ? `${property.ownerUserId.firstName} ${property.ownerUserId.lastName}` : 'Unknown'}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaHome className="detail-icon" />
                    <p><strong>Type:</strong> {property.propertyType}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaMapMarkerAlt className="detail-icon" />
                    <p><strong>Location:</strong> {property.address || `${property.location?.city || ''}, ${property.location?.state || ''}`.trim().replace(/^,|,$/, '') || 'Not specified'}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaMoneyBillWave className="detail-icon" />
                    <p><strong>Price:</strong> ৳{property.pricing?.rent || property.pricing?.sale || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="property-description" style={{ marginBottom: '0.9375rem', padding: '0.625rem', backgroundColor: '#f9f9f9', borderRadius: '0.25rem' }}>
                  <p><strong>Description:</strong></p>
                  <p>{property.description.substring(0, 150)}...</p>
                </div>
                
                <div className="property-actions" style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '0.9375rem' }}>
                  <button 
                    onClick={() => setSelectedProperty(property)} 
                    className="view-details-btn"
                    style={{ 
                      backgroundColor: '#2196F3', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.25rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3125rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FaEye className="btn-icon" /> View Details
                  </button>
                  <button 
                    onClick={() => handleApprove(property._id)} 
                    className="approve-btn"
                    disabled={actionInProgress}
                    style={{ 
                      backgroundColor: '#4CAF50', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.25rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3125rem',
                      cursor: actionInProgress ? 'not-allowed' : 'pointer',
                      opacity: actionInProgress ? 0.7 : 1
                    }}
                  >
                    <FaCheck className="btn-icon" /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(property._id)} 
                    className="reject-btn"
                    disabled={actionInProgress}
                    style={{ 
                      backgroundColor: '#f44336', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.25rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3125rem',
                      cursor: actionInProgress ? 'not-allowed' : 'pointer',
                      opacity: actionInProgress ? 0.7 : 1
                    }}
                  >
                    <FaTimes className="btn-icon" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.875rem',
            maxWidth: '50rem',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            width: '90%'
          }}>
            <button 
              onClick={() => setSelectedProperty(null)}
              style={{
                position: 'absolute',
                top: '0.9375rem',
                right: '0.9375rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <h2 style={{ marginBottom: '1.25rem', color: '#333' }}>Property Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Left Column */}
              <div>
                <h3 style={{ color: '#2196F3', marginBottom: '0.9375rem' }}>Basic Information</h3>
                <div style={{ marginBottom: '0.625rem' }}>
                  <strong>Property Type:</strong> {selectedProperty.propertyType}
                </div>
                <div style={{ marginBottom: '0.625rem' }}>
                  <strong>Display Name:</strong> {selectedProperty.displayName || `${selectedProperty.propertyType} at ${selectedProperty.address}`}
                </div>
                <div style={{ marginBottom: '0.625rem' }}>
                  <strong>Address:</strong> {selectedProperty.address}
                </div>
                {selectedProperty.location && (
                  <div style={{ marginBottom: '0.625rem' }}>
                    <strong>Location:</strong> {selectedProperty.location.city}, {selectedProperty.location.state}
                  </div>
                )}
                <div style={{ marginBottom: '0.625rem' }}>
                  <strong>Status:</strong> <span style={{ color: '#ff9800', fontWeight: 'bold' }}>{selectedProperty.status}</span>
                </div>
                
                <h3 style={{ color: '#2196F3', marginTop: '1.25rem', marginBottom: '0.9375rem' }}>Specifications</h3>
                {selectedProperty.specifications && (
                  <>
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                      <FaBed /> <strong>Bedrooms:</strong> {selectedProperty.specifications.bedrooms}
                    </div>
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                      <FaBath /> <strong>Bathrooms:</strong> {selectedProperty.specifications.bathrooms}
                    </div>
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                      <FaRulerCombined /> <strong>Square Feet:</strong> {selectedProperty.specifications.squareFeet}
                    </div>
                    {selectedProperty.specifications.yearBuilt && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <FaCalendarAlt /> <strong>Year Built:</strong> {selectedProperty.specifications.yearBuilt}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Right Column */}
              <div>
                <h3 style={{ color: '#2196F3', marginBottom: '0.9375rem' }}>Owner Information</h3>
                {selectedProperty.ownerUserId && (
                  <>
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                      <FaUser /> <strong>Name:</strong> {selectedProperty.ownerUserId.firstName} {selectedProperty.ownerUserId.lastName}
                    </div>
                    <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                      <FaEnvelope /> <strong>Email:</strong> {selectedProperty.ownerUserId.email}
                    </div>
                    {selectedProperty.ownerUserId.phone && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <FaPhone /> <strong>Phone:</strong> {selectedProperty.ownerUserId.phone}
                      </div>
                    )}
                  </>
                )}
                
                <h3 style={{ color: '#2196F3', marginTop: '1.25rem', marginBottom: '0.9375rem' }}>Pricing</h3>
                {selectedProperty.pricing && (
                  <>
                    {selectedProperty.pricing.rent && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <FaMoneyBillWave /> <strong>Rent:</strong> ${selectedProperty.pricing.rent}/month
                      </div>
                    )}
                    {selectedProperty.pricing.sale && (
                      <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <FaMoneyBillWave /> <strong>Sale Price:</strong> ${selectedProperty.pricing.sale}
                      </div>
                    )}
                    {selectedProperty.pricing.deposit && (
                      <div style={{ marginBottom: '0.625rem' }}>
                        <strong>Security Deposit:</strong> ${selectedProperty.pricing.deposit}
                      </div>
                    )}
                  </>
                )}
                
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <>
                    <h3 style={{ color: '#2196F3', marginTop: '1.25rem', marginBottom: '0.9375rem' }}>Amenities</h3>
                    <ul style={{ paddingLeft: '1.25rem' }}>
                      {selectedProperty.amenities.map((amenity, index) => (
                        <li key={index} style={{ marginBottom: '0.3125rem' }}>{amenity}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            
            {selectedProperty.description && (
              <div style={{ marginTop: '1.25rem' }}>
                <h3 style={{ color: '#2196F3', marginBottom: '0.9375rem' }}>Description</h3>
                <p style={{ lineHeight: '1.6', color: '#666' }}>{selectedProperty.description}</p>
              </div>
            )}
            
            {/* Action Buttons in Modal */}
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', marginTop: '1.875rem' }}>
              <button 
                onClick={() => {
                  handleApprove(selectedProperty._id);
                  setSelectedProperty(null);
                }} 
                disabled={actionInProgress}
                style={{ 
                  backgroundColor: '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.25rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  opacity: actionInProgress ? 0.7 : 1,
                  fontSize: '1rem'
                }}
              >
                <FaCheck /> Approve Property
              </button>
              <button 
                onClick={() => {
                  handleReject(selectedProperty._id);
                  setSelectedProperty(null);
                }} 
                disabled={actionInProgress}
                style={{ 
                  backgroundColor: '#f44336', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.25rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  opacity: actionInProgress ? 0.7 : 1,
                  fontSize: '1rem'
                }}
              >
                <FaTimes /> Reject Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingProperties;
