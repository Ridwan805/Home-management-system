import React, { useState, useEffect } from 'react';
import SidebarNav from './SidebarNav';
import OwnerProfile from './OwnerProfile';
import API from '../../config/api';

import './OwnerDashboard.css';
import { useNavigate } from 'react-router-dom';

const OwnerDashboard = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) {
      setIsOwner(false);
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (user.role === 'Owner') {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch {
      setIsOwner(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner === false) return;
    
    const getAuthToken = () => {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) return null;
      try {
        const user = JSON.parse(userData);
        return user.token;
      } catch (e) {
        return null;
      }
    };

    const fetchOwnerProperties = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          localStorage.removeItem('dwellSyncUser');
          window.location.href = '/login';
          throw new Error('Session expired or invalid. Please log in again.');
        }
        const response = await fetch(API.getUrl(API.endpoints.userProperties), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch properties');
        }
        const data = await response.json();
        console.log('Raw response data:', data);
        
        // Handle the response structure from the backend
        let propertiesArray;
        if (data.success && Array.isArray(data.properties)) {
          propertiesArray = data.properties;
        } else if (Array.isArray(data)) {
          propertiesArray = data;
        } else {
          throw new Error('Invalid data received from server');
        }
        
        console.log('Properties fetched:', propertiesArray.length);
        setProperties(propertiesArray);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchOwnerRequests = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const response = await fetch(API.getUrl(API.endpoints.ownerRequests), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRequests(data.requests.slice(0, 5)); // Show only recent 5 requests
          }
        }
      } catch (err) {
        console.error('Error fetching requests:', err);
      }
    };

    if (isOwner) {
      fetchOwnerProperties();
      fetchOwnerRequests();
    }
  }, [isOwner]);

  const handleRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('dwellSyncUser') ? JSON.parse(localStorage.getItem('dwellSyncUser')).token : null;
      if (!token) return;

      const response = await fetch(API.getUrl(API.endpoints.requestStatus(requestId)), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action === 'accept' ? 'Approved' : 'Rejected' })
      });

      if (response.ok) {
        // Refresh requests
        const requestsResponse = await fetch(API.getUrl(API.endpoints.ownerRequests), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (requestsResponse.ok) {
          const data = await requestsResponse.json();
          if (data.success) {
            setRequests(data.requests.slice(0, 5));
          }
        }
      }
    } catch (err) {
      console.error('Error updating request:', err);
    }
  };

  if (isOwner === false) {
    return null;
  }

  return (
    <div className="owner-dashboard">
      <SidebarNav activeSection={activeSection} setActiveSection={key => {
        if (key === 'profile') setActiveSection('profile');
        else if (key === 'create-listing') navigate('/create-listing');
        else if (key === 'property-details') navigate('/property-details');
        else if (key === 'tenant-info') navigate('/tenant-info');
        else if (key === 'security-guard-info') navigate('/security-guard-info');
        else if (key === 'request-info') navigate('/request-info');
        else if (key === 'payments') navigate('/payments');
        else if (key === 'maintenance-reports') navigate('/maintenance-reports');
      }} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeSection === 'profile' && (
            <>
              <OwnerProfile />

              <div className="dashboard-grid">
                {/* Top Properties Section */}
                <section className="dashboard-section properties-section">
                  <div className="section-header">
                    <h2>Your Top Properties</h2>
                    {properties.length > 3 && (
                      <button 
                        className="view-all-btn"
                        onClick={() => navigate('/property-details')}
                      >
                        View All Properties
                      </button>
                    )}
                  </div>
                  <div className="properties-grid">
                    {loading ? (
                      <div className="loading-state">Loading properties...</div>
                    ) : error ? (
                      <div className="error-state">{error}</div>
                    ) : properties.length > 0 ? (
                      // Show only top 3 properties
                      properties.slice(0, 3).map(property => (
                        <div key={property._id} className="property-card">
                          <div className="property-image">
                            {property.images?.length > 0 ? (
                              <img src={`${API.baseUrl}${property.images[0]}`} alt="Property" />
                            ) : (
                              <div className="property-placeholder">No Image Available</div>
                            )}
                            <span className={`status-badge ${property.status?.toLowerCase()}`}>
                              {property.status}
                            </span>
                          </div>
                          <div className="property-details">
                            <h3>৳{property.price?.toLocaleString()}</h3>
                            <p className="property-address">{property.address}</p>
                            <div className="property-specs">
                              <span>🛏️ {property.bedrooms} bd</span>
                              <span>🚿 {property.bathrooms} ba</span>
                              <span>📏 {property.squareFootage} sqft</span>
                            </div>
                            <span className="listing-type">{property.listingType}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-properties">
                        <p>No listing by this user.</p>
                        <button 
                          className="add-property-btn"
                          onClick={() => navigate('/create-listing')}
                        >
                          Add Your First Property
                        </button>
                      </div>
                    )}
                  </div>
                </section>
                {/* Requests Section */}
                <section className="dashboard-section requests-section">
                  <div className="section-header">
                    <h2>Recent Requests</h2>
                    {requests.length > 3 && (
                      <button 
                        className="view-all-btn"
                        onClick={() => navigate('/request-info')}
                      >
                        View All Requests
                      </button>
                    )}
                  </div>
                  <div className="requests-list">
                    {requests.length > 0 ? (
                      requests.map(request => (
                        <div key={request._id} className="request-card">
                          <div className="request-info">
                            <span className={`request-type ${request.requestType?.toLowerCase()}`}>
                              {request.requestType}
                            </span>
                            <p className="request-property">
                              {request.propertyId?.address || 'Property Address'}
                            </p>
                            <p className="request-tenant">
                              From: {request.tenantId?.name || 'Tenant'}
                            </p>
                            <p className="request-date">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                            <span className={`request-status ${request.status?.toLowerCase()}`}>
                              {request.status}
                            </span>
                          </div>
                          {request.status === 'Pending' && (
                            <div className="request-actions">
                              <button 
                                className="accept-btn"
                                onClick={() => handleRequestAction(request._id, 'accept')}
                              >
                                Accept
                              </button>
                              <button 
                                className="decline-btn"
                                onClick={() => handleRequestAction(request._id, 'decline')}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-requests">
                        No pending requests
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;