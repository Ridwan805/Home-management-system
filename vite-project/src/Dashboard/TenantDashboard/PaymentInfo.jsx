import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  RotateCw, 
  FileText, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';
import { authenticatedFetch } from '../../config/api';
import apiConfig from '../../config/api';
import './PaymentInfo.css';
import { TableSkeleton, DashboardCardSkeleton } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatCard from './components/TenantStatCard';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';

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
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'history'
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const navigate = useNavigate();

  const handleDownloadInvoicePDF = async (invoiceId, invoiceNo) => {
    try {
      setDownloadingPdf(`inv-${invoiceId}`);
      const userData = localStorage.getItem('dwellSyncUser');
      const token = userData ? JSON.parse(userData).token : '';
      
      const res = await fetch(apiConfig.getUrl(`/api/invoices/${invoiceId}/pdf`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to download invoice PDF');

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
      console.error('Error downloading invoice PDF:', err);
      setError('Could not download invoice PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadReceiptPDF = async (paymentId, receiptNumber) => {
    try {
      setDownloadingPdf(`rec-${paymentId}`);
      const userData = localStorage.getItem('dwellSyncUser');
      const token = userData ? JSON.parse(userData).token : '';

      const res = await fetch(apiConfig.getUrl(`/api/payments/${paymentId}/receipt/pdf`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to download receipt PDF');

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
      console.error('Error downloading receipt PDF:', err);
      setError('Could not download receipt PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const fetchAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setLoadingInvoices(true);
      setLoadingHistory(true);
    }
    try {
      const response = await authenticatedFetch(
        apiConfig.getUrl('/api/payments/my-payments'),
        { method: 'GET' },
        navigate
      );
      
      setInvoices(response.data?.pendingInvoices || []);
      setPaymentHistory(response.data?.paymentHistory || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load payment data. Please try refreshing the page.');
    } finally {
      setLoading(false);
      setLoadingInvoices(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Handle Stripe checkout return
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const sessionId = urlParams.get('session_id');
    
    if (status === 'success' && sessionId) {
      setError('');
      setSuccessMessage('Verifying payment confirmation with Stripe...');
      
      authenticatedFetch(
        apiConfig.getUrl(`/api/stripe/verify-session/${sessionId}`),
        {},
        navigate
      ).then(res => {
        if (res && res.success) {
          setSuccessMessage('Payment verified and completed successfully! Your invoice records have been updated.');
        } else {
          setSuccessMessage('Payment completed. Records updated.');
        }
        fetchAllData();
      }).catch(err => {
        console.warn('Verification warning:', err);
        fetchAllData();
      }).finally(() => {
        setTimeout(() => setSuccessMessage(null), 6000);
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (status === 'cancelled') {
      setError('Payment was cancelled. You can try again anytime.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePayInvoice = (invoice) => {
    if (invoice.payment && invoice.payment._id) {
      processPaymentDirect(invoice.payment._id);
    } else {
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
        apiConfig.getUrl(`/api/invoices/${selectedInvoice._id}/payment`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: selectedInvoice.total,
            currency: selectedInvoice.currency || 'USD'
          })
        },
        navigate
      );
      
      const checkoutTargetUrl = response.url || response.checkoutUrl;
      if (response.success && checkoutTargetUrl) {
        window.location.href = checkoutTargetUrl;
      } else {
        setError(response.message || 'Failed to create payment session. Please try again.');
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
        apiConfig.getUrl('/api/stripe/create-invoice-payment-session'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            paymentId,
            originUrl: window.location.origin 
          })
        },
        navigate
      );
      
      const checkoutTargetUrl = response.url || response.checkoutUrl;
      if (response.success && checkoutTargetUrl) {
        window.location.href = checkoutTargetUrl;
      } else {
        setError(response.message || 'Failed to create payment session. Please try again.');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Currency helper respecting actual invoice/payment currency
  const formatMoney = (amount, currency = 'USD') => {
    if (amount === undefined || amount === null) return '—';
    const curr = String(currency || 'USD').toUpperCase();
    if (curr === 'BDT') {
      return `৳${Number(amount).toLocaleString('en-US')}`;
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr
      }).format(amount);
    } catch {
      return `$${Number(amount).toFixed(2)}`;
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

  const calculateSummary = () => {
    // Filter payable active invoices (exclude voided test/cancelled invoices)
    const activeInvoices = invoices.filter(inv => inv.status !== 'void');

    // Total outstanding: unpaid balance on active non-paid invoices
    const totalOutstanding = activeInvoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'completed')
      .reduce((sum, inv) => sum + (inv.balance !== undefined ? Number(inv.balance) : (Number(inv.total || inv.amount) || 0)), 0);
    
    // Total paid: only verified completed payment records
    const verifiedPayments = paymentHistory
      .filter(p => ['completed', 'paid', 'succeeded'].includes(p.status));
    const totalPaid = verifiedPayments
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    
    // Overdue amount: past-due unpaid invoice balances
    const now = new Date();
    const overdueAmount = activeInvoices
      .filter(inv => (inv.status === 'overdue' || (new Date(inv.dueDate) < now && inv.status !== 'paid' && inv.status !== 'completed')))
      .reduce((sum, inv) => sum + (inv.balance !== undefined ? Number(inv.balance) : (Number(inv.total || inv.amount) || 0)), 0);

    // Primary currency detected
    const primaryCurrency = invoices[0]?.currency || paymentHistory[0]?.currency || 'BDT';

    return { totalOutstanding, totalPaid, overdueAmount, primaryCurrency };
  };

  const { totalOutstanding, totalPaid, overdueAmount, primaryCurrency } = calculateSummary();
  const isRefreshing = loadingInvoices || loadingHistory;

  return (
    <div className="tenant-payment-page">
      <TenantPageHeader 
        title="Payments & Billing" 
        subtitle="Manage rent invoices, view payment history, and download official receipts."
        action={
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchAllData(true)}
            disabled={loading || isRefreshing}
            title="Refresh payment data"
          >
            <RotateCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {error && (
        <div className="payment-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="payment-alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 3 Metric Summary Cards */}
      <div className="payment-metrics-grid">
        {loading ? (
          <>
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
            <DashboardCardSkeleton />
          </>
        ) : (
          <>
            <TenantStatCard 
              title="Outstanding Balance"
              value={formatMoney(totalOutstanding, primaryCurrency)}
              subtitle={
                invoices.filter(i => i.status !== 'paid' && i.status !== 'completed').length > 0 
                  ? `${invoices.filter(i => i.status !== 'paid' && i.status !== 'completed').length} unpaid invoice(s)`
                  : 'All caught up'
              }
              icon={Clock}
              variant="blue"
            />
            <TenantStatCard 
              title="Total Paid"
              value={formatMoney(totalPaid, primaryCurrency)}
              subtitle={`${paymentHistory.length} successful payment(s)`}
              icon={CreditCard}
              variant="emerald"
            />
            <TenantStatCard 
              title="Overdue Amount"
              value={formatMoney(overdueAmount, primaryCurrency)}
              subtitle={overdueAmount > 0 ? 'Immediate payment required' : 'No overdue invoices'}
              icon={AlertTriangle}
              variant={overdueAmount > 0 ? 'rose' : 'emerald'}
              highlightColor={overdueAmount > 0 ? '#DC2626' : '#059669'}
            />
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="payment-tabs-container">
        <div className="payment-tab-buttons" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'invoices'}
            className={`payment-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <span>Current Invoices</span>
            <span className="tab-count-pill">{invoices.length}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`payment-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span>Payment History</span>
            <span className="tab-count-pill">{paymentHistory.length}</span>
          </button>
        </div>
      </div>

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <div className="payment-table-card">
          <div className="table-card-header">
            <h3 className="table-card-title">Pending & Recent Invoices</h3>
            <span className="table-card-meta">
              {invoices.length} {invoices.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {(loading || loadingInvoices) ? (
            <TableSkeleton rows={4} columns={6} />
          ) : invoices.length === 0 ? (
            <TenantEmptyState 
              icon={FileText}
              title="No Invoices Available"
              description="You have no pending bills or invoices at this time. New rent invoices will appear here when issued."
            />
          ) : (
            <div className="responsive-table-wrapper">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Property</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="align-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const isPaid = invoice.status === 'paid' || invoice.status === 'completed';
                    const purposeLabel = (invoice.paymentPurpose || 'MONTHLY_RENT').replace(/_/g, ' ');
                    return (
                      <tr key={invoice._id}>
                        <td>
                          <span className="invoice-id-badge">
                            #{invoice.invoiceNo || invoice._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="property-cell-title">
                            {invoice.propertyId?.displayName || invoice.propertyId?.title || invoice.property?.title || 'Residential Unit'}
                          </span>
                        </td>
                        <td>
                          <span className="method-tag font-xs">
                            {purposeLabel}
                          </span>
                        </td>
                        <td className="amount-cell">
                          {formatMoney(invoice.total || invoice.amount, invoice.currency)}
                        </td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>
                          <TenantStatusBadge status={invoice.status || 'pending'} size="sm" />
                        </td>
                        <td className="align-right">
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* 1. Download Invoice PDF */}
                            <button
                              type="button"
                              className="ds-btn ds-btn-secondary ds-btn-sm"
                              onClick={() => handleDownloadInvoicePDF(invoice._id, invoice.invoiceNo)}
                              disabled={downloadingPdf === `inv-${invoice._id}`}
                              title="Download official PDF invoice"
                            >
                              <Download size={13} />
                              <span>{downloadingPdf === `inv-${invoice._id}` ? '...' : 'Invoice'}</span>
                            </button>

                            {/* 2. Paid state: Download Receipt */}
                            {isPaid && (
                              <button
                                type="button"
                                className="ds-btn ds-btn-secondary ds-btn-sm"
                                style={{ borderColor: '#A7F3D0', color: '#047857', background: '#ECFDF5' }}
                                onClick={() => {
                                  const paymentId = invoice.payments?.[0]?._id || invoice.payments?.[0] || invoice.payment?._id || invoice.payment;
                                  if (paymentId) {
                                    handleDownloadReceiptPDF(paymentId, invoice.receiptNumber);
                                  } else {
                                    setError('Receipt record is pending allocation.');
                                  }
                                }}
                                disabled={downloadingPdf?.startsWith('rec-')}
                                title="Download official payment receipt"
                              >
                                <FileText size={13} />
                                <span>Receipt</span>
                              </button>
                            )}

                            {/* 3. Processing state: Disabled Button */}
                            {!isPaid && (invoice.status === 'processing' || invoice.payment?.status === 'processing') && (
                              <button
                                type="button"
                                className="ds-btn ds-btn-secondary ds-btn-sm"
                                disabled={true}
                                title="Payment is currently processing with Stripe"
                                style={{ opacity: 0.7, cursor: 'not-allowed', color: '#B45309', background: '#FEF3C7', borderColor: '#FDE68A' }}
                              >
                                <Clock size={13} />
                                <span>Processing</span>
                              </button>
                            )}

                            {/* 4. Unpaid state (open/overdue): Pay Now Button */}
                            {!isPaid && invoice.status !== 'processing' && invoice.payment?.status !== 'processing' && invoice.status !== 'void' && (
                              <button
                                type="button"
                                className="ds-btn ds-btn-primary ds-btn-sm"
                                onClick={() => handlePayInvoice(invoice)}
                                disabled={processingPayment}
                                title="Pay invoice online securely via Stripe"
                              >
                                <CreditCard size={14} />
                                <span>{processingPayment ? 'Processing...' : 'Pay Now'}</span>
                              </button>
                            )}
                          </div>
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

      {/* Payment History Tab Content */}
      {activeTab === 'history' && (
        <div className="payment-table-card">
          <div className="table-card-header">
            <h3 className="table-card-title">Completed Payments</h3>
            <span className="table-card-meta">
              {paymentHistory.length} {paymentHistory.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          {(loading || loadingHistory) ? (
            <TableSkeleton rows={5} columns={6} />
          ) : paymentHistory.length === 0 ? (
            <TenantEmptyState 
              icon={CreditCard}
              title="No Payment History Found"
              description="Completed rent transactions and processed payments will be listed here with downloadable receipts."
            />
          ) : (
            <div className="responsive-table-wrapper">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Property</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th className="align-right">Receipt Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => {
                    const propTitle = payment.invoiceId?.propertyId?.displayName || 
                      payment.invoiceId?.propertyId?.address || 
                      payment.propertyId?.displayName ||
                      payment.propertyId?.address ||
                      payment.rentId?.propertyId?.displayName || 
                      payment.rentId?.propertyId?.address || 
                      'Rental Property';

                    const purposeLabel = (payment.paymentPurpose || payment.type || 'MONTHLY_RENT').replace(/_/g, ' ');

                    return (
                      <tr key={payment._id}>
                        <td>{formatDate(payment.paidAt || payment.createdAt)}</td>
                        <td>
                          <span className="property-cell-title">{propTitle}</span>
                        </td>
                        <td>
                          <span className="method-tag font-xs">
                            {purposeLabel}
                          </span>
                        </td>
                        <td className="amount-cell font-emerald">
                          {formatMoney(payment.amount, payment.currency || payment.invoiceId?.currency)}
                        </td>
                        <td>
                          <span className="method-tag">
                            {payment.method || payment.provider || 'Stripe Card'}
                          </span>
                        </td>
                        <td>
                          <TenantStatusBadge status={payment.status || 'completed'} size="sm" />
                        </td>
                        <td className="align-right">
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="ds-btn ds-btn-secondary ds-btn-sm"
                              onClick={() => handleViewReceipt(payment)}
                              title="View official receipt"
                            >
                              <FileText size={14} />
                              <span>Receipt</span>
                            </button>
                            <button
                              type="button"
                              className="ds-btn ds-btn-primary ds-btn-sm"
                              onClick={() => handleDownloadReceiptPDF(payment._id, payment.paymentId)}
                              disabled={downloadingPdf === `rec-${payment._id}`}
                              title="Download official receipt PDF"
                            >
                              <Download size={13} />
                              <span>{downloadingPdf === `rec-${payment._id}` ? '...' : 'PDF'}</span>
                            </button>
                          </div>
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

      {/* Payment Checkout Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="ds-modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="ds-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <CreditCard size={20} className="modal-header-icon" />
                <h3 className="ds-modal-title">Pay Invoice</h3>
              </div>
              <button
                type="button"
                className="ds-modal-close"
                onClick={() => setShowPaymentModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ds-modal-body">
              <div className="payment-checkout-details">
                <div className="checkout-row">
                  <span className="checkout-label">Invoice Number</span>
                  <span className="checkout-value font-mono">
                    #{selectedInvoice.invoiceNo || selectedInvoice._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="checkout-row">
                  <span className="checkout-label">Property</span>
                  <span className="checkout-value">
                    {selectedInvoice.propertyId?.displayName || selectedInvoice.propertyId?.title || selectedInvoice.property?.title || 'Residential Property'}
                  </span>
                </div>
                <div className="checkout-row">
                  <span className="checkout-label">Due Date</span>
                  <span className="checkout-value">{formatDate(selectedInvoice.dueDate)}</span>
                </div>
                <div className="checkout-row highlight-row">
                  <span className="checkout-label">Total Due</span>
                  <span className="checkout-amount">
                    {formatMoney(selectedInvoice.total || selectedInvoice.amount, selectedInvoice.currency)}
                  </span>
                </div>
              </div>

              <p className="checkout-note">
                You will be securely redirected to Stripe to complete this payment using your credit or debit card.
              </p>
            </div>

            <div className="ds-modal-footer">
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                onClick={processPayment}
                disabled={processingPayment}
                style={{ flex: 1 }}
              >
                <ExternalLink size={16} />
                <span>{processingPayment ? 'Redirecting to Stripe...' : 'Proceed to Stripe Checkout'}</span>
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-secondary"
                onClick={() => setShowPaymentModal(false)}
                disabled={processingPayment}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {showReceiptModal && selectedPayment && (
        <div className="ds-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="ds-modal-card receipt-modal-card" onClick={(e) => e.stopPropagation()}>
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

            <div className="receipt-paper" id="printable-receipt">
              <div className="receipt-brand-row">
                <div>
                  <h2 className="receipt-brand-logo">
                    <span>Dwell</span><span style={{ color: '#2563EB' }}>Sync</span>
                  </h2>
                  <p className="receipt-brand-sub">Official Payment Confirmation</p>
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
                    {selectedPayment.paymentId || selectedPayment._id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="receipt-meta-label">Payment Date</span>
                  <span className="receipt-meta-value">
                    {formatDate(selectedPayment.paidAt || selectedPayment.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="receipt-meta-label">Method</span>
                  <span className="receipt-meta-value">
                    {selectedPayment.method || selectedPayment.provider || 'Stripe Card'}
                  </span>
                </div>
                {selectedPayment.stripeDetails?.paymentIntentId && (
                  <div>
                    <span className="receipt-meta-label">Transaction Reference</span>
                    <span className="receipt-meta-value font-mono font-xs">
                      {selectedPayment.stripeDetails.paymentIntentId}
                    </span>
                  </div>
                )}
              </div>

              <div className="receipt-section-box">
                <h4 className="receipt-box-heading">Property & Tenancy</h4>
                <div className="receipt-line-item">
                  <span>Address:</span>
                  <strong>
                    {selectedPayment.invoiceId?.propertyId?.displayName || 
                     selectedPayment.invoiceId?.propertyId?.address || 
                     selectedPayment.rentId?.propertyId?.displayName || 
                     selectedPayment.rentId?.propertyId?.address || 
                     'Residence'}
                  </strong>
                </div>
                {selectedPayment.invoiceId?.invoiceNo && (
                  <div className="receipt-line-item">
                    <span>Invoice Ref:</span>
                    <span>#{selectedPayment.invoiceId.invoiceNo}</span>
                  </div>
                )}
                <div className="receipt-line-item">
                  <span>Payment Purpose:</span>
                  <span>{selectedPayment.type ? selectedPayment.type.replace('_', ' ') : 'Rent Payment'}</span>
                </div>
              </div>

              <div className="receipt-total-box">
                <span className="receipt-total-label">Total Amount Paid</span>
                <span className="receipt-total-val">
                  {formatMoney(selectedPayment.amount, selectedPayment.currency || selectedPayment.invoiceId?.currency)}
                </span>
              </div>

              <p className="receipt-footer-disclaimer">
                This document serves as an electronic receipt for payment processed through the DwellSync property management platform.
              </p>
            </div>

            <div className="ds-modal-footer no-print">
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                onClick={() => handleDownloadReceiptPDF(selectedPayment._id, selectedPayment.paymentId)}
                disabled={downloadingPdf === `rec-${selectedPayment._id}`}
              >
                <Download size={16} />
                <span>{downloadingPdf === `rec-${selectedPayment._id}` ? 'Downloading...' : 'Download PDF'}</span>
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-secondary"
                onClick={() => setShowReceiptModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfo;
