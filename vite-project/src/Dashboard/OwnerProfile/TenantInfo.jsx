import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TenantInfo.css';
import { authenticatedFetch, API_BASE_URL } from '../../config/api';
import {
  DashboardCardSkeleton,
  TableSkeleton,
  CircularSpinner,
  ButtonLoader
} from '../../components/loading';
import {
  FaSearch,
  FaBullhorn,
  FaSync,
  FaUser,
  FaHome,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEnvelope,
  FaPhone,
  FaPrint,
  FaCalendarAlt,
  FaShieldAlt,
  FaFileContract,
  FaInfoCircle
} from 'react-icons/fa';
import {
  CreditCard,
  AlertTriangle,
  Users,
  Wrench,
  Search,
  Megaphone,
  AlertCircle,
  Scale,
  CheckCircle2,
  Calendar,
  Plus
} from 'lucide-react';

const NOTICE_TYPES = [
  { id: 'rent_reminder', label: 'Rent Reminder', icon: <CreditCard size={18} /> },
  { id: 'overdue_payment', label: 'Overdue Rent Notice', icon: <AlertTriangle size={18} /> },
  { id: 'meeting', label: 'Meeting Notice', icon: <Users size={18} /> },
  { id: 'maintenance', label: 'Maintenance Notice', icon: <Wrench size={18} /> },
  { id: 'inspection', label: 'Inspection Notice', icon: <Search size={18} /> },
  { id: 'general', label: 'General Announcement', icon: <Megaphone size={18} /> },
  { id: 'emergency', label: 'Emergency Alert', icon: <AlertCircle size={18} /> },
  { id: 'eviction_warning', label: 'Eviction / Lease Termination', icon: <Scale size={18} /> },
];

const TenantInfo = () => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalTenants: 0,
    occupiedApartments: 0,
    outstandingRent: 0,
    activeNotices: 0
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('all');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenantRecord, setSelectedTenantRecord] = useState(null);

  // Profile View Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('overview'); // 'overview' | 'payments' | 'notices'
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    rentMonth: '',
    referenceNote: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Notice Composer Modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeFormData, setNoticeFormData] = useState({
    noticeType: 'rent_reminder',
    recipientType: 'individual',
    tenantId: '',
    propertyId: '',
    subject: '',
    message: '',
    priority: 'normal',
    dueDate: '',
    legalDisclaimerAcknowledged: false
  });
  const [noticeSubmitting, setNoticeSubmitting] = useState(false);

  // Move-Out & Deposit Settlement Modal
  const [showMoveOutSettlementModal, setShowMoveOutSettlementModal] = useState(false);
  const [selectedTenantForSettlement, setSelectedTenantForSettlement] = useState(null);
  const [settlementStep, setSettlementStep] = useState('acknowledge'); // 'acknowledge' | 'handover' | 'settlement'
  const [handoverDate, setHandoverDate] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [deductions, setDeductions] = useState([]);
  const [newDeduction, setNewDeduction] = useState({ description: '', amount: '', category: 'repairs' });
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [terminateTenancy, setTerminateTenancy] = useState(true);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState('');
  const [settlementError, setSettlementError] = useState('');

  // Form State for Add / Edit Tenant
  const [tenantFormData, setTenantFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    propertyId: '',
    unitNumber: '',
    monthlyRent: '',
    securityDeposit: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'Active',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Load Tenants Data
  const fetchTenantsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (propertyFilter !== 'all') queryParams.append('propertyId', propertyFilter);
      if (leaseStatusFilter !== 'all') queryParams.append('status', leaseStatusFilter);
      if (paymentStatusFilter !== 'all') queryParams.append('paymentStatus', paymentStatusFilter);

      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants?${queryParams.toString()}`);
      if (res && res.success) {
        setSummary(res.summary || { totalTenants: 0, occupiedApartments: 0, outstandingRent: 0, activeNotices: 0 });
        setTenants(res.tenants || []);
        if (res.properties && res.properties.length > 0) {
          setProperties(res.properties);
        }
      } else {
        setError(res?.message || 'Failed to load tenants directory');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Error loading tenant information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyFilter, paymentStatusFilter, leaseStatusFilter]);

  // Open Detailed Profile
  const handleOpenProfile = async (tenantRecord) => {
    setSelectedTenantRecord(tenantRecord);
    setShowProfileModal(true);
    setActiveProfileTab('overview');
    try {
      setProfileLoading(true);
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${tenantRecord.rentId}`);
      if (res && res.success) {
        setProfileData(res);
      }
    } catch (err) {
      console.error('Error loading tenant profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Open Edit Tenancy Agreement
  const handleOpenEditTenant = (tenant) => {
    setSelectedTenantRecord(tenant);
    setTenantFormData({
      firstName: tenant.firstName || '',
      lastName: tenant.lastName || '',
      email: tenant.email || '',
      phoneNumber: tenant.phoneNumber || '',
      address: tenant.address || '',
      propertyId: tenant.propertyId || '',
      unitNumber: tenant.unitNumber || '',
      monthlyRent: tenant.monthlyRent || '',
      securityDeposit: tenant.securityDeposit || '',
      startDate: tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toISOString().split('T')[0] : '',
      endDate: tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toISOString().split('T')[0] : '',
      status: tenant.leaseStatus || 'Active',
      notes: tenant.notes || ''
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Submit Edit Tenancy Form (Updates existing lease / contact terms)
  const handleSubmitTenantForm = async (e) => {
    e.preventDefault();
    if (!selectedTenantRecord?.rentId) return;

    try {
      setFormSubmitting(true);
      setFormError(null);

      const url = `${API_BASE_URL}/api/owner/tenants/${selectedTenantRecord.rentId}`;

      const res = await authenticatedFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantFormData)
      });

      if (res && res.success) {
        setShowEditModal(false);
        await fetchTenantsData();
      } else {
        setFormError(res?.message || 'Failed to save tenancy information');
      }
    } catch (err) {
      console.error('Error updating tenancy:', err);
      setFormError(err.message || 'Error occurred while updating tenancy.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Move-Out Notice & Deposit Settlement Handlers
  const handleOpenMoveOutSettlement = (tenant) => {
    setSelectedTenantForSettlement(tenant);
    setSettlementError('');
    setSettlementSuccess('');
    const defaultDate = tenant.moveOut?.handoverScheduledDate
      ? new Date(tenant.moveOut.handoverScheduledDate).toISOString().split('T')[0]
      : (tenant.moveOut?.intendedMoveOutDate ? new Date(tenant.moveOut.intendedMoveOutDate).toISOString().split('T')[0] : '');
    setHandoverDate(defaultDate);
    setHandoverNotes(tenant.moveOut?.handoverNotes || '');
    const existingDeductions = tenant.securityDepositDetails?.deductions || [];
    setDeductions(existingDeductions);
    const deposit = Number(tenant.securityDeposit || 0);
    const existingDedTotal = existingDeductions.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - existingDedTotal));
    setTerminateTenancy(true);

    if (!tenant.moveOut?.ownerAcknowledged) {
      setSettlementStep('acknowledge');
    } else if (!tenant.moveOut?.handoverCompletedDate) {
      setSettlementStep('handover');
    } else {
      setSettlementStep('settlement');
    }
    setShowMoveOutSettlementModal(true);
  };

  const handleAcknowledgeNotice = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/acknowledge-move-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverScheduledDate: handoverDate,
          notes: handoverNotes
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Move-out notice acknowledged and handover inspection scheduled!');
        fetchTenantsData();
        setTimeout(() => {
          setSettlementSuccess('');
          setSettlementStep('handover');
        }, 1000);
      } else {
        setSettlementError(res?.message || 'Failed to acknowledge move-out notice');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error acknowledging notice');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleRecordHandover = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/record-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverCompletedDate: new Date().toISOString(),
          handoverNotes: handoverNotes
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Handover inspection recorded!');
        fetchTenantsData();
        setTimeout(() => {
          setSettlementSuccess('');
          setSettlementStep('settlement');
        }, 1000);
      } else {
        setSettlementError(res?.message || 'Failed to record handover');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error recording handover');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.description || !newDeduction.amount) return;
    const updated = [...deductions, { description: newDeduction.description.trim(), amount: parseFloat(newDeduction.amount) || 0, category: newDeduction.category }];
    setDeductions(updated);
    setNewDeduction({ description: '', amount: '', category: 'repairs' });
    const deposit = Number(selectedTenantForSettlement?.securityDeposit || 0);
    const totalDed = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - totalDed));
  };

  const handleRemoveDeduction = (idx) => {
    const updated = deductions.filter((_, i) => i !== idx);
    setDeductions(updated);
    const deposit = Number(selectedTenantForSettlement?.securityDeposit || 0);
    const totalDed = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
    setRefundAmount(Math.max(0, deposit - totalDed));
  };

  const handleProcessSettlement = async () => {
    if (!selectedTenantForSettlement?.rentId) return;
    try {
      setSettlementSubmitting(true);
      setSettlementError('');
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantForSettlement.rentId}/settle-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deductions,
          refundAmount: parseFloat(refundAmount) || 0,
          method: refundMethod,
          transactionRef: transactionRef.trim(),
          note: handoverNotes.trim(),
          terminateTenancy
        })
      });
      if (res && res.success) {
        setSettlementSuccess('Deposit settlement finalized and tenancy concluded! Property returned to Available.');
        fetchTenantsData();
        setTimeout(() => {
          setShowMoveOutSettlementModal(false);
        }, 1500);
      } else {
        setSettlementError(res?.message || 'Failed to settle deposit');
      }
    } catch (e) {
      setSettlementError(e.message || 'Error processing settlement');
    } finally {
      setSettlementSubmitting(false);
    }
  };

  // Open Payment Recorder
  const handleOpenPaymentModal = (tenant) => {
    setSelectedTenantRecord(tenant);
    setPaymentFormData({
      amount: tenant.monthlyRent || '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      rentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      referenceNote: `Rent payment for ${tenant.unitNumber}`
    });
    setShowPaymentModal(true);
  };

  // Submit Manual Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedTenantRecord) return;

    try {
      setPaymentSubmitting(true);
      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/tenants/${selectedTenantRecord.rentId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentFormData)
      });

      if (res && res.success) {
        setShowPaymentModal(false);
        await fetchTenantsData();
        if (showProfileModal) {
          handleOpenProfile(selectedTenantRecord);
        }
      } else {
        alert(res?.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert(err.message || 'Error recording payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Open Notice Composer
  const handleOpenNoticeModal = (tenant = null) => {
    if (tenant) {
      setNoticeFormData({
        noticeType: 'rent_reminder',
        recipientType: 'individual',
        tenantId: tenant.tenantId,
        propertyId: tenant.propertyId,
        subject: `Rent Reminder for ${tenant.unitNumber}`,
        message: `Dear ${tenant.fullName},\n\nThis is a friendly reminder that your monthly rent of ৳${Number(tenant.monthlyRent).toLocaleString()} for ${tenant.propertyName} (${tenant.unitNumber}) is due. Please ensure timely payment through your DwellSync portal or authorized payment methods.\n\nThank you,\nProperty Management`,
        priority: 'normal',
        dueDate: '',
        legalDisclaimerAcknowledged: false
      });
    } else {
      setNoticeFormData({
        noticeType: 'general',
        recipientType: 'all_tenants',
        tenantId: '',
        propertyId: '',
        subject: 'General Property Announcement',
        message: '',
        priority: 'normal',
        dueDate: '',
        legalDisclaimerAcknowledged: false
      });
    }
    setShowNoticeModal(true);
  };

  // Submit Notice
  const handleSubmitNotice = async (status = 'sent') => {
    if (!noticeFormData.subject.trim() || !noticeFormData.message.trim()) {
      alert('Please enter both subject and message body for the notice.');
      return;
    }

    if (noticeFormData.noticeType === 'eviction_warning' && !noticeFormData.legalDisclaimerAcknowledged) {
      alert('You must acknowledge the legal notice requirement before sending an eviction or lease termination notice.');
      return;
    }

    try {
      setNoticeSubmitting(true);
      const payload = { ...noticeFormData, status };

      const res = await authenticatedFetch(`${API_BASE_URL}/api/owner/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowNoticeModal(false);
        alert(status === 'draft' ? 'Notice saved as draft.' : 'Notice dispatched successfully to tenants via in-app notification and email!');
        await fetchTenantsData();
        if (showProfileModal && selectedTenantRecord) {
          handleOpenProfile(selectedTenantRecord);
        }
      } else {
        alert(res?.message || 'Failed to dispatch notice');
      }
    } catch (err) {
      console.error('Error dispatching notice:', err);
      alert(err.message || 'Error occurred while sending notice.');
    } finally {
      setNoticeSubmitting(false);
    }
  };

  // Helper for Payment Status Badge
  const renderPaymentBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return <span className="badge-status paid"><FaCheckCircle /> Paid</span>;
    if (s === 'overdue') return <span className="badge-status overdue"><FaExclamationTriangle /> Overdue</span>;
    if (s === 'partially paid') return <span className="badge-status partially-paid"><FaInfoCircle /> Partial</span>;
    return <span className="badge-status pending"><FaInfoCircle /> Pending</span>;
  };

  // Helper for Lease Status Badge
  const renderLeaseBadge = (status) => {
    const s = (status || '').toLowerCase();
    return <span className={`badge-lease ${s}`}>{status || 'Active'}</span>;
  };

  // Filtered in-memory search
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        t.fullName?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phoneNumber?.toLowerCase().includes(q) ||
        t.propertyName?.toLowerCase().includes(q) ||
        t.unitNumber?.toLowerCase().includes(q) ||
        t.propertyAddress?.toLowerCase().includes(q)
      );
    });
  }, [tenants, searchTerm]);

  return (
    <div className="tenant-mgmt-container">
      {/* Header and Top Action Row */}
      <header className="tenant-mgmt-header">
        <div className="tenant-mgmt-title-group">
          <h1>Tenant Management</h1>
          <p>Directory, verified lease agreements, rent payment tracking, and formal tenant notices</p>
        </div>

        <div className="tenant-mgmt-actions">
          <button className="btn-secondary-outline" onClick={fetchTenantsData} title="Refresh records">
            <FaSync /> Refresh
          </button>
          <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(null)}>
            <FaBullhorn /> Send Notice
          </button>
        </div>
      </header>

      {/* Metric Summary Cards */}
      {loading ? (
        <div className="tenant-stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={`tenant-skel-${i}`} />
          ))}
        </div>
      ) : (
        <section className="tenant-stats-grid">
          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap blue"><FaUser /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Total Tenants</span>
              <span className="tenant-stat-value">{summary.totalTenants}</span>
              <span className="tenant-stat-subtext">Active verified tenancies</span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap emerald"><FaHome /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Occupied Units</span>
              <span className="tenant-stat-value">{summary.occupiedApartments}</span>
              <span className="tenant-stat-subtext">Across your portfolio</span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap amber"><FaMoneyBillWave /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Outstanding Rent</span>
              <span className="tenant-stat-value">৳{Number(summary.outstandingRent).toLocaleString()}</span>
              <span className="tenant-stat-subtext">Pending / overdue balances</span>
            </div>
          </div>

          <div className="tenant-stat-card">
            <div className="tenant-stat-icon-wrap purple"><FaBullhorn /></div>
            <div className="tenant-stat-details">
              <span className="tenant-stat-label">Active Notices</span>
              <span className="tenant-stat-value">{summary.activeNotices}</span>
              <span className="tenant-stat-subtext">Dispatched in last 30 days</span>
            </div>
          </div>
        </section>
      )}

      {/* Search and Filters Bar */}
      <section className="tenant-filters-bar">
        <div className="tenant-search-box">
          <FaSearch className="tenant-search-icon" />
          <input
            type="text"
            className="tenant-search-input"
            placeholder="Search tenant name, email, phone, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tenant-filter-selects">
          <select
            className="tenant-select"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p._id} value={p._id}>{p.title || p.address} ({p.unitNumber || 'Unit'})</option>
            ))}
          </select>

          <select
            className="tenant-select"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            className="tenant-select"
            value={leaseStatusFilter}
            onChange={(e) => setLeaseStatusFilter(e.target.value)}
          >
            <option value="all">All Lease Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Terminated">Terminated</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </section>

      {/* Error Message with Retry */}
      {error && (
        <div className="tenant-error-banner">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn-secondary-outline" onClick={fetchTenantsData} style={{ background: '#fff' }}>
            <FaSync /> Retry
          </button>
        </div>
      )}

      {/* Tenants Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredTenants.length === 0 ? (
        <div className="tenant-empty-state">
          <div className="tenant-empty-icon"><Users size={36} color="#94A3B8" /></div>
          <h3>{searchTerm || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || leaseStatusFilter !== 'all' ? 'No Matching Tenants' : 'No Active Tenants Yet'}</h3>
          <p>
            {searchTerm || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || leaseStatusFilter !== 'all'
              ? 'No tenants match your search and filter criteria.'
              : 'Tenants will appear here automatically once their rental applications have been approved and their tenancy is active.'}
          </p>
          <button className="btn-primary-blue" onClick={() => navigate('/request-info')}>
            View Property Requests
          </button>
        </div>
      ) : (
        <div className="tenant-table-container">
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Apartment & Unit</th>
                <th>Monthly Rent</th>
                <th>Payment Status</th>
                <th>Lease Status</th>
                <th>Move-In Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(tenant => (
                <tr key={tenant._id}>
                  {/* Identity */}
                  <td>
                    <div className="tenant-identity-cell">
                      <div className="tenant-avatar">
                        {(tenant.firstName?.[0] || tenant.fullName?.[0] || 'T').toUpperCase()}
                      </div>
                      <div className="tenant-name-col">
                        <span className="tenant-full-name">{tenant.fullName}</span>
                        <span className="tenant-contact-sub">
                          <FaEnvelope style={{ fontSize: '0.625rem' }} /> {tenant.email}
                        </span>
                        {tenant.phoneNumber && (
                          <span className="tenant-contact-sub">
                            <FaPhone style={{ fontSize: '0.625rem' }} /> {tenant.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Property & Unit */}
                  <td>
                    <div className="property-unit-col">
                      <span className="property-title-text">{tenant.propertyName}</span>
                      <span className="unit-badge-tag">{tenant.unitNumber}</span>
                      <span className="property-address-sub">{tenant.propertyAddress}</span>
                    </div>
                  </td>

                  {/* Monthly Rent */}
                  <td>
                    <div className="rent-amount-cell">
                      ৳{Number(tenant.monthlyRent).toLocaleString()}
                      <span className="rent-cycle-sub"> / month</span>
                    </div>
                    {tenant.outstandingBalance > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '0.125rem' }}>
                        Due: ৳{tenant.outstandingBalance.toLocaleString()}
                      </div>
                    )}
                  </td>

                  {/* Payment Status */}
                  <td>
                    {renderPaymentBadge(tenant.paymentStatus)}
                  </td>

                  {/* Lease Status */}
                  <td>
                    {renderLeaseBadge(tenant.leaseStatus)}
                    {tenant.moveOut?.noticeSubmitted && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="unit-badge-tag" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A', fontSize: '0.6875rem', fontWeight: 600 }}>
                          Move-Out: {new Date(tenant.moveOut.intendedMoveOutDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Lease Term */}
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 500 }}>
                      {new Date(tenant.leaseStartDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {tenant.leaseEndDate
                        ? `Until ${new Date(tenant.leaseEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                        : 'Month-to-Month'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="tenant-actions-cell">
                      <button
                        className="action-btn-sm view-btn"
                        onClick={() => handleOpenProfile(tenant)}
                        title="View comprehensive tenant profile"
                      >
                        Profile
                      </button>
                      <button
                        className="action-btn-sm"
                        onClick={() => handleOpenPaymentModal(tenant)}
                        title="Record a payment"
                      >
                        Pay
                      </button>
                      <button
                        className="action-btn-sm"
                        onClick={() => handleOpenNoticeModal(tenant)}
                        title="Send notice to this tenant"
                      >
                        Notice
                      </button>
                      <button
                        className="action-btn-sm"
                        style={tenant.moveOut?.noticeSubmitted ? { background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A', fontWeight: 600 } : {}}
                        onClick={() => handleOpenMoveOutSettlement(tenant)}
                        title="Move-Out Inspection & Deposit Settlement"
                      >
                        {tenant.moveOut?.noticeSubmitted ? 'Move-Out' : 'Deposit'}
                      </button>
                      <button
                        className="action-btn-sm"
                        onClick={() => handleOpenEditTenant(tenant)}
                        title="Edit tenancy details"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: EDIT TENANCY MODAL (Existing Approved Tenancies Only)
          ===================================================================== */}
      {showEditModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Edit Tenancy Agreement</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowEditModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitTenantForm}>
              <div className="tenant-modal-body">
                {formError && (
                  <div className="tenant-error-banner" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={tenantFormData.firstName}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, firstName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={tenantFormData.lastName}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, lastName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      disabled
                      value={tenantFormData.email}
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                    <span className="field-hint">
                      Email address is tied to the tenant's authenticated account and cannot be modified.
                    </span>
                  </div>

                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+880 1700-000000"
                      value={tenantFormData.phoneNumber}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Associated Property</label>
                    <input
                      type="text"
                      disabled
                      value={selectedTenantRecord.propertyName || selectedTenantRecord.propertyAddress}
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="form-field">
                    <label>Apartment / Unit Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Apt 4B / Unit 201"
                      value={tenantFormData.unitNumber}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, unitNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Monthly Rent (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 25000"
                      value={tenantFormData.monthlyRent}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, monthlyRent: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Security Deposit (BDT ৳)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={tenantFormData.securityDeposit}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, securityDeposit: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Move-In / Lease Start Date *</label>
                    <input
                      type="date"
                      required
                      value={tenantFormData.startDate}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Lease End Date (Optional)</label>
                    <input
                      type="date"
                      value={tenantFormData.endDate}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, endDate: e.target.value })}
                    />
                    <span className="field-hint">Leave blank for month-to-month tenancies</span>
                  </div>

                  <div className="form-field">
                    <label>Lease Status</label>
                    <select
                      value={tenantFormData.status}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="Ended">Ended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>

                  <div className="form-field form-group-full">
                    <label>Notes & Agreement Terms</label>
                    <textarea
                      rows="2"
                      placeholder="Special lease conditions, emergency contact, move-in checklists..."
                      value={tenantFormData.notes}
                      onChange={(e) => setTenantFormData({ ...tenantFormData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="tenant-modal-footer">
                <button
                  type="button"
                  className="btn-navy-outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-blue"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <ButtonLoader size="small" /> Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TENANT PROFILE DOSSIER (TABS: OVERVIEW, PAYMENTS, NOTICES)
          ===================================================================== */}
      {showProfileModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="tenant-modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Tenant Dossier & Records</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowProfileModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="tenant-modal-body">
              {profileLoading ? (
                <CircularSpinner message="Retrieving comprehensive tenant dossier..." minHeight="240px" />
              ) : profileData ? (
                <>
                  {/* Hero Header */}
                  <div className="tenant-dossier-hero">
                    <div className="dossier-left">
                      <div className="dossier-avatar">
                        {(profileData.tenant?.user?.firstName?.[0] || selectedTenantRecord.fullName?.[0] || 'T').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="dossier-name">
                          {profileData.tenant?.user?.firstName} {profileData.tenant?.user?.lastName || ''}
                        </h3>
                        <div className="dossier-sub">
                          <span>{profileData.tenant?.property?.title || selectedTenantRecord.propertyName}</span> &bull;{' '}
                          <span className="unit-badge-tag">{selectedTenantRecord.unitNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {renderPaymentBadge(selectedTenantRecord.paymentStatus)}
                      <div style={{ marginTop: '0.375rem' }}>
                        {renderLeaseBadge(profileData.tenant?.leaseStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Tabs Bar */}
                  <div className="tenant-tabs-bar">
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('overview')}
                    >
                      <FaUser /> Overview & Agreement
                    </button>
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'payments' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('payments')}
                    >
                      <FaMoneyBillWave /> Payment History ({profileData.invoices?.length || 0})
                    </button>
                    <button
                      className={`tenant-tab-btn ${activeProfileTab === 'notices' ? 'active' : ''}`}
                      onClick={() => setActiveProfileTab('notices')}
                    >
                      <FaBullhorn /> Notices & Audit ({profileData.notices?.length || 0})
                    </button>
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  {activeProfileTab === 'overview' && (
                    <div>
                      <div className="dossier-info-cards">
                        {/* Personal Contact */}
                        <div className="dossier-card">
                          <h4><FaUser /> Contact Details</h4>
                          <div className="dossier-card-grid">
                            <div className="item">
                              <label>Full Name</label>
                              <span>{selectedTenantRecord.fullName}</span>
                            </div>
                            <div className="item">
                              <label>Email Address</label>
                              <span>{selectedTenantRecord.email}</span>
                            </div>
                            <div className="item">
                              <label>Phone Number</label>
                              <span>{selectedTenantRecord.phoneNumber || 'Not provided'}</span>
                            </div>
                            <div className="item">
                              <label>Registered User ID</label>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                {selectedTenantRecord.tenantId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Property & Apartment */}
                        <div className="dossier-card">
                          <h4><FaHome /> Apartment Specifications</h4>
                          <div className="dossier-card-grid">
                            <div className="item">
                              <label>Property Name</label>
                              <span>{selectedTenantRecord.propertyName}</span>
                            </div>
                            <div className="item">
                              <label>Unit / Floor</label>
                              <span>{selectedTenantRecord.unitNumber} (Floor {selectedTenantRecord.floorNumber})</span>
                            </div>
                            <div className="item">
                              <label>Address</label>
                              <span>{selectedTenantRecord.propertyAddress}</span>
                            </div>
                            <div className="item">
                              <label>Property Type</label>
                              <span>{selectedTenantRecord.propertyType}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tenancy Agreement */}
                        <div className="dossier-card">
                          <h4><FaFileContract /> Lease & Rental Agreement</h4>
                          <div className="dossier-card-grid">
                            <div className="item">
                              <label>Monthly Rent</label>
                              <span style={{ color: '#2563EB' }}>৳{Number(selectedTenantRecord.monthlyRent).toLocaleString()}</span>
                            </div>
                            <div className="item">
                              <label>Security Deposit</label>
                              <span>৳{Number(selectedTenantRecord.securityDeposit || 0).toLocaleString()}</span>
                            </div>
                            <div className="item">
                              <label>Move-In / Lease Start</label>
                              <span>{new Date(selectedTenantRecord.leaseStartDate).toLocaleDateString()}</span>
                            </div>
                            <div className="item">
                              <label>Lease Expiration</label>
                              <span>{selectedTenantRecord.leaseEndDate ? new Date(selectedTenantRecord.leaseEndDate).toLocaleDateString() : 'Month-to-Month'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Ledger Summary */}
                        <div className="dossier-card">
                          <h4><FaFileInvoiceDollar /> Financial Health</h4>
                          <div className="dossier-card-grid">
                            <div className="item">
                              <label>Total Billed</label>
                              <span>৳{Number(profileData.financialSummary?.totalBilled || 0).toLocaleString()}</span>
                            </div>
                            <div className="item">
                              <label>Total Paid</label>
                              <span style={{ color: '#059669' }}>৳{Number(profileData.financialSummary?.totalPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="item">
                              <label>Current Outstanding</label>
                              <span style={{ color: profileData.financialSummary?.balanceDue > 0 ? '#DC2626' : '#0F172A' }}>
                                ৳{Number(profileData.financialSummary?.balanceDue || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="item">
                              <label>Payment Rate</label>
                              <span>{profileData.financialSummary?.paymentRate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Box */}
                      {selectedTenantRecord.notes && (
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.875rem', fontSize: '0.875rem' }}>
                          <strong style={{ color: '#334155' }}>Agreement Notes:</strong>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#64748B' }}>{selectedTenantRecord.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PAYMENT HISTORY */}
                  {activeProfileTab === 'payments' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: '#0F172A', fontSize: '1rem' }}>Invoices & Verified Payment Records</h4>
                        <button className="btn-primary-blue" onClick={() => handleOpenPaymentModal(selectedTenantRecord)}>
                          <Plus size={14} /> Record Payment
                        </button>
                      </div>

                      {profileData.invoices?.length === 0 ? (
                        <div className="tenant-empty-state" style={{ padding: '2.25rem' }}>
                          <p>No rent invoices recorded yet for this tenancy.</p>
                          <button className="btn-primary-blue" onClick={() => handleOpenPaymentModal(selectedTenantRecord)}>
                            Record First Payment
                          </button>
                        </div>
                      ) : (
                        <div className="tenant-table-container">
                          <table className="tenant-table">
                            <thead>
                              <tr>
                                <th>Invoice / Month</th>
                                <th>Due Date</th>
                                <th>Billed</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profileData.invoices.map((inv) => (
                                <tr key={inv._id}>
                                  <td>
                                    <strong style={{ color: '#0F172A' }}>{inv.invoiceNo}</strong>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                      {inv.lineItems?.[0]?.description || 'Monthly Rent'}
                                    </div>
                                  </td>
                                  <td>
                                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td>৳{Number(inv.total).toLocaleString()}</td>
                                  <td style={{ color: '#059669', fontWeight: 600 }}>৳{Number(inv.paidAmount || 0).toLocaleString()}</td>
                                  <td style={{ color: (inv.balance || 0) > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>
                                    ৳{Number(inv.balance !== undefined ? inv.balance : (inv.total - (inv.paidAmount || 0))).toLocaleString()}
                                  </td>
                                  <td>
                                    {renderPaymentBadge(inv.status === 'paid' ? 'Paid' : (inv.status === 'partially_paid' ? 'Partially Paid' : (new Date(inv.dueDate) < new Date() ? 'Overdue' : 'Pending')))}
                                  </td>
                                  <td>
                                    <button
                                      className="action-btn-sm"
                                      onClick={() => window.print()}
                                      title="Print receipt / invoice"
                                    >
                                      <FaPrint /> Print
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: NOTICES & COMMUNICATION */}
                  {activeProfileTab === 'notices' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: '#0F172A', fontSize: '1rem' }}>Notice Delivery & Audit Trail</h4>
                        <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(selectedTenantRecord)}>
                          <FaBullhorn /> Compose Notice for Tenant
                        </button>
                      </div>

                      {profileData.notices?.length === 0 ? (
                        <div className="tenant-empty-state" style={{ padding: '2.25rem' }}>
                          <p>No notices issued to this tenant yet.</p>
                          <button className="btn-navy-outline" onClick={() => handleOpenNoticeModal(selectedTenantRecord)}>
                            Compose First Notice
                          </button>
                        </div>
                      ) : (
                        <div>
                          {profileData.notices.map((ntc) => (
                            <div key={ntc._id} className="notice-history-item">
                              <div className="notice-history-header">
                                <span className="notice-history-title">
                                  {ntc.subject}
                                </span>
                                <span className={`notice-delivery-pill ${ntc.status}`}>
                                  {ntc.status === 'sent' ? 'Delivered' : ntc.status.toUpperCase()}
                                </span>
                              </div>

                              <p style={{ margin: '0.375rem 0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                                {ntc.message}
                              </p>

                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem', alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={13} /> Issued: {new Date(ntc.issuedDate || ntc.createdAt).toLocaleString()}</span>
                                <span>Priority: <strong>{(ntc.priority || 'normal').toUpperCase()}</strong></span>
                                {ntc.dueDate && <span>Deadline: {new Date(ntc.dueDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="tenant-error-banner">Could not load tenant dossier.</div>
              )}
            </div>

            <div className="tenant-modal-footer">
              <button className="btn-navy-outline" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
              <button className="btn-primary-blue" onClick={() => handleOpenPaymentModal(selectedTenantRecord)}>
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: RECORD MANUAL PAYMENT MODAL
          ===================================================================== */}
      {showPaymentModal && selectedTenantRecord && (
        <div className="tenant-modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Record Rent Payment</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="tenant-modal-body">
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.125rem' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedTenantRecord.fullName}</div>
                  <div style={{ fontSize: '0.825rem', color: '#64748B' }}>
                    {selectedTenantRecord.propertyName} &bull; {selectedTenantRecord.unitNumber}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Payment Amount (BDT ৳) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 25000"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Payment Method *</label>
                    <select
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    >
                      <option value="cash">Cash (Direct)</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="mobile_banking">Mobile Banking (bKash / Nagad)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Rent Month / Cycle</label>
                    <input
                      type="text"
                      placeholder="e.g. November 2026"
                      value={paymentFormData.rentMonth}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, rentMonth: e.target.value })}
                    />
                  </div>

                  <div className="form-field form-group-full">
                    <label>Transaction Reference / Audit Note</label>
                    <input
                      type="text"
                      placeholder="Receipt number, bank transaction ID, or check note..."
                      value={paymentFormData.referenceNote}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNote: e.target.value })}
                    />
                    <span className="field-hint">
                      This entry will be recorded in the tenant ledger with an audit trail and in-app receipt confirmation.
                    </span>
                  </div>
                </div>
              </div>

              <div className="tenant-modal-footer">
                <button
                  type="button"
                  className="btn-navy-outline"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-blue"
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? (
                    <>
                      <ButtonLoader size="small" /> Recording...
                    </>
                  ) : (
                    'Confirm & Record Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: NOTICE COMPOSER MODAL
          ===================================================================== */}
      {showNoticeModal && (
        <div className="tenant-modal-backdrop" onClick={() => setShowNoticeModal(false)}>
          <div className="tenant-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Compose Tenant Notice</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowNoticeModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="tenant-modal-body">
              {/* Notice Type Selector */}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                  Select Notice Type *
                </label>
                <div className="notice-type-grid">
                  {NOTICE_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`notice-type-btn ${noticeFormData.noticeType === type.id ? 'active' : ''}`}
                      onClick={() => setNoticeFormData({ ...noticeFormData, noticeType: type.id })}
                    >
                      <span className="notice-type-icon">{type.icon}</span>
                      <span className="notice-type-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Eviction Warning Statutory Disclaimer Box */}
              {noticeFormData.noticeType === 'eviction_warning' && (
                <div className="eviction-warning-box">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><AlertTriangle size={16} /> Statutory Notice Procedure Warning</h4>
                  <p>
                    Official legal notices, cure periods, and eviction actions are strictly governed by applicable jurisdiction and statutory tenancy laws. Sending this notice serves as an official formal warning and <strong>does not constitute an unlawful self-help eviction</strong>. The tenant will not be automatically locked out or terminated in the database.
                  </p>
                  <label className="eviction-checkbox-label">
                    <input
                      type="checkbox"
                      checked={noticeFormData.legalDisclaimerAcknowledged}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, legalDisclaimerAcknowledged: e.target.checked })}
                    />
                    I acknowledge that official eviction proceedings require compliance with applicable statutory notice periods.
                  </label>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Recipient Target *</label>
                  <select
                    value={noticeFormData.recipientType}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, recipientType: e.target.value })}
                  >
                    <option value="individual">Individual Tenant</option>
                    <option value="property_all">All Tenants of Selected Property</option>
                    <option value="all_tenants">All Tenants (Portfolio Broadcast)</option>
                  </select>
                </div>

                {noticeFormData.recipientType === 'individual' && (
                  <div className="form-field">
                    <label>Select Tenant *</label>
                    <select
                      value={noticeFormData.tenantId}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, tenantId: e.target.value })}
                    >
                      <option value="">Select Tenant...</option>
                      {tenants.map(t => (
                        <option key={t._id} value={t.tenantId}>{t.fullName} &bull; {t.propertyName} ({t.unitNumber})</option>
                      ))}
                    </select>
                  </div>
                )}

                {noticeFormData.recipientType === 'property_all' && (
                  <div className="form-field">
                    <label>Select Property *</label>
                    <select
                      value={noticeFormData.propertyId}
                      onChange={(e) => setNoticeFormData({ ...noticeFormData, propertyId: e.target.value })}
                    >
                      <option value="">Select Property...</option>
                      {properties.map(p => (
                        <option key={p._id} value={p._id}>{p.title || p.address}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-field">
                  <label>Priority Level</label>
                  <select
                    value={noticeFormData.priority}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="low">Low (Informational)</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Relevant Date / Scheduled Deadline</label>
                  <input
                    type="date"
                    value={noticeFormData.dueDate}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, dueDate: e.target.value })}
                  />
                  <span className="field-hint">e.g. Payment due date or inspection date</span>
                </div>

                <div className="form-field form-group-full">
                  <label>Notice Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled Water Maintenance on Thursday"
                    value={noticeFormData.subject}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, subject: e.target.value })}
                  />
                </div>

                <div className="form-field form-group-full">
                  <label>Notice Message Body *</label>
                  <textarea
                    rows="5"
                    required
                    placeholder="Enter formal notice details, schedules, contact instructions..."
                    value={noticeFormData.message}
                    onChange={(e) => setNoticeFormData({ ...noticeFormData, message: e.target.value })}
                  />
                  <span className="field-hint">
                    Notice will be dispatched to the tenant's in-app notification center and their registered email via Resend.
                  </span>
                </div>
              </div>
            </div>

            <div className="tenant-modal-footer">
              <button
                type="button"
                className="btn-navy-outline"
                onClick={() => setShowNoticeModal(false)}
                disabled={noticeSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary-outline"
                onClick={() => handleSubmitNotice('draft')}
                disabled={noticeSubmitting}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn-primary-blue"
                onClick={() => handleSubmitNotice('sent')}
                disabled={noticeSubmitting || (noticeFormData.noticeType === 'eviction_warning' && !noticeFormData.legalDisclaimerAcknowledged)}
              >
                {noticeSubmitting ? (
                  <>
                    <ButtonLoader size="small" /> Dispatching...
                  </>
                ) : (
                  'Send Notice Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MOVE-OUT INSPECTION & DEPOSIT SETTLEMENT
          ===================================================================== */}
      {showMoveOutSettlementModal && selectedTenantForSettlement && (
        <div className="tenant-modal-backdrop" onClick={() => { if (!settlementSubmitting) setShowMoveOutSettlementModal(false); }}>
          <div className="tenant-modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h2>Move-Out Inspection & Deposit Settlement</h2>
              <button className="tenant-modal-close-btn" onClick={() => setShowMoveOutSettlementModal(false)} disabled={settlementSubmitting}>
                <FaTimes />
              </button>
            </div>

            <div className="tenant-modal-body">
              {settlementSuccess && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaCheckCircle color="#059669" />
                  <span>{settlementSuccess}</span>
                </div>
              )}

              {settlementError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaExclamationTriangle color="#DC2626" />
                  <span>{settlementError}</span>
                </div>
              )}

              {/* Tenancy & Notice Overview */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A' }}>
                      {selectedTenantForSettlement.fullName} &bull; {selectedTenantForSettlement.unitNumber}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                      {selectedTenantForSettlement.propertyName} — {selectedTenantForSettlement.propertyAddress}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Deposit Held</span>
                    <strong style={{ fontSize: '1.125rem', color: '#2563EB' }}>
                      ৳{Number(selectedTenantForSettlement.securityDeposit || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {selectedTenantForSettlement.moveOut?.noticeSubmitted ? (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Notice Filed Date</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                        {new Date(selectedTenantForSettlement.moveOut.noticeDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Intended Move-Out</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                        {new Date(selectedTenantForSettlement.moveOut.intendedMoveOutDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Notice Period Given</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: selectedTenantForSettlement.moveOut.meetsRequirement ? '#059669' : '#D97706' }}>
                        {selectedTenantForSettlement.moveOut.noticeDaysGiven} days ({selectedTenantForSettlement.moveOut.meetsRequirement ? 'Met 60 days' : 'Under 60 days'})
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Reason</span>
                      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {selectedTenantForSettlement.moveOut.reason || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#64748B' }}>
                    No move-out notice was submitted by the tenant. You can proceed directly to inspection and deposit settlement.
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="tenant-tabs-bar" style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'acknowledge' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('acknowledge')}
                >
                  1. Acknowledge Notice
                </button>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'handover' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('handover')}
                >
                  2. Handover Inspection
                </button>
                <button
                  type="button"
                  className={`tenant-tab-btn ${settlementStep === 'settlement' ? 'active' : ''}`}
                  onClick={() => setSettlementStep('settlement')}
                >
                  3. Deductions & Refund
                </button>
              </div>

              {/* STEP 1: ACKNOWLEDGE NOTICE */}
              {settlementStep === 'acknowledge' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-field">
                    <label>Scheduled Handover Inspection Date</label>
                    <input
                      type="date"
                      value={handoverDate}
                      onChange={(e) => setHandoverDate(e.target.value)}
                    />
                    <span className="field-hint">Coordinate with tenant for key return and walkthrough</span>
                  </div>

                  <div className="form-field">
                    <label>Acknowledgment Notes / Meeting Instructions</label>
                    <textarea
                      rows="3"
                      placeholder="e.g. Walkthrough confirmed at 11 AM. Tenant should return keys and remove all personal belongings."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleAcknowledgeNotice}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Acknowledging...' : 'Acknowledge Notice & Schedule Handover'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: RECORD HANDOVER INSPECTION */}
              {settlementStep === 'handover' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-field">
                    <label>Inspection & Handover Notes</label>
                    <textarea
                      rows="4"
                      placeholder="Detail apartment condition: wall paint, appliances, fixtures, cleanliness, keys returned, meter readings..."
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                    />
                    <span className="field-hint">These notes will be preserved in the tenancy archive.</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary-outline"
                      onClick={() => setSettlementStep('settlement')}
                    >
                      Skip to Deductions
                    </button>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleRecordHandover}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Saving...' : 'Record Handover & Proceed to Settlement'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DEDUCTIONS & REFUND */}
              {settlementStep === 'settlement' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Deductions Ledger */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase' }}>
                      Itemized Deposit Deductions
                    </h4>

                    {deductions.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0 0 0.75rem' }}>
                        No deductions recorded. Deposit will be refunded in full.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {deductions.map((d, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', border: '1px solid #E2E8F0' }}>
                            <div>
                              <strong style={{ fontSize: '0.8125rem', color: '#0F172A' }}>{d.description}</strong>
                              <span style={{ fontSize: '0.6875rem', color: '#64748B', marginLeft: '0.5rem' }}>({d.category || 'general'})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#DC2626' }}>-৳{Number(d.amount).toLocaleString()}</span>
                              <button type="button" onClick={() => handleRemoveDeduction(idx)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Deduction Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Wall patch & repaint"
                          value={newDeduction.description}
                          onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Amount (৳)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newDeduction.amount}
                          onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                        <select
                          value={newDeduction.category}
                          onChange={(e) => setNewDeduction({ ...newDeduction, category: e.target.value })}
                          style={{ width: '100%', padding: '0.4375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #CBD5E1', borderRadius: '0.25rem' }}
                        >
                          <option value="repairs">Repairs</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="utilities">Unpaid Utilities</option>
                          <option value="rent">Unpaid Rent</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDeduction}
                        className="btn-secondary-outline"
                        style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem', height: 'fit-content' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Summary & Refund Processing */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Original Security Deposit:</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#0F172A' }}>৳{Number(selectedTenantForSettlement.securityDeposit || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Total Deductions:</span>
                      <strong style={{ fontSize: '0.9375rem', color: '#DC2626' }}>
                        -৳{deductions.reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #CBD5E1' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Net Refund Amount:</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                        ৳{Math.max(0, Number(selectedTenantForSettlement.securityDeposit || 0) - deductions.reduce((s, d) => s + Number(d.amount || 0), 0)).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Refund Payment Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.875rem' }}>
                    <div className="form-field">
                      <label>Disbursed Refund Amount (৳)</label>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Disbursement Method</label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                      >
                        <option value="Bank Transfer">Bank Transfer / Wire</option>
                        <option value="bKash / Nagad">Mobile Banking (bKash/Nagad)</option>
                        <option value="Check">Official Bank Check</option>
                        <option value="Cash">Cash Receipt</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Transaction / Check Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-7890123"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Terminate Tenancy & Release Property */}
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.375rem', padding: '0.75rem 1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1E3A8A', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={terminateTenancy}
                        onChange={(e) => setTerminateTenancy(e.target.checked)}
                        style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }}
                      />
                      <span>Conclude tenancy and immediately return property/unit status to Available</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-navy-outline"
                      onClick={() => setShowMoveOutSettlementModal(false)}
                      disabled={settlementSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary-blue"
                      onClick={handleProcessSettlement}
                      disabled={settlementSubmitting}
                    >
                      {settlementSubmitting ? 'Finalizing Settlement...' : 'Finalize Settlement & Terminate Tenancy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantInfo;
