import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../config/api';
import './Payment.css';
import { DashboardCardSkeleton, TableSkeleton } from '../../components/loading';
import {
  CreditCard,
  Clock,
  AlertTriangle,
  RotateCw,
  FileText,
  Download,
  Printer,
  X,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab: 'receivedPayments' | 'propertyInvoices' | 'securityGuardPayments'
  const [activeTab, setActiveTab] = useState('receivedPayments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Owner Financial Data
  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    outstandingBalance: 0,
    verifiedPaymentsCount: 0,
    openInvoicesCount: 0,
    pendingSettlementAmount: 0,
    currency: 'BDT'
  });
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Security Guard State
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [guardPaymentLoading, setGuardPaymentLoading] = useState(false);
  const [hiredGuards, setHiredGuards] = useState([]);
  const [guardPaymentHistory, setGuardPaymentHistory] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [refreshGuards, setRefreshGuards] = useState(0);

  // Modals & Feedback
  const [paymentMessage, setPaymentMessage] = useState(null);

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      return JSON.parse(userData).token;
    } catch {
      return null;
    }
  };

  // Fetch real owner payments data
  const fetchOwnerPaymentData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(API.getUrl('/api/payments/owner-payments'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setPayments(data.payments || []);
        setInvoices(data.invoices || []);
        setPaymentMessage(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setPaymentMessage({ type: 'error', text: 'Authentication session expired. Please sign in again.' });
        } else {
          setPaymentMessage({ type: 'error', text: errData.message || 'Failed to retrieve owner financial data. Please check your backend database connection.' });
        }
      }
    } catch (err) {
      console.error('Error fetching owner payments:', err);
      setPaymentMessage({ type: 'error', text: 'Cannot connect to backend payment service. Please verify the server is running.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch hired guards
  const fetchHiredGuards = async () => {
    try {
      setLoadingGuards(true);
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(API.getUrl('/api/security-guard-payments/hired-guards'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setHiredGuards(data.guards || []);
      }
    } catch (err) {
      console.error('Error fetching hired guards:', err);
    } finally {
      setLoadingGuards(false);
    }
  };

  useEffect(() => {
    fetchOwnerPaymentData();
  }, []);

  useEffect(() => {
    if (activeTab === 'securityGuardPayments') {
      fetchHiredGuards();
    }
  }, [activeTab, refreshGuards]);

  useEffect(() => {
    if (paymentMessage) {
      const timer = setTimeout(() => {
        setPaymentMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [paymentMessage]);

  // Handle URL return parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      setPaymentMessage({ type: 'success', text: 'Payment completed successfully. Records updated.' });
      fetchOwnerPaymentData();
      navigate('/owner/payments', { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setPaymentMessage({ type: 'error', text: 'Payment was cancelled.' });
      navigate('/owner/payments', { replace: true });
    }
  }, [location.search, navigate]);

  // PDF Handlers
  const handleDownloadInvoicePDF = async (invoiceId, invoiceNo) => {
    try {
      setDownloadingPdf(`inv-${invoiceId}`);
      const token = getAuthToken();
      const res = await fetch(API.getUrl(`/api/invoices/${invoiceId}/pdf`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate invoice PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNo || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Invoice PDF error:', err);
      setPaymentMessage({ type: 'error', text: 'Could not download invoice PDF.' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadReceiptPDF = async (paymentId, receiptNumber) => {
    try {
      setDownloadingPdf(`rec-${paymentId}`);
      const token = getAuthToken();
      const res = await fetch(API.getUrl(`/api/payments/${paymentId}/receipt/pdf`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate receipt PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNumber || paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Receipt PDF error:', err);
      setPaymentMessage({ type: 'error', text: 'Could not download receipt PDF.' });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Guard Actions
  const handleGuardPayment = async (guard) => {
    try {
      setGuardPaymentLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl('/api/security-guard-payments/create-payment-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          guardJobId: guard.guardJobId,
          amount: parseFloat(paymentAmount),
          description: paymentDescription,
          originUrl: window.location.origin
        })
      });

      const data = await response.json();
      if (data.success && (data.url || data.sessionUrl)) {
        window.location.href = data.url || data.sessionUrl;
      } else {
        alert(data.message || 'Failed to initialize payment session');
      }
    } catch (err) {
      console.error('Guard payment error:', err);
      alert('Failed to process payment');
    } finally {
      setGuardPaymentLoading(false);
    }
  };

  const generateMonthlyInvoice = async (guard) => {
    try {
      setGuardPaymentLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(`/api/security-guard-payments/generate-invoice/${guard.guardJobId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPaymentMessage({ type: 'success', text: 'Monthly guard payroll invoice generated.' });
        setRefreshGuards(prev => prev + 1);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate invoice: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice.');
    } finally {
      setGuardPaymentLoading(false);
    }
  };

  const fetchGuardPaymentHistory = async (jobPostId) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API.getUrl(`/api/security-guard-payments/history/${jobPostId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGuardPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching guard history:', error);
    }
  };

  const formatMoney = (amount) => {
    return `৳${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="payment-container">
      {/* Alert Banner */}
      {paymentMessage && (
        <div className={`payment-message ${paymentMessage.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
            {paymentMessage.type === 'error' ? (
              <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{paymentMessage.text}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {paymentMessage.type === 'error' && (
              <button
                type="button"
                onClick={() => fetchOwnerPaymentData(true)}
                disabled={refreshing}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  borderRadius: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <RotateCw size={12} className={refreshing ? 'spin-icon' : ''} />
                <span>{refreshing ? 'Retrying...' : 'Retry'}</span>
              </button>
            )}
            <button className="close-message-btn" onClick={() => setPaymentMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="payment-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.5rem', fontWeight: 700 }}>
              Property Financials & Payments
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
              Track verified tenant payments, monitor outstanding invoices, and manage security guard payroll.
            </p>
          </div>
          <button
            type="button"
            className="action-btn view-btn"
            onClick={() => fetchOwnerPaymentData(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.5rem 1rem', borderRadius: '0.375rem' }}
          >
            <RotateCw size={15} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Financials'}</span>
          </button>
        </div>

        {/* 3 Authoritative Financial Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>Total Collected Online</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} color="#059669" />
              </div>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : formatMoney(metrics.totalCollected)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: 500 }}>
              {metrics.verifiedPaymentsCount || 0} verified Stripe transaction(s)
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>Outstanding Invoices</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} color="#2563EB" />
              </div>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : formatMoney(metrics.outstandingBalance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '0.25rem', fontWeight: 500 }}>
              {metrics.openInvoicesCount || 0} open tenant obligation(s)
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1.125rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600 }}>In-Transit / Pending Gateway</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={16} color="#D97706" />
              </div>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : formatMoney(metrics.pendingSettlementAmount)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
              Distinguishes Stripe collected from bank payouts
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="payment-tabs">
          <button
            className={`tab-button ${activeTab === 'receivedPayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('receivedPayments')}
          >
            Collected Tenant Payments ({payments.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'propertyInvoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('propertyInvoices')}
          >
            Property Invoices ({invoices.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'securityGuardPayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('securityGuardPayments')}
          >
            Security Guard Payroll ({hiredGuards.length})
          </button>
        </div>
      </div>

      <div className="payment-content">
        {/* TAB 1: Collected Tenant Payments */}
        {activeTab === 'receivedPayments' && (
          <div className="received-payments-section">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>
              Verified Online Payments Received
            </h3>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1' }}>
                <CreditCard size={36} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: '#1E293B' }}>No Payments Received Yet</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Online rental advance payments and monthly rent payments completed by tenants will appear here.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tenant / Buyer</th>
                      <th>Property</th>
                      <th>Purpose</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => {
                      const tenantName = p.payerId ? `${p.payerId.firstName || ''} ${p.payerId.lastName || ''}`.trim() : 'Verified Tenant';
                      const propTitle = p.propertyId?.displayName || p.propertyId?.title || p.propertyId?.address || 'Property';
                      const purpose = (p.paymentPurpose || p.type || 'MONTHLY_RENT').replace(/_/g, ' ');

                      return (
                        <tr key={p._id}>
                          <td>{formatDate(p.paidAt || p.createdAt)}</td>
                          <td>
                            <strong>{tenantName}</strong>
                            {p.payerId?.email && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.payerId.email}</div>}
                          </td>
                          <td>{propTitle}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                              {purpose}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#059669' }}>
                            {formatMoney(p.amount)}
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.75rem',
                              background: p.status === 'completed' || p.status === 'paid' ? '#ECFDF5' : p.status === 'processing' ? '#FEF3C7' : '#F1F5F9',
                              color: p.status === 'completed' || p.status === 'paid' ? '#047857' : p.status === 'processing' ? '#B45309' : '#64748B',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: 600
                            }}>
                              {p.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {['completed', 'paid', 'succeeded'].includes(p.status) ? (
                              <button
                                type="button"
                                className="ds-btn-pdf-outline"
                                onClick={() => handleDownloadReceiptPDF(p._id, p.paymentId)}
                                disabled={downloadingPdf === `rec-${p._id}`}
                                title="Download official payment receipt PDF"
                              >
                                {downloadingPdf === `rec-${p._id}` ? (
                                  <>
                                    <RotateCw size={13} className="spin-icon" />
                                    <span>Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText size={13} />
                                    <span>Download Receipt</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Issued Property Invoices */}
        {activeTab === 'propertyInvoices' && (
          <div className="property-invoices-section">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>
              Issued Invoices for Your Properties
            </h3>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1' }}>
                <FileText size={36} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: '#1E293B' }}>No Invoices Issued</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Rental advances and scheduled lease billing cycles will generate invoices here automatically.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Billed Tenant</th>
                      <th>Property</th>
                      <th>Purpose</th>
                      <th>Due Date</th>
                      <th>Total Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const tenantName = inv.billTo ? `${inv.billTo.firstName || ''} ${inv.billTo.lastName || ''}`.trim() : 'Tenant';
                      const propTitle = inv.propertyId?.displayName || inv.propertyId?.title || inv.propertyId?.address || 'Property';
                      const purpose = (inv.paymentPurpose || 'MONTHLY_RENT').replace(/_/g, ' ');
                      const isPaid = inv.status === 'paid';

                      return (
                        <tr key={inv._id}>
                          <td><strong>#{inv.invoiceNo || inv._id.slice(-6).toUpperCase()}</strong></td>
                          <td>
                            <strong>{tenantName}</strong>
                            {inv.billTo?.email && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{inv.billTo.email}</div>}
                          </td>
                          <td>{propTitle}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                              {purpose}
                            </span>
                          </td>
                          <td>{formatDate(inv.dueDate)}</td>
                          <td style={{ fontWeight: 700, color: isPaid ? '#059669' : '#0F172A' }}>
                            {formatMoney(inv.total)}
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.75rem',
                              background: isPaid ? '#ECFDF5' : (inv.status === 'overdue' ? '#FEF2F2' : (inv.status === 'void' ? '#F1F5F9' : '#FEF3C7')),
                              color: isPaid ? '#047857' : (inv.status === 'overdue' ? '#DC2626' : (inv.status === 'void' ? '#64748B' : '#D97706')),
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: 600
                            }}>
                              {inv.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ds-btn-pdf-outline"
                              onClick={() => handleDownloadInvoicePDF(inv._id, inv.invoiceNo)}
                              disabled={downloadingPdf === `inv-${inv._id}`}
                              title="Download official PDF invoice"
                            >
                              {downloadingPdf === `inv-${inv._id}` ? (
                                <>
                                  <RotateCw size={13} className="spin-icon" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Download size={13} />
                                  <span>Download Invoice</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Security Guard Payroll */}
        {activeTab === 'securityGuardPayments' && (
          <div className="security-guard-payments-section">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0F172A', marginBottom: '1rem' }}>
              Security Guard Payroll
            </h3>
            {loadingGuards ? (
              <div className="guards-payment-grid">
                {Array.from({ length: 2 }).map((_, i) => (
                  <DashboardCardSkeleton key={`guard-pay-skel-${i}`} />
                ))}
              </div>
            ) : hiredGuards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1' }}>
                <ShieldCheck size={36} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: '#1E293B' }}>No Hired Security Guards</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Security guards hired for your buildings and complexes will be listed here for monthly payroll disbursement.
                </p>
              </div>
            ) : (
              <div className="guards-payment-grid">
                {hiredGuards.map(guard => (
                  <div key={guard.guardJobId} className="guard-payment-card">
                    <div className="guard-header">
                      <div className="guard-info">
                        <div className="guard-avatar">
                          <div className="avatar-placeholder">
                            {guard.guard?.firstName?.[0]}{guard.guard?.lastName?.[0]}
                          </div>
                        </div>
                        <div className="guard-basic-info">
                          <h4>{guard.guard?.firstName} {guard.guard?.lastName}</h4>
                          <p className="guard-position">{guard.jobDetails?.title}</p>
                          <p className="guard-property">{guard.property?.title} - {guard.property?.address}</p>
                          <p className="guard-email">{guard.guard?.email}</p>
                        </div>
                      </div>
                      <div className="payment-status-badge">
                        <span className={`status-indicator ${guard.paymentDetails?.status}`}>
                          {guard.paymentDetails?.status === 'paid' ? 'Up to Date' : 
                           guard.paymentDetails?.status === 'due' ? 'Payment Due' : 
                           guard.paymentDetails?.status === 'processing' ? 'Processing' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="payment-summary">
                      <div className="salary-info">
                        <h5>Salary Information</h5>
                        <p><strong>Amount:</strong> {guard.salary?.currency} {guard.salary?.amount}</p>
                        <p><strong>Frequency:</strong> {guard.salary?.paymentFrequency}</p>
                        <p><strong>Total Paid:</strong> {guard.salary?.currency} {guard.paymentDetails?.totalPaid || 0}</p>
                        <p><strong>Payment Count:</strong> {guard.paymentDetails?.paymentCount || 0}</p>
                      </div>

                      {guard.paymentDetails?.latestPayment && (
                        <div className="latest-payment">
                          <h5>Latest Payment</h5>
                          <p><strong>Amount:</strong> {guard.salary?.currency} {guard.paymentDetails.latestPayment.amount}</p>
                          <p><strong>Date:</strong> {new Date(guard.paymentDetails.latestPayment.createdAt).toLocaleDateString()}</p>
                          <p><strong>Status:</strong> {guard.paymentDetails.latestPayment.status}</p>
                        </div>
                      )}
                    </div>

                    <div className="payment-actions">
                      <div className="quick-actions">
                        <button
                          type="button"
                          className="generate-invoice-button"
                          onClick={() => generateMonthlyInvoice(guard)}
                          disabled={guardPaymentLoading}
                        >
                          {guardPaymentLoading ? 'Processing...' : 'Generate Monthly Invoice'}
                        </button>

                        <button
                          type="button"
                          className="view-history-button"
                          onClick={() => fetchGuardPaymentHistory(guard.jobPostId)}
                        >
                          View Payment History
                        </button>
                      </div>

                      <div className="custom-payment-form">
                        <h5>Custom Payment</h5>
                        <div className="form-group">
                          <label>Payment Amount ({guard.salary?.currency})</label>
                          <input
                            type="number"
                            value={selectedGuard === guard.guardJobId ? paymentAmount : ''}
                            onChange={(e) => {
                              setSelectedGuard(guard.guardJobId);
                              setPaymentAmount(e.target.value);
                            }}
                            placeholder={`Enter amount (Suggested: ${guard.salary?.amount})`}
                          />
                        </div>

                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            value={selectedGuard === guard.guardJobId ? paymentDescription : ''}
                            onChange={(e) => {
                              setSelectedGuard(guard.guardJobId);
                              setPaymentDescription(e.target.value);
                            }}
                            placeholder={`Payment for ${guard.guard?.firstName} ${guard.guard?.lastName}`}
                          />
                        </div>

                        <button
                          type="button"
                          className="pay-guard-button"
                          onClick={() => handleGuardPayment(guard)}
                          disabled={guardPaymentLoading || selectedGuard !== guard.guardJobId || !paymentAmount || !paymentDescription}
                        >
                          {guardPaymentLoading && selectedGuard === guard.guardJobId ? 'Processing...' : 'Pay Guard via Stripe'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {guardPaymentHistory.length > 0 && (
              <div className="guard-payment-history" style={{ marginTop: '2rem' }}>
                <h4>Guard Payment History</h4>
                <table className="payment-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Guard</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardPaymentHistory.map((payment) => (
                      <tr key={payment._id}>
                        <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                        <td>{payment.guardId?.firstName} {payment.guardId?.lastName}</td>
                        <td>{payment.currency} {payment.amount}</td>
                        <td>{payment.description}</td>
                        <td>
                          <span className={`status-badge ${payment.status}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;
