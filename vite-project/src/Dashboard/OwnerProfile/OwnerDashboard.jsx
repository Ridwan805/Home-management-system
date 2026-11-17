import React, { useState, useEffect } from 'react';
import OwnerProfile from './OwnerProfile';
import API from '../../config/api';
import PropertyCard from '../../components/PropertyCard';
import { PropertyCardSkeleton, DashboardCardSkeleton } from '../../components/loading';
import { Building2, CheckCircle2, Clock, KeyRound } from 'lucide-react';

import './OwnerDashboard.css';
import { useNavigate } from 'react-router-dom';

const OwnerDashboard = () => {
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
      if (user.role === 'Owner' || user.role === 'Resident / Property Owner' || (user.role && user.role.includes('Resident'))) {
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
      } catch {
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
    <>
      <OwnerProfile />

      {/* Quick Overview Metric Stats Bar */}
              <div className="dashboard-stats-grid">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <DashboardCardSkeleton key={`stat-skeleton-${i}`} />
                  ))
                ) : (
                  <>
                    <div className="stat-card">
                      <div className="stat-icon-wrap blue">
                        <Building2 size={24} color="#2563EB" />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label">Total Properties</span>
                        <span className="stat-value">{properties.length}</span>
                        <span className="stat-subtext">Active in your portfolio</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrap emerald">
                        <CheckCircle2 size={24} color="#059669" />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label">Available Listings</span>
                        <span className="stat-value">
                          {properties.filter(p => (p.effectiveAvailability || p.status) === 'Available').length}
                        </span>
                        <span className="stat-subtext">Open for applications</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrap amber">
                        <Clock size={24} color="#D97706" />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label">Processing Reservations</span>
                        <span className="stat-value">
                          {properties.filter(p => ['Processing', 'Reserved'].includes(p.effectiveAvailability || p.status)).length}
                        </span>
                        <span className="stat-subtext">Approved offers awaiting payment</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon-wrap" style={{ background: '#F1F5F9' }}>
                        <KeyRound size={24} color="#0F172A" />
                      </div>
                      <div className="stat-details">
                        <span className="stat-label">Active Rented Units</span>
                        <span className="stat-value">
                          {properties.filter(p => (p.effectiveAvailability || p.status) === 'Rented').length}
                        </span>
                        <span className="stat-subtext">Occupied under active lease</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="dashboard-grid">
                {/* Top Properties Section */}
                <section className="dashboard-section properties-section">
                  <div className="section-header">
                    <div className="section-title-wrap">
                      <h2>Your Top Properties</h2>
                      <span className="section-count-badge">{loading ? '...' : `${properties.length} Total`}</span>
                    </div>
                    {properties.length > 3 && (
                      <button 
                        className="view-all-btn"
                        onClick={() => navigate('/property-details')}
                      >
                        View All Properties ↗
                      </button>
                    )}
                  </div>
                  <div className="properties-grid">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <PropertyCardSkeleton key={`top-prop-skeleton-${i}`} />
                      ))
                    ) : error ? (
                      <div className="error-state">{error}</div>
                    ) : properties.length > 0 ? (
                      // Show only top 3 properties with modern card component
                      properties.slice(0, 3).map(property => (
                        <PropertyCard 
                          key={property._id} 
                          property={property} 
                          onViewDetails={() => navigate(`/properties/${property._id}`)}
                          onEdit={() => navigate('/property-details')}
                        />
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
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={`req-skeleton-${i}`} style={{ padding: '1rem', background: '#ffffff', borderRadius: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ height: '0.875rem', width: '35%', background: '#e2e8f0', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
                          <div style={{ height: '0.75rem', width: '60%', background: '#f1f5f9', borderRadius: '0.25rem' }} />
                        </div>
                      ))
                    ) : requests.length > 0 ? (
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
  );
};

export default OwnerDashboard;