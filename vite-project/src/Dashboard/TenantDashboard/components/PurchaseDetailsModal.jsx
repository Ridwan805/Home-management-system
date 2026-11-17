import React, { useState } from 'react';
import {
  Landmark,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  ShieldCheck,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  RotateCw,
  ExternalLink,
  Download,
  Receipt,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import API from '../../../config/api';
import './PurchaseDetailsModal.css';

// 9-Stage Purchase Workflow Lifecycle
const PURCHASE_WORKFLOW_STAGES = [
  { id: 'submitted', label: 'Application Submitted', desc: 'Initial purchase inquiry submitted' },
  { id: 'under_review', label: 'Under Review', desc: 'Seller reviewing applicant credentials' },
  { id: 'approved', label: 'Approved', desc: 'Purchase application approved by owner' },
  { id: 'awaiting_advance', label: 'Awaiting Advance', desc: 'Booking deposit payment requested' },
  { id: 'advance_paid', label: 'Advance Paid', desc: 'Booking deposit confirmed via Stripe' },
  { id: 'awaiting_final', label: 'Awaiting Final Payment', desc: 'Remaining balance settlement pending' },
  { id: 'fully_paid', label: 'Fully Paid', desc: 'Total purchase price settled in full' },
  { id: 'transfer_pending', label: 'Ownership Transfer Pending', desc: 'Sub-registry deed conveyance initiated' },
  { id: 'completed', label: 'Completed', desc: 'Deed registered and ownership transferred' }
];

const PurchaseDetailsModal = ({ isOpen, onClose, property, onOpenMessages }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'terms' | 'payments' | 'transfer'
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [pdfError, setPdfError] = useState('');

  if (!isOpen || !property) return null;

  const purchaseData = property.purchaseData || {};
  const requestInfo = property.requestInfo || {};
  const seller = purchaseData.seller || property.owner || property.ownerUserId || {};
  const transfer = purchaseData.ownershipTransfer || null;
  const payments = purchaseData.payments || [];
  const invoices = purchaseData.invoices || [];

  // Financial calculations
  const agreedPrice = Number(
    purchaseData.agreedPrice ||
    purchaseData.offer?.offeredPrice ||
    property.pricing?.sale ||
    property.price ||
    0
  );

  const advancePaid = Number(purchaseData.advancePaid || 0);
  const remainingBalance = Number(purchaseData.remainingBalance ?? Math.max(0, agreedPrice - advancePaid));

  const formatPrice = (val) => {
    return `৳${Number(val || 0).toLocaleString('en-US')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Determine Current Stage index in 9-step workflow
  const getWorkflowProgress = () => {
    const rawStatus = (purchaseData.status || requestInfo.status || property.status || '').toLowerCase();
    const transferStatus = (transfer?.status || '').toLowerCase();
    const isSold = property.status === 'Sold' || rawStatus === 'sold' || rawStatus === 'completed' || transferStatus === 'closed';

    if (isSold) return 8; // Completed
    if (transferStatus === 'pending' || transfer) return 7; // Ownership Transfer Pending
    if ((remainingBalance === 0 && advancePaid > 0) || rawStatus === 'fully paid' || rawStatus === 'fullypaid') return 6; // Fully Paid
    if (rawStatus === 'advancepaid' || rawStatus === 'advance paid' || advancePaid > 0) return 4; // Advance Paid
    if (rawStatus.includes('advance') || rawStatus === 'approved – pay advance') return 3; // Awaiting Advance
    if (rawStatus === 'approved') return 2; // Approved
    if (rawStatus === 'under review' || rawStatus === 'pending') return 1; // Under Review
    return 0; // Application Submitted
  };

  const currentStageIndex = getWorkflowProgress();

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      return JSON.parse(userData).token;
    } catch {
      return null;
    }
  };

  // PDF Handlers
  const handleDownloadInvoicePDF = async (invoiceId, invoiceNo) => {
    try {
      setDownloadingPdf(`inv-${invoiceId}`);
      setPdfError('');
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
      setPdfError('Could not download invoice PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadReceiptPDF = async (paymentId, receiptNumber) => {
    try {
      setDownloadingPdf(`rec-${paymentId}`);
      setPdfError('');
      const token = getAuthToken();
      const res = await fetch(API.getUrl(`/api/payments/${paymentId}/receipt/pdf`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate payment receipt PDF');

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
      setPdfError('Could not download payment receipt PDF. Please try again.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const sellerName = seller
    ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.name || 'Verified Property Owner'
    : 'Verified Property Owner';

  return (
    <div className="purchase-modal-backdrop" onClick={onClose}>
      <div className="purchase-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="purchase-modal-header">
          <div className="purchase-modal-title-row">
            <div className="purchase-modal-icon-badge">
              <Landmark size={24} />
            </div>
            <div>
              <h2 className="purchase-modal-heading">Purchase Agreement & Transaction Dossier</h2>
              <p className="purchase-modal-subtext">
                <span>{property.title || property.address}</span>
                {property.propertyType && (
                  <span>• {property.propertyType.toUpperCase()} PROPERTY</span>
                )}
                {requestInfo.requestId && (
                  <span>• REF: {requestInfo.requestId}</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="purchase-modal-close-btn"
            onClick={onClose}
            aria-label="Close purchase details dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="purchase-modal-tabs">
          <button
            type="button"
            className={`purchase-modal-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Building2 size={15} />
            <span>Overview & Workflow</span>
          </button>

          <button
            type="button"
            className={`purchase-modal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText size={15} />
            <span>Agreement & Terms</span>
          </button>

          <button
            type="button"
            className={`purchase-modal-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Receipt size={15} />
            <span>Payments & Receipts ({payments.length})</span>
          </button>

          <button
            type="button"
            className={`purchase-modal-tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            <ShieldCheck size={15} />
            <span>Ownership Transfer</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="purchase-modal-body">
          {pdfError && (
            <div className="purchase-legal-callout warning" style={{ marginBottom: '0.5rem' }}>
              <AlertCircle size={18} className="callout-icon" />
              <div>
                <p className="callout-title">Document Download Alert</p>
                <p className="callout-body">{pdfError}</p>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW & WORKFLOW */}
          {activeTab === 'overview' && (
            <>
              {/* Stepper Workflow */}
              <div className="purchase-stepper-card">
                <div className="purchase-stepper-header">
                  <h3 className="purchase-stepper-title">
                    <Clock size={16} color="#2563EB" />
                    <span>Purchase Progress Workflow</span>
                  </h3>
                  <span className={`purchase-status-pill status-${(purchaseData.status || 'processing').toLowerCase().replace(/\s+/g, '')}`}>
                    <CheckCircle2 size={12} />
                    <span>{purchaseData.status || requestInfo.status || 'In Progress'}</span>
                  </span>
                </div>

                <div className="purchase-stepper-track">
                  {PURCHASE_WORKFLOW_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending';

                    return (
                      <div key={stage.id} className={`stepper-step ${statusClass}`}>
                        <div className="stepper-icon-circle">
                          {isCompleted ? <CheckCircle2 size={13} /> : idx + 1}
                        </div>
                        <span className="stepper-label">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Ledger Metric Cards */}
              <div className="purchase-metrics-grid">
                <div className="purchase-metric-card highlight">
                  <div className="metric-header">
                    <span className="metric-label">Total Agreed Price</span>
                    <div className="metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      <Landmark size={15} />
                    </div>
                  </div>
                  <div className="metric-value">{formatPrice(agreedPrice)}</div>
                  <div className="metric-subtext">Authoritative purchase value in BDT</div>
                </div>

                <div className="purchase-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Advance / Deposit</span>
                    <div className="metric-icon-wrap" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                      <CheckCircle2 size={15} />
                    </div>
                  </div>
                  <div className="metric-value" style={{ color: '#059669' }}>{formatPrice(advancePaid)}</div>
                  <div className="metric-subtext verified-badge">
                    <ShieldCheck size={13} />
                    <span>Verified Stripe Deposit</span>
                  </div>
                </div>

                <div className="purchase-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Remaining Balance</span>
                    <div className="metric-icon-wrap" style={{ backgroundColor: remainingBalance === 0 ? '#ECFDF5' : '#FEF3C7', color: remainingBalance === 0 ? '#059669' : '#D97706' }}>
                      <CreditCard size={15} />
                    </div>
                  </div>
                  <div className="metric-value" style={{ color: remainingBalance === 0 ? '#059669' : '#0F172A' }}>
                    {formatPrice(remainingBalance)}
                  </div>
                  <div className="metric-subtext">
                    {remainingBalance === 0 ? 'Full price fully reconciled' : 'Payable at Sub-Registry closing'}
                  </div>
                </div>

                <div className="purchase-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Payment Deadline</span>
                    <div className="metric-icon-wrap" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      <Calendar size={15} />
                    </div>
                  </div>
                  <div className="metric-value" style={{ fontSize: '1.125rem' }}>
                    {purchaseData.paymentDeadline ? formatDate(purchaseData.paymentDeadline) : 'No Pending Dues'}
                  </div>
                  <div className="metric-subtext">Booking deposit terms met</div>
                </div>
              </div>

              {/* Two Columns: Seller Representation & Property Specs */}
              <div className="purchase-info-columns">
                {/* Seller Representation */}
                <div className="purchase-panel-card">
                  <h4 className="panel-heading">
                    <User size={15} color="#2563EB" />
                    <span>Seller & Property Owner Representation</span>
                  </h4>
                  <div className="seller-profile-row">
                    <div className="seller-avatar">
                      {sellerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="seller-info-wrap">
                      <span className="seller-name">{sellerName}</span>
                      <span className="seller-role-badge">
                        <ShieldCheck size={13} />
                        <span>Verified Property Seller</span>
                      </span>
                    </div>
                  </div>
                  <div className="panel-details-list">
                    {seller.email && (
                      <div className="panel-detail-item">
                        <span className="detail-label">Email Address</span>
                        <span className="detail-value">{seller.email}</span>
                      </div>
                    )}
                    {seller.phoneNumber && (
                      <div className="panel-detail-item">
                        <span className="detail-label">Direct Contact</span>
                        <span className="detail-value">{seller.phoneNumber}</span>
                      </div>
                    )}
                    <div className="panel-detail-item">
                      <span className="detail-label">Platform Communications</span>
                      <button
                        type="button"
                        className="ds-btn-pdf"
                        onClick={() => {
                          onClose();
                          if (onOpenMessages) onOpenMessages(property);
                        }}
                      >
                        <span>Open Direct Messages</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Property & Plot Specs */}
                <div className="purchase-panel-card">
                  <h4 className="panel-heading">
                    <MapPin size={15} color="#2563EB" />
                    <span>Property & Plot Specifications</span>
                  </h4>
                  <div className="panel-details-list">
                    <div className="panel-detail-item">
                      <span className="detail-label">Property Type</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                        {property.propertyType || 'Residential Plot / Land'}
                      </span>
                    </div>
                    <div className="panel-detail-item">
                      <span className="detail-label">Listing Classification</span>
                      <span className="detail-value">For Sale (Direct Purchase)</span>
                    </div>
                    {property.specifications?.squareFootage && (
                      <div className="panel-detail-item">
                        <span className="detail-label">Land Area / Size</span>
                        <span className="detail-value">
                          {property.specifications.squareFootage.toLocaleString()} sq ft ({Math.round(property.specifications.squareFootage / 720)} Katha approx.)
                        </span>
                      </div>
                    )}
                    <div className="panel-detail-item">
                      <span className="detail-label">Location / Sector</span>
                      <span className="detail-value">
                        {property.location?.city || 'Dhaka'}, {property.location?.country || 'Bangladesh'}
                      </span>
                    </div>
                    {property.location?.coordinates && (
                      <div className="panel-detail-item">
                        <span className="detail-label">GPS Coordinates</span>
                        <span className="detail-value">
                          {property.location.coordinates.latitude}, {property.location.coordinates.longitude}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legal Notice */}
              <div className="purchase-legal-callout">
                <ShieldCheck size={20} className="callout-icon" />
                <div>
                  <p className="callout-title">Statutory Legal Transfer Notice</p>
                  <p className="callout-body">
                    Approval of a purchase application and payment of advance booking money secure your contractual right to purchase.
                    Official transfer of legal ownership occurs exclusively through formal registration of the sale deed (Saf-Kabala) at the Sub-Registry office,
                    title record mutation, and issuance of the municipal tax holding.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: AGREEMENT & TERMS */}
          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="purchase-panel-card">
                <h4 className="panel-heading">
                  <FileText size={15} color="#2563EB" />
                  <span>Purchase Agreement Terms & Conditions</span>
                </h4>
                <div className="panel-details-list" style={{ marginBottom: '1rem' }}>
                  <div className="panel-detail-item">
                    <span className="detail-label">Application Reference ID</span>
                    <span className="detail-value font-mono">{requestInfo.requestId || 'REQ-BUY-PENDING'}</span>
                  </div>
                  <div className="panel-detail-item">
                    <span className="detail-label">Application Approved Date</span>
                    <span className="detail-value">{formatDate(requestInfo.approvedAt)}</span>
                  </div>
                  <div className="panel-detail-item">
                    <span className="detail-label">Financing & Settlement Method</span>
                    <span className="detail-value">
                      {purchaseData.buyDetails?.financingMethod || 'Verified Stripe Online Transfer / Bank Conveyance'}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #E2E8F0' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>
                    Agreed Purchase Covenants:
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                    <li>
                      <strong>Advance Earnest Deposit:</strong> The buyer has remitted the verified advance deposit of {formatPrice(advancePaid)} to freeze the listing and prevent competing buyer reservations.
                    </li>
                    <li>
                      <strong>Title Due Diligence:</strong> The seller agrees to provide all original chain-of-title records (CS, SA, RS, BS Khatiyan, DCR, and non-encumbrance certificate) for inspection prior to deed registration.
                    </li>
                    <li>
                      <strong>Encumbrance Warranty:</strong> The seller guarantees that the subject land/property is free from bank hypothecations, legal disputes, government acquisition notices, or private claims.
                    </li>
                    <li>
                      <strong>Registration Closing:</strong> The remainder balance of {formatPrice(remainingBalance)} shall be tendered concurrently with the execution of the registered sale deed at the local Sub-Registry Office.
                    </li>
                  </ul>
                </div>
              </div>

              {requestInfo.buyerNotes && (
                <div className="purchase-panel-card">
                  <h4 className="panel-heading">
                    <FileCheck size={15} color="#2563EB" />
                    <span>Buyer's Application Statement & Special Conditions</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#334155', lineHeight: 1.6 }}>
                    {requestInfo.buyerNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS & RECEIPTS */}
          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 className="panel-heading" style={{ marginBottom: '0.75rem' }}>
                  <Receipt size={16} color="#2563EB" />
                  <span>Verified Stripe Transactions & Official Receipts</span>
                </h4>
                {payments.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '0.5rem', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '0.875rem' }}>
                    No completed platform payment transactions recorded for this purchase yet.
                  </div>
                ) : (
                  <div className="purchase-table-wrap">
                    <table className="purchase-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Payment ID</th>
                          <th>Purpose</th>
                          <th>Amount (BDT)</th>
                          <th>Gateway / Reference</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Official Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const isComplete = ['completed', 'paid', 'succeeded'].includes(p.status?.toLowerCase());
                          return (
                            <tr key={p._id}>
                              <td>{formatDate(p.paidAt || p.createdAt)}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.paymentId || p._id}</td>
                              <td>{p.paymentPurpose?.replace(/_/g, ' ') || 'Purchase Deposit'}</td>
                              <td style={{ fontWeight: 700, color: '#0F172A' }}>{formatPrice(p.amount)}</td>
                              <td style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                {p.stripeDetails?.paymentIntentId || p.externalRef || 'Stripe Gateway'}
                              </td>
                              <td>
                                <span className={`purchase-status-pill status-${isComplete ? 'completed' : 'awaiting'}`}>
                                  {p.status?.toUpperCase() || 'COMPLETED'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isComplete ? (
                                  <button
                                    type="button"
                                    className="ds-btn-pdf"
                                    onClick={() => handleDownloadReceiptPDF(p._id, p.paymentId)}
                                    disabled={downloadingPdf === `rec-${p._id}`}
                                    title="Download verified PDF receipt"
                                  >
                                    {downloadingPdf === `rec-${p._id}` ? (
                                      <>
                                        <RotateCw size={12} className="spin-icon" />
                                        <span>Generating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download size={12} />
                                        <span>Download PDF</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>—</span>
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

              {/* Official Invoices */}
              {invoices.length > 0 && (
                <div>
                  <h4 className="panel-heading" style={{ marginBottom: '0.75rem' }}>
                    <FileText size={16} color="#2563EB" />
                    <span>Purchase Billing Invoices</span>
                  </h4>
                  <div className="purchase-table-wrap">
                    <table className="purchase-table">
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Issued Date</th>
                          <th>Due Date</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Invoice PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv._id}>
                            <td style={{ fontWeight: 600, color: '#0F172A' }}>{inv.invoiceNo || 'INV-DWELL'}</td>
                            <td>{formatDate(inv.issuedAt || inv.createdAt)}</td>
                            <td>{formatDate(inv.dueDate)}</td>
                            <td style={{ fontWeight: 700 }}>{formatPrice(inv.total)}</td>
                            <td>
                              <span className={`purchase-status-pill status-${inv.status === 'paid' ? 'completed' : 'awaiting'}`}>
                                {inv.status?.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="ds-btn-pdf"
                                onClick={() => handleDownloadInvoicePDF(inv._id, inv.invoiceNo)}
                                disabled={downloadingPdf === `inv-${inv._id}`}
                                title="Download official PDF invoice"
                              >
                                {downloadingPdf === `inv-${inv._id}` ? (
                                  <>
                                    <RotateCw size={12} className="spin-icon" />
                                    <span>Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={12} />
                                    <span>Download PDF</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OWNERSHIP TRANSFER */}
          {activeTab === 'transfer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="purchase-panel-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 className="panel-heading" style={{ margin: 0 }}>
                    <ShieldCheck size={16} color="#2563EB" />
                    <span>Deed Registration & Conveyance Status</span>
                  </h4>
                  <span className={`purchase-status-pill status-${transfer?.status === 'Closed' ? 'completed' : 'processing'}`}>
                    {transfer?.status || 'Processing / Pending Sub-Registry'}
                  </span>
                </div>

                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  The property booking deposit has been verified. The seller is currently compiling the land registration package
                  for the Sub-Registry Office appointment.
                </p>

                <div className="closing-checklist">
                  <div className="checklist-item done">
                    <CheckCircle2 size={16} color="#059669" className="checklist-icon" />
                    <div>
                      <p className="checklist-title">Purchase Application Approved</p>
                      <p className="checklist-desc">Owner accepted buyer credentials and terms</p>
                    </div>
                  </div>

                  <div className={`checklist-item ${advancePaid > 0 ? 'done' : ''}`}>
                    {advancePaid > 0 ? (
                      <CheckCircle2 size={16} color="#059669" className="checklist-icon" />
                    ) : (
                      <Clock size={16} color="#D97706" className="checklist-icon" />
                    )}
                    <div>
                      <p className="checklist-title">Advance Booking Deposit Settled ({formatPrice(advancePaid)})</p>
                      <p className="checklist-desc">Processed securely through Stripe checkout</p>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <Clock size={16} color="#2563EB" className="checklist-icon" />
                    <div>
                      <p className="checklist-title">Chain-of-Title Document Verification</p>
                      <p className="checklist-desc">Khatiyan and non-encumbrance certificate inspection</p>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <Clock size={16} color="#64748B" className="checklist-icon" />
                    <div>
                      <p className="checklist-title">Sub-Registry Office Saf-Kabala Deed Execution</p>
                      <p className="checklist-desc">Formal deed signing, stamp duty payment, and biometrics</p>
                    </div>
                  </div>

                  <div className="checklist-item">
                    <Clock size={16} color="#64748B" className="checklist-icon" />
                    <div>
                      <p className="checklist-title">Mutation & Holding Record Issuance</p>
                      <p className="checklist-desc">AC Land mutation registration in buyer's name</p>
                    </div>
                  </div>
                </div>
              </div>

              {transfer?.closing?.location && (
                <div className="purchase-panel-card">
                  <h4 className="panel-heading">
                    <MapPin size={15} color="#2563EB" />
                    <span>Closing & Registration Appointment Details</span>
                  </h4>
                  <div className="panel-details-list">
                    <div className="panel-detail-item">
                      <span className="detail-label">Registry Venue</span>
                      <span className="detail-value">{transfer.closing.location}</span>
                    </div>
                    {transfer.closing.scheduledDate && (
                      <div className="panel-detail-item">
                        <span className="detail-label">Scheduled Date</span>
                        <span className="detail-value">{formatDate(transfer.closing.scheduledDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="purchase-modal-footer">
          <span className="purchase-footer-note">
            DwellSync Property Conveyance Framework • Verified Stripe Settlement
          </span>
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={onClose}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailsModal;
