import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Home,
  CreditCard,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  Wrench,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  RotateCw,
  Bed,
  Bath,
  Maximize,
  ArrowRight,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { AuthContext } from '../../App';
import API, { getImageUrl } from '../../config/api';
import TenancyDetailsModal from '../TenantDashboard/components/TenancyDetailsModal';
import EditPropertyModal from '../../components/EditPropertyModal';
import './UnifiedOverview.css';

const UnifiedOverview = ({ onNavigateSection, searchTerm = '' }) => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard Data State
  const [summary, setSummary] = useState({
    propertiesOwned: 0,
    homesRented: 0,
    rentToPay: 0,
    rentToReceive: 0
  });
  const [portfolio, setPortfolio] = useState({
    all: [],
    owned: [],
    rented: []
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Active Portfolio Filter Tab: 'all' | 'owned' | 'rented'
  const [activeTab, setActiveTab] = useState('all');

  // Modals state
  const [selectedRentalProperty, setSelectedRentalProperty] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);

  // Fetch unified dashboard overview data
  const fetchDashboardOverview = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try {
        token = JSON.parse(saved).token;
      } catch {
        token = null;
      }
    }

    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(API.getUrl(API.endpoints.dashboardOverview), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard metrics');
      }

      const data = await response.json();
      if (data.success) {
        setSummary(data.summary || {});
        setPortfolio(data.portfolio || { all: [], owned: [], rented: [] });
        setRecentActivities(data.recentActivities || []);
      }
    } catch (err) {
      console.error('Error fetching unified overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  // Filter properties based on tab & optional search term
  const getFilteredProperties = () => {
    let list = [];
    if (activeTab === 'owned') list = portfolio.owned || [];
    else if (activeTab === 'rented') list = portfolio.rented || [];
    else list = portfolio.all || [];

    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.propertyType && p.propertyType.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const filteredProperties = getFilteredProperties();

  // Helper to format currency
  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  // Helper to format activity dates
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get activity icon based on type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'payment':
        return CreditCard;
      case 'invoice':
        return Receipt;
      case 'application':
        return ClipboardList;
      case 'notice':
        return AlertTriangle;
      case 'maintenance':
        return Wrench;
      default:
        return Clock;
    }
  };

  return (
    <div className="unified-overview-container">
      {/* Page Header */}
      <div className="overview-hero-row">
        <div>
          <h1 className="overview-page-title">Dashboard Overview</h1>
          <p className="overview-page-subtitle">
            Welcome back, {currentUser?.firstName || currentUser?.name || 'Member'}! Here is your real-time property and tenancy summary.
          </p>
        </div>
        <button
          type="button"
          className="overview-refresh-btn"
          onClick={() => fetchDashboardOverview(true)}
          disabled={refreshing}
          title="Refresh dashboard data"
        >
          <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="overview-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Four Financial / Property Summary KPI Cards */}
      <section className="summary-cards-grid" aria-label="Financial and Property Summary">
        {/* Card 1: Properties I Own */}
        <div
          className="summary-kpi-card"
          onClick={() => {
            setActiveTab('owned');
            const el = document.getElementById('portfolio-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">Properties I Own</span>
            <div className="kpi-icon-box owned-icon">
              <Building2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">{loading ? '...' : summary.propertiesOwned}</span>
            <span className="kpi-sub-badge owned-badge">Portfolio</span>
          </div>
          <span className="kpi-meta-text">Listed & managed properties</span>
        </div>

        {/* Card 2: Homes I Rent */}
        <div
          className="summary-kpi-card"
          onClick={() => {
            setActiveTab('rented');
            const el = document.getElementById('portfolio-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">Homes I Rent</span>
            <div className="kpi-icon-box rented-icon">
              <Home size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">{loading ? '...' : summary.homesRented}</span>
            <span className="kpi-sub-badge rented-badge">Active</span>
          </div>
          <span className="kpi-meta-text">Active rental leases</span>
        </div>

        {/* Card 3: Rent to Pay */}
        <div
          className="summary-kpi-card"
          onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">Rent to Pay</span>
            <div className="kpi-icon-box pay-icon">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">{loading ? '...' : formatBDT(summary.rentToPay)}</span>
            <span className={`kpi-sub-badge ${summary.rentToPay > 0 ? 'due-badge' : 'paid-badge'}`}>
              {summary.rentToPay > 0 ? 'Due' : 'Settled'}
            </span>
          </div>
          <span className="kpi-meta-text">Pending rent obligations as tenant</span>
        </div>

        {/* Card 4: Rent to Receive */}
        <div
          className="summary-kpi-card"
          onClick={() => onNavigateSection ? onNavigateSection('financials') : navigate('/dashboard/financials')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">Rent to Receive</span>
            <div className="kpi-icon-box receive-icon">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">{loading ? '...' : formatBDT(summary.rentToReceive)}</span>
            <span className={`kpi-sub-badge ${summary.rentToReceive > 0 ? 'pending-badge' : 'collected-badge'}`}>
              {summary.rentToReceive > 0 ? 'Pending' : 'Up to Date'}
            </span>
          </div>
          <span className="kpi-meta-text">Outstanding from tenants on owned units</span>
        </div>
      </section>

      {/* Main 2-Column Content Layout */}
      <div className="overview-main-columns" id="portfolio-section">
        {/* Left Column: My Property Portfolio (~70%) */}
        <div className="overview-portfolio-column">
          <div className="portfolio-card-container">
            {/* Header & Filter Tabs */}
            <div className="portfolio-header-row">
              <div className="portfolio-title-group">
                <h2 className="portfolio-section-title">My Property Portfolio</h2>
                <span className="portfolio-count-tag">
                  {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'}
                </span>
              </div>

              {/* Filter Tabs: All, Owned, Rented */}
              <div className="portfolio-filter-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'all'}
                  className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All ({portfolio.all?.length || 0})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'owned'}
                  className={`filter-tab ${activeTab === 'owned' ? 'active' : ''}`}
                  onClick={() => setActiveTab('owned')}
                >
                  Owned ({portfolio.owned?.length || 0})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'rented'}
                  className={`filter-tab ${activeTab === 'rented' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rented')}
                >
                  Rented ({portfolio.rented?.length || 0})
                </button>
              </div>
            </div>

            {/* Property Cards List */}
            {loading ? (
              <div className="portfolio-loading-grid">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={`p-skel-${i}`} className="portfolio-skeleton-card" />
                ))}
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="portfolio-cards-grid">
                {filteredProperties.map((property) => {
                  const isOwned = property.portfolioType === 'owned';
                  const propertyImage =
                    Array.isArray(property.images) && property.images.length > 0
                      ? getImageUrl(property.images[0])
                      : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';

                  return (
                    <article key={property._id || property.id} className="portfolio-property-card">
                      {/* Image Thumbnail & Badges */}
                      <div className="property-card-image-wrap">
                        <img
                          src={propertyImage}
                          alt={property.title || property.address}
                          className="property-card-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div className="property-badges-overlay">
                          <span className={`portfolio-type-pill ${isOwned ? 'owned-pill' : 'rented-pill'}`}>
                            {isOwned ? 'Owned Property' : 'Rented Residence'}
                          </span>
                          <span className="property-status-pill">
                            {property.status}
                          </span>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="property-card-body">
                        <div className="property-pricing-row">
                          <span className="property-price-main">
                            {formatBDT(property.price)}
                            <span className="price-cycle"> / mo</span>
                          </span>
                          <span className="property-type-label">
                            {property.propertyType || 'Apartment'}
                          </span>
                        </div>

                        <h3 className="property-card-title">{property.title || property.address}</h3>
                        <p className="property-card-address">{property.address}</p>

                        {/* Specifications */}
                        <div className="property-specs-row">
                          {property.specifications?.bedrooms > 0 && (
                            <span className="spec-item">
                              <Bed size={14} />
                              {property.specifications.bedrooms} Beds
                            </span>
                          )}
                          {property.specifications?.bathrooms > 0 && (
                            <span className="spec-item">
                              <Bath size={14} />
                              {property.specifications.bathrooms} Baths
                            </span>
                          )}
                          {property.specifications?.squareFootage > 0 && (
                            <span className="spec-item">
                              <Maximize size={14} />
                              {property.specifications.squareFootage} sqft
                            </span>
                          )}
                        </div>

                        {/* Contextual Action Buttons */}
                        <div className="property-actions-container">
                          {isOwned ? (
                            // OWNED PROPERTY ACTIONS
                            <div className="actions-button-grid owned-grid">
                              <button
                                type="button"
                                className="card-action-btn primary-action"
                                onClick={() => onNavigateSection ? onNavigateSection('tenants-buyers') : navigate('/dashboard/tenants-buyers')}
                              >
                                <Users size={14} />
                                <span>Manage Tenants</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => navigate(`/properties/${property._id}`)}
                              >
                                <ExternalLink size={14} />
                                <span>View Details</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => setEditingProperty(property)}
                              >
                                <span>Manage Listing</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => onNavigateSection ? onNavigateSection('applications') : navigate('/dashboard/applications')}
                              >
                                <span>View Applications</span>
                              </button>
                            </div>
                          ) : (
                            // RENTED PROPERTY ACTIONS
                            <div className="actions-button-grid rented-grid">
                              <button
                                type="button"
                                className="card-action-btn primary-action pay-btn"
                                onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
                              >
                                <CreditCard size={14} />
                                <span>Pay Rent</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => setSelectedRentalProperty(property)}
                              >
                                <FileText size={14} />
                                <span>Tenancy Details</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => onNavigateSection ? onNavigateSection('maintenance') : navigate('/dashboard/maintenance')}
                              >
                                <Wrench size={14} />
                                <span>Report an Issue</span>
                              </button>
                              <button
                                type="button"
                                className="card-action-btn secondary-action"
                                onClick={() => navigate(`/properties/${property._id}`)}
                              >
                                <ExternalLink size={14} />
                                <span>View Details</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="portfolio-empty-state">
                <Building2 size={36} className="empty-icon" />
                <h4 className="empty-title">
                  {activeTab === 'owned'
                    ? 'No Owned Properties'
                    : activeTab === 'rented'
                    ? 'No Rented Residences'
                    : 'No Properties in Portfolio'}
                </h4>
                <p className="empty-description">
                  {activeTab === 'owned'
                    ? 'You have not listed any properties yet. List your property to begin accepting tenant applications.'
                    : activeTab === 'rented'
                    ? 'You do not have any active rental leases. Explore available properties to submit a tenancy application.'
                    : 'Your unified property portfolio will show all homes you rent and properties you own.'}
                </p>
                <div className="empty-actions-row">
                  <button
                    type="button"
                    className="empty-cta-btn primary"
                    onClick={() => onNavigateSection ? onNavigateSection('create-listing') : navigate('/dashboard/create-listing')}
                  >
                    <PlusCircle size={15} />
                    <span>List a Property</span>
                  </button>
                  <button
                    type="button"
                    className="empty-cta-btn secondary"
                    onClick={() => navigate('/properties')}
                  >
                    <Home size={15} />
                    <span>Explore Rentals</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Recent Activity (~30%) */}
        <aside className="overview-sidebar-column">
          {/* Quick Actions Panel */}
          <section className="overview-side-panel quick-actions-panel" aria-label="Quick Actions">
            <div className="side-panel-header">
              <h3 className="side-panel-title">Quick Actions</h3>
              <span className="side-panel-desc">Common property shortcuts</span>
            </div>

            <div className="quick-actions-list">
              <button
                type="button"
                className="quick-action-item"
                onClick={() => onNavigateSection ? onNavigateSection('create-listing') : navigate('/dashboard/create-listing')}
              >
                <div className="qa-icon-wrap qa-create">
                  <PlusCircle size={18} />
                </div>
                <div className="qa-text-wrap">
                  <span className="qa-title">List a Property</span>
                  <span className="qa-subtitle">Add a new rental unit</span>
                </div>
                <ChevronRight size={16} className="qa-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
              >
                <div className="qa-icon-wrap qa-pay">
                  <CreditCard size={18} />
                </div>
                <div className="qa-text-wrap">
                  <span className="qa-title">Pay Rent</span>
                  <span className="qa-subtitle">Pay monthly rent online</span>
                </div>
                <ChevronRight size={16} className="qa-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => onNavigateSection ? onNavigateSection('applications') : navigate('/dashboard/applications')}
              >
                <div className="qa-icon-wrap qa-apps">
                  <ClipboardList size={18} />
                </div>
                <div className="qa-text-wrap">
                  <span className="qa-title">View Applications</span>
                  <span className="qa-subtitle">Manage rental requests</span>
                </div>
                <ChevronRight size={16} className="qa-arrow" />
              </button>

              <button
                type="button"
                className="quick-action-item"
                onClick={() => onNavigateSection ? onNavigateSection('maintenance') : navigate('/dashboard/maintenance')}
              >
                <div className="qa-icon-wrap qa-maint">
                  <Wrench size={18} />
                </div>
                <div className="qa-text-wrap">
                  <span className="qa-title">Request Maintenance</span>
                  <span className="qa-subtitle">Report a repair issue</span>
                </div>
                <ChevronRight size={16} className="qa-arrow" />
              </button>
            </div>
          </section>

          {/* Recent Activity Panel */}
          <section className="overview-side-panel recent-activity-panel" aria-label="Recent Activity">
            <div className="side-panel-header">
              <div className="side-header-left">
                <Clock size={16} className="clock-icon" />
                <h3 className="side-panel-title">Recent Activity</h3>
              </div>
              <span className="side-panel-desc">Real-time portfolio events</span>
            </div>

            {loading ? (
              <div className="activity-loading-list">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`act-skel-${i}`} className="activity-skeleton" />
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="activity-stream-list">
                {recentActivities.map((act) => {
                  const Icon = getActivityIcon(act.type);
                  return (
                    <div
                      key={act.id}
                      className="activity-item-card"
                      onClick={() => act.actionUrl && navigate(act.actionUrl)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`activity-type-icon ${act.type}`}>
                        <Icon size={15} />
                      </div>
                      <div className="activity-info-body">
                        <div className="activity-title-row">
                          <span className="activity-title">{act.title}</span>
                          {act.status && (
                            <span className={`activity-status-tag ${act.status.toLowerCase().replace(/[\s/]+/g, '-')}`}>
                              {act.status}
                            </span>
                          )}
                        </div>
                        <div className="activity-meta-row">
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
                <Clock size={28} className="empty-clock" />
                <p className="empty-act-title">No Recent Activity</p>
                <p className="empty-act-desc">
                  Incoming applications, payments, and maintenance notices will appear here automatically.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Tenancy Details Modal (for Rented Properties) */}
      {selectedRentalProperty && (
        <TenancyDetailsModal
          isOpen={Boolean(selectedRentalProperty)}
          onClose={() => setSelectedRentalProperty(null)}
          property={selectedRentalProperty}
          onOpenNoticeModal={() => {
            setSelectedRentalProperty(null);
            if (onNavigateSection) onNavigateSection('notices');
            else navigate('/dashboard/notices');
          }}
        />
      )}

      {/* Edit Property Listing Modal (for Owned Properties) */}
      {editingProperty && (
        <EditPropertyModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onUpdate={() => {
            setEditingProperty(null);
            fetchDashboardOverview(true);
          }}
        />
      )}
    </div>
  );
};

export default UnifiedOverview;
