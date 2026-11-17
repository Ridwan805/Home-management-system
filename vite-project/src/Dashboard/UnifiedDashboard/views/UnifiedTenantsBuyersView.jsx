import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Home,
  Landmark,
  AlertCircle,
  Search,
  Filter,
  RotateCw,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  MessageSquare,
  ShieldCheck,
  Receipt,
  ExternalLink,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import API from '../../../config/api';
import './UnifiedTenantsBuyersView.css';

const UnifiedTenantsBuyersView = ({ onNavigateSection, searchTerm = '' }) => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Raw data from backend
  const [summary, setSummary] = useState({
    totalClients: 0,
    totalTenants: 0,
    propertyBuyers: 0,
    occupiedApartments: 0,
    outstandingRent: 0,
    outstandingPurchaseBalance: 0,
    totalOutstanding: 0,
    activeNotices: 0
  });

  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);

  // Category Tab: 'all' | 'tenant' | 'buyer'
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState(searchTerm);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Selected client for Details Panel (master-detail)
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [clientDetailsData, setClientDetailsData] = useState(null);

  // Sync external header search term
  useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchQuery(searchTerm);
    }
  }, [searchTerm]);

  // Fetch client directory
  const fetchClientsDirectory = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try {
        token = JSON.parse(saved).token;
      } catch (e) {
        token = null;
      }
    }

    if (!token) {
      setError('Authentication token not found. Please log in again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (propertyFilter !== 'all') queryParams.append('propertyId', propertyFilter);
      if (paymentStatusFilter !== 'all') queryParams.append('paymentStatus', paymentStatusFilter);

      const url = `${API.getUrl('/api/owner/tenants')}?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load client directory (Status: ${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        const rawList = data.clients || data.tenants || [];
        setClients(rawList);
        setSummary(data.summary || {
          totalClients: rawList.length,
          totalTenants: rawList.filter(c => c.clientType === 'tenant').length,
          propertyBuyers: rawList.filter(c => c.clientType === 'buyer').length,
          occupiedApartments: data.summary?.occupiedApartments || 0,
          outstandingRent: data.summary?.outstandingRent || 0,
          outstandingPurchaseBalance: data.summary?.outstandingPurchaseBalance || 0,
          totalOutstanding: data.summary?.totalOutstanding || 0,
          activeNotices: data.summary?.activeNotices || 0
        });

        if (Array.isArray(data.properties)) {
          setProperties(data.properties);
        }

        // If a client was previously selected, keep or refresh their record
        if (selectedClient) {
          const updated = rawList.find(c => c._id === selectedClient._id || c.relationshipId === selectedClient.relationshipId);
          if (updated) setSelectedClient(updated);
        }
      } else {
        throw new Error(data.message || 'Failed to parse client directory response');
      }
    } catch (err) {
      console.error('Error fetching clients directory:', err);
      setError(err.message || 'An error occurred while loading client directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyFilter, paymentStatusFilter, selectedClient]);

  useEffect(() => {
    fetchClientsDirectory();
  }, [fetchClientsDirectory]);

  // Fetch full details when a client is selected
  const handleSelectClient = async (client) => {
    if (selectedClient?._id === client._id && clientDetailsData) {
      return; // Already selected
    }

    setSelectedClient(client);
    setDetailsLoading(true);
    setClientDetailsData(null);

    const saved = localStorage.getItem('dwellSyncUser');
    let token = null;
    if (saved) {
      try {
        token = JSON.parse(saved).token;
      } catch (e) {
        token = null;
      }
    }

    if (!token) {
      setDetailsLoading(false);
      return;
    }

    try {
      const lookupId = client.rentId || client.requestId || client._id;
      const response = await fetch(`${API.getUrl(`/api/owner/tenants/${lookupId}`)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const details = await response.json();
        if (details.success) {
          setClientDetailsData(details);
        }
      }
    } catch (err) {
      console.error('Error loading client detailed dossier:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Close details panel
  const handleCloseDetails = () => {
    setSelectedClient(null);
    setClientDetailsData(null);
  };

  // Format currency
  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  // Filter clients by category, search query, and filters
  const filteredClients = useMemo(() => {
    let list = clients;

    // Filter by category tab
    if (activeCategoryTab === 'tenant') {
      list = list.filter(c => c.clientType === 'tenant');
    } else if (activeCategoryTab === 'buyer') {
      list = list.filter(c => c.clientType === 'buyer');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.includes(q)) ||
        (c.propertyName && c.propertyName.toLowerCase().includes(q)) ||
        (c.propertyAddress && c.propertyAddress.toLowerCase().includes(q)) ||
        (c.unitNumber && c.unitNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [clients, activeCategoryTab, searchQuery]);

  // Client counts for category tabs
  const totalClientsCount = clients.length;
  const tenantsCount = useMemo(() => clients.filter(c => c.clientType === 'tenant').length, [clients]);
  const buyersCount = useMemo(() => clients.filter(c => c.clientType === 'buyer').length, [clients]);

  // Client initials helper
  const getClientInitials = (client) => {
    if (!client) return 'C';
    const first = client.firstName ? client.firstName[0] : '';
    const last = client.lastName ? client.lastName[0] : '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return (client.fullName ? client.fullName[0] : 'C').toUpperCase();
  };

  return (
    <div className="unified-tenants-buyers-container">
      {/* 1. Page Header */}
      <div className="tb-page-header">
        <div className="tb-header-titles">
          <h1 className="tb-main-title">Tenants & Buyers</h1>
          <p className="tb-main-subtitle">
            Manage active residential tenancies, property buyers, verified agreements, and dues.
          </p>
        </div>

        <button
          type="button"
          className="btn-tb-refresh"
          onClick={() => fetchClientsDirectory(true)}
          disabled={refreshing || loading}
          title="Refresh Directory"
        >
          <RotateCw size={14} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="tb-error-banner" role="alert">
          <AlertCircle size={18} className="tb-error-icon" />
          <div className="tb-error-text">
            <span className="tb-error-title">Unable to Load Client Directory</span>
            <span className="tb-error-msg">{error}</span>
          </div>
          <button
            type="button"
            className="btn-tb-retry"
            onClick={() => fetchClientsDirectory(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Compact Statistics (4 Equal-Height Cards) */}
      <div className="tb-statistics-grid">
        {/* Card 1: Total Clients */}
        <div className="tb-stat-card">
          <div className="tb-stat-header">
            <div className="tb-stat-icon-wrap icon-blue">
              <Users size={20} />
            </div>
            <span className="tb-stat-badge badge-blue">Directory</span>
          </div>
          <div className="tb-stat-body">
            <span className="tb-stat-label">Total Clients</span>
            <span className="tb-stat-value">
              {loading ? '...' : summary.totalClients || totalClientsCount}
            </span>
            <span className="tb-stat-subtext">
              {tenantsCount} active tenants, {buyersCount} buyers
            </span>
          </div>
        </div>

        {/* Card 2: Active Tenants */}
        <div className="tb-stat-card">
          <div className="tb-stat-header">
            <div className="tb-stat-icon-wrap icon-green">
              <Home size={20} />
            </div>
            <span className="tb-stat-badge badge-green">Residential</span>
          </div>
          <div className="tb-stat-body">
            <span className="tb-stat-label">Active Tenants</span>
            <span className="tb-stat-value text-green">
              {loading ? '...' : summary.totalTenants || tenantsCount}
            </span>
            <span className="tb-stat-subtext">
              {summary.occupiedApartments || tenantsCount} active rental leases
            </span>
          </div>
        </div>

        {/* Card 3: Property Buyers */}
        <div className="tb-stat-card">
          <div className="tb-stat-header">
            <div className="tb-stat-icon-wrap icon-violet">
              <Landmark size={20} />
            </div>
            <span className="tb-stat-badge badge-violet">Acquisitions</span>
          </div>
          <div className="tb-stat-body">
            <span className="tb-stat-label">Property Buyers</span>
            <span className="tb-stat-value text-violet">
              {loading ? '...' : summary.propertyBuyers || buyersCount}
            </span>
            <span className="tb-stat-subtext">Verified purchase bookings</span>
          </div>
        </div>

        {/* Card 4: Outstanding Dues */}
        <div className="tb-stat-card">
          <div className="tb-stat-header">
            <div className="tb-stat-icon-wrap icon-orange">
              <AlertCircle size={20} />
            </div>
            <span className="tb-stat-badge badge-orange">Receivables</span>
          </div>
          <div className="tb-stat-body">
            <span className="tb-stat-label">Outstanding Dues</span>
            <span className="tb-stat-value text-orange">
              {loading ? '...' : formatBDT(summary.totalOutstanding || summary.outstandingRent || 0)}
            </span>
            <span className="tb-stat-subtext">Unpaid balances across clients</span>
          </div>
        </div>
      </div>

      {/* 3. Client Category Tabs */}
      <div className="tb-category-nav-row">
        <div className="tb-tabs-group" role="tablist">
          <button
            type="button"
            className={`tb-tab-btn ${activeCategoryTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryTab('all')}
          >
            <span>All Clients</span>
            <span className="tb-tab-count-pill">{totalClientsCount}</span>
          </button>
          <button
            type="button"
            className={`tb-tab-btn ${activeCategoryTab === 'tenant' ? 'active' : ''}`}
            onClick={() => setActiveCategoryTab('tenant')}
          >
            <span>Active Tenants</span>
            <span className="tb-tab-count-pill">{tenantsCount}</span>
          </button>
          <button
            type="button"
            className={`tb-tab-btn ${activeCategoryTab === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveCategoryTab('buyer')}
          >
            <span>Property Buyers</span>
            <span className="tb-tab-count-pill">{buyersCount}</span>
          </button>
        </div>
      </div>

      {/* 4. Search and Filters Toolbar */}
      <div className="tb-toolbar-card">
        <div className="tb-search-box">
          <Search size={15} className="tb-search-icon" />
          <input
            type="text"
            className="tb-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, email, phone, or property..."
          />
          {searchQuery && (
            <button
              type="button"
              className="tb-clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>

        <div className="tb-filter-controls">
          {/* Property Filter */}
          <div className="tb-filter-select-wrap">
            <Building2 size={13} className="tb-select-icon" />
            <select
              className="tb-filter-select"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              aria-label="Filter by property"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title || p.address}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="tb-filter-select-wrap">
            <Filter size={13} className="tb-select-icon" />
            <select
              className="tb-filter-select"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="AdvancePaid">Advance Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Master-Detail Layout (LEFT: Directory, RIGHT: Client Details Panel) */}
      <div className={`tb-master-detail-layout ${selectedClient ? 'has-selection' : 'full-width'}`}>
        {/* LEFT: Client Directory */}
        <div className="tb-directory-column">
          {loading ? (
            <div className="tb-loading-state">
              <RotateCw size={24} className="spinning text-muted" />
              <span>Loading clients directory...</span>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="tb-client-cards-stack">
              {filteredClients.map((client) => {
                const isSelected = selectedClient?._id === client._id || selectedClient?.relationshipId === client.relationshipId;
                const isTenant = client.clientType === 'tenant';
                const isBuyer = client.clientType === 'buyer';

                return (
                  <article
                    key={client.relationshipId || client._id}
                    className={`tb-client-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectClient(client)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectClient(client);
                      }
                    }}
                  >
                    <div className="tb-client-top-row">
                      <div className="tb-avatar-title-group">
                        <div className={`tb-client-avatar ${isTenant ? 'avatar-tenant' : 'avatar-buyer'}`}>
                          <span>{getClientInitials(client)}</span>
                        </div>
                        <div className="tb-client-main-meta">
                          <div className="tb-name-tag-row">
                            <span className="tb-client-name">{client.fullName}</span>
                            <span className={`tb-role-pill ${isTenant ? 'role-tenant' : 'role-buyer'}`}>
                              {isTenant ? 'Tenant' : 'Buyer'}
                            </span>
                          </div>
                          <span className="tb-client-email">{client.email}</span>
                        </div>
                      </div>

                      <div className="tb-client-status-stack">
                        <span className={`tb-status-badge status-${(client.paymentStatus || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                          {client.paymentStatus || 'Pending'}
                        </span>
                        <span className="tb-agreement-status">
                          {client.leaseStatus || (isBuyer ? client.purchaseStatus : 'Active')}
                        </span>
                      </div>
                    </div>

                    <div className="tb-client-property-row">
                      <div className="tb-prop-info">
                        <Building2 size={13} className="tb-prop-icon" />
                        <span className="tb-prop-title">{client.propertyName}</span>
                        {client.unitNumber && (
                          <span className="tb-unit-pill">Unit {client.unitNumber}</span>
                        )}
                      </div>

                      <div className="tb-client-amount">
                        {isTenant ? (
                          <span>{formatBDT(client.monthlyRent)} <small>/ mo</small></span>
                        ) : (
                          <span>{formatBDT(client.purchasePrice || client.advancePaid)}</span>
                        )}
                      </div>
                    </div>

                    <div className="tb-client-card-footer">
                      <div className="tb-footer-details">
                        {client.phoneNumber && (
                          <span className="tb-detail-item">
                            <Phone size={11} />
                            <span>{client.phoneNumber}</span>
                          </span>
                        )}
                        <span className="tb-detail-item">
                          <Calendar size={11} />
                          <span>Started {formatDate(client.leaseStartDate || client.createdAt)}</span>
                        </span>
                      </div>

                      <div className="tb-select-indicator">
                        <span>{isSelected ? 'Active Dossier' : 'View Dossier'}</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="tb-empty-state-card">
              <Users size={36} className="text-muted" />
              <h3 className="empty-title">No Clients Found</h3>
              <p className="empty-subtext">
                {searchQuery || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || activeCategoryTab !== 'all'
                  ? 'No clients match your filter criteria. Try resetting the filters.'
                  : 'Tenants who rent your properties and buyers who purchase your properties will appear here.'}
              </p>
              {(searchQuery || propertyFilter !== 'all' || paymentStatusFilter !== 'all' || activeCategoryTab !== 'all') && (
                <button
                  type="button"
                  className="btn-tb-reset"
                  onClick={() => {
                    setSearchQuery('');
                    setPropertyFilter('all');
                    setPaymentStatusFilter('all');
                    setActiveCategoryTab('all');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Selected Client Details Panel */}
        {selectedClient && (
          <aside className="tb-details-panel" aria-label="Client details panel">
            {/* Panel Header */}
            <div className="tb-details-header">
              <div className="tb-panel-title-group">
                <div className="tb-panel-avatar-title">
                  <div className={`tb-client-avatar large ${selectedClient.clientType === 'tenant' ? 'avatar-tenant' : 'avatar-buyer'}`}>
                    <span>{getClientInitials(selectedClient)}</span>
                  </div>
                  <div>
                    <div className="tb-panel-name-row">
                      <h2 className="tb-panel-client-name">{selectedClient.fullName}</h2>
                      <span className={`tb-role-pill ${selectedClient.clientType === 'tenant' ? 'role-tenant' : 'role-buyer'}`}>
                        {selectedClient.clientType === 'tenant' ? 'Residential Tenant' : 'Property Buyer'}
                      </span>
                    </div>
                    <span className="tb-panel-email">{selectedClient.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-close-details"
                onClick={handleCloseDetails}
                aria-label="Close client details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Content Scrollable */}
            <div className="tb-details-content-scroll">
              {detailsLoading ? (
                <div className="tb-details-loading">
                  <RotateCw size={22} className="spinning text-muted" />
                  <span>Loading client records & history...</span>
                </div>
              ) : (
                <>
                  {/* Contact Information Card */}
                  <div className="tb-details-section">
                    <h3 className="tb-section-title">Contact Information</h3>
                    <div className="tb-contact-info-grid">
                      <div className="tb-info-row">
                        <Mail size={14} className="tb-info-icon" />
                        <div>
                          <span className="tb-info-label">Email Address</span>
                          <span className="tb-info-val">{selectedClient.email}</span>
                        </div>
                      </div>

                      <div className="tb-info-row">
                        <Phone size={14} className="tb-info-icon" />
                        <div>
                          <span className="tb-info-label">Phone Number</span>
                          <span className="tb-info-val">{selectedClient.phoneNumber || 'Not provided'}</span>
                        </div>
                      </div>

                      <div className="tb-info-row full-span">
                        <MapPin size={14} className="tb-info-icon" />
                        <div>
                          <span className="tb-info-label">Permanent / Forwarding Address</span>
                          <span className="tb-info-val">{selectedClient.address || 'Address on file'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Associated Property Card */}
                  <div className="tb-details-section">
                    <h3 className="tb-section-title">Associated Property</h3>
                    <div className="tb-property-dossier-card">
                      <div className="tb-prop-badge-line">
                        <span className="tb-prop-type-badge">{selectedClient.propertyType || 'Residential'}</span>
                        <span className="tb-prop-listing-badge">{selectedClient.listingType || (selectedClient.clientType === 'tenant' ? 'For Rent' : 'For Sale')}</span>
                      </div>
                      <h4 className="tb-dossier-prop-title">{selectedClient.propertyName}</h4>
                      <p className="tb-dossier-prop-addr">{selectedClient.propertyAddress || selectedClient.propertyName}</p>
                      {selectedClient.unitNumber && (
                        <div className="tb-dossier-unit-line">
                          <span>Unit Number:</span>
                          <strong>{selectedClient.unitNumber}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial & Agreement Details */}
                  <div className="tb-details-section">
                    <h3 className="tb-section-title">
                      {selectedClient.clientType === 'tenant' ? 'Rental & Lease Agreement' : 'Purchase Agreement & Terms'}
                    </h3>
                    <div className="tb-agreement-summary-grid">
                      {selectedClient.clientType === 'tenant' ? (
                        <>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Monthly Rent</span>
                            <span className="tb-agree-val text-blue">{formatBDT(selectedClient.monthlyRent)}</span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Security Deposit Held</span>
                            <span className="tb-agree-val text-violet">
                              {formatBDT(selectedClient.securityDeposit || selectedClient.securityDepositDetails?.held || 0)}
                            </span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Lease Period</span>
                            <span className="tb-agree-val small-text">
                              {formatDate(selectedClient.leaseStartDate)} – {selectedClient.leaseEndDate ? formatDate(selectedClient.leaseEndDate) : 'Ongoing'}
                            </span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Lease Status</span>
                            <span className="tb-status-badge status-paid">
                              {selectedClient.leaseStatus || 'Active'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Purchase Price</span>
                            <span className="tb-agree-val text-blue">{formatBDT(selectedClient.purchasePrice)}</span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Verified Advance Paid</span>
                            <span className="tb-agree-val text-green">{formatBDT(selectedClient.advancePaid || selectedClient.totalPaid)}</span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Remaining Balance</span>
                            <span className={`tb-agree-val ${selectedClient.remainingBalance > 0 ? 'text-orange' : 'text-green'}`}>
                              {formatBDT(selectedClient.remainingBalance || 0)}
                            </span>
                          </div>
                          <div className="tb-agree-stat">
                            <span className="tb-agree-label">Conveyance Deed</span>
                            <span className="tb-status-badge status-completed">
                              {selectedClient.deedStatus || 'Pending Conveyance'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Reconciliations */}
                  <div className="tb-details-section">
                    <h3 className="tb-section-title">Verified Payment Reconciliation</h3>
                    <div className="tb-recon-bar-grid">
                      <div className="tb-recon-item">
                        <span className="tb-recon-label">Total Billed / Agreement</span>
                        <span className="tb-recon-val">{formatBDT(selectedClient.totalBilled || selectedClient.purchasePrice || selectedClient.monthlyRent)}</span>
                      </div>
                      <div className="tb-recon-item">
                        <span className="tb-recon-label">Total Verified Paid</span>
                        <span className="tb-recon-val text-green">{formatBDT(selectedClient.totalPaid || selectedClient.advancePaid || 0)}</span>
                      </div>
                      <div className="tb-recon-item">
                        <span className="tb-recon-label">Outstanding Balance</span>
                        <span className={`tb-recon-val ${selectedClient.outstandingBalance > 0 ? 'text-orange' : ''}`}>
                          {formatBDT(selectedClient.outstandingBalance || selectedClient.remainingBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages Shortcut */}
                  <div className="tb-details-section">
                    <div className="tb-messages-shortcut-box">
                      <div className="tb-msg-icon-label">
                        <MessageSquare size={18} className="tb-msg-icon" />
                        <div>
                          <span className="tb-msg-title">Communication & Messages</span>
                          <span className="tb-msg-sub">
                            {selectedClient.messagesCount || 0} conversation history records
                            {selectedClient.unreadMessagesCount > 0 && ` (${selectedClient.unreadMessagesCount} unread)`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-open-messages"
                        onClick={() => {
                          if (onNavigateSection) onNavigateSection('messages');
                          else navigate('/dashboard/messages');
                        }}
                      >
                        <span>Open Messages</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Invoices & Transaction History */}
                  <div className="tb-details-section">
                    <h3 className="tb-section-title">Invoices & Payment Records</h3>
                    {clientDetailsData?.invoices && clientDetailsData.invoices.length > 0 ? (
                      <div className="tb-invoices-mini-list">
                        {clientDetailsData.invoices.map((inv) => (
                          <div key={inv._id} className="tb-invoice-mini-item">
                            <div>
                              <span className="tb-inv-no">{inv.invoiceNo}</span>
                              <span className="tb-inv-date">Issued {formatDate(inv.issuedAt || inv.createdAt)}</span>
                            </div>
                            <div className="tb-inv-amount-col">
                              <span className="tb-inv-amount">{formatBDT(inv.total)}</span>
                              <span className={`tb-status-badge status-${(inv.status || 'pending').toLowerCase()}`}>
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="tb-no-invoices-msg">
                        No outstanding or historical invoices generated for this client.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default UnifiedTenantsBuyersView;
