import React, { useState, useEffect } from 'react';
import API from '../../config/api';
import './OwnerRequestsInbox.css';
import { FaReceipt, FaPrint } from 'react-icons/fa';

const OwnerRequestsInbox = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Messaging state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);


  
  // Receipt state
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    fetchOwnerRequests();
  }, []);



  const fetchOwnerRequests = async () => {
    try {
  
      setLoading(true);
      setError(''); // Clear any previous errors
  
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

      const response = await fetch(API.getUrl(API.endpoints.ownerRequests), {
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
  
  
        if (data.requests && data.requests.length > 0) {
    
        }
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
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

  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    // Fetch messages for this request
    await fetchMessages(request._id);
  };

  // Fetch messages for a request
  const fetchMessages = async (requestId) => {
    try {
      setMessagesLoading(true);
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(API.getUrl(API.endpoints.requestManagement(requestId)), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.request.messages) {
          setMessages(data.request.messages);
          // Mark messages as read
          await markMessagesAsRead(requestId);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  // Send a new message
  const sendMessage = async (requestId) => {
    if (!newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(API.getUrl(API.endpoints.requestMessages(requestId)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(prev => [...prev, data.newMessage]);
          setNewMessage('');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Mark messages as read
  const markMessagesAsRead = async (requestId) => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      await fetch(API.getUrl(API.endpoints.readMessages(requestId)), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Get auth token helper
  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch (e) {
      return null;
    }
  };
  
  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // Get current user ID
  const getCurrentUserId = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.userId;
    } catch (e) {
      return null;
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
      
      const response = await fetch(API.getUrl(API.endpoints.requestStatus(requestId)), {
         method: 'PUT',
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

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = (requestId) => {
    setSelectedRequestForReject(requestId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setActionLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to reject request');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      const response = await fetch(API.getUrl(API.endpoints.rejectRequest(selectedRequestForReject)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        fetchOwnerRequests();
        setShowRejectModal(false);
        setRejectReason('');
        alert('Request rejected successfully. Tenant has been notified.');
      } else {
        alert(data.message || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle payment verification
  const handleVerifyPayment = async (requestId) => {
    if (!window.confirm('Are you sure you want to verify this payment and mark it as completed?')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(API.getUrl(API.endpoints.requestStatus(requestId)), {
         method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Paid/Completed',
          note: 'Payment verified and approved by owner'
        })
      });

      if (response.ok) {
        alert('Payment verified successfully! Request marked as completed.');
        setShowDetailModal(false);
        fetchOwnerRequests(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('An error occurred while verifying the payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle payment rejection
  const handleRejectPayment = async (requestId) => {
    const reason = prompt('Please provide a reason for rejecting the payment proof:');
    if (!reason || !reason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(API.getUrl(API.endpoints.requestStatusUpdate(requestId)), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Approved – Pay Advance',
          note: `Payment proof rejected: ${reason}`
        })
      });

      if (response.ok) {
        alert('Payment proof rejected. Request status reverted to "Approved – Pay Advance".');
        setShowDetailModal(false);
        fetchRequests(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to reject payment proof');
      }
    } catch (error) {
      console.error('Error rejecting payment proof:', error);
      alert('An error occurred while rejecting the payment proof');
    } finally {
      setActionLoading(false);
    }
  };

  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState(null);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    currency: 'BDT',
    dueDate: '',
    instructions: '',
    additionalNote: ''
  });
  const [amountError, setAmountError] = useState('');

  const handleApprove = (requestId) => {


    setSelectedRequestForPayment(requestId);
    setAmountError(''); // Clear any previous errors
    setAdvancePaymentForm({
      amount: '',
      currency: 'BDT',
      dueDate: '',
      instructions: '',
      additionalNote: ''
    }); // Reset form
    setShowAdvancePaymentModal(true);

  };

  const handleAdvancePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      
      // Check if there are any validation errors
      if (amountError) {
        alert('Please fix the validation errors before submitting');
        setActionLoading(false);
        return;
      }
      
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to set up advance payment');
        setActionLoading(false);
        return;
      }
      
      // Client-side validation for advance payment amount
      const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
      if (selectedRequest && selectedRequest.propertyId) {
        const property = selectedRequest.propertyId;
        const requestType = selectedRequest.requestType;
        let propertyPrice, maxPercentage, maxAdvanceAmount, priceLabel;
        
        if (requestType === 'Buy') {
          // For buy requests, use sale price with 20% limit
          propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
          maxPercentage = 0.2;
          priceLabel = 'sale price';
        } else {
          // For rent requests, use rent price with 50% limit
          propertyPrice = property.pricing?.rent || property.rent || property.price;
          maxPercentage = 0.5;
          priceLabel = 'monthly rent';
        }
        
        if (propertyPrice) {
          maxAdvanceAmount = propertyPrice * maxPercentage;
          const requestedAmount = parseFloat(advancePaymentForm.amount);
          
          if (isNaN(requestedAmount) || requestedAmount <= 0) {
            setAmountError('Please enter a valid amount greater than 0');
            setActionLoading(false);
            return;
          }
          
          if (requestedAmount > maxAdvanceAmount) {
            setAmountError(`Amount cannot exceed BDT ${maxAdvanceAmount.toLocaleString()} (${maxPercentage * 100}% of ${priceLabel})`);
            setActionLoading(false);
            return;
          }
        }
      } else {
        // If we can't find property price, still validate basic amount
        const requestedAmount = parseFloat(advancePaymentForm.amount);
        if (isNaN(requestedAmount) || requestedAmount <= 0) {
          setAmountError('Please enter a valid amount greater than 0');
          setActionLoading(false);
          return;
        }
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      const response = await fetch(API.getUrl(API.endpoints.advancePayment(selectedRequestForPayment)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(advancePaymentForm)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setShowAdvancePaymentModal(false);
        setAdvancePaymentForm({
          amount: '',
          currency: 'BDT',
          dueDate: '',
          instructions: '',
          note: ''
        });
        alert('Advance payment setup successfully! Tenant has been notified.');
        // Refresh requests after modal is closed and alert is dismissed
        await fetchOwnerRequests();
      } else {
        alert(data.message || 'Failed to set up advance payment');
      }
    } catch (err) {
      console.error('Error setting up advance payment:', err);
      alert('Failed to set up advance payment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle receipt download
  const handleGetReceipt = async (paymentId) => {
    try {
      setReceiptLoading(true);
      
      // Debug logging
  
      
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

  // Handle approve for AdvancePaid requests (for Rent requests)
  const handleApproveAdvancePaid = async (requestId) => {

    
    if (!window.confirm('Are you sure you want to approve this request and mark it as completed?')) {
      return;
    }

    try {
      setActionLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
  
      
      if (!userData) {
        alert('Please log in to approve request');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
  
      
      const url = API.getUrl(API.endpoints.requestStatusUpdate(requestId));
  
      
      const requestBody = {
        status: 'Paid/Completed',
        note: 'Request approved by owner after advance payment completion'
      };
  
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response data:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      
      if (data.success) {
        alert('Request approved successfully! Request marked as completed.');
        fetchOwnerRequests(); // Refresh the list
      } else {
        alert(data.message || 'Failed to approve request');
      }
    } catch (err) {
      console.error('❌ Error approving request:', err);
      console.error('❌ Error stack:', err.stack);
      alert(`Failed to approve request: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle confirm sale for Buy requests
  const handleConfirmSale = async (requestId) => {

    
    if (!window.confirm('Are you sure you want to confirm this sale? The tenant will be required to pay the full amount.')) {
      return;
    }

    try {
      setActionLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to confirm sale');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      const url = API.getUrl(API.endpoints.requestStatusUpdate(requestId));
      
      const requestBody = {
        status: 'Confirmed for Sale',
        note: 'Sale confirmed by owner - tenant must pay full amount'
      };
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Sale confirmed successfully! Tenant has been notified to pay the full amount.');
        fetchOwnerRequests(); // Refresh the list
      } else {
        alert(data.message || 'Failed to confirm sale');
      }
    } catch (err) {
      console.error('❌ Error confirming sale:', err);
      alert(`Failed to confirm sale: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle refund for Buy requests
  const handleRefundAdvance = async (requestId) => {

    
    if (!window.confirm('Are you sure you want to cancel this sale and refund the advance payment?')) {
      return;
    }

    try {
      setActionLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        alert('Please log in to process refund');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      const url = API.getUrl(API.endpoints.requestStatusUpdate(requestId));
      
      const requestBody = {
        status: 'Refunded',
        note: 'Sale canceled by owner - advance payment refunded'
      };
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('Refund processed successfully! Advance payment has been refunded to the tenant.');
        fetchOwnerRequests(); // Refresh the list
      } else {
        alert(data.message || 'Failed to process refund');
      }
    } catch (err) {
      console.error('❌ Error processing refund:', err);
      alert(`Failed to process refund: ${err.message}`);
    } finally {
      setActionLoading(false);
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

  const getStatusColor = (status) => {
    const statusColors = {
      'Submitted': '#007bff',
      'Under Review': '#ffc107',
      'Info Requested': '#17a2b8',
      'Approved – Pay Advance': '#28a745',
      'Payment Pending (Stripe)': '#fd7e14',
      'Payment Submitted': '#6f42c1',
      'AdvancePaid': '#28a745',
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
    'AdvancePaid',
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

  try {
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
                  onClick={() => handleViewDetails(request)}
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
                
                {request.status === 'AdvancePaid' && (
                  <>
                    <button 
                      onClick={() => handleGetReceipt(request.advancePayment?.paymentId)}
                      className="action-btn view-btn"
                      disabled={receiptLoading}
                    >
                      {receiptLoading ? (
                        'Loading...'
                      ) : (
                        <>
                          <FaReceipt /> Show Receipt
                        </>
                      )}
                    </button>
                    {request.requestType === 'Buy' ? (
                      <>
                        <button 
                          onClick={() => handleConfirmSale(request._id)}
                          className="action-btn approve-btn"
                          disabled={actionLoading}
                        >
                          Confirm Sale
                        </button>
                        <button 
                          onClick={() => handleRefundAdvance(request._id)}
                          className="action-btn reject-btn"
                          disabled={actionLoading}
                        >
                          Refund & Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleApproveAdvancePaid(request._id)}
                        className="action-btn approve-btn"
                        disabled={actionLoading}
                      >
                        Approve Request
                      </button>
                    )}
                  </>
                )}
                
                {request.status === 'Paid/Completed' && (
                  <>
                    <button 
                      onClick={() => handleGetReceipt(request.advancePayment?.paymentId)}
                      className="action-btn view-btn"
                      disabled={receiptLoading}
                    >
                      {receiptLoading ? (
                        'Loading...'
                      ) : (
                        <>
                          <FaReceipt /> Show Receipt
                        </>
                      )}
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
                <>
                  {/* Family Members Section */}
                  {selectedRequest.payload.familyMembers && selectedRequest.payload.familyMembers.length > 0 && (
                    <div className="detail-section">
                      <h3>Family Members ({selectedRequest.payload.familyMembers.length})</h3>
                      <div className="family-members-grid">
                        {selectedRequest.payload.familyMembers.map((member, index) => (
                          <div key={index} className="family-member-card">
                            <p><strong>Name:</strong> {member.name}</p>
                            <p><strong>Age:</strong> {member.age}</p>
                            <p><strong>Relation:</strong> {member.relation}</p>
                            {member.occupation && <p><strong>Occupation:</strong> {member.occupation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Belongings Section */}
                  {selectedRequest.payload.belongings && selectedRequest.payload.belongings.length > 0 && (
                    <div className="detail-section">
                      <h3>Belongings</h3>
                      <div className="belongings-list">
                        {selectedRequest.payload.belongings.map((item, index) => (
                          <div key={index} className="belonging-item">
                            <span className="item-name">{item.item}</span>
                            <span className="item-quantity">Qty: {item.quantity}</span>
                            {item.description && <span className="item-description">{item.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Occupation Section */}
                  {selectedRequest.payload.occupation && (
                    <div className="detail-section">
                      <h3>Occupation Details</h3>
                      <p><strong>Job Title:</strong> {selectedRequest.payload.occupation.jobTitle}</p>
                      <p><strong>Company:</strong> {selectedRequest.payload.occupation.company}</p>
                      <p><strong>Monthly Income:</strong> {selectedRequest.payload.occupation.monthlyIncome}</p>
                      <p><strong>Employment Type:</strong> {selectedRequest.payload.occupation.employmentType}</p>
                      {selectedRequest.payload.occupation.workAddress && (
                        <p><strong>Work Address:</strong> {selectedRequest.payload.occupation.workAddress}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Identity Documents Section */}
                  {selectedRequest.payload.identity && (
                    <div className="detail-section">
                      <h3>Identity Documents</h3>
                      <div className="identity-docs">
                        {selectedRequest.payload.identity.nidNumber && (
                          <p><strong>NID Number:</strong> ****{selectedRequest.payload.identity.nidNumber.slice(-4)}</p>
                        )}
                        {selectedRequest.payload.identity.passportNumber && (
                          <p><strong>Passport Number:</strong> ****{selectedRequest.payload.identity.passportNumber.slice(-4)}</p>
                        )}
                        {selectedRequest.payload.identity.drivingLicense && (
                          <p><strong>Driving License:</strong> ****{selectedRequest.payload.identity.drivingLicense.slice(-4)}</p>
                        )}
                        {selectedRequest.payload.identity.documents && selectedRequest.payload.identity.documents.length > 0 && (
                          <div className="uploaded-docs">
                            <strong>Uploaded Documents:</strong>
                            <ul>
                              {selectedRequest.payload.identity.documents.map((doc, index) => (
                                <li key={index}>
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    {doc.name || `Document ${index + 1}`}
                                  </a>
                                  <span className="doc-type">({doc.type})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Financial Information Section */}
                  {selectedRequest.payload.financials && (
                    <div className="detail-section">
                      <h3>Financial Information</h3>
                      <div className="financial-grid">
                        {selectedRequest.payload.financials.monthlyIncome && (
                          <p><strong>Monthly Income:</strong> {selectedRequest.payload.financials.monthlyIncome}</p>
                        )}
                        {selectedRequest.payload.financials.bankStatement && (
                          <p><strong>Bank Statement:</strong> 
                            <a href={selectedRequest.payload.financials.bankStatement} target="_blank" rel="noopener noreferrer">
                              View Document
                            </a>
                          </p>
                        )}
                        {selectedRequest.payload.financials.creditScore && (
                          <p><strong>Credit Score:</strong> {selectedRequest.payload.financials.creditScore}</p>
                        )}
                        {selectedRequest.payload.financials.references && selectedRequest.payload.financials.references.length > 0 && (
                          <div className="references">
                            <strong>References:</strong>
                            {selectedRequest.payload.financials.references.map((ref, index) => (
                              <div key={index} className="reference-item">
                                <p>{ref.name} - {ref.relation}</p>
                                <p>Contact: {ref.contact}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Letter to Owner Section */}
                  {selectedRequest.payload.letterToOwner && (
                    <div className="detail-section">
                      <h3>Letter to Owner</h3>
                      <div className="letter-content">
                        <p>{selectedRequest.payload.letterToOwner}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Advance Payment Section */}
                  {selectedRequest.advancePayment && (
                    <div className="detail-section">
                      <h3>Advance Payment Details</h3>
                      <div className="payment-details">
                        <p><strong>Amount:</strong> {selectedRequest.advancePayment.amount} {selectedRequest.advancePayment.currency}</p>
                        <p><strong>Due Date:</strong> {new Date(selectedRequest.advancePayment.dueDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {selectedRequest.advancePayment.status}</p>
                        {selectedRequest.advancePayment.instructions && (
                          <p><strong>Instructions:</strong> {selectedRequest.advancePayment.instructions}</p>
                        )}
                        {selectedRequest.advancePayment.note && (
                          <p><strong>Note:</strong> {selectedRequest.advancePayment.note}</p>
                        )}
                        {selectedRequest.advancePayment.proofUrl && (
                          <p><strong>Payment Proof:</strong> 
                            <a href={selectedRequest.advancePayment.proofUrl} target="_blank" rel="noopener noreferrer">
                              View Proof
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
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
              
              {/* Messaging Section */}
                <div className="detail-section">
                  <h3>Messages with Tenant</h3>
                  <div className="messaging-container">
                    <div className="messages-list">
                      {messagesLoading ? (
                        <div className="loading-messages">Loading messages...</div>
                      ) : messages.length > 0 ? (
                        messages.map((message, index) => {
                          const isOwner = message.senderId === getCurrentUserId();
                          return (
                            <div key={message._id || index} className={`message-item ${isOwner ? 'owner-message' : 'tenant-message'}`}>
                              <div className="message-header">
                                <span className="message-sender">
                                  {isOwner ? 'You' : `${selectedRequest.tenantId?.firstName} ${selectedRequest.tenantId?.lastName}`}
                                </span>
                                <span className="message-time">{formatMessageTime(message.timestamp)}</span>
                              </div>
                              <div className="message-content">{message.message}</div>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="message-attachments">
                                  {message.attachments.map((attachment, idx) => (
                                    <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="attachment-link">
                                      📎 Attachment {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-messages">No messages yet. Start a conversation with the tenant.</div>
                      )}
                    </div>
                    
                    <div className="message-input-container">
                      <div className="message-input-wrapper">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message to the tenant..."
                          rows="3"
                          className="message-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage(selectedRequest._id);
                            }
                          }}
                        />
                        <button
                          onClick={() => sendMessage(selectedRequest._id)}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="send-message-btn"
                        >
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              
              {/* Payment Verification Actions */}
              {selectedRequest.status === 'Payment Submitted' && selectedRequest.advancePayment?.proofUrl && (
                <div className="detail-section">
                  <h3>Payment Verification</h3>
                  <div className="payment-verification-actions">
                    <button 
                      onClick={() => handleVerifyPayment(selectedRequest._id)}
                      className="action-btn verify-payment-btn"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Verifying...' : 'Verify & Complete Payment'}
                    </button>
                    <button 
                      onClick={() => handleRejectPayment(selectedRequest._id)}
                      className="action-btn reject-payment-btn"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Rejecting...' : 'Reject Payment Proof'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Modal */}
      {showAdvancePaymentModal && (
        <div className="modal-overlay" onClick={() => setShowAdvancePaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Set Up Advance Payment</h2>
              <button 
                onClick={() => setShowAdvancePaymentModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAdvancePaymentSubmit} className="modal-body">

              {/* Property Price Information */}
              {(() => {
                const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                if (selectedRequest && selectedRequest.propertyId) {
                  const property = selectedRequest.propertyId;
                  const requestType = selectedRequest.requestType;
                  let propertyPrice, maxPercentage, maxAdvanceAmount, priceLabel;
                  
                  if (requestType === 'Buy') {
                    // For buy requests, use sale price with 20% limit
                    propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                    maxPercentage = 0.2;
                    priceLabel = 'Sale Price';
                  } else {
                    // For rent requests, use rent price with 50% limit
                    propertyPrice = property.pricing?.rent || property.rent || property.price;
                    maxPercentage = 0.5;
                    priceLabel = 'Monthly Rent';
                  }
                  
                  if (propertyPrice) {
                    maxAdvanceAmount = propertyPrice * maxPercentage;
                    return (
                      <div className="property-info" style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
                        <h4 style={{margin: '0 0 10px 0', color: '#495057'}}>Property Information</h4>
                        <p style={{margin: '5px 0', color: '#6c757d'}}><strong>Request Type:</strong> {requestType}</p>
                        <p style={{margin: '5px 0', color: '#6c757d'}}><strong>{priceLabel}:</strong> BDT {propertyPrice.toLocaleString()}</p>
                        <p style={{margin: '5px 0', color: '#28a745'}}><strong>Maximum Advance Payment ({maxPercentage * 100}%):</strong> BDT {maxAdvanceAmount.toLocaleString()}</p>
                      </div>
                    );
                  }
                }
                return null;
              })()}
              
              <div className="form-group">
                <label htmlFor="amount">
                  Amount * {(() => {
                    const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                    if (selectedRequest && selectedRequest.propertyId) {
                      const property = selectedRequest.propertyId;
                      const requestType = selectedRequest.requestType;
                      let propertyPrice, maxPercentage;
                      
                      if (requestType === 'Buy') {
                        propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                        maxPercentage = 0.2;
                      } else {
                        propertyPrice = property.pricing?.rent || property.rent || property.price;
                        maxPercentage = 0.5;
                      }
                      
                      if (propertyPrice) {
                        const maxAmount = propertyPrice * maxPercentage;
                        return `(Max: BDT ${maxAmount.toLocaleString()})`;
                      }
                    }
                    return '';
                  })()
                }</label>
                <input
                  type="number"
                  id="amount"
                  value={advancePaymentForm.amount}
                  min="1"
                  max={(() => {
                    const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                    if (selectedRequest && selectedRequest.propertyId) {
                      const property = selectedRequest.propertyId;
                      const requestType = selectedRequest.requestType;
                      let propertyPrice, maxPercentage;
                      
                      if (requestType === 'Buy') {
                        propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                        maxPercentage = 0.2;
                      } else {
                        propertyPrice = property.pricing?.rent || property.rent || property.price;
                        maxPercentage = 0.5;
                      }
                      
                      if (propertyPrice) {
                        return propertyPrice * maxPercentage;
                      }
                    }
                    return undefined;
                  })()}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                    
                    if (selectedRequest && selectedRequest.propertyId) {
                      const property = selectedRequest.propertyId;
                      const requestType = selectedRequest.requestType;
                      let propertyPrice, maxPercentage, priceLabel;
                      
                      if (requestType === 'Buy') {
                        propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                        maxPercentage = 0.2;
                        priceLabel = 'sale price';
                      } else {
                        propertyPrice = property.pricing?.rent || property.rent || property.price;
                        maxPercentage = 0.5;
                        priceLabel = 'monthly rent';
                      }
                      
                      if (propertyPrice) {
                        const maxAmount = propertyPrice * maxPercentage;
                        const numericValue = parseFloat(inputValue);
                        
                        // Prevent input that exceeds maximum limit
                        if (inputValue !== '' && !isNaN(numericValue) && numericValue > maxAmount) {
                          // Don't update the form value if it exceeds the limit
                          setAmountError(`Maximum allowed amount is BDT ${maxAmount.toLocaleString()} (${maxPercentage * 100}% of ${priceLabel})`);
                          return;
                        }
                      
                      // Update the form value
                      setAdvancePaymentForm({...advancePaymentForm, amount: inputValue});
                      
                      // Validate the input
                      if (inputValue === '') {
                        setAmountError('');
                      } else if (isNaN(numericValue)) {
                        setAmountError('Please enter a valid number');
                      } else if (numericValue <= 0) {
                        setAmountError('Amount must be greater than 0');
                      } else {
                        setAmountError('');
                      }
                    } else {
                      setAdvancePaymentForm({...advancePaymentForm, amount: inputValue});
                      setAmountError('');
                    }
                  }
                  }}
                  onKeyDown={(e) => {
                    // Prevent certain keys that could lead to exceeding the limit
                    const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                    if (selectedRequest && selectedRequest.propertyId) {
                      const property = selectedRequest.propertyId;
                      const requestType = selectedRequest.requestType;
                      let propertyPrice, maxPercentage, priceLabel;
                      
                      if (requestType === 'Buy') {
                        propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                        maxPercentage = 0.2;
                        priceLabel = 'sale price';
                      } else {
                        propertyPrice = property.pricing?.rent || property.rent || property.price;
                        maxPercentage = 0.5;
                        priceLabel = 'monthly rent';
                      }
                      
                      if (propertyPrice) {
                        const maxAmount = propertyPrice * maxPercentage;
                        const currentValue = parseFloat(e.target.value) || 0;
                      
                        // Allow backspace, delete, tab, escape, enter, and arrow keys
                        if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                            (e.keyCode === 65 && e.ctrlKey === true) ||
                            (e.keyCode === 67 && e.ctrlKey === true) ||
                            (e.keyCode === 86 && e.ctrlKey === true) ||
                            (e.keyCode === 88 && e.ctrlKey === true)) {
                          return;
                        }
                        
                        // For number keys, check if the resulting value would exceed the limit
                        if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105) || e.keyCode === 190 || e.keyCode === 110) {
                          const newChar = e.key;
                          const currentInput = e.target.value;
                          const selectionStart = e.target.selectionStart;
                          const selectionEnd = e.target.selectionEnd;
                          
                          // Simulate the new value after the key press
                          const newValue = currentInput.substring(0, selectionStart) + newChar + currentInput.substring(selectionEnd);
                          const newNumericValue = parseFloat(newValue);
                          
                          if (!isNaN(newNumericValue) && newNumericValue > maxAmount) {
                            e.preventDefault();
                            setAmountError(`Maximum allowed amount is BDT ${maxAmount.toLocaleString()} (${maxPercentage * 100}% of ${priceLabel})`);
                            return;
                          }
                        }
                      }
                    }
                  }}
                  onPaste={(e) => {
                    // Handle paste events to prevent exceeding the limit
                    const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                    if (selectedRequest && selectedRequest.propertyId) {
                      const property = selectedRequest.propertyId;
                      const requestType = selectedRequest.requestType;
                      let propertyPrice, maxPercentage, priceLabel;
                      
                      if (requestType === 'Buy') {
                        propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                        maxPercentage = 0.2;
                        priceLabel = 'sale price';
                      } else {
                        propertyPrice = property.pricing?.rent || property.rent || property.price;
                        maxPercentage = 0.5;
                        priceLabel = 'monthly rent';
                      }
                      
                      if (propertyPrice) {
                        const maxAmount = propertyPrice * maxPercentage;
                        const pastedData = e.clipboardData.getData('text');
                        const pastedValue = parseFloat(pastedData);
                        
                        if (!isNaN(pastedValue) && pastedValue > maxAmount) {
                          e.preventDefault();
                          setAmountError(`Maximum allowed amount is BDT ${maxAmount.toLocaleString()} (${maxPercentage * 100}% of ${priceLabel})`);
                          return;
                        }
                      }
                    }
                  }}
                  required
                  step="0.01"
                  style={{
                    borderColor: amountError ? '#dc3545' : '#ced4da',
                    boxShadow: amountError ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : 'none'
                  }}
                />
                {amountError && (
                  <div style={{color: '#dc3545', fontSize: '12px', marginTop: '5px', fontWeight: 'bold'}}>
                    {amountError}
                  </div>
                )}
                {(() => {
                  const selectedRequest = requests.find(req => req._id === selectedRequestForPayment);
                  if (selectedRequest && selectedRequest.propertyId) {
                    const property = selectedRequest.propertyId;
                    const requestType = selectedRequest.requestType;
                    let propertyPrice, maxPercentage, priceLabel;
                    
                    if (requestType === 'Buy') {
                      propertyPrice = property.pricing?.sale || property.buyPrice || property.price;
                      maxPercentage = 0.2;
                      priceLabel = 'sale price';
                    } else {
                      propertyPrice = property.pricing?.rent || property.rent || property.price;
                      maxPercentage = 0.5;
                      priceLabel = 'monthly rent';
                    }
                    
                    if (propertyPrice) {
                      const maxAmount = propertyPrice * maxPercentage;
                      return (
                        <small style={{color: '#28a745', fontSize: '12px', fontWeight: '500'}}>
                          Maximum allowed: BDT {maxAmount.toLocaleString()} ({maxPercentage * 100}% of {priceLabel})
                        </small>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
              
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={advancePaymentForm.currency}
                  onChange={(e) => setAdvancePaymentForm({...advancePaymentForm, currency: e.target.value})}
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="dueDate">Due Date *</label>
                <input
                  type="date"
                  id="dueDate"
                  value={advancePaymentForm.dueDate}
                  onChange={(e) => setAdvancePaymentForm({...advancePaymentForm, dueDate: e.target.value})}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="instructions">Payment Instructions</label>
                <textarea
                  id="instructions"
                  value={advancePaymentForm.instructions}
                  onChange={(e) => setAdvancePaymentForm({...advancePaymentForm, instructions: e.target.value})}
                  placeholder="Provide payment instructions for the tenant..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="note">Additional Note</label>
                <textarea
                  id="note"
                  value={advancePaymentForm.note}
                  onChange={(e) => setAdvancePaymentForm({...advancePaymentForm, note: e.target.value})}
                  placeholder="Any additional notes for the tenant..."
                  rows="2"
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAdvancePaymentModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Setting up...' : 'Set Up Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Request</h2>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleRejectSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="rejectReason">Reason for Rejection *</label>
                <textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejecting this request..."
                  rows="4"
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowRejectModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="reject-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && paymentReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <h2>Payment Receipt</h2>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="receipt-modal-body">
              <div className="receipt-content">
                <div className="receipt-header">
                   <h3>Official Receipt</h3>
                   <p className="receipt-id">Receipt ID: {paymentReceipt.receiptData?.receiptId || paymentReceipt.receiptData?.paymentId || 'N/A'}</p>
                 </div>
                 
                 <div className="receipt-details">
                   <div className="detail-section">
                     <h4>Payment Information</h4>
                     <div className="detail-row">
                       <span>Amount:</span>
                       <span className="amount">{paymentReceipt.receiptData?.currency || '৳'} {paymentReceipt.receiptData?.amount?.toLocaleString() || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Payment Date:</span>
                       <span>{paymentReceipt.receiptData?.paidAt ? new Date(paymentReceipt.receiptData.paidAt).toLocaleDateString() : 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Payment Method:</span>
                       <span>{paymentReceipt.receiptData?.paymentMethod || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Transaction ID:</span>
                       <span>{paymentReceipt.receiptData?.transactionId || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Status:</span>
                       <span className="status-paid">{paymentReceipt.receiptData?.paymentStatus || 'Paid'}</span>
                     </div>
                   </div>
                   
                   <div className="detail-section">
                     <h4>Request Information</h4>
                     <div className="detail-row">
                       <span>Request ID:</span>
                       <span>{paymentReceipt.receiptData?.request?.requestId || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Request Type:</span>
                       <span>{paymentReceipt.receiptData?.request?.requestType || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Request Status:</span>
                       <span>{paymentReceipt.receiptData?.request?.status || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Submitted Date:</span>
                       <span>{paymentReceipt.receiptData?.request?.submittedAt ? new Date(paymentReceipt.receiptData.request.submittedAt).toLocaleDateString() : 'N/A'}</span>
                     </div>
                   </div>
                   
                   <div className="detail-section">
                     <h4>Property Information</h4>
                     <div className="detail-row">
                       <span>Address:</span>
                       <span>{paymentReceipt.receiptData?.property?.address || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Property Price:</span>
                       <span>৳ {paymentReceipt.receiptData?.property?.price?.toLocaleString() || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Description:</span>
                       <span>{paymentReceipt.receiptData?.property?.description || 'N/A'}</span>
                     </div>
                   </div>
                   
                   <div className="detail-section">
                     <h4>Tenant Information</h4>
                     <div className="detail-row">
                       <span>Name:</span>
                       <span>{paymentReceipt.receiptData?.tenant?.name || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Email:</span>
                       <span>{paymentReceipt.receiptData?.tenant?.email || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Phone:</span>
                       <span>{paymentReceipt.receiptData?.tenant?.phone || 'N/A'}</span>
                     </div>
                   </div>
                   
                   <div className="detail-section">
                     <h4>Owner Information</h4>
                     <div className="detail-row">
                       <span>Name:</span>
                       <span>{paymentReceipt.receiptData?.owner?.name || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Email:</span>
                       <span>{paymentReceipt.receiptData?.owner?.email || 'N/A'}</span>
                     </div>
                     <div className="detail-row">
                       <span>Phone:</span>
                       <span>{paymentReceipt.receiptData?.owner?.phone || 'N/A'}</span>
                     </div>
                   </div>
                 </div>
                
                <div className="receipt-footer">
                  <p>This is an official receipt for the advance payment made through our platform.</p>
                  <p>Generated on: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="receipt-actions">
                {paymentReceipt.receiptUrl && (
                  <button 
                    onClick={() => window.open(paymentReceipt.receiptUrl, '_blank')}
                    className="action-btn view-btn"
                  >
                    <FaReceipt /> View Official Receipt
                  </button>
                )}
                <button 
                  onClick={() => window.print()}
                  className="action-btn print-btn"
                >
                  <FaPrint /> Print Receipt
                </button>
                <button 
                  onClick={() => {
                    const element = document.createElement('a');
                    const file = new Blob([document.querySelector('.receipt-content').outerHTML], {type: 'text/html'});
                    element.href = URL.createObjectURL(file);
                    element.download = `receipt-${paymentReceipt.receiptId}.html`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                  className="action-btn download-btn"
                >
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  } catch (renderError) {
    console.error('🔍 Render error in OwnerRequestsInbox:', renderError);
    return (
      <div className="owner-requests-container">
        <div className="error-message">
          <p>Something went wrong while rendering the page.</p>
          <p>Error: {renderError.message}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default OwnerRequestsInbox;