import React, { useState, useEffect } from 'react';
import './OwnerRequestsInbox.css';

const OwnerRequestsInbox = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOwnerRequests();
  }, []);

  const fetchOwnerRequests = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        setError('Please log in to view requests');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        setError('Please log in to view requests');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/request-management/owner-requests', {
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
        setFilteredRequests(data.requests);
      } else {
        setError(data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to fetch requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(request => request.status === statusFilter));
    }
  }, [statusFilter, requests]);

  const handleViewDetails = async (requestId) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to view request details');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        alert('Please log in to view request details');
        return;
      }
      const response = await fetch(`http://localhost:5000/api/request-management/${requestId}`, {
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
        setSelectedRequest(data.request);
        setShowDetailModal(true);
      } else {
        alert(data.message || 'Failed to fetch request details');
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      alert('Failed to fetch request details. Please try again.');
    }
  };

  const handleStatusUpdate = async (requestId, newStatus, reason = '') => {
    try {
      setActionLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to update request status');
        setActionLoading(false);
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        alert('Please log in to update request status');
        setActionLoading(false);
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/request-management/owner-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reason: reason
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh the requests list
        fetchOwnerRequests();
        setShowDetailModal(false);
        alert(`Request ${newStatus.toLowerCase()} successfully`);
      } else {
        alert(data.message || 'Failed to update request status');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Failed to update request status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = (requestId) => {
    handleStatusUpdate(requestId, 'Info Requested');
  };

  const handleReject = (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason && reason.trim()) {
      handleStatusUpdate(requestId, 'Rejected', reason.trim());
    }
  };

  const handleApprove = (requestId) => {
    // For now, just change status to Under Review
    // Later this will open advance payment setup
    handleStatusUpdate(requestId, 'Under Review');
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

  const getStatusColor = (status) => {
    const statusColors = {
      'Submitted': '#007bff',
      'Under Review': '#ffc107',
      'Info Requested': '#17a2b8',
      'Approved – Pay Advance': '#28a745',
      'Payment Pending (Stripe)': '#fd7e14',
      'Payment Submitted': '#6f42c1',
      'Paid/Completed': '#28a745',
      'Rejected': '#dc3545',
      'Canceled': '#6c757d',
      'Expired': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const statusOptions = [
    'All',
    'Submitted',
    'Under Review',
    'Info Requested',
    'Approved – Pay Advance',
    'Payment Pending (Stripe)',
    'Payment Submitted',
    'Paid/Completed',
    'Rejected',
    'Canceled',
    'Expired'
  ];

  if (loading) {
    return (
      <div className="owner-requests-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-requests-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchOwnerRequests} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-requests-container">
      <div className="owner-requests-header">
        <h1>Property Requests Inbox</h1>
        <p>Manage requests for your properties</p>
      </div>

      <div className="requests-filters">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="requests-count">
          Showing {filteredRequests.length} of {requests.length} requests
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <p>No requests found{statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}.</p>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map(request => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="request-id">
                  <strong>#{request.requestId}</strong>
                </div>
                <div 
                  className="request-status"
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {request.status}
                </div>
              </div>
              
              <div className="request-details">
                <div className="detail-row">
                  <span className="label">Property:</span>
                  <span className="value">
                    {request.propertyId?.address}, {request.propertyId?.city}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Tenant:</span>
                  <span className="value">
                    {request.tenantId?.firstName} {request.tenantId?.lastName}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Type:</span>
                  <span className="value">{request.requestType}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Submitted:</span>
                  <span className="value">{formatDate(request.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Last Update:</span>
                  <span className="value">{formatDate(request.updatedAt)}</span>
                </div>
              </div>

              <div className="request-actions">
                <button 
                  onClick={() => handleViewDetails(request._id)}
                  className="action-btn view-btn"
                >
                  View Details
                </button>
                
                {request.status === 'Submitted' && (
                  <>
                    <button 
                      onClick={() => handleRequestInfo(request._id)}
                      className="action-btn info-btn"
                      disabled={actionLoading}
                    >
                      Request Info
                    </button>
                    <button 
                      onClick={() => handleApprove(request._id)}
                      className="action-btn approve-btn"
                      disabled={actionLoading}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(request._id)}
                      className="action-btn reject-btn"
                      disabled={actionLoading}
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {request.status === 'Under Review' && (
                  <>
                    <button 
                      onClick={() => handleRequestInfo(request._id)}
                      className="action-btn info-btn"
                      disabled={actionLoading}
                    >
                      Request Info
                    </button>
                    <button 
                      onClick={() => handleApprove(request._id)}
                      className="action-btn approve-btn"
                      disabled={actionLoading}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(request._id)}
                      className="action-btn reject-btn"
                      disabled={actionLoading}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Details - #{selectedRequest.requestId}</h2>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Property Information</h3>
                <p><strong>Address:</strong> {selectedRequest.propertyId?.address}</p>
                <p><strong>City:</strong> {selectedRequest.propertyId?.city}</p>
                <p><strong>Type:</strong> {selectedRequest.requestType}</p>
              </div>
              
              <div className="detail-section">
                <h3>Tenant Information</h3>
                <p><strong>Name:</strong> {selectedRequest.tenantId?.firstName} {selectedRequest.tenantId?.lastName}</p>
                <p><strong>Email:</strong> {selectedRequest.tenantId?.email}</p>
              </div>
              
              {selectedRequest.payload && (
                <div className="detail-section">
                  <h3>Application Details</h3>
                  {selectedRequest.payload.familyMembers && (
                    <p><strong>Family Members:</strong> {selectedRequest.payload.familyMembers.length}</p>
                  )}
                  {selectedRequest.payload.occupation && (
                    <p><strong>Occupation:</strong> {selectedRequest.payload.occupation}</p>
                  )}
                  {selectedRequest.payload.letterToOwner && (
                    <div>
                      <strong>Letter to Owner:</strong>
                      <p className="letter-content">{selectedRequest.payload.letterToOwner}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="detail-section">
                <h3>Timeline</h3>
                <div className="timeline">
                  {selectedRequest.timeline?.map((event, index) => (
                    <div key={index} className="timeline-event">
                      <div className="timeline-date">{formatDate(event.timestamp)}</div>
                      <div className="timeline-content">
                        <strong>{event.event}</strong>
                        {event.note && <p>{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerRequestsInbox;