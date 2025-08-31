import React, { useState, useEffect } from 'react';
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
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin subscription invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const response = await fetch('http://localhost:5001/api/admin/subscription/payments', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

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
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
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
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
          </button>
        </div>
      </div>

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
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon revenue">
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
          </div>
        </div>
      </div>

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
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>

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
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default SubscriptionManagement;