import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import API from '../../../config/api';
import './UnifiedNoticesView.css';

const UnifiedNoticesView = () => {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tenant tenancies for move-out
  const [activeTenancies, setActiveTenancies] = useState([]);
  const [selectedRentId, setSelectedRentId] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [reason, setReason] = useState('relocation');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState(null);

  // Notice history
  const [notices, setNotices] = useState([]);

  const fetchNoticesData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try { token = JSON.parse(saved).token; } catch { token = null; }
    }
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [assignmentsRes, ownerRes] = await Promise.allSettled([
        fetch(API.getUrl(API.endpoints.tenantAssignments), { headers }).then(r => r.ok ? r.json() : null),
        fetch(API.getUrl('/api/owner/tenants'), { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value) {
        const assignments = assignmentsRes.value.assignments || assignmentsRes.value;
        const rented = assignments.rentedProperties || [];
        setActiveTenancies(rented);
        if (rented.length > 0 && !selectedRentId) {
          setSelectedRentId(rented[0].rent?._id || rented[0]._id);
        }
      }

      if (ownerRes.status === 'fulfilled' && ownerRes.value) {
        // Collect notices from owner tenant records
        const clients = ownerRes.value.tenants || [];
        const noticesList = [];
        clients.forEach(c => {
          if (c.moveOut?.noticeSubmitted) {
            noticesList.push({
              id: `notice_${c._id}`,
              propertyTitle: c.propertyName,
              tenantName: c.fullName,
              noticeDate: c.moveOut.noticeDate,
              handoverDate: c.moveOut.handoverDate,
              noticeDaysGiven: c.moveOut.noticeDaysGiven,
              meetsRequirement: c.moveOut.meetsRequirement,
              status: c.moveOut.status || 'Active Notice'
            });
          }
        });
        setNotices(noticesList);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRentId]);

  useEffect(() => {
    fetchNoticesData();
  }, [fetchNoticesData]);

  // Notice days calculated
  const getCalculatedDays = () => {
    if (!moveOutDate) return null;
    const target = new Date(moveOutDate);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysNotice = getCalculatedDays();
  const isCompliant = daysNotice !== null && daysNotice >= 60;

  const handleSubmitNotice = async (e) => {
    e.preventDefault();
    if (!selectedRentId || !moveOutDate) {
      setNoticeFeedback({ type: 'error', message: 'Please select a tenancy and proposed move-out date.' });
      return;
    }

    setSubmitting(true);
    setNoticeFeedback(null);

    try {
      const saved = localStorage.getItem('dwellSyncUser');
      const token = saved ? JSON.parse(saved).token : null;

      const response = await fetch(API.getUrl(`/api/owner/tenancy/${selectedRentId}/move-out-notice`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          handoverDate: moveOutDate,
          reason,
          notes
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setNoticeFeedback({
          type: 'success',
          message: 'Move-out notice officially registered! Your landlord has been notified.'
        });
        setMoveOutDate('');
        setNotes('');
        fetchNoticesData(true);
      } else {
        throw new Error(data.message || 'Failed to submit notice to vacate');
      }
    } catch (err) {
      setNoticeFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="unified-notices-view">
      <div className="notices-view-header">
        <div>
          <h1 className="notices-title">Notices & Move-Out Management</h1>
          <p className="notices-subtitle">
            Formal 2-month statutory notice submission for tenants and inspection reconciliation for property owners.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => fetchNoticesData(true)}
          disabled={refreshing || loading}
        >
          <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="notices-tab-switcher">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          <Send size={15} />
          <span>Submit Notice to Vacate (As Tenant)</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FileText size={15} />
          <span>Move-Out Notices Registry ({notices.length})</span>
        </button>
      </div>

      {/* Tab 1: Submit Notice */}
      {activeTab === 'submit' && (
        <div className="notice-form-card">
          <div className="notice-guidelines-box">
            <ShieldCheck size={20} className="guide-icon" />
            <div>
              <h4 className="guide-title">Standard 2-Month Notice Policy</h4>
              <p className="guide-desc">
                In accordance with DwellSync tenancy agreements and statutory regulations, a formal advance notice of at least 60 calendar days (2 full calendar months) is required before moving out to ensure full security deposit reconciliation.
              </p>
            </div>
          </div>

          {noticeFeedback && (
            <div className={`notice-alert-banner ${noticeFeedback.type}`}>
              {noticeFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{noticeFeedback.message}</span>
            </div>
          )}

          {activeTenancies.length > 0 ? (
            <form onSubmit={handleSubmitNotice} className="move-out-form">
              <div className="form-group">
                <label className="form-label">Select Rented Property</label>
                <select
                  className="form-select"
                  value={selectedRentId}
                  onChange={(e) => setSelectedRentId(e.target.value)}
                  required
                >
                  {activeTenancies.map(t => {
                    const p = t.property || t;
                    const rentId = t.rent?._id || t._id;
                    return (
                      <option key={rentId} value={rentId}>
                        {p.title || p.address} — ৳{(t.rent?.rent?.amount || p.price || 0).toLocaleString()} / mo
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Move-Out & Key Handover Date</label>
                <input
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  required
                />
                {daysNotice !== null && (
                  <div className={`notice-compliance-tag ${isCompliant ? 'compliant' : 'non-compliant'}`}>
                    {isCompliant ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>
                      {daysNotice} days advance notice provided ({isCompliant ? 'Complies with 60-day policy' : 'Less than recommended 60 days'})
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Departure</label>
                <select
                  className="form-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="relocation">Relocation / Job Transfer</option>
                  <option value="purchased_home">Purchased a Home</option>
                  <option value="lease_end">Natural Lease Expiration</option>
                  <option value="financial">Financial / Budgetary Adjustments</option>
                  <option value="other">Other Personal Reasons</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Forwarding Address or Additional Notes</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Provide your forwarding contact information or any notes regarding move-out inspection..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-submit-notice"
                disabled={submitting}
              >
                {submitting ? 'Registering Notice...' : 'Submit Official Move-Out Notice'}
              </button>
            </form>
          ) : (
            <div className="no-tenancies-banner">
              <Building2 size={32} />
              <h4>No Active Tenancies Found</h4>
              <p>You must have an active rental lease to submit a move-out notice.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Notice Registry */}
      {activeTab === 'history' && (
        <div className="notices-registry-card">
          {notices.length > 0 ? (
            <div className="notices-table-wrap">
              <table className="notices-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Notice Date</th>
                    <th>Handover Date</th>
                    <th>Notice Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((n) => (
                    <tr key={n.id}>
                      <td className="prop-col">{n.propertyTitle}</td>
                      <td>{n.tenantName}</td>
                      <td>{new Date(n.noticeDate).toLocaleDateString()}</td>
                      <td>{new Date(n.handoverDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`compliance-badge ${n.meetsRequirement ? 'met' : 'under'}`}>
                          {n.noticeDaysGiven} days ({n.meetsRequirement ? 'Met 60' : 'Under 60'})
                        </span>
                      </td>
                      <td>
                        <span className="status-pill active">{n.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-notices-state">
              <AlertTriangle size={32} className="empty-icon" />
              <h4>No Move-Out Notices Recorded</h4>
              <p>When formal departure notices are submitted, they will be registered and tracked here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedNoticesView;
