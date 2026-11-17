import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  User,
  ArrowRight,
  RotateCw,
  FileText,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import API from '../../../config/api';
import TenancyDetailsModal from '../../TenantDashboard/components/TenancyDetailsModal';
import './UnifiedLeaseAgreements.css';

const UnifiedLeaseAgreements = ({ onNavigateSection }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tenant' | 'owner'

  const [tenantLeases, setTenantLeases] = useState([]);
  const [ownerLeases, setOwnerLeases] = useState([]);
  const [selectedLeaseProperty, setSelectedLeaseProperty] = useState(null);

  const fetchLeaseData = useCallback(async (isManual = false) => {
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

      const [tenantRes, ownerRes] = await Promise.allSettled([
        fetch(API.getUrl(API.endpoints.tenantAssignments), { headers }).then(r => r.ok ? r.json() : null),
        fetch(API.getUrl('/api/owner/tenants'), { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (tenantRes.status === 'fulfilled' && tenantRes.value) {
        const assignments = tenantRes.value.assignments || tenantRes.value;
        setTenantLeases(assignments.rentedProperties || []);
      }

      if (ownerRes.status === 'fulfilled' && ownerRes.value) {
        const tenants = ownerRes.value.tenants || [];
        setOwnerLeases(tenants.filter(t => t.clientType === 'tenant'));
      }
    } catch (err) {
      console.error('Error fetching lease agreements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaseData();
  }, [fetchLeaseData]);

  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Active Term';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFilteredLeases = () => {
    const combined = [];
    if (activeTab === 'all' || activeTab === 'tenant') {
      tenantLeases.forEach(tl => {
        const p = tl.property || tl;
        combined.push({
          id: tl._id || p._id,
          title: p.title || p.address || 'Rental Residence',
          address: p.address,
          propertyType: p.propertyType || 'Apartment',
          rentAmount: tl.rent?.rent?.amount || p.pricing?.rent || p.price || 0,
          deposit: tl.rent?.securityDeposit?.amount || 0,
          startDate: tl.rent?.term?.startDate || tl.createdAt,
          endDate: tl.rent?.term?.endDate || null,
          status: tl.rent?.status || 'Active',
          role: 'Tenant',
          propertyObj: tl,
          counterpart: p.ownerUserId || tl.ownerId || { name: 'Owner' }
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'owner') {
      ownerLeases.forEach(ol => {
        combined.push({
          id: ol._id,
          title: ol.propertyName || ol.propertyAddress || 'Leased Property',
          address: ol.propertyAddress,
          propertyType: ol.propertyType || 'Apartment',
          rentAmount: ol.monthlyRent || 0,
          deposit: ol.securityDeposit || 0,
          startDate: ol.leaseStartDate || ol.agreementDate,
          endDate: ol.leaseEndDate || null,
          status: ol.leaseStatus || 'Active',
          role: 'Owner',
          propertyObj: { property: { _id: ol.propertyId, title: ol.propertyName, address: ol.propertyAddress } },
          counterpart: { name: ol.fullName, email: ol.email, phone: ol.phoneNumber }
        });
      });
    }
    return combined;
  };

  const filteredLeases = getFilteredLeases();

  return (
    <div className="unified-leases-view">
      <div className="leases-header">
        <div>
          <h1 className="leases-title">Lease Agreements</h1>
          <p className="leases-subtitle">
            Authoritative registry of active tenancies, security deposits held, and contractual move-out provisions.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => fetchLeaseData(true)}
          disabled={refreshing}
        >
          <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="leases-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Agreements ({tenantLeases.length + ownerLeases.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'tenant' ? 'active' : ''}`}
          onClick={() => setActiveTab('tenant')}
        >
          My Tenancies (As Tenant) ({tenantLeases.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'owner' ? 'active' : ''}`}
          onClick={() => setActiveTab('owner')}
        >
          Tenant Leases (On My Properties) ({ownerLeases.length})
        </button>
      </div>

      {/* Agreements Cards Grid */}
      {loading ? (
        <div className="leases-loading-grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`l-skel-${i}`} className="lease-skeleton" />
          ))}
        </div>
      ) : filteredLeases.length > 0 ? (
        <div className="leases-cards-grid">
          {filteredLeases.map((lease) => (
            <div key={lease.id} className="lease-record-card">
              <div className="lease-card-top">
                <div className="lease-icon-box">
                  <ScrollText size={20} />
                </div>
                <div className="lease-header-info">
                  <div className="lease-badge-row">
                    <span className={`lease-role-badge ${lease.role.toLowerCase()}`}>
                      {lease.role === 'Tenant' ? 'My Tenancy' : 'Leased to Tenant'}
                    </span>
                    <span className="lease-status-badge">
                      <CheckCircle2 size={12} />
                      {lease.status}
                    </span>
                  </div>
                  <h3 className="lease-prop-title">{lease.title}</h3>
                  <p className="lease-prop-addr">{lease.address}</p>
                </div>
              </div>

              <div className="lease-details-table">
                <div className="detail-row">
                  <span className="detail-label">Monthly Rent</span>
                  <span className="detail-value highlight">{formatBDT(lease.rentAmount)} / mo</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Security Deposit</span>
                  <span className="detail-value">{formatBDT(lease.deposit)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Commencement</span>
                  <span className="detail-value">{formatDate(lease.startDate)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Notice Requirement</span>
                  <span className="detail-value">2 Months Advance Notice</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{lease.role === 'Tenant' ? 'Owner / Landlord' : 'Tenant'}</span>
                  <span className="detail-value">{lease.counterpart?.name || lease.counterpart?.firstName || 'Party on file'}</span>
                </div>
              </div>

              <div className="lease-card-footer">
                {lease.role === 'Tenant' ? (
                  <button
                    type="button"
                    className="lease-action-btn primary"
                    onClick={() => setSelectedLeaseProperty(lease.propertyObj)}
                  >
                    <FileText size={14} />
                    <span>View Tenancy Dossier</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lease-action-btn primary"
                    onClick={() => onNavigateSection ? onNavigateSection('tenants-buyers') : navigate('/dashboard/tenants-buyers')}
                  >
                    <User size={14} />
                    <span>Manage Tenant Client</span>
                  </button>
                )}
                <button
                  type="button"
                  className="lease-action-btn secondary"
                  onClick={() => onNavigateSection ? onNavigateSection('invoices') : navigate('/dashboard/invoices')}
                >
                  <span>Invoices</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="leases-empty-state">
          <ScrollText size={36} className="empty-icon" />
          <h3>No Lease Agreements Found</h3>
          <p>
            When you enter into a verified rental tenancy as a tenant or accept an approved applicant as an owner, official agreements are registered here.
          </p>
          <button
            type="button"
            className="empty-cta"
            onClick={() => onNavigateSection ? onNavigateSection('overview') : navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Tenancy Modal */}
      {selectedLeaseProperty && (
        <TenancyDetailsModal
          isOpen={Boolean(selectedLeaseProperty)}
          onClose={() => setSelectedLeaseProperty(null)}
          property={selectedLeaseProperty}
          onOpenNoticeModal={() => {
            setSelectedLeaseProperty(null);
            if (onNavigateSection) onNavigateSection('notices');
            else navigate('/dashboard/notices');
          }}
        />
      )}
    </div>
  );
};

export default UnifiedLeaseAgreements;
