import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaClock, FaCheck, FaExclamationTriangle, FaReceipt, FaCalendarAlt, FaSync } from 'react-icons/fa';
import apiConfig from '../../config/api';
import './OwnerProfile.css';

const OwnerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalCompleted: 0,
    totalAmount: 0,
    nextDueDate: null
  });

  const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');

  useEffect(() => {
    fetchPayments();
    
    // Handle Stripe checkout return
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const sessionId = urlParams.get('session_id');
    const paymentId = urlParams.get('payment_id');
    
    if (status === 'success' && sessionId) {
      setError('');
      setSuccessMessage('Payment completed successfully! Your payment status has been updated.');
      // Show success message and refresh data
      setTimeout(() => {
        fetchPayments();
      }, 1000);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiConfig.getUrl('/api/payments'), {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched payments data:', data);
        console.log('User from localStorage:', user);
        // Backend already filters payments for the authenticated user
        // No additional filtering needed
        setPayments(data);
        calculateStats(data);
      } else {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        setError(`Failed to fetch payment data: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentData) => {
    const pending = paymentData.filter(p => p.status === 'pending');
    const completed = paymentData.filter(p => p.status === 'completed');
    const totalAmount = completed.reduce((sum, p) => sum + p.amount, 0);
    
    // Find next due date from pending payments
    const nextDue = pending
      .map(p => new Date(p.dueDate))
      .filter(date => date > new Date())
      .sort((a, b) => a - b)[0];

    setStats({
      totalPending: pending.length,
      totalCompleted: completed.length,
      totalAmount,
      nextDueDate: nextDue
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="status-icon completed" />;
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'failed':
        return <FaExclamationTriangle className="status-icon failed" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePayNow = async (payment) => {
    try {
      setLoading(true);
      console.log('Processing subscription payment:', payment);
      
      // Get current page URL for redirect after payment
      const currentUrl = window.location.href;
      
      // Create Stripe payment session for subscription
      const response = await fetch(apiConfig.getUrl(apiConfig.endpoints.createSubscriptionPaymentSession), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: payment._id,
          amount: payment.amount,
          currency: payment.currency || 'BDT',
          description: payment.description || 'Monthly Subscription Fee',
          subscriptionPeriod: payment.billingPeriod || {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          },
          redirectUrl: currentUrl
        })
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Failed to process payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPayments = async () => {
    setRefreshing(true);
    setError('');
    setSuccessMessage('');
    
    try {
      // First, refresh the payments data
      await fetchPayments();
      
      // Then check for any pending payments that might have been completed
      const pendingPayments = payments.filter(p => p.status === 'pending');
      
      if (pendingPayments.length > 0) {
        // Check payment status for each pending payment
        for (const payment of pendingPayments) {
          if (payment.stripeSessionId) {
            try {
              const response = await fetch(apiConfig.getUrl(`/api/stripe/payment-status/${payment.stripeSessionId}`), {
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const statusData = await response.json();
                if (statusData.status === 'completed' && payment.status === 'pending') {
                  setSuccessMessage('Payment status updated! Some payments have been completed.');
                }
              }
            } catch (error) {
              console.error('Error checking payment status:', error);
            }
          }
        }
      }
      
      // Refresh payments again to get updated data
      await fetchPayments();
      
    } catch (error) {
      console.error('Error refreshing payments:', error);
      setError('Failed to refresh payment status');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (activeTab === 'pending') return payment.status === 'pending';
    if (activeTab === 'completed') return payment.status === 'completed';
    return true; // 'all' tab
  });

  if (loading) {
    return (
      <div className="owner-payments">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-payments">
      <div className="payments-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Payment Management</h2>
            <p>Manage your subscription payments and view payment history</p>
          </div>
          <button 
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefreshPayments}
            disabled={refreshing}
            title="Refresh payment status"
          >
            <FaSync className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <FaCheck /> {successMessage}
        </div>
      )}

      {/* Payment Statistics */}
      <div className="payment-stats">
        <div className="stat-card pending">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-content">
            <h3>{stats.totalPending}</h3>
            <p>Pending Payments</p>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">
            <FaCheck />
          </div>
          <div className="stat-content">
            <h3>{stats.totalCompleted}</h3>
            <p>Completed Payments</p>
          </div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon">
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalAmount)}</h3>
            <p>Total Paid</p>
          </div>
        </div>
        <div className="stat-card due-date">
          <div className="stat-icon">
            <FaCalendarAlt />
          </div>
          <div className="stat-content">
            <h3>{stats.nextDueDate ? formatDate(stats.nextDueDate) : 'N/A'}</h3>
            <p>Next Due Date</p>
          </div>
        </div>
      </div>

      {/* Payment Tabs */}
      <div className="payment-tabs">
        <button 
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({stats.totalPending})
        </button>
        <button 
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({stats.totalCompleted})
        </button>
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Payments ({payments.length})
        </button>
      </div>

      {/* Payment List */}
      <div className="payments-container">
        {filteredPayments.length === 0 ? (
          <div className="no-payments">
            <FaMoneyBillWave className="no-payments-icon" />
            <h3>No {activeTab === 'all' ? '' : activeTab} payments found</h3>
            <p>
              {activeTab === 'pending' 
                ? 'You have no pending payments at the moment.'
                : activeTab === 'completed'
                ? 'No completed payments to display.'
                : 'No payment records found.'}
            </p>
          </div>
        ) : (
          <div className="payments-grid">
            {filteredPayments.map((payment) => (
              <div key={payment._id} className={`payment-card ${payment.status}`}>
                <div className="payment-header">
                  <div className="payment-id">
                    <strong>#{payment.paymentId || payment._id.slice(-6)}</strong>
                  </div>
                  <div className="payment-status">
                    {getStatusIcon(payment.status)}
                    <span className={`status-text ${payment.status}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="payment-details">
                  <div className="payment-amount">
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>
                  <div className="payment-description">
                    {payment.description || 'Monthly Subscription Fee'}
                  </div>
                  <div className="payment-dates">
                    <div className="due-date">
                      <strong>Due:</strong> {formatDate(payment.dueDate)}
                    </div>
                    {payment.paidAt && (
                      <div className="paid-date">
                        <strong>Paid:</strong> {formatDate(payment.paidAt)}
                      </div>
                    )}
                    {payment.billingPeriod && (
                      <div className="billing-period">
                        <strong>Period:</strong> {formatDate(payment.billingPeriod.startDate)} - {formatDate(payment.billingPeriod.endDate)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="payment-actions">
                  {payment.status === 'pending' ? (
                    <button 
                      className="pay-now-btn"
                      onClick={() => handlePayNow(payment)}
                    >
                      <FaMoneyBillWave /> Pay Now
                    </button>
                  ) : (
                    <button className="receipt-btn" disabled>
                      <FaReceipt /> Receipt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerPayments;