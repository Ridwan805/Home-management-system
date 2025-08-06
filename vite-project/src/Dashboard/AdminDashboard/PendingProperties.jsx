import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PendingProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPendingProperties = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
        const res = await axios.get('http://localhost:5000/api/admin/properties/pending', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setProperties(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching pending properties:', err);
        setError('Failed to load pending properties. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchPendingProperties();
  }, []);

  const handleApprove = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.put(`http://localhost:5000/api/admin/properties/${id}/approve`, 
        { status: 'approved' }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setProperties(properties.filter(property => property._id !== id));
    } catch (err) {
      console.error('Error approving property:', err);
      setError('Failed to approve property. Please try again.');
    }
  };

  const handleReject = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      await axios.put(`http://localhost:5000/api/admin/properties/${id}/approve`, 
        { status: 'rejected' }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setProperties(properties.filter(property => property._id !== id));
    } catch (err) {
      console.error('Error rejecting property:', err);
      setError('Failed to reject property. Please try again.');
    }
  };

  return (
    <div className="pending-properties">
      <h2>Pending Properties</h2>
      {loading ? (
        <div className="loading-spinner">Loading pending properties...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="pending-properties-list">
          {properties.length === 0 ? (
            <p className="no-properties">No pending properties found.</p>
          ) : (
            properties.map((property) => (
              <div key={property._id} className="property-card">
                <h3>{property.title}</h3>
                <p><strong>Owner:</strong> {property.owner?.name || 'Unknown'}</p>
                <p><strong>Type:</strong> {property.type}</p>
                <p><strong>Location:</strong> {property.location}</p>
                <p><strong>Price:</strong> ${property.price}</p>
                <p><strong>Description:</strong> {property.description.substring(0, 100)}...</p>
                <div className="property-actions">
                  <button onClick={() => handleApprove(property._id)} className="approve-btn">
                    Approve
                  </button>
                  <button onClick={() => handleReject(property._id)} className="reject-btn">
                    Reject
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
