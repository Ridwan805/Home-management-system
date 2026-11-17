import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Calendar, 
  Banknote, 
  ShieldCheck, 
  Clock, 
  User, 
  Home, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Building2,
  FileCheck,
  History
} from 'lucide-react';
import './TenancyDetailsModal.css';

const LIFECYCLE_STAGES = [
  { key: 'Notice Submitted', label: 'Notice Submitted', desc: 'Formal notice recorded and transmitted to owner' },
  { key: 'Owner Acknowledged', label: 'Owner Acknowledged', desc: 'Owner has reviewed and accepted the departure notice' },
  { key: 'Inspection Scheduled', label: 'Inspection Scheduled', desc: 'Handover inspection and key return appointment set' },
  { key: 'Handover Completed', label: 'Handover Completed', desc: 'Property walkthrough completed and keys returned' },
  { key: 'Settlement Pending', label: 'Settlement Pending', desc: 'Final utility dues and deductions being reconciled' },
  { key: 'Completed', label: 'Completed', desc: 'Security deposit settled and tenancy formally concluded' }
];

const TenancyDetailsModal = ({ isOpen, onClose, property, onOpenNoticeModal }) => {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'policies' | 'moveout'

  if (!isOpen || !property) return null;

  const rentData = property.rentData || {};
  const moveOut = rentData.moveOut || {};
  const term = rentData.term || {};
  const deposit = rentData.securityDeposit || {};
  const owner = property.owner || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `৳${num.toLocaleString('en-US')}`;
  };

  // Determine notice label accurately
  const isDaysBased = term.noticePeriodUnit === 'days' || (term.noticeDays && term.noticeDays !== 60 && !term.noticePeriodMonths);
  const noticeRequirementLabel = isDaysBased && term.noticeDays
    ? `${term.noticeDays} Days (Signed Lease Term)`
    : `${term.noticePeriodMonths || 2} Calendar Months (Standard)`;

  // Move-Out lifecycle stage determination
  const currentStatus = moveOut.status || (moveOut.noticeSubmitted ? 'Notice Submitted' : 'none');
  const getStageState = (stageKey) => {
    const order = ['none', 'Notice Submitted', 'Owner Acknowledged', 'Inspection Scheduled', 'Handover Completed', 'Settlement Pending', 'Completed'];
    const currentIdx = order.indexOf(currentStatus);
    const stageIdx = order.indexOf(stageKey);
    if (stageIdx < currentIdx || currentStatus === 'Completed') return 'completed';
    if (stageIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="tenancy-modal-backdrop" onClick={onClose}>
      <div className="tenancy-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tenancy-modal-header">
          <div className="tenancy-modal-title-row">
            <div className="tenancy-modal-icon-badge">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="tenancy-modal-heading">Tenancy Agreement Dossier</h2>
              <p className="tenancy-modal-subtext">
                {property.name || property.title || property.address}
                {property.unitNumber ? ` • Unit ${property.unitNumber}` : ''}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="tenancy-modal-close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tenancy-modal-tabs">
          <button
            type="button"
            className={`tenancy-modal-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <Home size={15} />
            <span>Agreement & Terms</span>
          </button>
          <button
            type="button"
            className={`tenancy-modal-tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            <ShieldCheck size={15} />
            <span>Conditions & Policies</span>
          </button>
          <button
            type="button"
            className={`tenancy-modal-tab-btn ${activeTab === 'moveout' ? 'active' : ''}`}
            onClick={() => setActiveTab('moveout')}
          >
            <Clock size={15} />
            <span>Move-Out & Notice History {moveOut.noticeSubmitted ? '(1)' : ''}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="tenancy-modal-body">
          {/* TAB 1: AGREEMENT SUMMARY */}
          {activeTab === 'summary' && (
            <>
              {/* Highlight Metrics */}
              <div className="tenancy-metric-strip">
                <div className="tenancy-metric-card highlight-blue">
                  <span className="tenancy-metric-label">
                    <Banknote size={14} /> Monthly Rent
                  </span>
                  <div className="tenancy-metric-val">
                    {formatPrice(rentData.rent?.amount || property.price)}
                  </div>
                  <div className="tenancy-metric-sub">
                    Due on {rentData.rent?.dueDay || 1}st of each month
                  </div>
                </div>

                <div className="tenancy-metric-card highlight-green">
                  <span className="tenancy-metric-label">
                    <ShieldCheck size={14} /> Refundable Deposit
                  </span>
                  <div className="tenancy-metric-val">
                    {formatPrice(deposit.amount || 0)}
                  </div>
                  <div className="tenancy-metric-sub">
                    Held in trust &bull; {deposit.refundStatus === 'completed' ? 'Settled' : 'Active'}
                  </div>
                </div>

                <div className="tenancy-metric-card">
                  <span className="tenancy-metric-label">
                    <Calendar size={14} /> Lease Term
                  </span>
                  <div className="tenancy-metric-val" style={{ fontSize: '0.9375rem' }}>
                    {formatDate(property.assignedAt)}
                  </div>
                  <div className="tenancy-metric-sub">
                    {property.leaseEnd ? `Until ${formatDate(property.leaseEnd)}` : 'Month-to-Month'}
                  </div>
                </div>

                <div className="tenancy-metric-card">
                  <span className="tenancy-metric-label">
                    <Clock size={14} /> Required Notice
                  </span>
                  <div className="tenancy-metric-val" style={{ fontSize: '0.9375rem' }}>
                    {noticeRequirementLabel}
                  </div>
                  <div className="tenancy-metric-sub">
                    Prior to departure
                  </div>
                </div>
              </div>

              {/* Tenancy & Residence Specification Grid */}
              <div className="tenancy-section-box">
                <h3 className="tenancy-section-header">
                  <Building2 size={16} /> Residence & Tenancy Information
                </h3>
                <div className="tenancy-details-grid">
                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Property Title</span>
                    <span className="tenancy-detail-value">{property.name || property.title || 'Residential Residence'}</span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Unit Number</span>
                    <span className="tenancy-detail-value">{property.unitNumber || 'Main Residence'}</span>
                  </div>

                  {property.floorNumber !== undefined && property.floorNumber !== null && (
                    <div className="tenancy-detail-item">
                      <span className="tenancy-detail-label">Floor</span>
                      <span className="tenancy-detail-value">Floor {property.floorNumber}</span>
                    </div>
                  )}

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Full Address</span>
                    <span className="tenancy-detail-value">{property.address || 'Address on record'}</span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Tenancy Status</span>
                    <span className="tenancy-detail-value" style={{ color: '#059669' }}>
                      {rentData.status || property.status || 'Active'}
                    </span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Billing Cycle</span>
                    <span className="tenancy-detail-value">
                      {rentData.billing?.frequency || 'Monthly'} (Grace Period: {rentData.rent?.graceDays || 5} days)
                    </span>
                  </div>
                </div>
              </div>

              {/* Owner / Management Details */}
              {owner && (
                <div className="tenancy-section-box">
                  <h3 className="tenancy-section-header">
                    <User size={16} /> Landlord & Contact Details
                  </h3>
                  <div className="tenancy-details-grid">
                    <div className="tenancy-detail-item">
                      <span className="tenancy-detail-label">Owner Name</span>
                      <span className="tenancy-detail-value">
                        {`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.name || 'Property Owner'}
                      </span>
                    </div>

                    {owner.email && (
                      <div className="tenancy-detail-item">
                        <span className="tenancy-detail-label">Email</span>
                        <span className="tenancy-detail-value">{owner.email}</span>
                      </div>
                    )}

                    {owner.phoneNumber && (
                      <div className="tenancy-detail-item">
                        <span className="tenancy-detail-label">Phone</span>
                        <span className="tenancy-detail-value">{owner.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notice Requirement Banner */}
              <div className="tenancy-notice-banner">
                <div className="tenancy-notice-banner-title">
                  <Info size={16} />
                  <span>Departure & Move-Out Standard: {noticeRequirementLabel}</span>
                </div>
                <p className="tenancy-notice-banner-text">
                  To ensure a compliant handover and full reconciliation of your security deposit, formal written notice must be submitted through DwellSync prior to your move-out date. The owner will schedule a walkthrough inspection and settle refundable funds.
                </p>
              </div>
            </>
          )}

          {/* TAB 2: POLICIES & CONDITIONS */}
          {activeTab === 'policies' && (
            <>
              <div className="tenancy-section-box">
                <h3 className="tenancy-section-header">
                  <ShieldCheck size={16} /> Building & Lease Rules
                </h3>
                <div className="tenancy-details-grid">
                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Pet Policy</span>
                    <span className="tenancy-detail-value">
                      {property.constraints?.petPolicy?.allowed ? 'Pets Allowed' : 'No Pets Allowed'}
                    </span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Smoking Policy</span>
                    <span className="tenancy-detail-value">
                      {property.constraints?.smokingPolicy?.allowed ? 'Smoking Permitted' : 'Strictly Non-Smoking'}
                    </span>
                  </div>

                  {property.constraints?.occupancyLimit?.maxOccupants && (
                    <div className="tenancy-detail-item">
                      <span className="tenancy-detail-label">Max Occupancy</span>
                      <span className="tenancy-detail-value">
                        {property.constraints.occupancyLimit.maxOccupants} Occupants Max
                      </span>
                    </div>
                  )}

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Advance Payment Status</span>
                    <span className="tenancy-detail-value" style={{ color: '#059669' }}>
                      Verified & Active
                    </span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Late Fee Policy</span>
                    <span className="tenancy-detail-value">
                      {rentData.rent?.lateFee?.amount ? `৳${rentData.rent.lateFee.amount} flat fee` : 'Standard 5-day grace period'}
                    </span>
                  </div>

                  <div className="tenancy-detail-item">
                    <span className="tenancy-detail-label">Reconciliation Type</span>
                    <span className="tenancy-detail-value">
                      {rentData.reconciliationStatus || 'Authoritative Ledger'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="tenancy-section-box">
                <h3 className="tenancy-section-header">
                  <FileText size={16} /> Security Deposit Terms & Conditions
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  The security deposit of <strong>{formatPrice(deposit.amount || 0)}</strong> is held for the duration of your tenancy. Upon submission of formal advance notice and completion of the joint handover inspection, the owner will reconcile any outstanding utility arrears or itemized repair deductions and disburse the remaining balance directly to your designated account or via Stripe refund.
                </p>
              </div>
            </>
          )}

          {/* TAB 3: MOVE-OUT NOTICE & PROGRESS */}
          {activeTab === 'moveout' && (
            <>
              {moveOut.noticeSubmitted ? (
                <>
                  {/* Notice Overview Box */}
                  <div className="tenancy-section-box" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#92400E', fontSize: '0.9375rem' }}>
                        <Clock size={16} /> Current Move-Out Status: {moveOut.status || 'Notice Submitted'}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309', background: '#FEF3C7', padding: '0.25rem 0.625rem', borderRadius: '0.375rem' }}>
                        Filed on {formatDate(moveOut.noticeDate)}
                      </span>
                    </div>

                    {moveOut.isShorterNotice && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#B45309', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                        <span>{moveOut.shortNoticeExplanation || 'Early departure requested. Subject to owner review.'}</span>
                      </div>
                    )}
                  </div>

                  {/* Submission Details Grid */}
                  <div className="tenancy-section-box">
                    <h3 className="tenancy-section-header">
                      <FileCheck size={16} /> Submitted Move-Out Notice Parameters
                    </h3>
                    <div className="tenancy-details-grid">
                      <div className="tenancy-detail-item">
                        <span className="tenancy-detail-label">Requested Move-Out Date</span>
                        <span className="tenancy-detail-value font-bold" style={{ color: '#1E40AF' }}>
                          {formatDate(moveOut.intendedMoveOutDate)}
                        </span>
                      </div>

                      <div className="tenancy-detail-item">
                        <span className="tenancy-detail-label">Notice Provided</span>
                        <span className="tenancy-detail-value">
                          {moveOut.noticeDaysGiven} days ({moveOut.meetsRequirement ? 'Compliant' : 'Short notice'})
                        </span>
                      </div>

                      {moveOut.earliestCompliantDate && (
                        <div className="tenancy-detail-item">
                          <span className="tenancy-detail-label">Earliest Compliant Date</span>
                          <span className="tenancy-detail-value">
                            {formatDate(moveOut.earliestCompliantDate)}
                          </span>
                        </div>
                      )}

                      <div className="tenancy-detail-item">
                        <span className="tenancy-detail-label">Departure Reason</span>
                        <span className="tenancy-detail-value">
                          {moveOut.reason || 'Relocation'}
                        </span>
                      </div>

                      {moveOut.forwardingPhone && (
                        <div className="tenancy-detail-item">
                          <span className="tenancy-detail-label">Forwarding Phone</span>
                          <span className="tenancy-detail-value">{moveOut.forwardingPhone}</span>
                        </div>
                      )}

                      {moveOut.forwardingEmail && (
                        <div className="tenancy-detail-item">
                          <span className="tenancy-detail-label">Forwarding Email</span>
                          <span className="tenancy-detail-value">{moveOut.forwardingEmail}</span>
                        </div>
                      )}

                      {moveOut.forwardingAddress && (
                        <div className="tenancy-detail-item" style={{ gridColumn: 'span 2' }}>
                          <span className="tenancy-detail-label">Forwarding Address</span>
                          <span className="tenancy-detail-value">{moveOut.forwardingAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move-Out Lifecycle Stage Tracker */}
                  <div className="tenancy-section-box">
                    <h3 className="tenancy-section-header">
                      <Clock size={16} /> Move-Out Progress Tracking
                    </h3>
                    <div className="moveout-lifecycle-track">
                      {LIFECYCLE_STAGES.map((stage) => {
                        const state = getStageState(stage.key);
                        return (
                          <div key={stage.key} className={`moveout-stage-item ${state}`}>
                            <div className="stage-dot">
                              {state === 'completed' ? <CheckCircle2 size={13} /> : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />}
                            </div>
                            <div className="stage-content">
                              <div className="stage-name">{stage.label}</div>
                              <div className="stage-desc">
                                {stage.key === 'Inspection Scheduled' && moveOut.handoverScheduledDate
                                  ? `Scheduled for: ${formatDate(moveOut.handoverScheduledDate)}`
                                  : stage.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit Trail */}
                  {Array.isArray(moveOut.history) && moveOut.history.length > 0 && (
                    <div className="tenancy-section-box">
                      <h3 className="tenancy-section-header">
                        <History size={16} /> Move-Out Audit History Log
                      </h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="tenancy-audit-table">
                          <thead>
                            <tr>
                              <th>Timestamp</th>
                              <th>Status</th>
                              <th>Actor</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moveOut.history.map((h, i) => (
                              <tr key={i}>
                                <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.timestamp).toLocaleString()}</td>
                                <td><strong>{h.status}</strong></td>
                                <td>{h.actorRole || 'System'}</td>
                                <td>{h.action || h.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#F8FAFC', borderRadius: '0.625rem', border: '1px dashed #CBD5E1' }}>
                  <Clock size={36} color="#64748B" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ margin: '0 0 0.375rem 0', color: '#0F172A', fontSize: '1rem', fontWeight: 700 }}>
                    No Move-Out Notice Submitted
                  </h4>
                  <p style={{ margin: '0 auto 1.25rem', fontSize: '0.84375rem', color: '#64748B', maxWidth: '28rem' }}>
                    Planning to relocate or conclude your residency? Submit a formal move-out notice at least {noticeRequirementLabel} prior to departure to coordinate walkthrough inspection and deposit release.
                  </p>
                  <button
                    type="button"
                    className="ds-btn ds-btn-primary"
                    onClick={() => {
                      onClose();
                      onOpenNoticeModal(property);
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>Submit Notice to Vacate</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="tenancy-modal-footer">
          {!moveOut.noticeSubmitted && (
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={() => {
                onClose();
                onOpenNoticeModal(property);
              }}
            >
              <AlertTriangle size={15} />
              <span>Submit Notice to Vacate</span>
            </button>
          )}
          <button 
            type="button" 
            className="ds-btn ds-btn-primary" 
            onClick={onClose}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenancyDetailsModal;
