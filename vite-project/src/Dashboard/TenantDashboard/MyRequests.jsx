import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MyRequests.css';
import { authenticatedFetch } from '../../config/api.js';
import API from '../../config/api.js';
import { FaDownload, FaUpload, FaReceipt, FaPrint } from 'react-icons/fa';
// TEMPORARILY DISABLED FOR WEBHOOK TESTING
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentStatusIndicator from '../../components/PaymentStatusIndicator';

const MyRequests = () => {

  
  const navigate = useNavigate();
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

  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [ownershipProperty, setOwnershipProperty] = useState(null);

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
  
  // Initial load effect to handle payment redirects and authentication
  useEffect(() => {
  
    
    // Check authentication status first
    const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
    if (!userData || !userData.token) {

      // If user is not authenticated, redirect to login
      navigate('/login');
      return;
    }
    
    // Check for payment success/cancel parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {

      
      // Check if this is a full payment by fetching session details
      checkPaymentTypeAndShowMessage(sessionId);
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh data after successful payment
      setTimeout(() => {
        fetchRequests();
        fetchStats();
      }, 1000); // Small delay to ensure webhook processing
    } else if (paymentStatus === 'cancelled') {

      alert('Payment was cancelled.');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Always fetch requests on initial load
    fetchRequests();
  }, [navigate]);
  
  // REMOVED: Long polling functionality has been removed
  // Webhooks now handle real-time payment status updates automatically

  // Authentication check effect
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
    if (!userData || !userData.token) {

      navigate('/login');
      return;
    }
    
    // Refresh data when authentication is confirmed
    fetchRequests();
    fetchStats();
  }, [navigate]);

  // Note: Removed resetPolling useEffect as it was causing polling to restart constantly

  // Function to check payment type and show appropriate message
  const checkPaymentTypeAndShowMessage = async (sessionId) => {
    try {
  
      
      // Fetch the latest requests to get property information
      const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
      if (!user || !user.token) {
  
        return;
      }
      
      // Add a small delay to allow webhook processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await authenticatedFetch(
        API.getUrl('/api/request-management/my-requests'),
        { method: 'GET' },
        navigate
      );
      

      
      if (response && response.requests) {

        
        // Find the request that was just paid (look for recent full payment)
        const recentlyPaidRequest = response.requests.find(req => {

          
          return (
            req.fullPayment?.status === 'completed' && 
            req.requestType === 'Buy' && 
            req.propertyId?.listingType === 'For Sale' &&
            req.status === 'Paid/Completed'
          );
        });
        

        
        if (recentlyPaidRequest && recentlyPaidRequest.propertyId) {
          // This is a full payment for a property purchase
          const property = recentlyPaidRequest.propertyId;
          const propertyName = property.name || property.address || 'this property';
          

          
          setOwnershipProperty({
            name: propertyName,
            address: property.address,
            price: property.pricing?.sale || property.buyPrice
          });
          setShowOwnershipModal(true);
          

        } else {

          // This is an advance payment or other payment type
          alert('Payment completed successfully!');
        }
      } else {

        // Fallback message
        alert('Payment completed successfully!');
      }
    } catch (error) {
      console.error('❌ Error checking payment type:', error);
      // Fallback message
      alert('Payment completed successfully!');
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      
      
      // Check if user is authenticated
      const user = JSON.parse(localStorage.getItem('dwellSyncUser'));

      

      
      if (!user || !user.token) {
        console.error('❌ MyRequests: No authentication data found');
        setError('Please log in to view your requests');

        navigate('/login');
        return;
      }
      
      const statusParam = selectedStatus !== 'all' ? `?status=${encodeURIComponent(selectedStatus)}` : '';
      const apiUrl = `${API.getUrl('/api/request-management/my-requests')}${statusParam}`;
      

      
      const data = await authenticatedFetch(
        apiUrl,
        { method: 'GET' },
        navigate
      );
      

      

      setRequests(data.requests || []);
      
      if (!data.requests || data.requests.length === 0) {

      }
      
    } catch (err) {
      console.error('❌ MyRequests: Error fetching requests:', err);
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {

      const data = await authenticatedFetch(
        API.getUrl('/api/requests/stats'),
        { method: 'GET' },
        navigate
      );
      

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

  const fetchRequestDetails = async (requestId) => {
    try {
      const data = await authenticatedFetch(
        API.getUrl(`/api/request-management/request/${requestId}`),
        { method: 'GET' },
        navigate
      );
      
      if (data.request) {
        // Update the selected request with fresh data
        setSelectedRequest(data.request);
        
        // Also update the request in the requests array
        setRequests(prev => prev.map(req => 
          req._id === data.request._id ? data.request : req
        ));
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
    }
  };
  
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    // Fetch the latest details when viewing
    fetchRequestDetails(request._id);
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      const response = await fetch(API.getUrl(`/api/request-management/my-requests/${requestId}/cancel`), {
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



      // Create Stripe payment session
      const response = await fetch(API.getUrl(`/api/stripe/create-payment-session/${requestId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originUrl: window.location.origin
        })
      });



      const data = await response.json();

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, data);
        throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
      }
      

      
      if (data.success && data.url) {

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

  const handleFullPayNow = async (requestId) => {
    if (paymentLoading) return; // Prevent double clicks
    
    try {
      setPaymentLoading(true);
      
      // Enhanced validation checks with specific error messages

      
      // Check if selectedRequest exists
      if (!selectedRequest) {
        console.error('❌ No request selected');
        alert('Please select a request to make payment.');
        return;
      }
      
      // Check if the request status is 'Confirmed for Sale'
      if (selectedRequest.status !== 'Confirmed for Sale') {
        console.error('❌ Owner has not confirmed the sale yet. Current status:', selectedRequest.status);
        alert(`Cannot proceed with full payment. Current status: ${selectedRequest.status}. The owner must confirm the sale first.`);
        return;
      }
      
      // Check if advance payment is completed
      if (!selectedRequest.advancePayment?.isPaid) {
        console.error('❌ Advance payment not completed');
        alert('Advance payment must be completed before making full payment.');
        return;
      }
      
      // Check if full payment is already completed
      if (selectedRequest.fullPayment?.status === 'completed') {
        console.error('❌ Full payment already completed');
        alert('Full payment has already been completed for this request.');
        return;
      }
      
      // Check if this is a sale property
      if (selectedRequest.propertyId?.listingType !== 'For Sale' || selectedRequest.requestType !== 'Buy') {
        console.error('❌ Invalid property type for full payment');
        alert('Full payment is only available for property purchases.');
        return;
      }
      
      // Check authentication status
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      if (!userData || !userData.token) {
        console.error('❌ No authentication data found');
        alert('Please log in to make payment');
        navigate('/login');
        return;
      }
      
      // Validate token format
      if (!userData.token.startsWith('eyJ')) {
        console.error('❌ Invalid token format');
        alert('Authentication token is invalid. Please log in again.');
        navigate('/login');
        return;
      }



      // Use authenticatedFetch instead of direct fetch

      
      const data = await authenticatedFetch(
        API.getUrl(`/api/stripe/create-full-payment-session/${requestId}`),
        {
          method: 'POST',
          body: JSON.stringify({
            originUrl: window.location.origin
          })
        },
        navigate
      );
      

      
      if (data && data.success && data.url) {

        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('❌ Full payment session creation failed:', data);
        const errorMessage = data?.message || 'Failed to create full payment session. Please try again later.';
        console.error('❌ Error message:', errorMessage);
        alert(errorMessage);
      }
    } catch (err) {
      console.error('❌ Error creating full payment session:', err);
      console.error('❌ Error details:', err.message);
      console.error('❌ Error stack:', err.stack);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to initiate full payment. Please try again later.';
      
      if (err.message === 'Authentication required' || err.message === 'Session expired') {
        errorMessage = 'Your session has expired. Please log in again.';
        alert(errorMessage);
        navigate('/login');
        return;
      } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
        errorMessage = 'Unable to connect to payment service. Please check your internet connection and try again.';
      } else if (err.message.includes('JSON')) {
        errorMessage = 'Invalid response from server. Please try again later.';
      } else if (err.message.includes('Network')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = `Payment error: ${err.message}`;
      }
      
      console.error('❌ Final error message to user:', errorMessage);
      alert(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle receipt download
  const handleGetReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      

      
      if (!paymentId) {
        alert('Payment ID not found. Cannot retrieve receipt.');
        return;
      }
      
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        alert('Please log in to view receipt');
        return;
      }


      
      const response = await fetch(API.getUrl(`/api/stripe/receipt/${paymentId}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
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
        console.error('API returned error:', data.message);
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

      const uploadResponse = await fetch(API.getUrl('/api/upload'), {
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
      const proofResponse = await fetch(API.getUrl(`/api/requests/${selectedRequest.requestId}/payment-proof`), {
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
        <LoadingSpinner message="Loading your requests..." />
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
৳{(
                        request.propertyId?.listingType === 'For Rent' 
                          ? Number(request.propertyId?.pricing?.rent) || 0
                          : Number(request.propertyId?.pricing?.sale) || 0
                      ).toLocaleString()}
                      {request.requestType === 'Rent' && <span className="rent-period">/month</span>}
                    </h3>
                  </div>
                  <PaymentStatusIndicator 
                    status={request.status}
                    onRetry={() => fetchRequestDetails(request._id)}
                  />
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
                  <PaymentStatusIndicator 
                    status={selectedRequest.status}
                    onRetry={() => fetchRequestDetails(selectedRequest._id)}
                    showTimestamp={true}
                  />
                </div>
                
                <div className="property-info-grid">
                  <div className="info-item">
                    <span className="info-label">Price</span>
                    <span className="info-value">
৳{(
                        selectedRequest.propertyId?.listingType === 'For Rent' 
                          ? Number(selectedRequest.propertyId?.pricing?.rent) || 0
                          : Number(selectedRequest.propertyId?.pricing?.sale) || 0
                      ).toLocaleString()}
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
                    
                    {/* Payment Success Confirmation - Only show if full payment is not completed */}
                    {selectedRequest.advancePayment.isPaid && selectedRequest.fullPayment?.status !== 'completed' && (
                      <div className="payment-success-banner">
                        <div className="success-icon">✅</div>
                        <div className="success-content">
                          <h5>Payment Successful!</h5>
                          <p>Your advance payment of ৳{selectedRequest.advancePayment.amount?.toLocaleString()} has been successfully processed.</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Message for Buy Requests */}
                    {selectedRequest.requestType === 'Buy' && selectedRequest.status === 'AdvancePaid' && (
                      <div className="status-message-banner">
                        <div className="status-icon">⏳</div>
                        <div className="status-content">
                          <h5>Waiting for Owner Confirmation</h5>
                          <p>Your advance payment has been received. The property owner will review and confirm the sale to enable your full payment.</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Workflow Indicator for Sale Properties */}
                    {selectedRequest.requestType === 'Buy' && selectedRequest.propertyId?.listingType === 'For Sale' && (
                      <div className="payment-workflow">
                        <div className="workflow-steps">
                          <div className={`workflow-step ${selectedRequest.advancePayment.isPaid ? 'completed' : 'current'}`}>
                            <div className="step-number">1</div>
                            <div className="step-label">Advance Payment</div>
                            <div className="step-status">{selectedRequest.advancePayment.isPaid ? 'Completed' : 'In Progress'}</div>
                          </div>
                          <div className="workflow-arrow">→</div>
                          <div className={`workflow-step ${selectedRequest.status === 'Confirmed for Sale' ? 'current' : selectedRequest.status === 'AdvancePaid' ? 'pending' : 'inactive'}`}>
                            <div className="step-number">2</div>
                            <div className="step-label">Owner Confirmation</div>
                            <div className="step-status">
                              {selectedRequest.status === 'Confirmed for Sale' ? 'Confirmed' : 
                               selectedRequest.status === 'AdvancePaid' ? 'Pending' : 'Waiting'}
                            </div>
                          </div>
                          <div className="workflow-arrow">→</div>
                          <div className={`workflow-step ${selectedRequest.fullPayment?.status === 'completed' ? 'completed' : selectedRequest.status === 'Confirmed for Sale' ? 'current' : 'inactive'}`}>
                            <div className="step-number">3</div>
                            <div className="step-label">Full Payment</div>
                            <div className="step-status">
                              {selectedRequest.fullPayment?.status === 'completed' ? 'Completed' : 
                               selectedRequest.status === 'Confirmed for Sale' ? 'Available' : 'Locked'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="property-info-grid">
                      <div className="info-item">
                        <span className="info-label">Amount</span>
                        <span className="info-value">৳{selectedRequest.advancePayment.amount?.toLocaleString()} {selectedRequest.advancePayment.currency || 'BDT'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className={`info-value payment-status ${selectedRequest.advancePayment.isPaid ? 'paid' : 'pending'}`}>
                          {selectedRequest.advancePayment.isPaid ? 'Paid' : selectedRequest.advancePayment.status || 'Pending'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Due Date</span>
                        <span className="info-value">{formatDate(selectedRequest.advancePayment.dueDate)}</span>
                      </div>
                      {selectedRequest.advancePayment.paidAt && (
                        <div className="info-item">
                          <span className="info-label">Paid At</span>
                          <span className="info-value">{formatDate(selectedRequest.advancePayment.paidAt)}</span>
                        </div>
                      )}
                      {selectedRequest.advancePayment.instructions && (
                        <div className="info-item">
                          <span className="info-label">Instructions</span>
                          <span className="info-value">{selectedRequest.advancePayment.instructions}</span>
                        </div>
                      )}
                      {selectedRequest.advancePayment.verifiedAt && (
                        <div className="info-item">
                          <span className="info-label">Verified At</span>
                          <span className="info-value">{formatDate(selectedRequest.advancePayment.verifiedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedRequest.fullPayment && (
                  <div className="full-payment-info">
                    <h4>Full Payment Details</h4>
                    
                    {/* Full Payment Success Confirmation */}
                    {selectedRequest.fullPayment.status === 'completed' && (
                      <div className="payment-success-banner ownership-success">
                        <div className="success-icon">🎉</div>
                        <div className="success-content">
                          <h5>Congratulations! You are now the owner!</h5>
                          <p>Your full payment of ৳{selectedRequest.fullPayment.amount?.toLocaleString()} has been successfully processed and ownership has been transferred to you.</p>
                        </div>
                      </div>
                    )}
                    <div className="property-info-grid">
                      <div className="info-item">
                        <span className="info-label">Amount</span>
                        <span className="info-value">{selectedRequest.fullPayment.amount?.toLocaleString()} {selectedRequest.fullPayment.currency || 'BDT'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className="info-value">{selectedRequest.fullPayment.status || 'pending'}</span>
                      </div>
                      {selectedRequest.fullPayment.paidAt && (
                        <div className="info-item">
                          <span className="info-label">Paid At</span>
                          <span className="info-value">{formatDate(selectedRequest.fullPayment.paidAt)}</span>
                        </div>
                      )}
                      {selectedRequest.fullPayment.verifiedAt && (
                        <div className="info-item">
                          <span className="info-label">Verified At</span>
                          <span className="info-value">{formatDate(selectedRequest.fullPayment.verifiedAt)}</span>
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
                  {/* Show Pay Online button only if payment is required and not yet paid */}
                  {selectedRequest.status === 'Approved – Pay Advance' && 
                   selectedRequest.advancePayment && 
                   !selectedRequest.advancePayment.isPaid && 
                   !selectedRequest.isPaid && (
                    <button 
                    className="pay-btn"
                    onClick={() => handlePayNow(selectedRequest._id)}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Processing...
                      </>
                    ) : (
                      `Pay Online (৳${selectedRequest.advancePayment.amount})`
                    )}
                  </button>
                  )}
                  
                  {/* Show Full Payment button for Buy requests after owner confirms sale */}
                  {selectedRequest.status === 'Confirmed for Sale' && 
                   selectedRequest.requestType === 'Buy' && 
                   selectedRequest.propertyId?.listingType === 'For Sale' && 
                   selectedRequest.advancePayment && 
                   selectedRequest.advancePayment.isPaid && 
                   (!selectedRequest.fullPayment || !selectedRequest.fullPayment.isPaid) && (
                    <button 
                    className="pay-btn full-payment-btn"
                    onClick={() => handleFullPayNow(selectedRequest._id)}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Processing...
                      </>
                    ) : (
                       (() => {
                         // Calculate remaining amount for sale properties only
                         const salePrice = Number(selectedRequest.propertyId?.pricing?.sale) || 0;
                         const advanceAmount = Number(selectedRequest.advancePayment?.amount) || 0;
                         const fullPaymentAmount = salePrice - advanceAmount;
                         return fullPaymentAmount > 0 ? `Pay Full Amount (৳${fullPaymentAmount.toLocaleString()})` : 'Pay Full Amount (৳0)';
                       })()
                     )}
                  </button>
                  )}
                  

                  
                  {/* Show Receipt button if payment has been made */}
                  {(selectedRequest.status === 'Advance Payment Received' || 
                    selectedRequest.status === 'AdvancePaid' || 
                    selectedRequest.status === 'Paid/Completed' || 
                    selectedRequest.status === 'Payment Submitted' ||
                    selectedRequest.isPaid ||
                    (selectedRequest.advancePayment && selectedRequest.advancePayment.isPaid)) && (
                    <button 
                    className="show-receipt-btn"
                    onClick={() => handleGetReceipt(selectedRequest.advancePayment?.paymentId)}
                    disabled={receiptLoading}
                  >
                    {receiptLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FaReceipt /> Show Receipt
                      </>
                    )}
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
                    {uploadLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Uploading...
                      </>
                    ) : (
                      'Submit Payment Proof'
                    )}
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
                    <p className="receipt-id">Receipt ID: {paymentReceipt.receiptData?.receiptId || 'N/A'}</p>
                    <p className="receipt-date">Generated on: {new Date().toLocaleString()}</p>
                  </div>
                  
                  {/* Payment Information */}
                  <div className="receipt-section">
                    <h3 className="section-title">Payment Details</h3>
                    <div className="receipt-details">
                      <div className="receipt-row">
                        <span className="receipt-label">Amount:</span>
                        <span className="receipt-value amount">{paymentReceipt.receiptData?.currency || '৳'} {paymentReceipt.receiptData?.amount?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Payment Status:</span>
                        <span className="receipt-value receipt-status">{paymentReceipt.receiptData?.paymentStatus || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Payment Method:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.paymentMethod || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Payment Date:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.paidAt ? formatDate(paymentReceipt.receiptData.paidAt) : 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Transaction ID:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.transactionId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Request Information */}
                  <div className="receipt-section">
                    <h3 className="section-title">Request Details</h3>
                    <div className="receipt-details">
                      <div className="receipt-row">
                        <span className="receipt-label">Request ID:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.request?.requestId || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Request Type:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.request?.requestType || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Request Status:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.request?.status || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Submitted Date:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.request?.submittedAt ? formatDate(paymentReceipt.receiptData.request.submittedAt) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Property Information */}
                  <div className="receipt-section">
                    <h3 className="section-title">Property Details</h3>
                    <div className="receipt-details">
                      <div className="receipt-row">
                        <span className="receipt-label">Address:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.property?.address || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Property Price:</span>
                        <span className="receipt-value">৳ {paymentReceipt.receiptData?.property?.price?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Description:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.property?.description || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Information */}
                  <div className="receipt-section">
                    <h3 className="section-title">Tenant Information</h3>
                    <div className="receipt-details">
                      <div className="receipt-row">
                        <span className="receipt-label">Name:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.tenant?.name || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Email:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.tenant?.email || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Phone:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.tenant?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div className="receipt-section">
                    <h3 className="section-title">Owner Information</h3>
                    <div className="receipt-details">
                      <div className="receipt-row">
                        <span className="receipt-label">Name:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.owner?.name || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Email:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.owner?.email || 'N/A'}</span>
                      </div>
                      <div className="receipt-row">
                        <span className="receipt-label">Phone:</span>
                        <span className="receipt-value">{paymentReceipt.receiptData?.owner?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="receipt-footer">
                    <p>Thank you for your payment!</p>
                    <p className="receipt-note">This is an official receipt for your advance payment.</p>
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
                    className="show-receipt-btn" 
                    onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                  >
                    <FaReceipt /> View Official Receipt
                  </button>
                )}

                <button 
                  type="button" 
                  className="print-btn" 
                  onClick={() => window.print()}
                >
                  <FaPrint /> Print Receipt
                </button>
                
                <button 
                  type="button" 
                  className="download-btn" 
                  onClick={() => {
                    const receiptElement = document.querySelector('.receipt-container');
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Payment Receipt - ${paymentReceipt.receiptData?.receiptId || 'N/A'}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .receipt-container { max-width: 800px; margin: 0 auto; }
                            .receipt-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3498db; }
                            .receipt-header h2 { color: #2c3e50; margin-bottom: 10px; font-size: 1.8rem; }
                            .receipt-id, .receipt-date { color: #7f8c8d; font-size: 0.9rem; margin-bottom: 5px; }
                            .receipt-section { margin-bottom: 25px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db; }
                            .section-title { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
                            .receipt-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e9ecef; }
                            .receipt-row:last-child { border-bottom: none; margin-bottom: 0; }
                            .receipt-label { font-weight: 600; color: #495057; flex: 1; }
                            .receipt-value { text-align: right; color: #212529; flex: 1; word-break: break-word; }
                            .receipt-value.amount { font-weight: 700; color: #28a745; font-size: 1.1rem; }
                            .receipt-status { font-weight: 600; color: #28a745; text-transform: uppercase; font-size: 0.9rem; }
                            .receipt-footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 3px solid #3498db; color: #6c757d; }
                            .receipt-note { font-size: 0.9rem; font-style: italic; color: #6c757d; }
                          </style>
                        </head>
                        <body>
                          ${receiptElement.outerHTML}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }}
                >
                  <FaDownload /> Download Receipt
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership Congratulations Modal */}
      {showOwnershipModal && ownershipProperty && (
        <div className="modal-overlay">
          <div className="modal ownership-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>🎉 Congratulations!</h2>
                <button 
                  className="close-btn" 
                  onClick={() => setShowOwnershipModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="ownership-message">
                <div className="celebration-icon">🏠✨</div>
                <h3>You are now the owner of</h3>
                <div className="property-details">
                  <h4>{ownershipProperty.name}</h4>
                  {ownershipProperty.address && (
                    <p className="property-address">{ownershipProperty.address}</p>
                  )}
                  {ownershipProperty.price && (
                    <p className="property-price">Purchase Price: ৳{ownershipProperty.price.toLocaleString()}</p>
                  )}
                </div>
                
                <div className="ownership-details">
                  <p>Your full payment has been processed successfully and the ownership transfer is complete!</p>
                  <p>You will receive official ownership documents and property transfer papers shortly.</p>
                </div>
                
                <div className="next-steps">
                  <h4>Next Steps:</h4>
                  <ul>
                    <li>Check your email for ownership transfer confirmation</li>
                    <li>Official property documents will be sent to your registered address</li>
                    <li>You can now access your property management dashboard</li>
                  </ul>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="primary-btn"
                  onClick={() => setShowOwnershipModal(false)}
                >
                  Continue to Dashboard
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