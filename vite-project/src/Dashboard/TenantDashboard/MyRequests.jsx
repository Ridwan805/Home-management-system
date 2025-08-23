import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MyRequests.css';
import { authenticatedFetch } from '../../config/api.js';
import API from '../../config/api.js';
import { FaDownload, FaUpload, FaReceipt } from 'react-icons/fa';

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({});
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentProofForm, setPaymentProofForm] = useState({
    proofFile: null,
    note: ''
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const statusFilters = [
    { key: 'all', label: 'All Requests' },
    { key: 'Submitted', label: 'Submitted' },
    { key: 'Under Review', label: 'Under Review' },
    { key: 'Info Requested', label: 'Info Requested' },
    { key: 'Approved – Pay Advance', label: 'Approved' },
    { key: 'Payment Submitted', label: 'Payment Submitted' },
    { key: 'AdvancePaid', label: 'Advance Paid' },
    { key: 'Paid/Completed', label: 'Completed' },
    { key: 'Rejected', label: 'Rejected' },
    { key: 'Canceled', label: 'Canceled' }
  ];

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [selectedStatus]);

  const navigate = useNavigate();



  const fetchRequests = async () => {
    try {
      setLoading(true);
      const statusParam = selectedStatus !== 'all' ? `?status=${encodeURIComponent(selectedStatus)}` : '';
      
      const data = await authenticatedFetch(
        `http://localhost:5001/api/request-management/my-requests${statusParam}`,
        { method: 'GET' },
        navigate
      );
      
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
      console.log('Fetching request stats...');
      const data = await authenticatedFetch(
        'http://localhost:5001/api/requests/stats',
        { method: 'GET' },
        navigate
      );
      
      console.log('Stats received:', data);
      setStats(data.statusBreakdown || {});
    } catch (err) {
      console.error('Error fetching stats:', err);
      // We don't set an error state here as this is a secondary feature
      // and we don't want to block the main functionality
      // Initialize with empty stats to prevent UI issues
      setStats({});
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Paid/Completed':
      case 'AdvancePaid':
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

      const response = await fetch(`http://localhost:5001/api/request-management/my-requests/${requestId}/cancel`, {
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
      const response = await fetch(`http://localhost:5001/api/stripe/create-payment-session/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originUrl: window.location.origin
        })
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', response.headers);

      const data = await response.json();
      console.log('🔍 Full response data:', data);

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, data);
        throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
      }
      
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
      console.error('❌ Error details:', err.message, err.stack);
      alert('Failed to initiate payment. Please try again. Error: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle receipt download
  const handleGetReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        alert('Please log in to view receipt');
        return;
      }

      const response = await fetch(`http://localhost:5001/api/stripe/receipt/${paymentId}`, {
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
        setPaymentReceipt(data);
        
        // If there's a direct receipt URL from Stripe, open it in a new tab
        if (data.receiptUrl) {
          window.open(data.receiptUrl, '_blank');
        } else if (data.receiptData) {
          // Otherwise, display the receipt data in a modal
          setShowReceiptModal(true);
        }
      } else {
        alert(data.message || 'Failed to retrieve receipt');
      }
    } catch (err) {
      console.error('Error retrieving receipt:', err);
      alert('Failed to retrieve receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
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

      const uploadResponse = await fetch('http://localhost:5001/api/upload', {
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
      const proofResponse = await fetch(`http://localhost:5001/api/requests/${selectedRequest.requestId}/payment-proof`, {
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
                    src={`${API.baseUrl}${request.propertyId.images[0]}`} 
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
                    src={`${API.baseUrl}${selectedRequest.propertyId.images[0]}`} 
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
                        <span className="info-value">{selectedRequest.advancePayment.amount?.toLocaleString()} {selectedRequest.advancePayment.currency || 'BDT'}</span>
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
                        <FaUpload /> Upload Payment Proof
                      </button>
                    </>
                  )}
                  
                  {(selectedRequest.status === 'Advance Payment Received' || selectedRequest.status === 'AdvancePaid') && (
                    <button 
                      className="download-receipt-btn"
                      onClick={() => handleGetReceipt(selectedRequest.advancePayment?.paymentId)}
                      disabled={receiptLoading}
                    >
                      {receiptLoading ? 'Loading...' : <><FaReceipt /> Download Receipt</>}
                    </button>
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
      
      {/* Receipt Modal */}
      {showReceiptModal && paymentReceipt && (
        <div className="modal-overlay">
          <div className="modal receipt-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Payment Receipt</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setShowReceiptModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body receipt-body">
                <div className="receipt-container">
                  <div className="receipt-header">
                    <h2>Payment Receipt</h2>
                    <p className="receipt-id">Receipt ID: {paymentReceipt.receiptData?.paymentId || 'N/A'}</p>
                  </div>
                  
                  <div className="receipt-details">
                    <div className="receipt-row">
                      <span className="receipt-label">Property:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.propertyTitle || 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Address:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.propertyAddress || 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Amount:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.currency || '৳'} {paymentReceipt.receiptData?.amount?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Payment Date:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.paymentDate ? formatDate(paymentReceipt.receiptData.paymentDate) : 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Payment Method:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.paymentMethod || 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Status:</span>
                      <span className="receipt-value receipt-status">{paymentReceipt.receiptData?.paymentStatus || 'N/A'}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">Transaction ID:</span>
                      <span className="receipt-value">{paymentReceipt.receiptData?.transactionId || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="receipt-footer">
                    <p>Thank you for your payment!</p>
                    <p className="receipt-timestamp">Generated on: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="close-btn" 
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
                {paymentReceipt.receiptUrl && (
                  <button 
                    type="button" 
                    className="download-btn" 
                    onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                  >
                    <FaDownload /> Download Official Receipt
                  </button>
                )}
                <button 
                  type="button" 
                  className="print-btn" 
                  onClick={() => window.print()}
                >
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;