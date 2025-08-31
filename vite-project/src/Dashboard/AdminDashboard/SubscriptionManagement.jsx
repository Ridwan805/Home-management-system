import React, { useState, useEffect } from 'react';
<<<<<<< Updated upstream
import { FaSearch, FaFilter, FaDownload, FaEdit, FaPause, FaPlay, FaTrash, FaEye, FaExclamationTriangle, FaCheckCircle, FaClock, FaBan, FaCreditCard, FaDollarSign } from 'react-icons/fa';
import './adminDashboard.css';

const SubscriptionManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'payments'
  const [stats, setStats] = useState({
    totalAdmins: 0,
    invoices: { total: 0, byStatus: [], currentMonth: 0 },
    payments: { total: 0, byStatus: [], currentMonth: 0 },
    revenue: { total: 0, currentMonth: 0 }
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'view', 'pay'
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
    fetchStats();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch('http://localhost:5001/api/admin/subscription/invoices', {
=======
import { FaMoneyBillWave, FaFileInvoice, FaUsers, FaSync, FaCheck, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import apiConfig from '../../config/api';
import './adminDashboard.css';

const SubscriptionManagement = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    totalOwners: 0,
    pendingPayments: 0,
    completedPayments: 0,
    totalRevenue: 0
  });

  const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');

  useEffect(() => {
    fetchSubscriptionData();
    fetchSubscriptionStats();
  }, []);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      // Fetch payment data
      const paymentRes = await fetch(apiConfig.getUrl('/api/payments'), {
>>>>>>> Stashed changes
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
<<<<<<< Updated upstream

      if (!response.ok) {
        throw new Error('Failed to fetch admin subscription invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
=======
      
      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        const subscriptionPayments = paymentData.filter(payment => 
          payment.metadata?.subscriptionPayment || payment.tags?.includes('subscription')
        );
        setPayments(subscriptionPayments);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setMessage('Failed to load subscription data');
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  };

<<<<<<< Updated upstream
  const fetchPayments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch('http://localhost:5001/api/admin/subscription/payments', {
=======
  const fetchSubscriptionStats = async () => {
    try {
      const res = await fetch(apiConfig.getUrl(apiConfig.endpoints.subscriptionStats), {
>>>>>>> Stashed changes
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
<<<<<<< Updated upstream

      if (!response.ok) {
        throw new Error('Failed to fetch admin subscription payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch('http://localhost:5001/api/admin/subscription/stats', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin subscription stats');
      }

      const data = await response.json();
      setStats(data.stats || stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFreezeSubscription = async (subscriptionId, reason) => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch(`/api/subscriptions/${subscriptionId}/freeze`, {
=======
      
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalOwners: data.data.totalOwners,
          pendingPayments: data.data.pendingPayments,
          completedPayments: data.data.completedPayments,
          totalRevenue: data.data.totalRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    }
  };

  const createMonthlyInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiConfig.getUrl(apiConfig.endpoints.createMonthlyInvoices), {
>>>>>>> Stashed changes
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
<<<<<<< Updated upstream
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to freeze subscription');
      }

      await fetchSubscriptions();
      await fetchStats();
      setShowModal(false);
      setSelectedSubscription(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreezeSubscription = async (subscriptionId, reason) => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch(`/api/subscriptions/${subscriptionId}/unfreeze`, {
=======
        body: JSON.stringify({ amount: 1200 }) // Default subscription amount
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`Successfully created ${data.data.invoicesCreated} monthly invoices for ${data.data.period.month}/${data.data.period.year}`);
        fetchSubscriptionStats();
        fetchSubscriptionData();
      } else {
        setMessage(data.message || 'Failed to create monthly invoices');
      }
    } catch (error) {
      console.error('Error creating monthly invoices:', error);
      setMessage('Failed to create monthly invoices');
    } finally {
      setLoading(false);
    }
  };

  const createSubscriptionPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiConfig.getUrl('/api/payments/admin/create-subscription-payments'), {
>>>>>>> Stashed changes
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
<<<<<<< Updated upstream
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to unfreeze subscription');
      }

      await fetchSubscriptions();
      await fetchStats();
      setShowModal(false);
      setSelectedSubscription(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConfig = async (subscriptionId, config) => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch(`/api/subscriptions/${subscriptionId}/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription config');
      }

      await fetchSubscriptions();
      setShowModal(false);
      setSelectedSubscription(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.billTo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.payer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment._id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FaCheckCircle className="status-icon active" />;
      case 'warning': return <FaExclamationTriangle className="status-icon warning" />;
      case 'overdue': return <FaClock className="status-icon overdue" />;
      case 'frozen': return <FaPause className="status-icon frozen" />;
      case 'cancelled': return <FaBan className="status-icon cancelled" />;
      default: return <FaClock className="status-icon" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
=======
        body: JSON.stringify({ amount: 12000 })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`Created ${data.data.summary.successfulPayments} subscription payment records`);
        fetchSubscriptionData();
      } else {
        setMessage(data.message || 'Failed to create subscription payments');
      }
    } catch (error) {
      console.error('Error creating subscription payments:', error);
      setMessage('Failed to create subscription payments');
    } finally {
      setLoading(false);
    }
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
>>>>>>> Stashed changes
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

<<<<<<< Updated upstream
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="subscription-management">
        <div className="loading-spinner">
          <FaClock /> Loading admin subscription data...
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-management">
      <div className="subscription-header">
        <h2>Admin Subscription Management</h2>
        <div className="subscription-actions">
          <button className="btn-export">
            <FaDownload /> Export Data
=======
  return (
    <div className="subscription-management">
      <div className="subscription-header">
        <h2>Subscription Management</h2>
        <div className="subscription-actions">
          <button 
            onClick={createMonthlyInvoices} 
            disabled={loading}
            className="action-button primary"
          >
            <FaFileInvoice /> Create Monthly Invoices
          </button>
          <button 
            onClick={createSubscriptionPayments} 
            disabled={loading}
            className="action-button secondary"
          >
            <FaMoneyBillWave /> Generate Payment Records
          </button>
          <button 
            onClick={() => {
              fetchSubscriptionData();
              fetchSubscriptionStats();
            }} 
            disabled={loading}
            className="action-button refresh"
          >
            <FaSync /> Refresh
>>>>>>> Stashed changes
          </button>
        </div>
      </div>

<<<<<<< Updated upstream
      {error && (
        <div className="error-message">
          <FaExclamationTriangle /> {error}
          <button onClick={() => setError('')} className="retry-button">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="subscription-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <FaCreditCard />
          </div>
          <div className="stat-content">
            <h3>Total Admins</h3>
            <div className="stat-value">{stats.totalAdmins}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3>Total Invoices</h3>
            <div className="stat-value">{stats.invoices?.total || 0}</div>
=======
      {message && (
        <div className={`message ${message.includes('success') || message.includes('Created') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="subscription-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>{stats.totalOwners}</h3>
            <p>Total Owners</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <FaClock />
          </div>
          <div className="stat-content">
            <h3>{stats.pendingPayments}</h3>
            <p>Pending Payments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completed">
            <FaCheck />
          </div>
          <div className="stat-content">
            <h3>{stats.completedPayments}</h3>
            <p>Completed Payments</p>
>>>>>>> Stashed changes
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon revenue">
<<<<<<< Updated upstream
            <FaDollarSign />
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <div className="stat-value">${stats.revenue?.total || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon current-month">
            <FaClock />
          </div>
          <div className="stat-content">
            <h3>This Month</h3>
            <div className="stat-value">${stats.revenue?.currentMonth || 0}</div>
=======
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalRevenue)}</h3>
            <p>Total Revenue</p>
>>>>>>> Stashed changes
          </div>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FaCreditCard /> Invoices ({invoices.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <FaDollarSign /> Payments ({payments.length})
        </button>
      </div>

      {/* Filters */}
      <div className="subscription-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <FaFilter className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="warning">Warning</option>
            <option value="overdue">Overdue</option>
            <option value="frozen">Frozen</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="tab-content">
        {activeTab === 'invoices' && (
          <div className="invoices-list">
            {filteredInvoices.length === 0 ? (
              <div className="no-data">
                No invoices found matching your criteria.
              </div>
            ) : (
              filteredInvoices.map(invoice => (
                <div key={invoice._id} className="invoice-card">
                  <div className="invoice-header">
                    <div className="invoice-info">
                      <h3>Invoice #{invoice.invoiceNumber}</h3>
                      <p>{invoice.billTo?.email}</p>
                    </div>
                    <div className="invoice-status">
                      <span className={`status-badge ${invoice.status}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="invoice-details">
                    <div className="detail-item">
                      <strong>Amount:</strong> ${invoice.amount}
                    </div>
                    <div className="detail-item">
                      <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
                    </div>
                    <div className="detail-item">
                      <strong>Created:</strong> {formatDate(invoice.createdAt)}
                    </div>
                    {invoice.paidAt && (
                      <div className="detail-item">
                        <strong>Paid:</strong> {formatDate(invoice.paidAt)}
                      </div>
                    )}
                  </div>

                  <div className="invoice-actions">
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedItem(invoice);
                        setModalType('view');
                        setShowModal(true);
                      }}
                    >
                      <FaEye /> View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-list">
            {filteredPayments.length === 0 ? (
              <div className="no-data">
                No payments found matching your criteria.
              </div>
            ) : (
              filteredPayments.map(payment => (
                <div key={payment._id} className="payment-card">
                  <div className="payment-header">
                    <div className="payment-info">
                      <h3>Payment #{payment._id.slice(-8)}</h3>
                      <p>{payment.payer?.email}</p>
                    </div>
                    <div className="payment-status">
                      <span className={`status-badge ${payment.status}`}>
=======
      {/* Payment Records */}
      <div className="subscription-section">
        <h3>Recent Subscription Payments</h3>
        {loading ? (
          <div className="loading">Loading subscription data...</div>
        ) : (
          <div className="payments-grid">
            {payments.length === 0 ? (
              <div className="no-data">
                <p>No subscription payments found. Create payment records to get started.</p>
              </div>
            ) : (
              payments.slice(0, 10).map((payment) => (
                <div key={payment._id} className="payment-card">
                  <div className="payment-header">
                    <div className="payment-id">
                      <strong>#{payment.paymentId}</strong>
                    </div>
                    <div className="payment-status">
                      {getStatusIcon(payment.status)}
                      <span className={`status-text ${payment.status}`}>
>>>>>>> Stashed changes
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>
<<<<<<< Updated upstream

                  <div className="payment-details">
                    <div className="detail-item">
                      <strong>Amount:</strong> ${payment.amount}
                    </div>
                    <div className="detail-item">
                      <strong>Method:</strong> {payment.method}
                    </div>
                    <div className="detail-item">
                      <strong>Date:</strong> {formatDate(payment.createdAt)}
                    </div>
                    {payment.invoice && (
                      <div className="detail-item">
                        <strong>Invoice:</strong> #{payment.invoice.invoiceNumber}
                      </div>
                    )}
                  </div>

                  <div className="payment-actions">
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedItem(payment);
                        setModalType('view');
                        setShowModal(true);
                      }}
                    >
                      <FaEye /> View Details
                    </button>
=======
                  <div className="payment-details">
                    <div className="payment-amount">
                      <strong>{formatCurrency(payment.amount)}</strong>
                    </div>
                    <div className="payment-description">
                      {payment.description}
                    </div>
                    <div className="payment-dates">
                      <div>Due: {formatDate(payment.dueDate)}</div>
                      {payment.paidAt && (
                        <div>Paid: {formatDate(payment.paidAt)}</div>
                      )}
                    </div>
>>>>>>> Stashed changes
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
<<<<<<< Updated upstream

      {/* Modal for various actions */}
      {showModal && selectedItem && (
        <ItemModal
          item={selectedItem}
          type={modalType}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
            setModalType('');
          }}
        />
      )}
    </div>
  );
};

// Item Modal Component (for invoices and payments)
const ItemModal = ({ item, type, onClose }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isInvoice = item?.invoiceNumber !== undefined;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            {isInvoice ? 'Invoice Details' : 'Payment Details'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="item-view">
            {isInvoice ? (
              <>
                <div className="detail-section">
                  <h4>Invoice Information</h4>
                  <p><strong>Invoice Number:</strong> {item.invoiceNumber}</p>
                  <p><strong>Amount:</strong> {formatCurrency(item.amount)}</p>
                  <p><strong>Status:</strong> {item.status}</p>
                  <p><strong>Due Date:</strong> {formatDate(item.dueDate)}</p>
                  <p><strong>Created:</strong> {formatDate(item.createdAt)}</p>
                  {item.paidAt && <p><strong>Paid:</strong> {formatDate(item.paidAt)}</p>}
                </div>

                <div className="detail-section">
                  <h4>Bill To</h4>
                  <p><strong>Email:</strong> {item.billTo?.email}</p>
                  <p><strong>Admin ID:</strong> {item.billTo?.adminId}</p>
                </div>

                {item.description && (
                  <div className="detail-section">
                    <h4>Description</h4>
                    <p>{item.description}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="detail-section">
                  <h4>Payment Information</h4>
                  <p><strong>Payment ID:</strong> {item._id}</p>
                  <p><strong>Amount:</strong> {formatCurrency(item.amount)}</p>
                  <p><strong>Status:</strong> {item.status}</p>
                  <p><strong>Method:</strong> {item.method}</p>
                  <p><strong>Date:</strong> {formatDate(item.createdAt)}</p>
                </div>

                <div className="detail-section">
                  <h4>Payer Information</h4>
                  <p><strong>Email:</strong> {item.payer?.email}</p>
                  <p><strong>Admin ID:</strong> {item.payer?.adminId}</p>
                </div>

                {item.invoice && (
                  <div className="detail-section">
                    <h4>Related Invoice</h4>
                    <p><strong>Invoice Number:</strong> {item.invoice.invoiceNumber}</p>
                  </div>
                )}

                {item.stripePaymentIntentId && (
                  <div className="detail-section">
                    <h4>Payment Details</h4>
                    <p><strong>Stripe Payment ID:</strong> {item.stripePaymentIntentId}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
=======
>>>>>>> Stashed changes
    </div>
  );
};

export default SubscriptionManagement;