import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaCheck, FaTimes, FaHourglass, FaMapMarkerAlt, FaHome, FaMoneyBillWave, FaUser } from 'react-icons/fa';

const PendingProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchPendingProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to view this page');
        setLoading(false);
        return;
      }
      
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/properties/pending`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setProperties(res.data);
    } catch (err) {
      console.error('Error fetching pending properties:', err);
      setError('Failed to load pending properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingProperties();
  }, [fetchPendingProperties]);

  const handleApprove = async (id) => {
    try {
      setActionInProgress(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/properties/${id}/approve`, 
        { status: 'approved' }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
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
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      
      if (!user.token) {
        setError('You must be logged in to perform this action');
        return;
      }
      
      await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/admin/properties/${id}/approve`, 
        { status: 'rejected' }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
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
        <div className="loading-spinner">Loading pending properties...</div>
      ) : error ? (
        <div className="error-message" style={{ backgroundColor: '#fee2e2', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          Failed to load pending properties. Please try again later.
          <button 
            className="retry-button" 
            onClick={fetchPendingProperties}
            style={{ 
              marginTop: '15px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '8px 20px', 
              borderRadius: '4px', 
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
              <div key={property._id} className={`property-card ${actionInProgress ? 'action-in-progress' : ''}`}>
                <div className="property-header">
                  <h3>{property.title}</h3>
                  <div className="property-status">
                    <FaHourglass className="status-icon" />
                    <span className="status-pending">Pending Review</span>
                  </div>
                </div>
                
                <div className="property-details">
                  <div className="property-detail-item">
                    <FaUser className="detail-icon" />
                    <p><strong>Owner:</strong> {property.owner?.name || 'Unknown'}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaHome className="detail-icon" />
                    <p><strong>Type:</strong> {property.type}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaMapMarkerAlt className="detail-icon" />
                    <p><strong>Location:</strong> {property.location}</p>
                  </div>
                  
                  <div className="property-detail-item">
                    <FaMoneyBillWave className="detail-icon" />
                    <p><strong>Price:</strong> ${property.price}</p>
                  </div>
                </div>
                
                <div className="property-description">
                  <p><strong>Description:</strong></p>
                  <p>{property.description.substring(0, 150)}...</p>
                </div>
                
                <div className="property-actions">
                  <button 
                    onClick={() => handleApprove(property._id)} 
                    className="approve-btn"
                    disabled={actionInProgress}
                  >
                    <FaCheck className="btn-icon" /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(property._id)} 
                    className="reject-btn"
                    disabled={actionInProgress}
                  >
                    <FaTimes className="btn-icon" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PendingProperties;
