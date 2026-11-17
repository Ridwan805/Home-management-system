import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Home,
  PlusCircle,
  Search,
  ExternalLink,
  Users,
  CreditCard,
  FileText,
  Wrench,
  RotateCw,
  Bed,
  Bath,
  Maximize,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import API, { getImageUrl } from '../../../config/api';
import TenancyDetailsModal from '../../TenantDashboard/components/TenancyDetailsModal';
import PurchaseDetailsModal from '../../TenantDashboard/components/PurchaseDetailsModal';
import EditPropertyModal from '../../../components/EditPropertyModal';
import './UnifiedPropertiesView.css';

const UnifiedPropertiesView = ({ onNavigateSection }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'owned' | 'rented' | 'purchases'
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [ownedProperties, setOwnedProperties] = useState([]);
  const [rentedProperties, setRentedProperties] = useState([]);
  const [historicalPurchases, setHistoricalPurchases] = useState([]);

  // Modals
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);

  const fetchPropertiesData = useCallback(async (isManual = false) => {
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

      // Fetch owned properties and tenant assignments in parallel
      const [ownedRes, assignmentsRes] = await Promise.allSettled([
        fetch(API.getUrl(API.endpoints.userProperties), { headers }).then(r => r.ok ? r.json() : null),
        fetch(API.getUrl(API.endpoints.tenantAssignments), { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (ownedRes.status === 'fulfilled' && ownedRes.value) {
        const data = ownedRes.value;
        const list = Array.isArray(data.properties) ? data.properties : (Array.isArray(data) ? data : []);
        setOwnedProperties(list);
      }

      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value) {
        const assignments = assignmentsRes.value.assignments || assignmentsRes.value;
        setRentedProperties(assignments.rentedProperties || []);
        setHistoricalPurchases(assignments.ownedProperties || []);
      }
    } catch (err) {
      console.error('Error fetching unified properties:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPropertiesData();
  }, [fetchPropertiesData]);

  // Aggregate and filter
  const getDisplayItems = () => {
    let items = [];

    if (activeFilter === 'all' || activeFilter === 'owned') {
      ownedProperties.forEach(p => {
        items.push({
          ...p,
          unifiedType: 'owned',
          sortKey: p.updatedAt || p.createdAt
        });
      });
    }

    if (activeFilter === 'all' || activeFilter === 'rented') {
      rentedProperties.forEach(r => {
        const p = r.property || r;
        items.push({
          ...p,
          rentRecord: r.rent || r,
          requestRecord: r.request,
          unifiedType: 'rented',
          sortKey: r.rent?.updatedAt || r.updatedAt || p.updatedAt
        });
      });
    }

    if (activeFilter === 'all' || activeFilter === 'purchases') {
      historicalPurchases.forEach(item => {
        const p = item.property || item;
        items.push({
          ...p,
          purchaseData: item.purchaseData,
          requestRecord: item.request,
          unifiedType: 'purchase',
          sortKey: item.request?.approvedAt || p.updatedAt
        });
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.address && i.address.toLowerCase().includes(q)) ||
        (i.propertyType && i.propertyType.toLowerCase().includes(q))
      );
    }

    return items;
  };

  const displayItems = getDisplayItems();

  const formatBDT = (amount) => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  return (
    <div className="unified-properties-view">
      {/* Top Header Row */}
      <div className="properties-view-header">
        <div>
          <h1 className="view-title">My Properties</h1>
          <p className="view-subtitle">
            Manage your owned real estate assets and residences you rent in one integrated directory.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-refresh"
            onClick={() => fetchPropertiesData(true)}
            disabled={refreshing}
          >
            <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn-add-property"
            onClick={() => onNavigateSection ? onNavigateSection('create-listing') : navigate('/dashboard/create-listing')}
          >
            <PlusCircle size={16} />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="properties-controls-bar">
        <div className="filter-pill-tabs">
          <button
            type="button"
            className={`pill-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({ownedProperties.length + rentedProperties.length + historicalPurchases.length})
          </button>
          <button
            type="button"
            className={`pill-tab ${activeFilter === 'owned' ? 'active' : ''}`}
            onClick={() => setActiveFilter('owned')}
          >
            Owned Properties ({ownedProperties.length})
          </button>
          <button
            type="button"
            className={`pill-tab ${activeFilter === 'rented' ? 'active' : ''}`}
            onClick={() => setActiveFilter('rented')}
          >
            Rented Residences ({rentedProperties.length})
          </button>
          {historicalPurchases.length > 0 && (
            <button
              type="button"
              className={`pill-tab ${activeFilter === 'purchases' ? 'active' : ''}`}
              onClick={() => setActiveFilter('purchases')}
            >
              Purchase Records ({historicalPurchases.length})
            </button>
          )}
        </div>

        <div className="properties-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Filter by title, address, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Properties */}
      {loading ? (
        <div className="properties-grid-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`p-skel-${i}`} className="property-item-skeleton" />
          ))}
        </div>
      ) : displayItems.length > 0 ? (
        <div className="properties-cards-grid">
          {displayItems.map((item) => {
            const isOwned = item.unifiedType === 'owned';
            const isRented = item.unifiedType === 'rented';
            const isPurchase = item.unifiedType === 'purchase';

            const photos = item.media?.photos || item.images || [];
            const photoUrl = photos.length > 0 ? getImageUrl(photos[0]) : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';

            const priceDisplay = isOwned
              ? (item.pricing?.rent || item.price || 0)
              : isRented
              ? (item.rentRecord?.rent?.amount || item.pricing?.rent || item.price || 0)
              : (item.purchaseData?.agreedPrice || item.pricing?.sale || item.price || 0);

            return (
              <div key={item._id || item.id} className="unified-prop-card">
                <div className="prop-img-wrap">
                  <img
                    src={photoUrl}
                    alt={item.title || item.address}
                    className="prop-card-img"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="prop-tags-overlay">
                    <span className={`tag-type ${isOwned ? 'type-owned' : isRented ? 'type-rented' : 'type-purchase'}`}>
                      {isOwned ? 'Owned Property' : isRented ? 'Rented Residence' : 'Historical Purchase'}
                    </span>
                    <span className="tag-status">
                      {isOwned ? item.status : isRented ? 'Active Tenancy' : (item.purchaseData?.status || 'Purchased')}
                    </span>
                  </div>
                </div>

                <div className="prop-body">
                  <div className="prop-price-row">
                    <span className="prop-price">
                      {formatBDT(priceDisplay)}
                      {!isPurchase && <span className="cycle"> / mo</span>}
                    </span>
                    <span className="prop-type">{item.propertyType || 'Apartment'}</span>
                  </div>

                  <h3 className="prop-title">{item.title || item.address}</h3>
                  <p className="prop-address">{item.address}</p>

                  <div className="prop-specs-row">
                    {item.specifications?.bedrooms > 0 && (
                      <span className="spec"><Bed size={13} /> {item.specifications.bedrooms} Beds</span>
                    )}
                    {item.specifications?.bathrooms > 0 && (
                      <span className="spec"><Bath size={13} /> {item.specifications.bathrooms} Baths</span>
                    )}
                    {item.specifications?.squareFootage > 0 && (
                      <span className="spec"><Maximize size={13} /> {item.specifications.squareFootage} sqft</span>
                    )}
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="prop-card-actions">
                    {isOwned && (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action primary"
                          onClick={() => onNavigateSection ? onNavigateSection('tenants-buyers') : navigate('/dashboard/tenants-buyers')}
                        >
                          <Users size={13} />
                          <span>Manage Tenants</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => navigate(`/properties/${item._id}`)}
                        >
                          <ExternalLink size={13} />
                          <span>View Details</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => setEditingProperty(item)}
                        >
                          <span>Manage Listing</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => onNavigateSection ? onNavigateSection('applications') : navigate('/dashboard/applications')}
                        >
                          <span>View Applications</span>
                        </button>
                      </div>
                    )}

                    {isRented && (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action primary pay"
                          onClick={() => onNavigateSection ? onNavigateSection('payments') : navigate('/dashboard/payments')}
                        >
                          <CreditCard size={13} />
                          <span>Pay Rent</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => setSelectedRental(item)}
                        >
                          <FileText size={13} />
                          <span>Tenancy Details</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => onNavigateSection ? onNavigateSection('maintenance') : navigate('/dashboard/maintenance')}
                        >
                          <Wrench size={13} />
                          <span>Report Issue</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => navigate(`/properties/${item._id}`)}
                        >
                          <ExternalLink size={13} />
                          <span>View Details</span>
                        </button>
                      </div>
                    )}

                    {isPurchase && (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action primary"
                          onClick={() => setSelectedPurchase(item)}
                        >
                          <Landmark size={13} />
                          <span>Purchase Details</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action secondary"
                          onClick={() => navigate(`/properties/${item._id}`)}
                        >
                          <ExternalLink size={13} />
                          <span>View Property</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="properties-empty">
          <Building2 size={36} className="empty-icon" />
          <h3>No properties match your filter</h3>
          <p>Try switching filter tabs or adding a new property to your portfolio.</p>
          <button
            type="button"
            className="empty-btn"
            onClick={() => onNavigateSection ? onNavigateSection('create-listing') : navigate('/dashboard/create-listing')}
          >
            <PlusCircle size={15} />
            <span>List a Property</span>
          </button>
        </div>
      )}

      {/* Tenancy Modal */}
      {selectedRental && (
        <TenancyDetailsModal
          isOpen={Boolean(selectedRental)}
          onClose={() => setSelectedRental(null)}
          property={selectedRental}
          onOpenNoticeModal={() => {
            setSelectedRental(null);
            if (onNavigateSection) onNavigateSection('notices');
            else navigate('/dashboard/notices');
          }}
        />
      )}

      {/* Purchase Modal */}
      {selectedPurchase && (
        <PurchaseDetailsModal
          isOpen={Boolean(selectedPurchase)}
          onClose={() => setSelectedPurchase(null)}
          property={selectedPurchase}
        />
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <EditPropertyModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onUpdate={() => {
            setEditingProperty(null);
            fetchPropertiesData(true);
          }}
        />
      )}
    </div>
  );
};

export default UnifiedPropertiesView;
