import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import './PaymentInfo.css';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div style={{
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  }}>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const PaymentInfo = () => {
  const [invoices, setInvoices] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices'); // New state for tab management
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Use a single API call to fetch both invoices and payment history
    const fetchAllData = async () => {
      try {
        const response = await authenticatedFetch(
          'http://localhost:5001/api/payments/my-payments',
          { method: 'GET' },
          navigate
        );
        
        console.log('🔍 Payment API Response:', response);
        console.log('📄 Invoices:', response.data?.pendingInvoices);
        console.log('💰 Payment History:', response.data?.paymentHistory);
        
        setInvoices(response.data?.pendingInvoices || []);
        setPaymentHistory(response.data?.paymentHistory || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
    
    // Handle Stripe checkout return
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const sessionId = urlParams.get('session_id');
    const paymentId = urlParams.get('payment_id');
    
    if (status === 'success' && sessionId) {
      setError('');
      setSuccessMessage('Payment completed successfully! Your invoice has been updated.');
      // Refresh data after successful payment
      setTimeout(() => {
        fetchAllData();
      }, 1000);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/payments/my-payments',
        { method: 'GET' },
        navigate
      );
      setInvoices(response.data?.pendingInvoices || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try refreshing the page.');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/payments/my-payments',
        { method: 'GET' },
        navigate
      );
      setPaymentHistory(response.data?.paymentHistory || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Failed to load payment history. Please try refreshing the page.');
    } finally {
      setLoadingHistory(false);
      setLoading(false);
    }
  };

  const handlePayInvoice = (invoice) => {
    if (invoice.payment && invoice.payment._id) {
      // Direct payment processing for invoices with payment objects
      processPaymentDirect(invoice.payment._id);
    } else {
      // Fallback to modal for legacy invoices
      setSelectedInvoice(invoice);
      setShowPaymentModal(true);
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const processPayment = async () => {
    if (!selectedInvoice) return;
    
    setProcessingPayment(true);
    try {
      const response = await authenticatedFetch(
        `http://localhost:5001/api/invoices/${selectedInvoice._id}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: selectedInvoice.total,
            currency: 'USD'
          })
        },
        navigate
      );
      
      if (response.success && response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else {
        setError('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
      setShowPaymentModal(false);
    }
  };

  const processPaymentDirect = async (paymentId) => {
    setProcessingPayment(true);
    try {
      const response = await authenticatedFetch(
        'http://localhost:5001/api/stripe/create-invoice-payment-session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ paymentId })
        },
        navigate
      );
      
      if (response.success && response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else {
        setError('Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'succeeded':
        return 'status-badge status-paid';
      case 'overdue':
        return 'status-badge status-overdue';
      case 'pending':
      case 'processing':
        return 'status-badge status-pending';
      case 'failed':
      case 'cancelled':
        return 'status-badge status-overdue';
      default:
        return 'status-badge status-pending';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateSummary = () => {
    const totalOutstanding = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const totalPaid = paymentHistory
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { totalOutstanding, totalPaid, overdueAmount };
  };

  // Add a refresh button to manually refresh invoices and payment history
  const refreshData = () => {
    setLoadingInvoices(true);
    setLoadingHistory(true);
    // Use a single API call to refresh both invoices and payment history
    const refreshAll = async () => {
      try {
        const response = await authenticatedFetch(
          'http://localhost:5001/api/payments/my-payments',
          { method: 'GET' },
          navigate
        );
        setInvoices(response.data?.pendingInvoices || []);
        setPaymentHistory(response.data?.paymentHistory || []);
        setError(null);
      } catch (err) {
        console.error('Error refreshing data:', err);
        setError('Failed to refresh data. Please try again.');
      } finally {
        setLoadingInvoices(false);
        setLoadingHistory(false);
      }
    };
    refreshAll();
  };

  if (loading) {
    return (
      <div className="payment-info">
        <LoadingSpinner />
      </div>
    );
  }

  const { totalOutstanding, totalPaid, overdueAmount } = calculateSummary();

  return (
    <div className="payment-info">
      <h2 className="section-title">Payment Information</h2>
      
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message" style={{ 
          backgroundColor: '#dcfce7', 
          color: '#16a34a', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #bbf7d0'
        }}>
          <strong>Success:</strong> {successMessage}
        </div>
      )}

      {/* Payment Summary */}
      <div className="payment-summary">
        <div className="summary-card">
          <h3>Outstanding Balance</h3>
          <p className="amount">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="summary-card">
          <h3>Total Paid</h3>
          <p className="amount">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="summary-card">
          <h3>Overdue Amount</h3>
          <p className="amount" style={{ color: overdueAmount > 0 ? '#dc2626' : '#059669' }}>
            {formatCurrency(overdueAmount)}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Payment History
        </button>
        <button
          className="refresh-btn"
          onClick={refreshData}
        >
          <span role="img" aria-label="refresh" style={{ marginRight: '0.5rem' }}>🔄</span>
          Refresh
        </button>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bills-container">
          <h3>Current Bills {loadingInvoices && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>(Loading...)</span>}</h3>
          {loadingInvoices ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <p>No invoices found.</p>
          ) : (
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>#{invoice.invoiceNo || invoice._id.slice(-6)}</td>
                    <td>{invoice.propertyId?.displayName || invoice.propertyId?.title || invoice.property?.title || 'N/A'}</td>
                    <td>{formatCurrency(invoice.total || invoice.amount)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>
                      <span className={getStatusBadgeClass(invoice.status)}>
                        {invoice.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {invoice.status !== 'paid' && invoice.status !== 'completed' ? (
                        <button
                          className="pay-btn"
                          onClick={() => handlePayInvoice(invoice)}
                          disabled={processingPayment}
                        >
                          Pay Online
                        </button>
                      ) : (
                        <span className="paid-date">
                          Paid {formatDate(invoice.paidAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <div className="bills-container">
          <h3>Payment History {loadingHistory && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>(Loading...)</span>}</h3>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading payment history...</p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <p>No payment history found.</p>
          ) : (
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => {
                  console.log('🔍 Rendering payment:', {
                    id: payment._id,
                    status: payment.status,
                    method: payment.method,
                    provider: payment.provider,
                    amount: payment.amount
                  });
                  
                  return (
                    <tr key={payment._id}>
                      <td>{formatDate(payment.paidAt || payment.createdAt)}</td>
                      <td>{payment.invoiceId?.propertyId?.displayName || payment.invoiceId?.propertyId?.address || payment.rentId?.propertyId?.displayName || payment.rentId?.propertyId?.address || 'N/A'}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.method || payment.provider || 'Stripe'}</td>
                      <td>
                        <span className={getStatusBadgeClass(payment.status)}>
                          {payment.status || 'completed'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="receipt-btn"
                          onClick={() => handleViewReceipt(payment)}
                          title="View Receipt"
                        >
                          📄 Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Pay Invoice</h3>
              <button
                className="close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-details">
                <p><strong>Invoice #:</strong> #{selectedInvoice.invoiceNo || selectedInvoice._id.slice(-6)}</p>
                <p><strong>Property:</strong> {selectedInvoice.propertyId?.displayName || selectedInvoice.propertyId?.title || selectedInvoice.property?.title || 'N/A'}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedInvoice.total)}</p>
                <p><strong>Due Date:</strong> {formatDate(selectedInvoice.dueDate)}</p>
              </div>
              
              <div className="form-actions">
                <button
                  className="pay-btn"
                  onClick={processPayment}
                  disabled={processingPayment}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {processingPayment ? 'Processing...' : 'Pay with Stripe'}
                </button>
                <button
                  className="close-btn"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedPayment && (
        <div className="payment-modal-overlay">
          <div className="payment-modal receipt-modal">
            <div className="modal-header">
              <h3>Payment Receipt</h3>
              <button
                className="close-btn"
                onClick={() => setShowReceiptModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt-details">
                <div className="receipt-header">
                  <div className="receipt-meta">
                    <span className="receipt-time">{new Date(selectedPayment.paidAt || selectedPayment.createdAt).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    <span className="receipt-id">Payment Receipt - {selectedPayment.paymentId || selectedPayment._id.slice(-8)}</span>
                  </div>
                  <h4>Payment Receipt</h4>
                  <div className="receipt-info">
                    <span className="receipt-id-label">Receipt ID: {selectedPayment.paymentId || selectedPayment._id.slice(-8)}</span>
                    <span className="receipt-generated">Generated on: {new Date(selectedPayment.paidAt || selectedPayment.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} {new Date(selectedPayment.paidAt || selectedPayment.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  </div>
                </div>
                
                <div className="receipt-section">
                  <h5>Payment Details</h5>
                  <div className="receipt-row">
                    <span className="label">Amount:</span>
                    <span className="value amount">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Payment Status:</span>
                    <span className="value status-success">{selectedPayment.status?.toUpperCase() || 'COMPLETED'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Payment Method:</span>
                    <span className="value">{selectedPayment.method || selectedPayment.provider || 'stripe'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Payment Date:</span>
                    <span className="value">{formatDate(selectedPayment.paidAt || selectedPayment.createdAt)}</span>
                  </div>
                  {selectedPayment.stripeDetails?.paymentIntentId && (
                    <div className="receipt-row">
                      <span className="label">Transaction ID:</span>
                      <span className="value">{selectedPayment.stripeDetails.paymentIntentId}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-section">
                  <h5>Request Details</h5>
                  <div className="receipt-row">
                    <span className="label">Request ID:</span>
                    <span className="value">{selectedPayment.paymentId || selectedPayment._id.slice(-8)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Request Type:</span>
                    <span className="value">{selectedPayment.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rent'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Request Status:</span>
                    <span className="value status-success">Paid/Completed</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Submitted Date:</span>
                    <span className="value">{formatDate(selectedPayment.createdAt)}</span>
                  </div>
                </div>

                <div className="receipt-section">
                  <h5>Property Details</h5>
                  <div className="receipt-row">
                    <span className="label">Address:</span>
                    <span className="value">{selectedPayment.invoiceId?.propertyId?.displayName || selectedPayment.invoiceId?.propertyId?.address || selectedPayment.rentId?.propertyId?.displayName || selectedPayment.rentId?.propertyId?.address || 'N/A'}</span>
                  </div>
                  {selectedPayment.invoiceId?.invoiceNo && (
                    <div className="receipt-row">
                      <span className="label">Invoice #:</span>
                      <span className="value">#{selectedPayment.invoiceId.invoiceNo}</span>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span className="label">Property Price:</span>
                    <span className="value">৳{selectedPayment.amount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Description:</span>
                    <span className="value">{selectedPayment.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rent Payment'}</span>
                  </div>
                </div>

                <div className="receipt-actions">
                  <button
                    className="print-btn"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Receipt
                  </button>
                  <button
                    className="close-btn"
                    onClick={() => setShowReceiptModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo;