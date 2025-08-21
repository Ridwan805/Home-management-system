import React, { useState, useEffect } from 'react';
import './TenantMyRequests.css';

const TenantMyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const statusOptions = [
    'All',
    'Submitted',
    'Under Review',
    'Info Requested',
    'Approved – Pay Advance',
    'Payment Submitted',
    'Paid/Completed',
    'Rejected',
    'Canceled',
    'Expired'
  ];

  const statusColors = {
    'Submitted': '#3498db',
    'Under Review': '#f39c12',
    'Info Requested': '#e74c3c',
    'Approved – Pay Advance': '#27ae60',
    'Payment Submitted': '#9b59b6',
    'Paid/Completed': '#2ecc71',
    'Rejected': '#e74c3c',
    'Canceled': '#95a5a6',
    'Expired': '#e67e22'
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter]);

  const fetchMyRequests = async () => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        setError('Please log in to view your requests');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        setError('Please log in to view your requests');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/request-management/my-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests);
      } else {
        setError(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    if (statusFilter === 'All') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(request => request.status === statusFilter));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskRequestId = (requestId) => {
    if (!requestId || requestId.length < 4) return requestId;
    return requestId.slice(0, -4) + '****';
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetail(true);
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to cancel requests');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        alert('Please log in to cancel requests');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/request-management/my-requests/${requestId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh the requests list
        fetchMyRequests();
        alert('Request canceled successfully');
      } else {
        alert(data.message || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error canceling request:', error);
      alert('Failed to cancel request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="tenant-requests-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tenant-requests-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchMyRequests} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-requests-container">
      <div className="requests-header">
        <h2>My Requests</h2>
        <div className="requests-summary">
          <span className="total-count">{requests.length} Total Requests</span>
        </div>
      </div>

      <div className="requests-filters">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="results-count">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <div className="no-requests-icon">📋</div>
          <h3>No Requests Found</h3>
          <p>
            {statusFilter === 'All' 
              ? "You haven't submitted any requests yet." 
              : `No requests with status "${statusFilter}" found.`
            }
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map(request => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="request-id">
                  <strong>Request ID:</strong> {maskRequestId(request.requestId)}
                </div>
                <div 
                  className="request-status"
                  style={{ 
                    backgroundColor: statusColors[request.status] || '#95a5a6',
                    color: 'white'
                  }}
                >
                  {request.status}
                </div>
              </div>

              <div className="request-details">
                <div className="property-info">
                  <h4>{request.propertyId?.address || 'Property Address'}</h4>
                  <p>{request.propertyId?.city}, {request.propertyId?.state}</p>
                </div>
                
                <div className="request-meta">
                  <div className="meta-item">
                    <strong>Type:</strong> {request.requestType}
                  </div>
                  <div className="meta-item">
                    <strong>Submitted:</strong> {formatDate(request.createdAt)}
                  </div>
                  <div className="meta-item">
                    <strong>Last Update:</strong> {formatDate(request.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="request-actions">
                <button 
                  onClick={() => handleViewDetails(request)}
                  className="btn-primary"
                >
                  View Details
                </button>
                
                {request.status === 'Submitted' && (
                  <button 
                    onClick={() => handleCancelRequest(request._id)}
                    className="btn-danger"
                  >
                    Cancel Request
                  </button>
                )}
                
                {request.status === 'Approved – Pay Advance' && (
                  <button 
                    onClick={() => handleViewDetails(request)}
                    className="btn-success"
                  >
                    Pay Advance
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetail && selectedRequest && (
        <div className="request-detail-overlay">
          <div className="request-detail-modal">
            <div className="modal-header">
              <h3>Request Details</h3>
              <button 
                onClick={() => setShowDetail(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Request detail view will be implemented in the next component...</p>
              <div className="request-summary">
                <p><strong>Request ID:</strong> {selectedRequest.requestId}</p>
                <p><strong>Property:</strong> {selectedRequest.propertyId?.address}</p>
                <p><strong>Status:</strong> {selectedRequest.status}</p>
                <p><strong>Type:</strong> {selectedRequest.requestType}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowDetail(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantMyRequests;