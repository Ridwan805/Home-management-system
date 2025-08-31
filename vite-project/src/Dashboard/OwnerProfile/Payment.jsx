import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import './Payment.css';

const Payment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [error, setError] = useState(null);
  
  const [subscriptionInvoices, setSubscriptionInvoices] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Fetch subscription invoices and payment history
  useEffect(() => {
    fetchSubscriptionInvoices();
    fetchPaymentHistory();
  }, []);

  const fetchSubscriptionInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(API.getUrl('/api/payments/owner'), {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${user.token}`,
           'Content-Type': 'application/json'
         }
       });
       
       if (!response.ok) {
         throw new Error('Failed to fetch invoices');
       }
       
       const data = await response.json();
       setSubscriptionInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error fetching subscription invoices:', error);
      setError(error.message);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setLoadingPayments(true);
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(API.getUrl('/api/payments/owner/history'), {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${user.token}`,
           'Content-Type': 'application/json'
         }
       });
       
       if (!response.ok) {
         throw new Error('Failed to fetch payment history');
       }
       
       const data = await response.json();
       setPaymentHistory(data.payments || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError(error.message);
    } finally {
      setLoadingPayments(false);
    }
  };
  
  // Handle payment process
  const handlePayInvoice = async (invoice) => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(API.getUrl('/api/stripe/create-subscription-payment-session'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoice._id,
          amount: invoice.amount,
          description: `Subscription Fee - ${formatDate(invoice.dueDate)}`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }
      
      const data = await response.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No payment session URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment processing failed: ${error.message}`);
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  // Utility functions
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `৳${amount.toLocaleString()}`;
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      default: return 'status-pending';
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h2>Payments</h2>
        <div className="payment-tabs">
          <button 
            className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Subscription Invoices
          </button>
          <button 
            className={`tab-button ${activeTab === 'paymentHistory' ? 'active' : ''}`}
            onClick={() => setActiveTab('paymentHistory')}
          >
            Payment History
          </button>
          <button 
            className="refresh-button"
            onClick={() => {
              fetchSubscriptionInvoices();
              fetchPaymentHistory();
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="payment-content">
        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
            <button onClick={() => {
              setError(null);
              fetchSubscriptionInvoices();
              fetchPaymentHistory();
            }}>Retry</button>
          </div>
        )}
        
        {activeTab === 'invoices' ? (
          <div className="invoices-section">
            <h3>Subscription Invoices</h3>
            {loadingInvoices ? (
              <div className="loading-state">Loading invoices...</div>
            ) : subscriptionInvoices.length === 0 ? (
              <div className="empty-state">
                <p>No subscription invoices found.</p>
              </div>
            ) : (
              <div className="invoices-table-container">
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionInvoices.map(invoice => (
                      <tr key={invoice._id}>
                        <td>#{invoice._id.slice(-8)}</td>
                        <td>{invoice.description || 'Monthly Subscription Fee'}</td>
                        <td>{formatCurrency(invoice.amount)}</td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>
                          <span className={`payment-status ${getStatusClass(invoice.status)}`}>
                            {invoice.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          {invoice.status !== 'paid' && (
                            <button 
                              className="pay-button"
                              onClick={() => openPaymentModal(invoice)}
                              disabled={loading}
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="payment-history-section">
            <h3>Payment History</h3>
            {loadingPayments ? (
              <div className="loading-state">Loading payment history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="empty-state">
                <p>No payment history found.</p>
              </div>
            ) : (
              <table className="payment-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(payment => (
                    <tr key={payment._id}>
                      <td>{formatDate(payment.paidAt || payment.createdAt)}</td>
                      <td>{payment.description || 'Subscription Payment'}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.method || 'Stripe'}</td>
                      <td>
                        <span className={`payment-status ${getStatusClass(payment.status)}`}>
                          {payment.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h3>Pay Invoice</h3>
              <button 
                className="close-button"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="invoice-details">
                <div className="detail-row">
                  <span>Invoice #:</span>
                  <span>#{selectedInvoice._id.slice(-8)}</span>
                </div>
                <div className="detail-row">
                  <span>Description:</span>
                  <span>{selectedInvoice.description || 'Monthly Subscription Fee'}</span>
                </div>
                <div className="detail-row">
                  <span>Amount:</span>
                  <span className="amount">{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="detail-row">
                  <span>Due Date:</span>
                  <span>{formatDate(selectedInvoice.dueDate)}</span>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="pay-now-button"
                  onClick={() => handlePayInvoice(selectedInvoice)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;