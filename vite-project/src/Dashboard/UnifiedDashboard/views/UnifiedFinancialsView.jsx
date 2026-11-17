import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  DollarSign,
  Building2,
  Calendar,
  RotateCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import API from '../../../config/api';
import './UnifiedFinancialsView.css';

const UnifiedFinancialsView = ({ onNavigateSection }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    totalPaid: 0,
    rentToPay: 0,
    rentToReceive: 0,
    activeLeasesCount: 0,
    ownedPropertiesCount: 0
  });

  const [propertyFinancials, setPropertyFinancials] = useState([]);

  const fetchFinancials = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try { token = JSON.parse(saved).token; } catch (e) { token = null; }
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

      const [overviewRes, ownerTenantsRes] = await Promise.allSettled([
        fetch(API.getUrl(API.endpoints.dashboardOverview), { headers }).then(r => r.ok ? r.json() : null),
        fetch(API.getUrl('/api/owner/tenants'), { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value?.summary) {
        const sum = overviewRes.value.summary;
        setMetrics(prev => ({
          ...prev,
          rentToPay: sum.rentToPay || 0,
          rentToReceive: sum.rentToReceive || 0,
          ownedPropertiesCount: sum.propertiesOwned || 0,
          activeLeasesCount: sum.homesRented || 0
        }));
      }

      if (ownerTenantsRes.status === 'fulfilled' && ownerTenantsRes.value) {
        const tenants = ownerTenantsRes.value.tenants || [];
        const sum = ownerTenantsRes.value.summary || {};
        const totalColl = tenants.reduce((acc, t) => acc + (t.totalPaid || t.advancePaid || 0), 0);
        setMetrics(prev => ({
          ...prev,
          totalCollected: totalColl
        }));
        setPropertyFinancials(tenants);
      }
    } catch (err) {
      console.error('Error fetching financial overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  return (
    <div className="unified-financials-view">
      <div className="financials-header">
        <div>
          <h1 className="financials-title">Financial Overview</h1>
          <p className="financials-subtitle">
            Comprehensive audit of property receivables, tenant billing obligations, and Stripe payment reconciliations.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => fetchFinancials(true)}
          disabled={refreshing}
        >
          <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
          <span>Refresh Financials</span>
        </button>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="financial-kpi-grid">
        <div className="fin-card">
          <div className="fin-icon-wrap fin-received">
            <ArrowDownRight size={22} />
          </div>
          <div className="fin-text">
            <span className="fin-label">Total Rent Received</span>
            <span className="fin-amount">{formatBDT(metrics.totalCollected)}</span>
            <span className="fin-subtext">Verified tenant collections</span>
          </div>
        </div>

        <div className="fin-card">
          <div className="fin-icon-wrap fin-pending-recv">
            <TrendingUp size={22} />
          </div>
          <div className="fin-text">
            <span className="fin-label">Rent to Receive</span>
            <span className="fin-amount highlight-blue">{formatBDT(metrics.rentToReceive)}</span>
            <span className="fin-subtext">Unpaid tenant obligations</span>
          </div>
        </div>

        <div className="fin-card">
          <div className="fin-icon-wrap fin-due">
            <ArrowUpRight size={22} />
          </div>
          <div className="fin-text">
            <span className="fin-label">Rent to Pay</span>
            <span className="fin-amount highlight-orange">{formatBDT(metrics.rentToPay)}</span>
            <span className="fin-subtext">Upcoming dues as tenant</span>
          </div>
        </div>

        <div className="fin-card">
          <div className="fin-icon-wrap fin-portfolio">
            <Building2 size={22} />
          </div>
          <div className="fin-text">
            <span className="fin-label">Active Units</span>
            <span className="fin-amount">{metrics.ownedPropertiesCount + metrics.activeLeasesCount}</span>
            <span className="fin-subtext">{metrics.ownedPropertiesCount} owned, {metrics.activeLeasesCount} rented</span>
          </div>
        </div>
      </div>

      {/* Property Receivables Breakdown Table */}
      <div className="fin-table-card">
        <div className="fin-table-header">
          <h3 className="table-title">Property Receivables Ledger</h3>
          <button
            type="button"
            className="btn-ledger-action"
            onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
          >
            <span>View Payments & Payouts</span>
          </button>
        </div>

        {propertyFinancials.length > 0 ? (
          <div className="fin-table-wrap">
            <table className="fin-data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Client / Tenant</th>
                  <th>Monthly Rent</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Outstanding Balance</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {propertyFinancials.map((t) => (
                  <tr key={t._id}>
                    <td className="bold-prop">{t.propertyName}</td>
                    <td>{t.fullName} ({t.clientType})</td>
                    <td>{formatBDT(t.monthlyRent)}</td>
                    <td>{formatBDT(t.totalBilled || t.purchasePrice || 0)}</td>
                    <td className="paid-val">{formatBDT(t.totalPaid || t.advancePaid || 0)}</td>
                    <td className={t.remainingBalance > 0 ? 'due-val' : ''}>
                      {formatBDT(t.remainingBalance || 0)}
                    </td>
                    <td>
                      <span className={`status-pill ${t.paymentStatus ? t.paymentStatus.toLowerCase().replace(/\s+/g, '-') : 'pending'}`}>
                        {t.paymentStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="fin-empty-state">
            <BarChart3 size={32} className="empty-icon" />
            <h4>No Active Financial Records</h4>
            <p>Property billing and tenant collection records will appear here as transactions occur.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFinancialsView;
