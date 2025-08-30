import React, { useState, useEffect, useCallback } from 'react';
import './HouseInfo.css';
import API from '../../config/api';

const HouseInfo = () => {
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchAssignedProperties();
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAssignedProperties(true); // Silent refresh
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAssignedProperties = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      } else {
        setRefreshing(true);
      }
      
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        setError('Authentication required');
        return;
      }

      // Add cache-busting parameter to prevent stale data
      const timestamp = new Date().getTime();
      const response = await fetch(`${API.getUrl(API.endpoints.tenantAssignments)}?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned properties');
      }

      const data = await response.json();
      // Handle the correct response structure from backend
      const allAssignments = [];
      
      // Add rented properties (only from approved requests)
      if (data.assignments?.rentedProperties) {
        data.assignments.rentedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: 'Rent',
            assignedAt: item.request?.approvedAt || item.property.updatedAt,
            status: 'Approved',
            owner: item.property.ownerUserId,
            requestInfo: item.request
          });
        });
      }
      
      // Add owned properties (from approved requests and existing ownership)
      if (data.assignments?.ownedProperties) {
        data.assignments.ownedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: item.request ? 'Purchase' : 'Ownership',
            assignedAt: item.request?.approvedAt || item.property.updatedAt,
            status: item.request ? 'Approved' : 'Owned',
            owner: item.property.ownerUserId,
            requestInfo: item.request
          });
        });
      }
      
      setAssignedProperties(allAssignments);
    } catch (err) {
      console.error('Error fetching assigned properties:', err);
      if (!silent) {
        setError('Failed to load assigned properties');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchAssignedProperties();
  };

  const handleViewDetails = async (property) => {
    setSelectedProperty(property);
    setShowModal(true);
    setLoadingDetails(true);
    
    try {
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API.getUrl(API.endpoints.tenantPropertyDetails(property._id))}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property details');
      }

      const data = await response.json();
      setSelectedPropertyDetails(data.property);
    } catch (err) {
      console.error('Error fetching property details:', err);
      setError('Failed to load property details');
    } finally {
      setLoadingDetails(false);
    }
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
      <div className="section-header">
        <h2 className="section-title">House Information</h2>
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={loading || refreshing}
          title="Refresh property data"
        >
          {refreshing ? '🔄' : '↻'} {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {assignedProperties.length === 0 ? (
        <div className="no-properties">
          <h3>No Approved Properties</h3>
          <p>You don't have any approved property requests yet. Properties will appear here only after the owner approves your request and marks it as completed.</p>
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
              {loadingDetails ? (
                <div className="loading-details">
                  <div className="loading-spinner">🔄</div>
                  <p>Loading detailed property information...</p>
                </div>
              ) : (
                <>
                  {/* Basic Property Information */}
                  <div className="property-info-section">
                    <h3>Basic Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Address</span>
                        <span className="info-value">
                          {selectedPropertyDetails?.basicInfo?.address || selectedProperty.address}
                          {selectedPropertyDetails?.basicInfo?.city && `, ${selectedPropertyDetails.basicInfo.city}`}
                          {selectedPropertyDetails?.basicInfo?.state && `, ${selectedPropertyDetails.basicInfo.state}`}
                          {selectedPropertyDetails?.basicInfo?.zipCode && ` ${selectedPropertyDetails.basicInfo.zipCode}`}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Property Type</span>
                        <span className="info-value">{selectedPropertyDetails?.basicInfo?.propertyType || selectedProperty.propertyType}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Price</span>
                        <span className="info-value">
                          ৳{(selectedPropertyDetails?.basicInfo?.price || selectedProperty.price)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Listing Type</span>
                        <span className="info-value">{selectedPropertyDetails?.basicInfo?.listingType || selectedProperty.listingType}</span>
                      </div>
                      {selectedPropertyDetails?.basicInfo?.bedrooms && (
                        <div className="info-item">
                          <span className="info-label">Bedrooms</span>
                          <span className="info-value">{selectedPropertyDetails.basicInfo.bedrooms}</span>
                        </div>
                      )}
                      {selectedPropertyDetails?.basicInfo?.bathrooms && (
                        <div className="info-item">
                          <span className="info-label">Bathrooms</span>
                          <span className="info-value">{selectedPropertyDetails.basicInfo.bathrooms}</span>
                        </div>
                      )}
                      {selectedPropertyDetails?.basicInfo?.squareFootage && (
                        <div className="info-item">
                          <span className="info-label">Square Footage</span>
                          <span className="info-value">{selectedPropertyDetails.basicInfo.squareFootage} sqft</span>
                        </div>
                      )}
                      {selectedPropertyDetails?.basicInfo?.yearBuilt && (
                        <div className="info-item">
                          <span className="info-label">Year Built</span>
                          <span className="info-value">{selectedPropertyDetails.basicInfo.yearBuilt}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Details */}
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

                  {/* Current Owner Information */}
                  {selectedPropertyDetails?.currentOwner && (
                    <div className="property-info-section">
                      <h3>Current Owner Information</h3>
                      <div className="owner-info">
                        <div className="info-item">
                          <span className="info-label">Name</span>
                          <span className="info-value">
                            {selectedPropertyDetails.currentOwner.firstName} {selectedPropertyDetails.currentOwner.lastName}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{selectedPropertyDetails.currentOwner.email}</span>
                        </div>
                        {selectedPropertyDetails.currentOwner.phoneNumber && (
                          <div className="info-item">
                            <span className="info-label">Phone</span>
                            <span className="info-value">{selectedPropertyDetails.currentOwner.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Previous Owner Information */}
                  {selectedPropertyDetails?.previousOwner && (
                    <div className="property-info-section">
                      <h3>Previous Owner Information</h3>
                      <div className="owner-info">
                        <div className="info-item">
                          <span className="info-label">Name</span>
                          <span className="info-value">
                            {selectedPropertyDetails.previousOwner.firstName} {selectedPropertyDetails.previousOwner.lastName}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{selectedPropertyDetails.previousOwner.email}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ownership History */}
                  {selectedPropertyDetails?.ownershipHistory && selectedPropertyDetails.ownershipHistory.length > 0 && (
                    <div className="property-info-section">
                      <h3>Ownership History</h3>
                      <div className="ownership-history">
                        {selectedPropertyDetails.ownershipHistory.map((transfer, index) => (
                          <div key={transfer.transferId} className="ownership-transfer">
                            <div className="transfer-header">
                              <span className="transfer-number">Transfer #{index + 1}</span>
                              <span className="transfer-date">{formatDate(transfer.transferDate)}</span>
                            </div>
                            <div className="transfer-details">
                              <div className="transfer-party">
                                <span className="party-label">Seller:</span>
                                <span className="party-name">
                                  {transfer.seller.firstName} {transfer.seller.lastName}
                                </span>
                              </div>
                              <div className="transfer-party">
                                <span className="party-label">Buyer:</span>
                                <span className="party-name">
                                  {transfer.buyer.firstName} {transfer.buyer.lastName}
                                </span>
                              </div>
                              <div className="transfer-price">
                                <span className="price-label">Price:</span>
                                <span className="price-value">
                                  ৳{transfer.agreedPrice?.toLocaleString()} {transfer.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Building Information */}
                  {selectedPropertyDetails?.buildingInfo && (
                    <div className="property-info-section">
                      <h3>Building Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Building Name</span>
                          <span className="info-value">{selectedPropertyDetails.buildingInfo.name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Building Address</span>
                          <span className="info-value">{selectedPropertyDetails.buildingInfo.address}</span>
                        </div>
                      </div>
                      {selectedPropertyDetails.buildingInfo.amenities && selectedPropertyDetails.buildingInfo.amenities.length > 0 && (
                        <div className="amenities-section">
                          <h4>Amenities</h4>
                          <div className="amenities-list">
                            {selectedPropertyDetails.buildingInfo.amenities.map((amenity, index) => (
                              <span key={index} className="amenity-tag">{amenity}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Property Description */}
                  {selectedPropertyDetails?.basicInfo?.description && (
                    <div className="property-info-section">
                      <h3>Description</h3>
                      <p className="property-description">{selectedPropertyDetails.basicInfo.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseInfo;