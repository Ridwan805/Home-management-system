import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  FileText, 
  Wrench, 
  Compass, 
  UserRound, 
  Home, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone, 
  ArrowRight, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Tag, 
  Bed, 
  Bath, 
  Maximize, 
  DollarSign, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AuthContext } from '../../App';
import API, { authenticatedFetch, getImageUrl, getTenantReports } from '../../config/api';
import TenantStatCard from './components/TenantStatCard';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';
import { DashboardCardSkeleton } from '../../components/loading';
import './TenantOverview.css';

const TenantOverview = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [tenantProfile, setTenantProfile] = useState(currentUser || null);
  const [activeProperty, setActiveProperty] = useState(null);
  const [hasActiveLease, setHasActiveLease] = useState(false);
  const [leaseDetails, setLeaseDetails] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [maintenanceReports, setMaintenanceReports] = useState([]);

  // Fetch all tenant dashboard data concurrently
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const saved = localStorage.getItem('dwellSyncUser');
    if (!saved) {
      setError('Session expired. Please log in.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let token = null;
    try {
      const parsed = JSON.parse(saved);
      token = parsed.token;
    } catch {
      setError('Invalid session. Please log in again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const timestamp = new Date().getTime();

      // Run fetches in parallel with resilient error handling
      const [assignmentsRes, paymentsRes, requestsRes, reportsRes, profileRes] = await Promise.allSettled([
        // 1. Assigned Property / Lease
        fetch(`${API.getUrl(API.endpoints.tenantAssignments)}?_t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }).then(res => res.ok ? res.json() : null),

        // 2. Invoices & Payments
        authenticatedFetch(
          API.getUrl('/api/payments/my-payments'),
          { method: 'GET' },
          navigate
        ).catch(() => null),

        // 3. Property Requests / Applications
        authenticatedFetch(
          API.getUrl('/api/request-management/my-requests'),
          { method: 'GET' },
          navigate
        ).catch(() => null),

        // 4. Maintenance Reports
        getTenantReports().catch(() => null),

        // 5. User Profile (fresh copy if available)
        fetch(API.getUrl('/api/auth/me'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : null).catch(() => null)
      ]);

      // Handle Profile
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setTenantProfile(profileRes.value);
      }

      // Handle Assignments / Active Tenancy
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.assignments) {
        const assignments = assignmentsRes.value.assignments;
        const rented = assignments.rentedProperties || [];
        const owned = assignments.ownedProperties || [];

        if (rented.length > 0) {
          const primaryRental = rented[0];
          setActiveProperty(primaryRental.property || primaryRental);
          setLeaseDetails({
            assignmentType: 'Rent',
            assignedAt: primaryRental.request?.approvedAt || primaryRental.property?.updatedAt,
            leaseEnd: primaryRental.request?.leaseEnd || null,
            status: primaryRental.request?.status || 'Approved',
            owner: primaryRental.property?.ownerUserId || primaryRental.ownerId || null,
            requestInfo: primaryRental.request || null
          });
          setHasActiveLease(true);
        } else if (owned.length > 0) {
          const primaryOwned = owned[0];
          setActiveProperty(primaryOwned);
          setLeaseDetails({
            assignmentType: 'Owned',
            assignedAt: primaryOwned.updatedAt,
            leaseEnd: null,
            status: 'Owned',
            owner: null,
            requestInfo: null
          });
          setHasActiveLease(true);
        } else {
          setActiveProperty(null);
          setLeaseDetails(null);
          setHasActiveLease(false);
        }
      } else {
        setHasActiveLease(false);
      }

      // Handle Invoices & Payments
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.data) {
        setInvoices(paymentsRes.value.data.pendingInvoices || []);
        setPaymentHistory(paymentsRes.value.data.paymentHistory || []);
      }

      // Handle Requests
      if (requestsRes.status === 'fulfilled' && requestsRes.value?.requests) {
        setRequests(requestsRes.value.requests);
      }

      // Handle Maintenance Reports
      if (reportsRes.status === 'fulfilled' && reportsRes.value) {
        const reps = reportsRes.value.data || reportsRes.value.reports || [];
        setMaintenanceReports(reps);
      }

    } catch (err) {
      console.error('TenantOverview: Error fetching dashboard data:', err);
      setError('Failed to load some dashboard information. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Currency formatter
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

  // Date formatter
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Metric Computations
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'completed');
  const outstandingRent = pendingInvoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const primaryCurrency = invoices[0]?.currency || paymentHistory[0]?.currency || 'USD';

  // Pending property applications count
  const pendingApplications = requests.filter(r => 
    ['Submitted', 'Under Review', 'Info Requested', 'Approved – Pay Advance', 'Payment Submitted'].includes(r.status)
  );

  // Open maintenance reports count
  const openMaintenanceReports = maintenanceReports.filter(r => 
    !['resolved', 'completed', 'cancelled'].includes(r.status?.toLowerCase())
  );

  // Address helper
  const getPropertyAddress = (property) => {
    if (!property) return 'Address not available';
    if (property.fullAddress) return property.fullAddress;
    if (property.address) {
      const parts = [property.address];
      if (property.city) parts.push(property.city);
      if (property.state) parts.push(property.state);
      return parts.join(', ');
    }
    if (property.location?.address) {
      const parts = [property.location.address];
      if (property.location.city) parts.push(property.location.city);
      if (property.location.state) parts.push(property.location.state);
      return parts.join(', ');
    }
    return 'Residential Unit';
  };

  // Primary image helper
  const getPropertyImage = (property) => {
    if (property?.images && property.images.length > 0) {
      return getImageUrl(property.images[0]);
    }
    if (property?.media?.images && property.media.images.length > 0) {
      return getImageUrl(property.media.images[0]);
    }
    return null;
  };

  // Consolidated Recent Activity Feed (sorted newest first)
  const getCombinedRecentActivity = () => {
    const activityItems = [];

    // 1. Property Applications
    requests.forEach(req => {
      activityItems.push({
        id: `req-${req._id}`,
        type: 'request',
        icon: FileText,
        title: req.propertyId?.title || req.propertyId?.address || 'Property Application',
        subtitle: `Application for ${req.requestType || 'Rental'}`,
        status: req.status,
        date: req.createdAt || req.updatedAt,
        actionUrl: '/tenant/request-info'
      });
    });

    // 2. Pending Invoices
    pendingInvoices.forEach(inv => {
      activityItems.push({
        id: `inv-${inv._id}`,
        type: 'invoice',
        icon: CreditCard,
        title: `Rent Invoice: ${formatMoney(inv.total || inv.amount, inv.currency || primaryCurrency)}`,
        subtitle: inv.dueDate ? `Due by ${formatDate(inv.dueDate)}` : 'Outstanding payment',
        status: inv.status || 'pending',
        date: inv.createdAt || inv.dueDate,
        actionUrl: '/tenant/payment'
      });
    });

    // 3. Paid Transactions
    paymentHistory.slice(0, 5).forEach(pay => {
      activityItems.push({
        id: `pay-${pay._id}`,
        type: 'payment',
        icon: CheckCircle2,
        title: `Payment: ${formatMoney(pay.amount, pay.currency || primaryCurrency)}`,
        subtitle: pay.paymentMethod ? `Via ${pay.paymentMethod}` : 'Rent payment completed',
        status: pay.status || 'Completed',
        date: pay.paymentDate || pay.createdAt,
        actionUrl: '/tenant/payment'
      });
    });

    // 4. Maintenance Tickets
    maintenanceReports.forEach(rep => {
      activityItems.push({
        id: `rep-${rep._id}`,
        type: 'maintenance',
        icon: Wrench,
        title: rep.title || `Maintenance: ${rep.issueType || 'Issue'}`,
        subtitle: rep.propertyId?.address || 'Report submitted',
        status: rep.status || 'submitted',
        date: rep.createdAt,
        actionUrl: '/tenant/report-problem'
      });
    });

    // Sort by timestamp descending
    activityItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return activityItems.slice(0, 6);
  };

  const recentActivities = getCombinedRecentActivity();

  // Tenant greeting name
  const tenantName = tenantProfile?.firstName || 
    (tenantProfile?.name ? tenantProfile.name.split(' ')[0] : null) || 
    currentUser?.firstName || 
    'Tenant';

  const todayString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="tenant-overview-page">
      {/* 1. Welcome Header Banner */}
      <section className="overview-welcome-banner">
        <div className="banner-left">
          <div className="banner-badge-row">
            <span className="tenant-role-badge">
              <ShieldCheck size={14} className="badge-icon" />
              <span>Verified Tenant</span>
            </span>
            <span className="banner-date-pill">
              <Calendar size={13} className="badge-icon" />
              <span>{todayString}</span>
            </span>
          </div>
          <h1 className="banner-title">Welcome back, {tenantName}!</h1>
          <p className="banner-subtitle">
            Here is your live property summary, rental status, open requests, and quick actions.
          </p>
        </div>

        <div className="banner-actions">
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchDashboardData(true)}
            disabled={loading || refreshing}
            title="Refresh dashboard data"
          >
            <RotateCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
          <Link to="/properties" className="ds-btn ds-btn-primary">
            <Compass size={16} />
            <span>Browse Listings</span>
          </Link>
        </div>
      </section>

      {error && (
        <div className="overview-alert-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Key Metrics Stat Grid */}
      <section className="overview-stats-grid" aria-label="Tenant Quick Metrics">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={`stat-skeleton-${i}`} />
          ))
        ) : (
          <>
            <TenantStatCard
              title="Active Tenancy"
              value={hasActiveLease ? 'Active Lease' : 'No Active Lease'}
              subtitle={
                hasActiveLease 
                  ? (activeProperty?.city || activeProperty?.title || 'Residential Unit Assigned') 
                  : 'Ready to apply for listings'
              }
              icon={Home}
              variant={hasActiveLease ? 'emerald' : 'blue'}
              onClick={() => navigate(hasActiveLease ? '/tenant/house-info' : '/properties')}
            />

            <TenantStatCard
              title="Outstanding Rent"
              value={formatMoney(outstandingRent, primaryCurrency)}
              subtitle={
                pendingInvoices.length > 0 
                  ? `${pendingInvoices.length} invoice(s) awaiting payment` 
                  : 'All rent payments are settled'
              }
              icon={CreditCard}
              variant={outstandingRent > 0 ? 'rose' : 'emerald'}
              highlightColor={outstandingRent > 0 ? '#DC2626' : '#059669'}
              onClick={() => navigate('/tenant/payment')}
            />

            <TenantStatCard
              title="Pending Applications"
              value={pendingApplications.length}
              subtitle={
                pendingApplications.length > 0 
                  ? `${pendingApplications.length} application(s) under review` 
                  : 'No pending property applications'
              }
              icon={FileText}
              variant={pendingApplications.length > 0 ? 'amber' : 'navy'}
              onClick={() => navigate('/tenant/request-info')}
            />

            <TenantStatCard
              title="Open Maintenance"
              value={openMaintenanceReports.length}
              subtitle={
                openMaintenanceReports.length > 0 
                  ? `${openMaintenanceReports.length} issue(s) in progress` 
                  : 'All maintenance reports resolved'
              }
              icon={Wrench}
              variant={openMaintenanceReports.length > 0 ? 'amber' : 'emerald'}
              onClick={() => navigate('/tenant/report-problem')}
            />
          </>
        )}
      </section>

      {/* 3. Main Dashboard Layout: Current Residence + Activity Feed */}
      <div className="overview-main-grid">
        {/* Left Column: Tenancy Summary & Quick Actions */}
        <div className="overview-column-primary">
          {/* Current Tenancy Section */}
          <section className="overview-card tenancy-summary-card">
            <div className="card-header-row">
              <div className="card-header-left">
                <div className="section-icon-box">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="card-section-title">Current Residence</h2>
                  <p className="card-section-subtitle">Details of your actively leased property</p>
                </div>
              </div>
              {hasActiveLease && (
                <TenantStatusBadge status={leaseDetails?.status || 'Active'} />
              )}
            </div>

            {loading ? (
              <div className="tenancy-skeleton-wrapper">
                <div className="skeleton-image-box" />
                <div className="skeleton-info-lines">
                  <div className="skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton-line" style={{ width: '80%' }} />
                </div>
              </div>
            ) : hasActiveLease && activeProperty ? (
              <div className="active-tenancy-details">
                <div className="tenancy-visual-row">
                  <div className="tenancy-thumbnail-box">
                    {getPropertyImage(activeProperty) ? (
                      <img 
                        src={getPropertyImage(activeProperty)} 
                        alt={activeProperty.title || 'Assigned Property'} 
                        className="tenancy-thumb-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="tenancy-thumb-placeholder">
                        <Building2 size={36} />
                      </div>
                    )}
                  </div>

                  <div className="tenancy-key-info">
                    <div className="tenancy-type-tag">
                      <Tag size={13} />
                      <span>{activeProperty.propertyType ? activeProperty.propertyType.toUpperCase() : 'RESIDENTIAL'} • {leaseDetails?.assignmentType || 'RENT'}</span>
                    </div>
                    <h3 className="tenancy-property-title">
                      {activeProperty.title || activeProperty.fullAddress || 'Assigned Residence'}
                    </h3>
                    <p className="tenancy-address">
                      <MapPin size={15} />
                      <span>{getPropertyAddress(activeProperty)}</span>
                    </p>

                    <div className="tenancy-specs-chips">
                      <span className="spec-chip">
                        <DollarSign size={14} />
                        <strong>{formatMoney(activeProperty.rentAmount || activeProperty.price || 0, primaryCurrency)}</strong> / mo
                      </span>
                      {activeProperty.bedrooms && (
                        <span className="spec-chip">
                          <Bed size={14} /> {activeProperty.bedrooms} Beds
                        </span>
                      )}
                      {activeProperty.bathrooms && (
                        <span className="spec-chip">
                          <Bath size={14} /> {activeProperty.bathrooms} Baths
                        </span>
                      )}
                      {(activeProperty.size || activeProperty.specifications?.squareFootage) && (
                        <span className="spec-chip">
                          <Maximize size={14} /> {activeProperty.size || activeProperty.specifications?.squareFootage} sq ft
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Tenancy Info */}
                <div className="tenancy-meta-grid">
                  <div className="meta-info-item">
                    <span className="meta-label">Lease Commenced</span>
                    <span className="meta-value">
                      <Calendar size={14} />
                      {formatDate(leaseDetails?.assignedAt)}
                    </span>
                  </div>

                  <div className="meta-info-item">
                    <span className="meta-label">Lease Status</span>
                    <span className="meta-value">
                      <CheckCircle2 size={14} color="#059669" />
                      Active & In Good Standing
                    </span>
                  </div>

                  {leaseDetails?.owner && (
                    <div className="meta-info-item">
                      <span className="meta-label">Property Landlord</span>
                      <span className="meta-value">
                        <UserRound size={14} />
                        {leaseDetails.owner.name || `${leaseDetails.owner.firstName || ''} ${leaseDetails.owner.lastName || ''}`.trim() || 'Property Owner'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct Action Links */}
                <div className="tenancy-card-actions">
                  <Link to="/tenant/house-info" className="ds-btn ds-btn-primary">
                    <Building2 size={16} />
                    <span>View Full House Details</span>
                  </Link>
                  <Link to="/tenant/report-problem" className="ds-btn ds-btn-secondary">
                    <Wrench size={16} />
                    <span>Report Maintenance Issue</span>
                  </Link>
                  <Link to="/tenant/payment" className="ds-btn ds-btn-secondary">
                    <CreditCard size={16} />
                    <span>Rent Payments</span>
                  </Link>
                </div>
              </div>
            ) : (
              <TenantEmptyState
                icon={Building2}
                title="No Active Tenancy Found"
                description="You do not currently have an active lease assigned to your account. You can discover available properties or monitor your existing tenancy applications below."
                primaryAction={
                  <Link to="/properties" className="ds-btn ds-btn-primary">
                    <Compass size={16} />
                    <span>Browse Properties</span>
                  </Link>
                }
                secondaryAction={
                  <Link to="/tenant/request-info" className="ds-btn ds-btn-secondary">
                    <FileText size={16} />
                    <span>View My Requests</span>
                  </Link>
                }
              />
            )}
          </section>

          {/* Quick Action Navigation Grid */}
          <section className="overview-card quick-actions-card">
            <h2 className="card-section-title" style={{ marginBottom: '1rem' }}>
              Quick Actions
            </h2>
            <div className="quick-actions-grid">
              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/properties')}
              >
                <div className="action-icon-circle blue">
                  <Compass size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">Browse Properties</span>
                  <span className="action-tile-desc">Find apartments & houses</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>

              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/tenant/payment')}
              >
                <div className="action-icon-circle emerald">
                  <CreditCard size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">Make Payment</span>
                  <span className="action-tile-desc">Pay rent & view receipts</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>

              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/tenant/report-problem')}
              >
                <div className="action-icon-circle amber">
                  <Wrench size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">Report a Problem</span>
                  <span className="action-tile-desc">Request repairs & maintenance</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>

              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/tenant/request-info')}
              >
                <div className="action-icon-circle purple">
                  <FileText size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">My Requests</span>
                  <span className="action-tile-desc">Track tenancy applications</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>

              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/tenant/house-info')}
              >
                <div className="action-icon-circle navy">
                  <Home size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">House Information</span>
                  <span className="action-tile-desc">Floor plan & building info</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>

              <button 
                type="button" 
                className="quick-action-tile"
                onClick={() => navigate('/tenant/profile')}
              >
                <div className="action-icon-circle sky">
                  <UserRound size={20} />
                </div>
                <div className="action-tile-text">
                  <span className="action-tile-title">My Profile</span>
                  <span className="action-tile-desc">Update contact details</span>
                </div>
                <ArrowRight size={16} className="tile-arrow" />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Recent Activity Feed & Active Applications Spotlight */}
        <div className="overview-column-secondary">
          {/* Recent Activity Feed */}
          <section className="overview-card activity-feed-card">
            <div className="card-header-row">
              <div className="card-header-left">
                <div className="section-icon-box" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="card-section-title">Recent Activity</h2>
                  <p className="card-section-subtitle">Latest updates across your tenant account</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="activity-feed-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`act-skeleton-${i}`} className="activity-skeleton-item">
                    <div className="skeleton-circle" />
                    <div className="skeleton-content">
                      <div className="skeleton-line" style={{ width: '70%' }} />
                      <div className="skeleton-line" style={{ width: '45%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="activity-feed-list">
                {recentActivities.map((act) => {
                  const ActIcon = act.icon;
                  return (
                    <div 
                      key={act.id} 
                      className="activity-feed-item"
                      onClick={() => navigate(act.actionUrl)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`activity-icon-wrap type-${act.type}`}>
                        <ActIcon size={16} />
                      </div>
                      <div className="activity-body">
                        <div className="activity-title-line">
                          <span className="activity-title">{act.title}</span>
                          <TenantStatusBadge status={act.status} size="sm" />
                        </div>
                        <div className="activity-sub-line">
                          <span className="activity-subtitle">{act.subtitle}</span>
                          <span className="activity-date">{formatDate(act.date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="activity-empty-state">
                <Clock size={32} className="empty-clock-icon" />
                <p className="empty-activity-title">No Recent Activity</p>
                <p className="empty-activity-desc">
                  When you apply for properties, complete rent payments, or submit maintenance requests, updates will appear here.
                </p>
              </div>
            )}
          </section>

          {/* Pending Applications Spotlight */}
          {pendingApplications.length > 0 && (
            <section className="overview-card spotlight-card">
              <div className="card-header-row">
                <h3 className="card-section-title" style={{ fontSize: '1.05rem' }}>
                  Pending Applications ({pendingApplications.length})
                </h3>
                <Link to="/tenant/request-info" className="spotlight-view-all">
                  <span>View All</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="spotlight-list">
                {pendingApplications.slice(0, 3).map((app) => (
                  <div 
                    key={app._id} 
                    className="spotlight-item"
                    onClick={() => navigate('/tenant/request-info')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="spotlight-item-header">
                      <span className="spotlight-prop-title">
                        {app.propertyId?.title || app.propertyId?.address || 'Property Application'}
                      </span>
                      <TenantStatusBadge status={app.status} size="sm" />
                    </div>
                    <div className="spotlight-item-footer">
                      <span className="spotlight-type">{app.requestType || 'Rental'} Application</span>
                      <span className="spotlight-date">{formatDate(app.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantOverview;