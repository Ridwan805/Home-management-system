import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  Filter,
  RotateCw,
  Eye,
  Check,
  X,
  MapPin,
  User,
  Mail,
  Phone,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  SlidersHorizontal,
  Home,
  CheckSquare,
  List,
  LayoutGrid
} from 'lucide-react';
import API, { authenticatedAxios } from '../../config/api.js';
import { TableSkeleton, DashboardCardSkeleton, ButtonLoader } from '../../components/loading';
import './adminDashboard.css';

// Helper to format property type enum
const formatPropertyType = (type) => {
  if (!type) return 'Residential';
  const mapping = {
    apartment_unit: 'Apartment Unit',
    floor: 'Full Floor',
    house: 'Independent House',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    villa: 'Luxury Villa',
    studio: 'Studio Apartment',
    duplex: 'Duplex Unit',
    penthouse: 'Penthouse Suite',
    retail: 'Commercial Retail',
    office: 'Commercial Office',
    land: 'Plot / Land',
    other: 'Other Property'
  };
  return mapping[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `৳${Number(amount).toLocaleString('en-US')}`;
};

// Helper to format date
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const PendingProperties = () => {
  const navigate = useNavigate();

  // Data State
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    pendingProperties: 0,
    approvedProperties: 0,
    rejectedProperties: 0,
    totalProperties: 0
  });

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'Available' | 'rejected' | 'all'
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Modals & Panels State
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [propertyToModerate, setPropertyToModerate] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Keyboard navigation: Escape key closes active drawer or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showApproveModal) {
          setShowApproveModal(false);
        } else if (showRejectModal) {
          setShowRejectModal(false);
        } else if (selectedProperty) {
          setSelectedProperty(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showApproveModal, showRejectModal, selectedProperty]);

  // Fetch Properties & Statistics from Backend
  const fetchPropertiesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (propertyTypeFilter !== 'all') queryParams.append('propertyType', propertyTypeFilter);
      if (listingTypeFilter !== 'all') queryParams.append('listingType', listingTypeFilter);
      if (sortOrder) queryParams.append('sort', sortOrder);
      if (searchTerm) queryParams.append('search', searchTerm.trim());

      const url = `${API.baseUrl}${API.endpoints.pendingProperties}?${queryParams.toString()}`;

      const data = await authenticatedAxios(
        axios,
        {
          method: 'get',
          url
        },
        navigate
      );

      const items = Array.isArray(data) ? data : (data.properties || []);
      setProperties(items);

      // If a property was selected, refresh its data in the detail panel
      setSelectedProperty((prev) => {
        if (!prev) return null;
        return items.find((p) => p._id === prev._id) || null;
      });

      if (data.stats) {
        setSummaryStats({
          pendingProperties: data.stats.pendingProperties || 0,
          approvedProperties: data.stats.approvedProperties || 0,
          rejectedProperties: data.stats.rejectedProperties || 0,
          totalProperties: data.stats.totalProperties || 0
        });
      } else {
        // Fallback: fetch stats from adminStats endpoint
        const token = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}').token;
        if (token) {
          const statsRes = await axios.get(API.getUrl(API.endpoints.adminStats), {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);

          if (statsRes && statsRes.data) {
            setSummaryStats({
              pendingProperties: statsRes.data.pendingProperties || 0,
              approvedProperties: statsRes.data.approvedProperties || statsRes.data.activeProperties || 0,
              rejectedProperties: statsRes.data.rejectedProperties || 0,
              totalProperties: statsRes.data.totalProperties || 0
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin properties:', err);
      setError(err?.response?.data?.message || 'Failed to load properties for review. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, statusFilter, propertyTypeFilter, listingTypeFilter, sortOrder, searchTerm]);

  useEffect(() => {
    fetchPropertiesData();
  }, [fetchPropertiesData]);

  // Client-side text filter safeguard
  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties;
    const q = searchTerm.trim().toLowerCase();
    return properties.filter((p) => {
      const owner = p.ownerUserId || p.owner;
      const ownerName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.name || '';
      const ownerEmail = owner?.email || '';
      const address = p.address || p.displayName || p.title || '';
      const city = p.location?.city || '';
      return (
        ownerName.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q) ||
        address.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q)
      );
    });
  }, [properties, searchTerm]);

  // Open Property Review Panel
  const handleOpenReview = (property) => {
    setSelectedProperty(property);
    setSelectedPhotoIndex(0);
  };

  // Close Review Panel
  const handleCloseReview = () => {
    setSelectedProperty(null);
    setSelectedPhotoIndex(0);
  };

  // Open Approval Dialog
  const handlePromptApprove = (property, e) => {
    if (e) e.stopPropagation();
    setPropertyToModerate(property);
    setShowApproveModal(true);
  };

  // Open Rejection Dialog
  const handlePromptReject = (property, e) => {
    if (e) e.stopPropagation();
    setPropertyToModerate(property);
    setRejectionReason('');
    setRejectionError('');
    setShowRejectModal(true);
  };

  // Confirm Approval
  const handleConfirmApprove = async () => {
    if (!propertyToModerate) return;
    try {
      setIsSubmitting(true);
      const url = `${API.baseUrl}${API.endpoints.approveProperty(propertyToModerate._id)}`;

      await authenticatedAxios(
        axios,
        {
          method: 'put',
          url,
          data: { status: 'Available' }
        },
        navigate
      );

      setActionFeedback({
        type: 'success',
        message: `Property "${propertyToModerate.displayName || propertyToModerate.address}" has been approved successfully and is now active.`
      });

      setShowApproveModal(false);
      setPropertyToModerate(null);
      await fetchPropertiesData();
    } catch (err) {
      console.error('Error approving property:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to approve property. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Rejection
  const handleConfirmReject = async () => {
    if (!propertyToModerate) return;
    if (!rejectionReason.trim()) {
      setRejectionError('Please provide an explicit rejection reason for the owner.');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = `${API.baseUrl}${API.endpoints.approveProperty(propertyToModerate._id)}`;

      await authenticatedAxios(
        axios,
        {
          method: 'put',
          url,
          data: {
            status: 'rejected',
            rejectionReason: rejectionReason.trim()
          }
        },
        navigate
      );

      setActionFeedback({
        type: 'success',
        message: `Property listing was rejected. Reason recorded and owner has been notified.`
      });

      setShowRejectModal(false);
      setPropertyToModerate(null);
      setRejectionReason('');
      await fetchPropertiesData();
    } catch (err) {
      console.error('Error rejecting property:', err);
      setRejectionError(err?.response?.data?.message || 'Failed to reject property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract image list
  const getPropertyImages = (property) => {
    if (!property) return [];
    if (property.media?.images && property.media.images.length > 0) {
      return property.media.images.map((img) => (typeof img === 'string' ? img : img.url));
    }
    if (property.images && property.images.length > 0) {
      return property.images.map((img) => (typeof img === 'string' ? img : img.url));
    }
    return [];
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') {
      return (
        <span className="admin-status-pill pending">
          <Clock size={12} />
          <span>Pending</span>
        </span>
      );
    }
    if (s === 'available' || s === 'approved') {
      return (
        <span className="admin-status-pill approved">
          <CheckCircle2 size={12} />
          <span>Approved</span>
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="admin-status-pill rejected">
          <XCircle size={12} />
          <span>Rejected</span>
        </span>
      );
    }
    if (s === 'rented') {
      return (
        <span className="admin-status-pill rented">
          <Building2 size={12} />
          <span>Rented</span>
        </span>
      );
    }
    if (s === 'sold') {
      return (
        <span className="admin-status-pill sold">
          <CheckSquare size={12} />
          <span>Sold</span>
        </span>
      );
    }
    return (
      <span className="admin-status-pill default">
        <span>{status || 'Unknown'}</span>
      </span>
    );
  };

  const activePhotos = selectedProperty ? getPropertyImages(selectedProperty) : [];

  return (
    <div className="admin-crm-workspace">
      {/* =====================================================================
          PANEL 2: CENTRAL CONTENT & RECORD LISTING PANEL
          ===================================================================== */}
      <div className="admin-crm-central-panel">
        {/* Page Header */}
        <header className="admin-page-header">
          <div className="admin-page-title-group">
            <h1>Property Approvals</h1>
            <p>Review, inspect, and moderate property listings submitted by property owners</p>
          </div>
          <div className="admin-page-header-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={fetchPropertiesData}
              disabled={loading}
              title="Refresh property listings"
            >
              <RotateCw size={15} className={loading ? 'spin-icon' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Feedback Alert */}
        {actionFeedback && (
          <div className={`admin-feedback-banner ${actionFeedback.type}`}>
            <div className="feedback-content">
              {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              className="feedback-dismiss-btn"
              onClick={() => setActionFeedback(null)}
              aria-label="Dismiss feedback"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Admin KPI Summary Statistics */}
        <section className="admin-stats-row">
          <div
            className={`admin-stat-card amber ${statusFilter === 'pending' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('pending')}
            role="button"
            tabIndex={0}
            title="Filter by Pending"
          >
            <div className="stat-card-icon">
              <Clock size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Pending Review</span>
              <span className="stat-card-value">{loading ? '—' : summaryStats.pendingProperties}</span>
              <span className="stat-card-sub">Awaiting moderation</span>
            </div>
          </div>

          <div
            className={`admin-stat-card emerald ${statusFilter === 'Available' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('Available')}
            role="button"
            tabIndex={0}
            title="Filter by Approved"
          >
            <div className="stat-card-icon">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Approved Listings</span>
              <span className="stat-card-value">{loading ? '—' : summaryStats.approvedProperties}</span>
              <span className="stat-card-sub">Live in catalog</span>
            </div>
          </div>

          <div
            className={`admin-stat-card rose ${statusFilter === 'rejected' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('rejected')}
            role="button"
            tabIndex={0}
            title="Filter by Rejected"
          >
            <div className="stat-card-icon">
              <XCircle size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Rejected Listings</span>
              <span className="stat-card-value">{loading ? '—' : summaryStats.rejectedProperties}</span>
              <span className="stat-card-sub">Denied with reason</span>
            </div>
          </div>

          <div
            className={`admin-stat-card navy ${statusFilter === 'all' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('all')}
            role="button"
            tabIndex={0}
            title="Show All Properties"
          >
            <div className="stat-card-icon">
              <Layers size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">Total Listings</span>
              <span className="stat-card-value">{loading ? '—' : summaryStats.totalProperties}</span>
              <span className="stat-card-sub">Entire catalog</span>
            </div>
          </div>
        </section>

        {/* Filter and Control Toolbar */}
        <section className="admin-filters-card">
          <div className="admin-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by property, address, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="admin-crm-status-tabs">
            <button
              type="button"
              className={`status-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`status-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              className={`status-tab-btn ${statusFilter === 'Available' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Available')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`status-tab-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected
            </button>
          </div>

          {/* Filter Dropdowns and View Toggle */}
          <div className="admin-filter-controls">
            {/* Property Type */}
            <div className="filter-group">
              <select
                id="filter-type"
                className="admin-select"
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                aria-label="Filter by property type"
              >
                <option value="all">All Types</option>
                <option value="apartment_unit">Apartment Unit</option>
                <option value="house">House</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
                <option value="penthouse">Penthouse</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="land">Land</option>
              </select>
            </div>

            {/* Listing Type */}
            <div className="filter-group">
              <select
                id="filter-listing"
                className="admin-select"
                value={listingTypeFilter}
                onChange={(e) => setListingTypeFilter(e.target.value)}
                aria-label="Filter by listing type"
              >
                <option value="all">All Listings</option>
                <option value="For Rent">For Rent</option>
                <option value="For Sale">For Sale</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="filter-group">
              <select
                id="filter-sort"
                className="admin-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Sort order"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            {/* List vs Grid View Switching */}
            <div className="admin-view-switcher">
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Table list view"
                aria-label="Table list view"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Main Records Section (List or Grid - rendered once only) */}
        <section className="admin-records-section">
          {loading ? (
            <TableSkeleton rows={6} columns={8} />
          ) : error ? (
            <div className="admin-error-box">
              <AlertTriangle size={32} color="#DC2626" />
              <h3>Unable to Load Properties</h3>
              <p>{error}</p>
              <button type="button" className="admin-btn-primary" onClick={fetchPropertiesData}>
                <RotateCw size={14} /> Retry
              </button>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="admin-empty-box">
              <div className="empty-icon-wrap">
                <CheckSquare size={36} color="#64748B" />
              </div>
              <h3>No Properties Found</h3>
              <p>
                {statusFilter === 'pending'
                  ? 'All submitted properties have been reviewed. No listings are currently pending approval.'
                  : 'No property records match the selected search and filter criteria.'}
              </p>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => {
                    setStatusFilter('all');
                    setPropertyTypeFilter('all');
                    setListingTypeFilter('all');
                    setSearchTerm('');
                  }}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <>
              {/* ================= TABLE LIST VIEW (Desktop) ================= */}
              <div className="admin-table-container">
              <table className="admin-review-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Listing</th>
                    <th>Price</th>
                    <th>Owner</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((prop) => {
                    const images = getPropertyImages(prop);
                    const primaryImage = images[0];
                    const owner = prop.ownerUserId || prop.owner;
                    const ownerName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.name || 'Verified Owner';
                    const priceAmount = prop.pricing?.rent || prop.pricing?.sale || prop.price || prop.pricing?.monthlyRent;
                    const priceSuffix = prop.listingType === 'For Rent' ? '/mo' : '';
                    const isSelected = selectedProperty?._id === prop._id;

                    return (
                      <tr
                        key={prop._id}
                        className={`admin-table-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleOpenReview(prop)}
                      >
                        {/* Property Thumbnail & Info */}
                        <td className="admin-col-prop">
                          <div className="admin-prop-cell">
                            <div className="admin-prop-thumb">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt=""
                                  className="admin-prop-thumb-img"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className="admin-prop-thumb-placeholder"
                                style={{ display: primaryImage ? 'none' : 'flex' }}
                              >
                                <Building2 size={18} />
                              </div>
                            </div>
                            <div className="admin-prop-info-col">
                              <span className="prop-name" title={prop.displayName || prop.title || prop.address}>
                                {prop.displayName || prop.title || prop.address || 'Untitled Property'}
                              </span>
                              <div className="prop-address-row">
                                <MapPin size={12} className="map-icon" />
                                <span className="prop-address" title={prop.address}>{prop.address}</span>
                              </div>
                              {(prop.unitNumber || (prop.floorNumber !== null && prop.floorNumber !== undefined)) && (
                                <div className="prop-badges-sub">
                                  {prop.unitNumber && <span className="unit-badge">Unit {prop.unitNumber}</span>}
                                  {prop.floorNumber !== null && prop.floorNumber !== undefined && (
                                    <span className="unit-badge">Floor {prop.floorNumber}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Property Type */}
                        <td className="admin-col-type">
                          <span className="prop-type-badge">{formatPropertyType(prop.propertyType)}</span>
                        </td>

                        {/* Listing Type */}
                        <td className="admin-col-listing">
                          <span className={`listing-badge ${prop.listingType === 'For Sale' ? 'sale' : 'rent'}`}>
                            {prop.listingType || 'For Rent'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="admin-col-price">
                          <span className="price-value">
                            {formatCurrency(priceAmount)}
                            {priceSuffix && <span className="price-sub"> {priceSuffix}</span>}
                          </span>
                        </td>

                        {/* Owner Information */}
                        <td className="admin-col-owner">
                          <div className="prop-owner-cell">
                            <span className="owner-name">{ownerName}</span>
                            {owner?.email && (
                              <span className="owner-contact" title={owner.email}>
                                <Mail size={12} /> {owner.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Submission Date */}
                        <td className="admin-col-date">
                          <span className="date-text">{formatDate(prop.createdAt)}</span>
                        </td>

                        {/* Status */}
                        <td className="admin-col-status">
                          {renderStatusBadge(prop.status)}
                          {prop.status === 'rejected' && prop.rejectionReason && (
                            <div className="rejection-snippet" title={prop.rejectionReason}>
                              {prop.rejectionReason.slice(0, 24)}...
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="admin-col-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-btn-action review"
                              onClick={() => handleOpenReview(prop)}
                              title="Inspect full property dossier"
                            >
                              <Eye size={13} />
                              <span>Review</span>
                            </button>

                            {prop.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  className="admin-btn-action approve"
                                  onClick={(e) => handlePromptApprove(prop, e)}
                                  title="Approve listing"
                                >
                                  <Check size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn-action reject"
                                  onClick={(e) => handlePromptReject(prop, e)}
                                  title="Reject listing with reason"
                                >
                                  <X size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {prop.status === 'rejected' && (
                              <button
                                type="button"
                                className="admin-btn-action approve"
                                onClick={(e) => handlePromptApprove(prop, e)}
                                title="Re-evaluate and approve listing"
                              >
                                <Check size={13} />
                                <span>Re-Approve</span>
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

            {/* ================= RESPONSIVE STACKED CARDS VIEW (Tablet & Mobile) ================= */}
            <div className="admin-stacked-cards-list">
              {filteredProperties.map((prop) => {
                const images = getPropertyImages(prop);
                const primaryImage = images[0];
                const owner = prop.ownerUserId || prop.owner;
                const ownerName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.name || 'Verified Owner';
                const priceAmount = prop.pricing?.rent || prop.pricing?.sale || prop.price || prop.pricing?.monthlyRent;
                const priceSuffix = prop.listingType === 'For Rent' ? '/mo' : '';
                const isSelected = selectedProperty?._id === prop._id;

                return (
                  <div
                    key={`stacked-${prop._id}`}
                    className={`admin-stacked-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOpenReview(prop)}
                  >
                    <div className="stacked-card-main">
                      <div className="stacked-card-thumb">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt=""
                            className="admin-prop-thumb-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="admin-prop-thumb-placeholder"
                          style={{ display: primaryImage ? 'none' : 'flex' }}
                        >
                          <Building2 size={20} />
                        </div>
                      </div>

                      <div className="stacked-card-info">
                        <div className="stacked-card-title-row">
                          <h4 className="stacked-prop-title">
                            {prop.displayName || prop.title || prop.address || 'Untitled Property'}
                          </h4>
                          <div className="stacked-badges-cluster">
                            {renderStatusBadge(prop.status)}
                            <span className={`listing-badge ${prop.listingType === 'For Sale' ? 'sale' : 'rent'}`}>
                              {prop.listingType || 'For Rent'}
                            </span>
                          </div>
                        </div>

                        <div className="stacked-prop-address">
                          <MapPin size={12} className="map-icon" />
                          <span>{prop.address}</span>
                        </div>

                        <div className="stacked-meta-grid">
                          <div className="stacked-meta-item">
                            <span className="stacked-meta-lbl">Type</span>
                            <span className="stacked-meta-val">{formatPropertyType(prop.propertyType)}</span>
                          </div>
                          <div className="stacked-meta-item">
                            <span className="stacked-meta-lbl">Price</span>
                            <span className="stacked-meta-val price-val">
                              {formatCurrency(priceAmount)}
                              {priceSuffix && <span className="price-sub"> {priceSuffix}</span>}
                            </span>
                          </div>
                          <div className="stacked-meta-item">
                            <span className="stacked-meta-lbl">Owner</span>
                            <span className="stacked-meta-val">{ownerName}</span>
                          </div>
                          <div className="stacked-meta-item">
                            <span className="stacked-meta-lbl">Submitted</span>
                            <span className="stacked-meta-val">{formatDate(prop.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="stacked-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="admin-btn-action review"
                        onClick={() => handleOpenReview(prop)}
                      >
                        <Eye size={13} />
                        <span>Review Dossier</span>
                      </button>

                      {prop.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="admin-btn-action approve"
                            onClick={(e) => handlePromptApprove(prop, e)}
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="admin-btn-action reject"
                            onClick={(e) => handlePromptReject(prop, e)}
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {prop.status === 'rejected' && (
                        <button
                          type="button"
                          className="admin-btn-action approve"
                          onClick={(e) => handlePromptApprove(prop, e)}
                        >
                          <Check size={13} />
                          <span>Re-Approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
          ) : (
            /* ================= GRID VIEW ================= */
            <div className="admin-crm-grid">
              {filteredProperties.map((prop) => {
                const images = getPropertyImages(prop);
                const primaryImage = images[0];
                const owner = prop.ownerUserId || prop.owner;
                const ownerName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.name || 'Verified Owner';
                const priceAmount = prop.pricing?.rent || prop.pricing?.sale || prop.price || prop.pricing?.monthlyRent;
                const isSelected = selectedProperty?._id === prop._id;

                return (
                  <div
                    key={prop._id}
                    className={`admin-crm-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOpenReview(prop)}
                  >
                    <div className="crm-card-image-wrap">
                      {primaryImage ? (
                        <img src={primaryImage} alt="" className="crm-card-img" />
                      ) : (
                        <div className="crm-card-placeholder">
                          <Building2 size={28} />
                        </div>
                      )}
                      <div className="crm-card-overlay-badges">
                        {renderStatusBadge(prop.status)}
                        <span className={`listing-badge ${prop.listingType === 'For Sale' ? 'sale' : 'rent'}`}>
                          {prop.listingType || 'For Rent'}
                        </span>
                      </div>
                    </div>

                    <div className="crm-card-content">
                      <div className="crm-card-type-row">
                        <span className="prop-type-badge">{formatPropertyType(prop.propertyType)}</span>
                        <span className="crm-card-date">{formatDate(prop.createdAt)}</span>
                      </div>

                      <h3 className="crm-card-title">{prop.displayName || prop.title || prop.address}</h3>
                      <p className="crm-card-address">
                        <MapPin size={12} /> {prop.address}
                      </p>

                      <div className="crm-card-specs-row">
                        {(prop.specifications?.bedrooms || prop.bedrooms) && (
                          <span className="crm-spec-item">
                            <Bed size={13} /> {prop.specifications?.bedrooms || prop.bedrooms} beds
                          </span>
                        )}
                        {(prop.specifications?.bathrooms || prop.bathrooms) && (
                          <span className="crm-spec-item">
                            <Bath size={13} /> {prop.specifications?.bathrooms || prop.bathrooms} baths
                          </span>
                        )}
                        {(prop.specifications?.squareFootage || prop.squareFootage) && (
                          <span className="crm-spec-item">
                            <Maximize2 size={13} /> {prop.specifications?.squareFootage || prop.squareFootage} sqft
                          </span>
                        )}
                      </div>

                      <div className="crm-card-bottom-row">
                        <div className="crm-card-price-group">
                          <span className="crm-card-price-val">{formatCurrency(priceAmount)}</span>
                          {prop.listingType === 'For Rent' && <span className="crm-price-sub">/mo</span>}
                        </div>
                        <span className="crm-card-owner">{ownerName}</span>
                      </div>

                      {prop.status === 'rejected' && prop.rejectionReason && (
                        <div className="crm-card-rejection-note">
                          <strong>Reason:</strong> {prop.rejectionReason}
                        </div>
                      )}

                      <div className="crm-card-actions-row" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="admin-btn-action review"
                          onClick={() => handleOpenReview(prop)}
                        >
                          <Eye size={13} /> Review Details
                        </button>
                        {prop.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="admin-btn-action approve"
                              onClick={(e) => handlePromptApprove(prop, e)}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              className="admin-btn-action reject"
                              onClick={(e) => handlePromptReject(prop, e)}
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        {prop.status === 'rejected' && (
                          <button
                            type="button"
                            className="admin-btn-action approve"
                            onClick={(e) => handlePromptApprove(prop, e)}
                          >
                            <Check size={13} /> Re-Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================================
          PANEL 3: RIGHT CONTEXTUAL DETAIL PANEL (Docked on >=1536px / Drawer on <1536px)
          Rendered only when a property is actively selected
          ===================================================================== */}
      {selectedProperty && (
        <>
          {/* Drawer backdrop for tablet/mobile/narrow screen overlays */}
          <div
            className="admin-crm-drawer-backdrop"
            onClick={handleCloseReview}
            aria-hidden="true"
          />

          <aside className="admin-crm-detail-panel open">
            {/* Detail Header */}
            <div className="crm-detail-header">
              <div className="crm-detail-header-main">
                <div className="crm-detail-badges-row">
                  {renderStatusBadge(selectedProperty.status)}
                  <span className={`listing-badge ${selectedProperty.listingType === 'For Sale' ? 'sale' : 'rent'}`}>
                    {selectedProperty.listingType || 'For Rent'}
                  </span>
                  <span className="prop-type-badge">{formatPropertyType(selectedProperty.propertyType)}</span>
                </div>
                <h2 className="crm-detail-title">
                  {selectedProperty.displayName || selectedProperty.title || selectedProperty.address}
                </h2>
                <p className="crm-detail-address">
                  <MapPin size={14} /> {selectedProperty.address}
                </p>
              </div>
              <button
                type="button"
                className="crm-detail-close-btn"
                onClick={handleCloseReview}
                aria-label="Close detail panel"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Detail Scrollable Body */}
            <div className="crm-detail-body">
              {/* Photo Gallery Section */}
              <div className="crm-detail-section">
                {activePhotos.length === 0 ? (
                  <div className="crm-gallery-empty">
                    <Building2 size={36} color="#94A3B8" />
                    <span>No photographs submitted for this listing</span>
                  </div>
                ) : (
                  <div className="crm-gallery-wrap">
                    <div className="crm-gallery-viewport">
                      <img
                        src={activePhotos[selectedPhotoIndex] || activePhotos[0]}
                        alt="Property preview"
                        className="crm-gallery-active-img"
                      />
                      {activePhotos.length > 1 && (
                        <div className="crm-gallery-nav-bar">
                          <button
                            type="button"
                            className="crm-photo-nav-btn prev"
                            onClick={() =>
                              setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1))
                            }
                            aria-label="Previous photo"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="crm-photo-counter">
                            {selectedPhotoIndex + 1} / {activePhotos.length}
                          </span>
                          <button
                            type="button"
                            className="crm-photo-nav-btn next"
                            onClick={() =>
                              setSelectedPhotoIndex((prev) => (prev < activePhotos.length - 1 ? prev + 1 : 0))
                            }
                            aria-label="Next photo"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {activePhotos.length > 1 && (
                      <div className="crm-gallery-thumbnails">
                        {activePhotos.map((url, idx) => (
                          <button
                            key={`th-${idx}`}
                            type="button"
                            className={`crm-thumb-btn ${idx === selectedPhotoIndex ? 'active' : ''}`}
                            onClick={() => setSelectedPhotoIndex(idx)}
                          >
                            <img src={url} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing & Financial Terms */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Pricing & Financial Terms</h3>
                <div className="crm-key-value-grid">
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">
                      {selectedProperty.listingType === 'For Sale' ? 'Sale Price' : 'Monthly Rent'}
                    </span>
                    <span className="crm-kv-val price-highlight">
                      {formatCurrency(
                        selectedProperty.pricing?.rent ||
                        selectedProperty.pricing?.sale ||
                        selectedProperty.price
                      )}
                      {selectedProperty.listingType !== 'For Sale' && ' / month'}
                    </span>
                  </div>

                  {selectedProperty.pricing?.deposit > 0 && (
                    <div className="crm-kv-item">
                      <span className="crm-kv-lbl">Security Deposit</span>
                      <span className="crm-kv-val">{formatCurrency(selectedProperty.pricing.deposit)}</span>
                    </div>
                  )}

                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Utilities Included</span>
                    <span className="crm-kv-val">
                      {selectedProperty.pricing?.utilities?.included ? 'Yes, Included' : 'No, Separate'}
                    </span>
                  </div>

                  {selectedProperty.pricing?.utilities?.estimatedCost > 0 && (
                    <div className="crm-kv-item">
                      <span className="crm-kv-lbl">Est. Utility Cost</span>
                      <span className="crm-kv-val">
                        {formatCurrency(selectedProperty.pricing.utilities.estimatedCost)} / mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications & Dimensions */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Specifications & Dimensions</h3>
                <div className="crm-specs-tiles-grid">
                  <div className="crm-spec-tile">
                    <Bed size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Bedrooms</span>
                    <span className="spec-tile-val">
                      {selectedProperty.specifications?.bedrooms ?? selectedProperty.bedrooms ?? '—'}
                    </span>
                  </div>
                  <div className="crm-spec-tile">
                    <Bath size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Bathrooms</span>
                    <span className="spec-tile-val">
                      {selectedProperty.specifications?.bathrooms ?? selectedProperty.bathrooms ?? '—'}
                    </span>
                  </div>
                  <div className="crm-spec-tile">
                    <Maximize2 size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Area (sq ft)</span>
                    <span className="spec-tile-val">
                      {selectedProperty.specifications?.squareFootage ?? selectedProperty.squareFootage ?? '—'}
                    </span>
                  </div>
                  <div className="crm-spec-tile">
                    <Building2 size={16} className="spec-icon" />
                    <span className="spec-tile-lbl">Floor</span>
                    <span className="spec-tile-val">
                      {selectedProperty.floorNumber ?? 'Standalone'}
                    </span>
                  </div>
                </div>

                <div className="crm-key-value-grid mt-2">
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Furnishing</span>
                    <span className="crm-kv-val">
                      {selectedProperty.specifications?.furnishing || 'Unfurnished'}
                    </span>
                  </div>
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Facing Direction</span>
                    <span className="crm-kv-val">
                      {selectedProperty.specifications?.facing || 'Not specified'}
                    </span>
                  </div>
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Parking Spots</span>
                    <span className="crm-kv-val">
                      {selectedProperty.specifications?.parkingSpots ?? 0} designated
                    </span>
                  </div>
                  <div className="crm-kv-item">
                    <span className="crm-kv-lbl">Balcony</span>
                    <span className="crm-kv-val">
                      {selectedProperty.specifications?.balcony?.hasBalcony
                        ? `Yes (${selectedProperty.specifications.balcony.balconyType || 'Open'})`
                        : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Building Association Details */}
              {selectedProperty.buildingId && (
                <div className="crm-detail-card">
                  <h3 className="crm-card-heading">Building Profile</h3>
                  <div className="crm-key-value-grid">
                    <div className="crm-kv-item">
                      <span className="crm-kv-lbl">Building Name</span>
                      <span className="crm-kv-val">{selectedProperty.buildingId.name || 'Building'}</span>
                    </div>
                    {selectedProperty.buildingId.address && (
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Building Street</span>
                        <span className="crm-kv-val">
                          {selectedProperty.buildingId.address.fullAddress || selectedProperty.buildingId.address.street || '—'}
                        </span>
                      </div>
                    )}
                    {selectedProperty.unitNumber && (
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Unit Identifier</span>
                        <span className="crm-kv-val">{selectedProperty.unitNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Amenities & Appliances */}
              {((selectedProperty.amenities && selectedProperty.amenities.length > 0) ||
                selectedProperty.specifications?.appliances) && (
                <div className="crm-detail-card">
                  <h3 className="crm-card-heading">Amenities & Inclusions</h3>
                  {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                    <div className="crm-amenity-tags-wrap">
                      {selectedProperty.amenities.map((item, idx) => (
                        <span key={`am-${idx}`} className="crm-amenity-pill">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedProperty.specifications?.appliances && (
                    <div className="crm-appliances-wrap mt-2">
                      {Object.entries(selectedProperty.specifications.appliances)
                        .filter(([k, v]) => v === true && k !== 'other')
                        .map(([applianceKey]) => (
                          <span key={applianceKey} className="crm-appliance-pill">
                            <Check size={11} /> {applianceKey.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Owner Information */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Owner Information</h3>
                {(() => {
                  const owner = selectedProperty.ownerUserId || selectedProperty.owner;
                  return (
                    <div className="crm-key-value-grid">
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Name</span>
                        <span className="crm-kv-val">
                          {`${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.name || 'Verified Owner'}
                        </span>
                      </div>
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Email</span>
                        <span className="crm-kv-val">{owner?.email || '—'}</span>
                      </div>
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Phone</span>
                        <span className="crm-kv-val">{owner?.phoneNumber || '—'}</span>
                      </div>
                      <div className="crm-kv-item">
                        <span className="crm-kv-lbl">Account Verification</span>
                        <span className="crm-kv-val" style={{ color: '#059669', fontWeight: 600 }}>
                          Verified Registered Owner
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Description */}
              <div className="crm-detail-card">
                <h3 className="crm-card-heading">Listing Description</h3>
                <p className="crm-description-text">
                  {selectedProperty.description || 'No description provided by the owner.'}
                </p>
              </div>

              {/* Moderation History / Rejection Notice */}
              {selectedProperty.rejectionReason && (
                <div className="crm-detail-card rejection-box">
                  <h3 className="crm-card-heading text-danger">Rejection Notice</h3>
                  <p className="crm-rejection-body">{selectedProperty.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Detail Sticky Action Footer */}
            <div className="crm-detail-footer">
              <button type="button" className="admin-btn-secondary" onClick={handleCloseReview}>
                Close
              </button>

              {selectedProperty.status === 'pending' && (
                <div className="crm-footer-actions-group">
                  <button
                    type="button"
                    className="admin-btn-danger"
                    onClick={() => handlePromptReject(selectedProperty)}
                  >
                    <X size={14} /> Reject
                  </button>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={() => handlePromptApprove(selectedProperty)}
                  >
                    <Check size={14} /> Approve
                  </button>
                </div>
              )}

              {selectedProperty.status === 'rejected' && (
                <button
                  type="button"
                  className="admin-btn-primary"
                  onClick={() => handlePromptApprove(selectedProperty)}
                >
                  <Check size={14} /> Re-Approve Listing
                </button>
              )}

              {(selectedProperty.status === 'Available' || selectedProperty.status === 'approved') && (
                <span className="crm-approved-status-tag">
                  <CheckCircle2 size={14} /> Published & Active
                </span>
              )}
            </div>
          </aside>
        </>
      )}

      {/* =====================================================================
          APPROVAL CONFIRMATION MODAL
          ===================================================================== */}
      {showApproveModal && propertyToModerate && (
        <div className="admin-dialog-backdrop" onClick={() => !isSubmitting && setShowApproveModal(false)}>
          <div className="admin-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-icon-wrap emerald">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2>Approve Property Listing</h2>
                <p>Authorize this listing for public discovery</p>
              </div>
            </div>

            <div className="dialog-body">
              <div className="dialog-property-preview">
                <strong>{propertyToModerate.displayName || propertyToModerate.title || propertyToModerate.address}</strong>
                <p>{propertyToModerate.address}</p>
                <div className="dialog-tags">
                  <span className="unit-badge">{formatPropertyType(propertyToModerate.propertyType)}</span>
                  <span className="unit-badge">{propertyToModerate.listingType || 'For Rent'}</span>
                </div>
              </div>
              <p className="dialog-note">
                Approving this property updates its status to <strong>Available</strong>. It will be immediately visible
                in public search results for tenant and buyer applications.
              </p>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowApproveModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-primary emerald"
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ButtonLoader size="small" /> Approving...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Confirm & Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          REJECTION DIALOG MODAL (REQUIRES REASON)
          ===================================================================== */}
      {showRejectModal && propertyToModerate && (
        <div className="admin-dialog-backdrop" onClick={() => !isSubmitting && setShowRejectModal(false)}>
          <div className="admin-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-icon-wrap rose">
                <XCircle size={24} />
              </div>
              <div>
                <h2>Reject Property Listing</h2>
                <p>Provide a constructive reason so the owner can correct and resubmit</p>
              </div>
            </div>

            <div className="dialog-body">
              <div className="dialog-property-preview">
                <strong>{propertyToModerate.displayName || propertyToModerate.title || propertyToModerate.address}</strong>
                <p>{propertyToModerate.address}</p>
              </div>

              <div className="dialog-form-group">
                <label htmlFor="rejection-reason-input">
                  Rejection Reason <span className="req">*</span>
                </label>
                <textarea
                  id="rejection-reason-input"
                  rows={4}
                  className={`admin-textarea ${rejectionError ? 'has-error' : ''}`}
                  placeholder="e.g., Missing essential interior photographs, invalid address specification, or misstated rental terms. Please update and resubmit."
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError('');
                  }}
                />
                {rejectionError && <span className="dialog-field-error">{rejectionError}</span>}
              </div>

              <p className="dialog-note text-warning">
                The listing record will remain preserved in the database with status <strong>rejected</strong>.
                The owner will receive your feedback to edit and request re-review.
              </p>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ButtonLoader size="small" /> Rejecting...
                  </>
                ) : (
                  <>
                    <X size={14} /> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingProperties;
