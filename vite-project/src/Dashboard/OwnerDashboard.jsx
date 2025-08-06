import React, { useState, useEffect } from 'react';
import SidebarNav from './components/SidebarNav';
import OwnerProfile from './components/OwnerProfile';
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
    const fetchOwnerProperties = async () => {
      try {
        setLoading(true);
        const userData = localStorage.getItem('dwellSyncUser');
        let token = null;
        if (userData) {
          try {
            const user = JSON.parse(userData);
            token = user.token;
          } catch (e) {
            token = null;
          }
        }
        if (!token) {
          localStorage.removeItem('dwellSyncUser');
          window.location.href = '/login';
          throw new Error('Session expired or invalid. Please log in again.');
        }
        const response = await fetch('http://localhost:5000/api/Properties/user', {
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
        if (!Array.isArray(data)) {
          throw new Error('Invalid data received from server');
        }
        setProperties(data.slice(0, 2));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    if (isOwner) fetchOwnerProperties();
  }, [isOwner]);

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
      }} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeSection === 'profile' && (
            <>
              <OwnerProfile />
              <div className="dashboard-grid">
                {/* Top Properties Section */}
                <section className="dashboard-section properties-section">
                  <h2>Your Top Properties</h2>
                  <div className="properties-grid">
                    {loading ? (
                      <div className="loading-state">Loading properties...</div>
                    ) : error ? (
                      <div className="error-state">{error}</div>
                    ) : properties.length > 0 ? (
                      properties.map(property => (
                        <div key={property._id} className="property-card">
                          <div className="property-image">
                            {property.images?.length > 0 ? (
                              <img src={`http://localhost:5000${property.images[0]}`} alt="Property" />
                            ) : (
                              <div className="property-placeholder">No Image Available</div>
                            )}
                            <span className={`status-badge ${property.status?.toLowerCase()}`}>
                              {property.status}
                            </span>
                          </div>
                          <div className="property-details">
                            <h3>${property.price?.toLocaleString()}</h3>
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
                  <h2>Recent Requests</h2>
                  <div className="requests-list">
                    {requests.length > 0 ? (
                      requests.map(request => (
                        <div key={request._id} className="request-card">
                          <div className="request-info">
                            <span className={`request-type ${request.type?.toLowerCase()}`}>
                              {request.type}
                            </span>
                            <p className="request-property">{request.propertyAddress}</p>
                            <p className="request-date">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="request-actions">
                            <button className="accept-btn">Accept</button>
                            <button className="decline-btn">Decline</button>
                          </div>
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