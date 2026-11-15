import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  RotateCw, 
  Building2, 
  MapPin, 
  Eye, 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  Clock, 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  Sparkles, 
  PartyPopper,
  AlertCircle,
  Home,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import './MyRequests.css';
import { authenticatedFetch } from '../../config/api.js';
import API from '../../config/api.js';
import PaymentStatusIndicator from '../../components/PaymentStatusIndicator';
import { ListItemSkeleton, ButtonLoader } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantEmptyState from './components/TenantEmptyState';

const MyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchRequests = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        setError('Please log in to view your requests');
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      if (!user || !user.token) {
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
    } catch (err) {
      console.error('MyRequests: Error fetching requests:', err);
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      setStats({});
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [selectedStatus]);
  
  // Initial load effect to handle payment redirects and authentication
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
    if (!userData || !userData.token) {
      navigate('/login');
      return;
    }
    
    // Check for payment success/cancel parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      checkPaymentTypeAndShowMessage(sessionId);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        fetchRequests();
        fetchStats();
      }, 1000);
    } else if (paymentStatus === 'cancelled') {
      alert('Payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  const checkPaymentTypeAndShowMessage = async (sessionId) => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser'));
      if (!user || !user.token) return;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await authenticatedFetch(
        API.getUrl('/api/request-management/my-requests'),
        { method: 'GET' },
        navigate
      );
      
      if (response && response.requests) {
        const recentlyPaidRequest = response.requests.find(req => {
          return (
            req.fullPayment?.status === 'completed' && 
            req.requestType === 'Buy' && 
            req.propertyId?.listingType === 'For Sale' &&
            req.status === 'Paid/Completed'
          );
        });
        
        if (recentlyPaidRequest && recentlyPaidRequest.propertyId) {
          const property = recentlyPaidRequest.propertyId;
          const propertyName = property.name || property.address || 'this property';
          setOwnershipProperty({
            name: propertyName,
            address: property.address,
            price: property.pricing?.sale || recentlyPaidRequest.fullPayment?.amount
          });
          setShowOwnershipModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking payment type:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
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
        setSelectedRequest(data.request);
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
    if (paymentLoading) return;
    
    try {
      setPaymentLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        alert('Please log in to make payment');
        return;
      }

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
        throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || 'Unknown error'}`);
      }
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Failed to create payment session');
      }
    } catch (err) {
      console.error('Error creating payment session:', err);
      alert('Failed to initiate payment. Please try again. Error: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFullPayNow = async (requestId) => {
    if (paymentLoading) return;
    
    try {
      setPaymentLoading(true);
      
      if (!selectedRequest) {
        alert('Please select a request to make payment.');
        return;
      }
      
      if (selectedRequest.status !== 'Confirmed for Sale') {
        alert(`Cannot proceed with full payment. Current status: ${selectedRequest.status}. The owner must confirm the sale first.`);
        return;
      }
      
      if (!selectedRequest.advancePayment?.isPaid) {
        alert('Advance payment must be completed before making full payment.');
        return;
      }
      
      if (selectedRequest.fullPayment?.status === 'completed') {
        alert('Full payment has already been completed for this request.');
        return;
      }
      
      if (selectedRequest.propertyId?.listingType !== 'For Sale' || selectedRequest.requestType !== 'Buy') {
        alert('Full payment is only available for property purchases.');
        return;
      }
      
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      if (!userData || !userData.token) {
        alert('Please log in to make payment');
        navigate('/login');
        return;
      }
      
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
        window.location.href = data.url;
      } else {
        const errorMessage = data?.message || 'Failed to create full payment session. Please try again later.';
        alert(errorMessage);
      }
    } catch (err) {
      console.error('Error creating full payment session:', err);
      alert(err.message || 'Payment error occurred');
    } finally {
      setPaymentLoading(false);
    }
  };

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPaymentReceipt(data);
        if (data.receiptUrl) {
          window.open(data.receiptUrl, '_blank');
        } else if (data.receiptData) {
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

      alert('Payment proof submitted successfully. The property owner will review it.');
      setShowPaymentProofModal(false);
      setPaymentProofForm({ proofFile: null, note: '' });
      fetchRequests();
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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only JPG, PNG, or PDF files');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setPaymentProofForm(prev => ({ ...prev, proofFile: file }));
    }
  };

  return (
    <div className="tenant-requests-page">
      <TenantPageHeader 
        title="My Requests" 
        subtitle="Track the status of your rental applications and purchase offers."
        action={
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={() => { fetchRequests(true); fetchStats(); }}
            disabled={loading || refreshing}
            title="Refresh requests"
          >
            <RotateCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {error && (
        <div className="requests-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Row */}
      <div className="requests-filter-bar">
        <div className="requests-filter-scroll">
          {statusFilters.map(filter => {
            const count = stats[filter.key];
            const isActive = selectedStatus === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                className={`request-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedStatus(filter.key)}
              >
                <span>{filter.label}</span>
                {count !== undefined && count !== null && filter.key !== 'all' && (
                  <span className="filter-badge">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="requests-skeleton-list">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : requests.length === 0 ? (
        <TenantEmptyState 
          icon={FileText}
          title="No Requests Found"
          description="You do not have any property requests under this status filter. Browse our property directory to submit a rental or purchase inquiry."
          primaryAction={
            <Link to="/properties" className="ds-btn ds-btn-primary">
              <Building2 size={16} />
              <span>Browse Properties</span>
            </Link>
          }
        />
      ) : (
        <div className="requests-cards-stack">
          {requests.map(request => {
            const property = request.propertyId || {};
            const imageSrc = property.images?.[0] || property.media?.images?.[0]?.url || null;
            const priceVal = property.listingType === 'For Rent' 
              ? (Number(property.pricing?.rent) || Number(property.price) || 0)
              : (Number(property.pricing?.sale) || Number(property.price) || 0);

            return (
              <div key={request._id} className="tenant-request-card">
                {/* Media Image Thumbnail */}
                <div className="request-card-thumb">
                  {imageSrc ? (
                    <img 
                      src={`${API.baseUrl}${imageSrc}`} 
                      alt={property.address || 'Property thumbnail'}
                      className="thumb-img"
                    />
                  ) : (
                    <div className="thumb-fallback">
                      <Home size={28} />
                    </div>
                  )}
                  <span className={`request-type-badge type-${request.requestType?.toLowerCase() || 'rent'}`}>
                    {request.requestType || 'Rent'}
                  </span>
                </div>

                {/* Content */}
                <div className="request-card-body">
                  <div className="request-card-header-line">
                    <div className="price-and-title">
                      <h3 className="request-price-text">
                        ৳{priceVal.toLocaleString()}
                        {request.requestType === 'Rent' && <span className="period-span"> / month</span>}
                      </h3>
                      <p className="request-property-addr">
                        <MapPin size={14} />
                        <span>{property.address || 'Residential Property'}</span>
                      </p>
                    </div>

                    <div className="status-wrap">
                      <PaymentStatusIndicator 
                        status={request.status}
                        onRetry={() => fetchRequestDetails(request._id)}
                      />
                    </div>
                  </div>

                  {/* Property Specs */}
                  <div className="request-specs-bar">
                    {property.bedrooms !== undefined && <span>{property.bedrooms} Beds</span>}
                    {property.bathrooms !== undefined && <span>• {property.bathrooms} Baths</span>}
                    {property.squareFootage && <span>• {property.squareFootage} sqft</span>}
                    <span className="spec-req-id">Ref: {request.requestId || request._id.slice(-6).toUpperCase()}</span>
                  </div>

                  {/* Footer & Actions */}
                  <div className="request-card-footer-line">
                    <span className="request-date-submitted">
                      <Calendar size={13} />
                      <span>Submitted: {formatDate(request.createdAt)}</span>
                    </span>

                    <div className="card-buttons-group">
                      <button 
                        type="button"
                        className="ds-btn ds-btn-primary ds-btn-sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>

                      {['Submitted', 'Under Review', 'Info Requested'].includes(request.status) && (
                        <button 
                          type="button"
                          className="ds-btn ds-btn-danger ds-btn-sm"
                          onClick={() => handleCancelRequest(request.requestId)}
                        >
                          <X size={14} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="ds-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="ds-modal-card request-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <FileText size={20} className="modal-header-icon" />
                <h3 className="ds-modal-title">
                  Request Details — {selectedRequest.requestId || selectedRequest._id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <button 
                type="button" 
                className="ds-modal-close" 
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="ds-modal-body modal-scrollable-body">
              {/* Property Header Snippet */}
              <div className="modal-property-card-snippet">
                <div className="snippet-info">
                  <h4 className="snippet-addr">{selectedRequest.propertyId?.address || 'Residential Unit'}</h4>
                  <div className="snippet-price-line">
                    <strong>
                      ৳{(
                        selectedRequest.propertyId?.listingType === 'For Rent' 
                          ? Number(selectedRequest.propertyId?.pricing?.rent) || 0
                          : Number(selectedRequest.propertyId?.pricing?.sale) || 0
                      ).toLocaleString()}
                    </strong>
                    {selectedRequest.requestType === 'Rent' && ' / month'}
                  </div>
                </div>

                <PaymentStatusIndicator 
                  status={selectedRequest.status}
                  onRetry={() => fetchRequestDetails(selectedRequest._id)}
                  showTimestamp={true}
                />
              </div>

              {/* Application Details Grid */}
              <div className="modal-grid-box">
                <div className="grid-box-item">
                  <span className="grid-box-label">Request Type</span>
                  <span className="grid-box-val">{selectedRequest.requestType}</span>
                </div>
                <div className="grid-box-item">
                  <span className="grid-box-label">Submitted Date</span>
                  <span className="grid-box-val">{formatDate(selectedRequest.createdAt)}</span>
                </div>
                <div className="grid-box-item">
                  <span className="grid-box-label">Last Updated</span>
                  <span className="grid-box-val">{formatDate(selectedRequest.updatedAt)}</span>
                </div>
                <div className="grid-box-item">
                  <span className="grid-box-label">Current Status</span>
                  <span className="grid-box-val">{selectedRequest.status}</span>
                </div>
              </div>

              {/* Application Letter */}
              {selectedRequest.payload?.applicationLetter && (
                <div className="modal-letter-box">
                  <span className="letter-box-title">Application Letter</span>
                  <p className="letter-box-content">{selectedRequest.payload.applicationLetter}</p>
                </div>
              )}
              
              {/* Advance Payment Details */}
              {selectedRequest.advancePayment && (
                <div className="modal-payment-section">
                  <h4 className="payment-sec-title">Advance Payment Specification</h4>
                  
                  {/* Payment Success Confirmation */}
                  {selectedRequest.advancePayment.isPaid && selectedRequest.fullPayment?.status !== 'completed' && (
                    <div className="payment-success-banner">
                      <CheckCircle2 size={22} className="banner-success-icon" />
                      <div className="success-content">
                        <h5>Payment Processed Successfully</h5>
                        <p>Your advance payment of ৳{selectedRequest.advancePayment.amount?.toLocaleString()} has been confirmed.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Message for Buy Requests */}
                  {selectedRequest.requestType === 'Buy' && selectedRequest.status === 'AdvancePaid' && (
                    <div className="status-message-banner">
                      <Clock size={22} className="banner-clock-icon" />
                      <div className="status-content">
                        <h5>Awaiting Owner Confirmation</h5>
                        <p>Your advance payment has been registered. The owner is reviewing the deed transfer to confirm the sale and enable full payment.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Workflow Indicator for Sale Properties */}
                  {selectedRequest.requestType === 'Buy' && selectedRequest.propertyId?.listingType === 'For Sale' && (
                    <div className="payment-workflow">
                      <div className="workflow-steps">
                        <div className={`workflow-step ${selectedRequest.advancePayment.isPaid ? 'completed' : 'current'}`}>
                          <div className="step-number">1</div>
                          <div className="step-label">Advance Payment</div>
                          <div className="step-status">{selectedRequest.advancePayment.isPaid ? 'Completed' : 'Pending'}</div>
                        </div>
                        <ArrowRight size={16} className="workflow-arrow-icon" />
                        <div className={`workflow-step ${selectedRequest.status === 'Confirmed for Sale' ? 'current' : selectedRequest.status === 'AdvancePaid' ? 'pending' : 'inactive'}`}>
                          <div className="step-number">2</div>
                          <div className="step-label">Owner Confirmation</div>
                          <div className="step-status">
                            {selectedRequest.status === 'Confirmed for Sale' ? 'Confirmed' : 
                             selectedRequest.status === 'AdvancePaid' ? 'Pending' : 'Awaiting'}
                          </div>
                        </div>
                        <ArrowRight size={16} className="workflow-arrow-icon" />
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
                  
                  <div className="modal-grid-box">
                    <div className="grid-box-item">
                      <span className="grid-box-label">Advance Amount</span>
                      <span className="grid-box-val font-bold">
                        ৳{selectedRequest.advancePayment.amount?.toLocaleString()} {selectedRequest.advancePayment.currency || 'BDT'}
                      </span>
                    </div>
                    <div className="grid-box-item">
                      <span className="grid-box-label">Payment Status</span>
                      <span className="grid-box-val">
                        {selectedRequest.advancePayment.isPaid ? 'Paid' : selectedRequest.advancePayment.status || 'Pending'}
                      </span>
                    </div>
                    <div className="grid-box-item">
                      <span className="grid-box-label">Due Date</span>
                      <span className="grid-box-val">{formatDate(selectedRequest.advancePayment.dueDate)}</span>
                    </div>
                    {selectedRequest.advancePayment.paidAt && (
                      <div className="grid-box-item">
                        <span className="grid-box-label">Paid On</span>
                        <span className="grid-box-val">{formatDate(selectedRequest.advancePayment.paidAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Full Payment Details */}
              {selectedRequest.fullPayment && (
                <div className="modal-payment-section">
                  <h4 className="payment-sec-title">Full Payment & Ownership Transfer</h4>
                  
                  {selectedRequest.fullPayment.status === 'completed' && (
                    <div className="payment-success-banner ownership-success">
                      <PartyPopper size={24} className="banner-success-icon" />
                      <div className="success-content">
                        <h5>Congratulations! Property Ownership Confirmed</h5>
                        <p>Your payment of ৳{selectedRequest.fullPayment.amount?.toLocaleString()} has completed the ownership acquisition.</p>
                      </div>
                    </div>
                  )}

                  <div className="modal-grid-box">
                    <div className="grid-box-item">
                      <span className="grid-box-label">Full Amount</span>
                      <span className="grid-box-val font-bold">
                        ৳{selectedRequest.fullPayment.amount?.toLocaleString()} {selectedRequest.fullPayment.currency || 'BDT'}
                      </span>
                    </div>
                    <div className="grid-box-item">
                      <span className="grid-box-label">Status</span>
                      <span className="grid-box-val">{selectedRequest.fullPayment.status || 'Pending'}</span>
                    </div>
                    {selectedRequest.fullPayment.paidAt && (
                      <div className="grid-box-item">
                        <span className="grid-box-label">Paid At</span>
                        <span className="grid-box-val">{formatDate(selectedRequest.fullPayment.paidAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ds-modal-footer">
              <button 
                type="button" 
                className="ds-btn ds-btn-secondary" 
                onClick={() => setShowModal(false)}
              >
                Close
              </button>

              {['Submitted', 'Under Review', 'Info Requested'].includes(selectedRequest.status) && (
                <button 
                  type="button" 
                  className="ds-btn ds-btn-danger"
                  onClick={() => handleCancelRequest(selectedRequest.requestId)}
                >
                  <X size={15} />
                  <span>Cancel Request</span>
                </button>
              )}

              {/* Pay Advance Button */}
              {selectedRequest.status === 'Approved – Pay Advance' && 
               selectedRequest.advancePayment && 
               !selectedRequest.advancePayment.isPaid && 
               !selectedRequest.isPaid && (
                <button 
                  type="button" 
                  className="ds-btn ds-btn-primary"
                  onClick={() => handlePayNow(selectedRequest._id)}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>Pay Online (৳{selectedRequest.advancePayment.amount?.toLocaleString()})</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Full Payment Button */}
              {selectedRequest.status === 'Confirmed for Sale' && 
               selectedRequest.requestType === 'Buy' && 
               selectedRequest.propertyId?.listingType === 'For Sale' && 
               selectedRequest.advancePayment && 
               selectedRequest.advancePayment.isPaid && 
               (!selectedRequest.fullPayment || !selectedRequest.fullPayment.isPaid) && (
                <button 
                  type="button" 
                  className="ds-btn ds-btn-primary"
                  onClick={() => handleFullPayNow(selectedRequest._id)}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>
                        {(() => {
                          const salePrice = Number(selectedRequest.propertyId?.pricing?.sale) || 0;
                          const advanceAmount = Number(selectedRequest.advancePayment?.amount) || 0;
                          const fullPaymentAmount = salePrice - advanceAmount;
                          return fullPaymentAmount > 0 
                            ? `Pay Full Balance (৳${fullPaymentAmount.toLocaleString()})` 
                            : 'Pay Balance (৳0)';
                        })()}
                      </span>
                    </>
                  )}
                </button>
              )}
              
              {/* Show Receipt Button */}
              {(selectedRequest.status === 'Advance Payment Received' || 
                selectedRequest.status === 'AdvancePaid' || 
                selectedRequest.status === 'Paid/Completed' || 
                selectedRequest.status === 'Payment Submitted' ||
                selectedRequest.isPaid ||
                (selectedRequest.advancePayment && selectedRequest.advancePayment.isPaid)) && (
                <button 
                  type="button" 
                  className="ds-btn ds-btn-secondary"
                  onClick={() => handleGetReceipt(selectedRequest.advancePayment?.paymentId)}
                  disabled={receiptLoading}
                >
                  {receiptLoading ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Retrieving...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={15} />
                      <span>Show Receipt</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Proof Upload Modal */}
      {showPaymentProofModal && (
        <div className="ds-modal-backdrop" onClick={() => setShowPaymentProofModal(false)}>
          <div className="ds-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <Upload size={20} className="modal-header-icon" />
                <h3 className="ds-modal-title">Upload Payment Proof</h3>
              </div>
              <button 
                type="button" 
                className="ds-modal-close" 
                onClick={() => setShowPaymentProofModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePaymentProofSubmit}>
              <div className="ds-modal-body">
                <div className="payment-proof-info-box">
                  <div className="proof-row">
                    <span>Required Amount:</span>
                    <strong>৳{selectedRequest?.advancePayment?.amount?.toLocaleString()}</strong>
                  </div>
                  <div className="proof-row">
                    <span>Due Date:</span>
                    <span>{formatDate(selectedRequest?.advancePayment?.dueDate)}</span>
                  </div>
                  {selectedRequest?.advancePayment?.instructions && (
                    <div className="proof-instructions">
                      <span>Instructions:</span>
                      <p>{selectedRequest.advancePayment.instructions}</p>
                    </div>
                  )}
                </div>
                
                <div className="ds-form-group">
                  <label htmlFor="proofFile" className="ds-form-label">
                    <span>Payment Proof Document *</span>
                    <span className="label-hint">JPG, PNG, PDF (Max 5MB)</span>
                  </label>
                  <input
                    type="file"
                    id="proofFile"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    required
                    className="ds-form-input"
                  />
                  {paymentProofForm.proofFile && (
                    <span className="selected-file-label">
                      Selected: {paymentProofForm.proofFile.name}
                    </span>
                  )}
                </div>
                
                <div className="ds-form-group">
                  <label htmlFor="proofNote" className="ds-form-label">Additional Note (Optional)</label>
                  <textarea
                    id="proofNote"
                    value={paymentProofForm.note}
                    onChange={(e) => setPaymentProofForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Provide transaction number, bank branch, or date details..."
                    rows={3}
                    className="ds-form-textarea"
                  />
                </div>
              </div>
              
              <div className="ds-modal-footer">
                <button 
                  type="button" 
                  className="ds-btn ds-btn-secondary" 
                  onClick={() => setShowPaymentProofModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="ds-btn ds-btn-primary"
                  disabled={uploadLoading || !paymentProofForm.proofFile}
                >
                  {uploadLoading ? (
                    <>
                      <ButtonLoader size="small" />
                      <span>Submitting Document...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      <span>Submit Payment Proof</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Receipt Modal */}
      {showReceiptModal && paymentReceipt && (
        <div className="ds-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="ds-modal-card receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header no-print">
              <div className="modal-title-wrap">
                <FileText size={20} className="modal-header-icon" />
                <h3 className="ds-modal-title">Payment Receipt</h3>
              </div>
              <button 
                type="button" 
                className="ds-modal-close" 
                onClick={() => setShowReceiptModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="receipt-paper">
              <div className="receipt-brand-row">
                <div>
                  <h2 className="receipt-brand-logo">
                    <span>Dwell</span><span style={{ color: '#2563EB' }}>Sync</span>
                  </h2>
                  <p className="receipt-brand-sub">Official Advance Payment Receipt</p>
                </div>
                <div className="receipt-stamp-box">
                  <CheckCircle2 size={16} color="#059669" />
                  <span>PAID</span>
                </div>
              </div>

              <div className="receipt-meta-grid">
                <div>
                  <span className="receipt-meta-label">Receipt ID</span>
                  <span className="receipt-meta-value font-mono">
                    {paymentReceipt.receiptData?.receiptId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="receipt-meta-label">Date Generated</span>
                  <span className="receipt-meta-value">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="receipt-meta-label">Method</span>
                  <span className="receipt-meta-value">
                    {paymentReceipt.receiptData?.paymentMethod || 'Stripe Card'}
                  </span>
                </div>
                <div>
                  <span className="receipt-meta-label">Transaction ID</span>
                  <span className="receipt-meta-value font-mono font-xs">
                    {paymentReceipt.receiptData?.transactionId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Property Details */}
              <div className="receipt-section-box">
                <h4 className="receipt-box-heading">Property & Request</h4>
                <div className="receipt-line-item">
                  <span>Address:</span>
                  <strong>{paymentReceipt.receiptData?.property?.address || 'N/A'}</strong>
                </div>
                <div className="receipt-line-item">
                  <span>Request ID:</span>
                  <span>{paymentReceipt.receiptData?.request?.requestId || 'N/A'}</span>
                </div>
                <div className="receipt-line-item">
                  <span>Type:</span>
                  <span>{paymentReceipt.receiptData?.request?.requestType || 'Rental Application'}</span>
                </div>
              </div>

              {/* Total Paid */}
              <div className="receipt-total-box">
                <span className="receipt-total-label">Amount Paid</span>
                <span className="receipt-total-val">
                  ৳{paymentReceipt.receiptData?.amount?.toLocaleString() || '0'} {paymentReceipt.receiptData?.currency || 'BDT'}
                </span>
              </div>
            </div>
            
            <div className="ds-modal-footer no-print">
              <button 
                type="button" 
                className="ds-btn ds-btn-secondary" 
                onClick={() => setShowReceiptModal(false)}
              >
                Close
              </button>
              {paymentReceipt.receiptUrl && (
                <button 
                  type="button" 
                  className="ds-btn ds-btn-secondary" 
                  onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                >
                  <ExternalLink size={15} />
                  <span>View Stripe Document</span>
                </button>
              )}
              <button 
                type="button" 
                className="ds-btn ds-btn-primary" 
                onClick={() => window.print()}
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ownership Congratulations Modal */}
      {showOwnershipModal && ownershipProperty && (
        <div className="ds-modal-backdrop" onClick={() => setShowOwnershipModal(false)}>
          <div className="ds-modal-card ownership-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <PartyPopper size={22} color="#059669" />
                <h3 className="ds-modal-title">Congratulations!</h3>
              </div>
              <button 
                type="button" 
                className="ds-modal-close" 
                onClick={() => setShowOwnershipModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="ds-modal-body text-center">
              <div className="ownership-celebrate-wrap">
                <div className="celebrate-icon-box">
                  <Building2 size={36} color="#2563EB" />
                  <Sparkles size={20} color="#D97706" className="sparkle-float" />
                </div>
                <h4 className="ownership-celebrate-title">You are now the owner of</h4>
                <p className="ownership-property-name">{ownershipProperty.name}</p>
                {ownershipProperty.address && (
                  <p className="ownership-property-address">{ownershipProperty.address}</p>
                )}
                {ownershipProperty.price && (
                  <span className="ownership-property-price">
                    Purchase Price: ৳{ownershipProperty.price.toLocaleString()}
                  </span>
                )}
              </div>
              
              <div className="ownership-info-steps">
                <h5>Next Steps</h5>
                <ul className="ownership-steps-list">
                  <li>Check your registered email for deed transfer confirmation.</li>
                  <li>Official title documentation will be dispatched to your address.</li>
                  <li>You can now manage this residence directly from your dashboard.</li>
                </ul>
              </div>
            </div>
            
            <div className="ds-modal-footer">
              <button 
                type="button" 
                className="ds-btn ds-btn-primary"
                onClick={() => setShowOwnershipModal(false)}
                style={{ width: '100%' }}
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
