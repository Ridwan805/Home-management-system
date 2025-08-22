import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyRequests.css';

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({});
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentProofForm, setPaymentProofForm] = useState({
    proofFile: null,
    note: ''
  });
  const [uploadLoading, setUploadLoading] = useState(false);

  const statusFilters = [
    { key: 'all', label: 'All Requests' },
    { key: 'Submitted', label: 'Submitted' },
    { key: 'Under Review', label: 'Under Review' },
    { key: 'Info Requested', label: 'Info Requested' },
    { key: 'Approved – Pay Advance', label: 'Approved' },
    { key: 'Payment Submitted', label: 'Payment Submitted' },
    { key: 'Paid/Completed', label: 'Completed' },
    { key: 'Rejected', label: 'Rejected' },
    { key: 'Canceled', label: 'Canceled' }
  ];

  useEffect(() => {
    fetchRequests();
    fetchStats();
    
    // Handle payment status from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      alert('Payment completed successfully! Your request is being processed.');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      alert('Payment was cancelled. You can try again anytime.');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [selectedStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        setError('Authentication required');
        return;
      }

      const statusParam = selectedStatus !== 'all' ? `?status=${encodeURIComponent(selectedStatus)}` : '';
      const response = await fetch(`http://localhost:5000/api/request-management/my-requests${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) return;

      const response = await fetch('http://localhost:5000/api/requests/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // Note: If stats endpoint doesn't work, we can switch to using the request-management endpoint

      if (response.ok) {
        const data = await response.json();
        setStats(data.statusBreakdown || {});
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Paid/Completed':
      case 'Approved – Pay Advance':
        return 'status-approved';
      case 'Submitted':
      case 'Under Review':
      case 'Payment Submitted':
        return 'status-pending';
      case 'Rejected':
      case 'Canceled':
      case 'Expired':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      const response = await fetch(`http://localhost:5000/api/request-management/my-requests/${requestId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: 'Request canceled by tenant'
        })
      });

      if (response.ok) {
        fetchRequests();
        fetchStats();
        setShowModal(false);
      } else {
        throw new Error('Failed to cancel request');
      }
    } catch (err) {
      console.error('Error canceling request:', err);
      alert('Failed to cancel request');
    }
  };

  const handlePayNow = async (requestId) => {
    if (paymentLoading) return; // Prevent double clicks
    
    try {
      setPaymentLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        alert('Please log in to make payment');
        return;
      }

      console.log('🔄 Creating payment session for request:', requestId);

      // Create Stripe payment session
      const response = await fetch(`http://localhost:5000/api/stripe/create-payment-session/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('💳 Payment session response:', data);
      
      if (data.success && data.url) {
        console.log('✅ Redirecting to Stripe checkout:', data.url);
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('❌ Payment session creation failed:', data);
        alert(data.message || 'Failed to create payment session');
      }
    } catch (err) {
      console.error('❌ Error creating payment session:', err);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUploadPaymentProof = () => {
    setShowPaymentProofModal(true);
  };

  const handlePaymentProofSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentProofForm.proofFile) {
      alert('Please select a payment proof file');
      return;
    }

    try {
      setUploadLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        alert('Please log in to upload payment proof');
        return;
      }

      // First upload the file
      const formData = new FormData();
      formData.append('file', paymentProofForm.proofFile);
      formData.append('type', 'payment-proof');

      const uploadResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      
      // Then submit payment proof
      const proofResponse = await fetch(`http://localhost:5000/api/requests/${selectedRequest.requestId}/payment-proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proofUrl: uploadData.fileUrl,
          note: paymentProofForm.note
        })
      });

      if (!proofResponse.ok) {
        throw new Error('Failed to submit payment proof');
      }

      alert('Payment proof submitted successfully! The owner will review it shortly.');
      setShowPaymentProofModal(false);
      setPaymentProofForm({ proofFile: null, note: '' });
      fetchRequests(); // Refresh the requests list
      
    } catch (err) {
      console.error('Error submitting payment proof:', err);
      alert('Failed to submit payment proof. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only JPG, PNG, or PDF files');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setPaymentProofForm(prev => ({ ...prev, proofFile: file }));
    }
  };

  if (loading) {
    return (
      <div className="my-requests">
        <h2 className="section-title">My Requests</h2>
        <div className="loading-message">Loading your requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-requests">
        <h2 className="section-title">My Requests</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-requests">
      <h2 className="section-title">My Requests</h2>
      
      {/* Stats Summary */}
      {Object.keys(stats).length > 0 && (
        <div className="stats-summary">
          <div className="stats-grid">
            {Object.entries(stats).map(([status, count]) => (
              <div key={status} className="stat-item">
                <div className="stat-count">{count}</div>
                <div className="stat-label">{status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="status-filters">
          {statusFilters.map(filter => (
            <button
              key={filter.key}
              className={`filter-btn ${selectedStatus === filter.key ? 'active' : ''}`}
              onClick={() => setSelectedStatus(filter.key)}
            >
              {filter.label}
              {stats[filter.key] && filter.key !== 'all' && (
                <span className="filter-count"> ({stats[filter.key]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <div className="empty-requests">
          <p>No requests found</p>
          <p>Start by browsing properties and submitting rental or purchase requests.</p>
          <Link to="/properties" className="browse-properties-btn">Browse Properties</Link>
        </div>
      ) : (
        <div className="request-list">
          {requests.map(request => (
            <div key={request._id} className="request-card">
              <div className="request-image">
                {request.propertyId?.images && request.propertyId.images.length > 0 ? (
                  <img 
                    src={`http://localhost:5000/${request.propertyId.images[0]}`} 
                    alt={request.propertyId.address}
                  />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>
              
              <div className="request-content">
                <div className="request-header">
                  <div>
                    <h3 className="property-price">
                      ৳{request.propertyId?.price?.toLocaleString()}
                      {request.requestType === 'Rent' && <span className="rent-period">/month</span>}
                    </h3>
                  </div>
                  <span className={`request-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                
                <p className="property-address">{request.propertyId?.address}</p>
                
                <div className="property-features">
                  <span>{request.propertyId?.bedrooms} beds</span>
                  <span>{request.propertyId?.bathrooms} baths</span>
                  <span>{request.propertyId?.squareFootage} sqft</span>
                  <span>{request.requestType}</span>
                </div>
                
                <div className="request-dates">
                  <div className="date-item">
                    <span className="date-label">Submitted</span>
                    <span className="date-value">{formatDate(request.createdAt)}</span>
                  </div>
                  <div className="date-item">
                    <span className="date-label">Request ID</span>
                    <span className="date-value">{request.requestId}</span>
                  </div>
                </div>
                
                <div className="request-actions">
                  <button 
                    className="view-details-btn"
                    onClick={() => handleViewDetails(request)}
                  >
                    View Details
                  </button>
                  {['Submitted', 'Under Review', 'Info Requested'].includes(request.status) && (
                    <button 
                      className="cancel-btn"
                      onClick={() => handleCancelRequest(request.requestId)}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="request-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="request-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details - {selectedRequest.requestId}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {selectedRequest.propertyId?.images && selectedRequest.propertyId.images.length > 0 && (
                <div className="modal-property-image">
                  <img 
                    src={`http://localhost:5000/${selectedRequest.propertyId.images[0]}`} 
                    alt={selectedRequest.propertyId.address}
                  />
                </div>
              )}
              
              <div className="modal-property-details">
                <div className="modal-status-header">
                  <h4>{selectedRequest.propertyId?.address}</h4>
                  <span className={`request-status ${getStatusClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                
                <div className="property-info-grid">
                  <div className="info-item">
                    <span className="info-label">Price</span>
                    <span className="info-value">
                      ৳{selectedRequest.propertyId?.price?.toLocaleString()}
                      {selectedRequest.requestType === 'Rent' && '/month'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Request Type</span>
                    <span className="info-value">{selectedRequest.requestType}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Submitted Date</span>
                    <span className="info-value">{formatDate(selectedRequest.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated</span>
                    <span className="info-value">{formatDate(selectedRequest.updatedAt)}</span>
                  </div>
                </div>
                
                {selectedRequest.payload?.applicationLetter && (
                  <div className="request-notes">
                    <h4>Application Letter</h4>
                    <p>{selectedRequest.payload.applicationLetter}</p>
                  </div>
                )}
                
                {selectedRequest.advancePayment && (
                  <div className="advance-payment-info">
                    <h4>Advance Payment Details</h4>
                    <div className="property-info-grid">
                      <div className="info-item">
                        <span className="info-label">Amount</span>
                        <span className="info-value">${selectedRequest.advancePayment.amount?.toLocaleString()}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Due Date</span>
                        <span className="info-value">{formatDate(selectedRequest.advancePayment.dueDate)}</span>
                      </div>
                      {selectedRequest.advancePayment.instructions && (
                        <div className="info-item">
                          <span className="info-label">Instructions</span>
                          <span className="info-value">{selectedRequest.advancePayment.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="modal-actions">
                  <button className="close-btn" onClick={() => setShowModal(false)}>Close</button>
                  {['Submitted', 'Under Review', 'Info Requested'].includes(selectedRequest.status) && (
                    <button 
                      className="cancel-btn"
                      onClick={() => handleCancelRequest(selectedRequest.requestId)}
                    >
                      Cancel Request
                    </button>
                  )}
                  {selectedRequest.status === 'Approved – Pay Advance' && selectedRequest.advancePayment && (
                    <>
                      <button 
                        className="pay-btn"
                        onClick={() => handlePayNow(selectedRequest._id)}
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? 'Processing...' : `Pay Online (৳${selectedRequest.advancePayment.amount})`}
                      </button>
                      <button 
                        className="upload-proof-btn"
                        onClick={handleUploadPaymentProof}
                      >
                        Upload Payment Proof
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Proof Upload Modal */}
      {showPaymentProofModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Upload Payment Proof</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setShowPaymentProofModal(false)}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handlePaymentProofSubmit}>
                <div className="modal-body">
                  <div className="payment-proof-info">
                    <h4>Payment Details</h4>
                    <p><strong>Amount:</strong> ৳{selectedRequest?.advancePayment?.amount}</p>
                    <p><strong>Due Date:</strong> {formatDate(selectedRequest?.advancePayment?.dueDate)}</p>
                    {selectedRequest?.advancePayment?.instructions && (
                      <p><strong>Instructions:</strong> {selectedRequest.advancePayment.instructions}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="proofFile">Payment Proof File *</label>
                    <input
                      type="file"
                      id="proofFile"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      required
                    />
                    <small className="file-info">
                      Accepted formats: JPG, PNG, PDF (Max 5MB)
                    </small>
                    {paymentProofForm.proofFile && (
                      <div className="selected-file">
                        Selected: {paymentProofForm.proofFile.name}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="proofNote">Additional Note (Optional)</label>
                    <textarea
                      id="proofNote"
                      value={paymentProofForm.note}
                      onChange={(e) => setPaymentProofForm(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="Add any additional information about the payment..."
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="close-btn" 
                    onClick={() => setShowPaymentProofModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-proof-btn"
                    disabled={uploadLoading || !paymentProofForm.proofFile}
                  >
                    {uploadLoading ? 'Uploading...' : 'Submit Payment Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;