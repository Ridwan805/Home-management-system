import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  RotateCw, 
  Eye, 
  X, 
  Bed, 
  Bath, 
  Maximize, 
  Tag, 
  Home, 
  FileText,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageCircle,
  Landmark
} from 'lucide-react';
import './HouseInfo.css';
import API from '../../config/api';
import apiConfig from '../../config/api';
import { PropertyCardSkeleton, PageLoader } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';
import ApplicationMessagesModal from '../../components/ApplicationMessaging/ApplicationMessagesModal';
import TenancyDetailsModal from './components/TenancyDetailsModal';
import PurchaseDetailsModal from './components/PurchaseDetailsModal';

const HouseInfo = () => {
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Two-Way Owner-Tenant Application Messaging states
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedPropertyForMessages, setSelectedPropertyForMessages] = useState(null);

  const handleOpenMessages = (property) => {
    setSelectedPropertyForMessages(property);
    setShowMessagesModal(true);
  };

  // Tenancy Agreement Dossier modal states
  const [showTenancyModal, setShowTenancyModal] = useState(false);
  const [selectedPropertyForTenancy, setSelectedPropertyForTenancy] = useState(null);

  const handleOpenTenancyDetails = (property) => {
    setSelectedPropertyForTenancy(property);
    setShowTenancyModal(true);
  };

  // Purchase Agreement & Transaction Dossier modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPropertyForPurchase, setSelectedPropertyForPurchase] = useState(null);

  const handleOpenPurchaseDetails = (property) => {
    setSelectedPropertyForPurchase(property);
    setShowPurchaseModal(true);
  };

  // Move-Out Notice states
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [selectedRentForMoveOut, setSelectedRentForMoveOut] = useState(null);
  const [moveOutForm, setMoveOutForm] = useState({
    intendedMoveOutDate: '',
    reason: '',
    forwardingPhone: '',
    forwardingEmail: '',
    forwardingAddress: '',
    remarks: '',
    acknowledgedCompliance: false
  });
  const [moveOutLoading, setMoveOutLoading] = useState(false);
  const [moveOutError, setMoveOutError] = useState('');
  const [moveOutNoticeSuccess, setMoveOutNoticeSuccess] = useState('');

  // Calendar-month arithmetic for departure notice calculation
  const addCalendarMonthsClient = (date, months) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    const originalDay = d.getDate();
    const targetYear = d.getFullYear() + Math.floor((d.getMonth() + months) / 12);
    const normalizedMonth = ((d.getMonth() + months) % 12 + 12) % 12;
    const maxDays = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const day = Math.min(originalDay, maxDays);
    const res = new Date(targetYear, normalizedMonth, day);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const getNoticeCompliance = (intendedDateStr, property) => {
    if (!intendedDateStr || !property) return null;
    const term = property?.rentData?.term || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(intendedDateStr);
    targetDate.setHours(0, 0, 0, 0);

    const isDaysBased = term.noticePeriodUnit === 'days' || (term.noticeDays && term.noticeDays !== 60 && !term.noticePeriodMonths);
    const noticeMonths = Number(term.noticePeriodMonths) || (term.noticeDays === 30 ? 1 : 2);
    const noticeDays = Number(term.noticeDays) || 60;

    let earliestDate;
    let requiredLabel;

    if (isDaysBased && term.noticeDays && term.noticeDays !== 60) {
      earliestDate = new Date(today.getTime() + term.noticeDays * 24 * 60 * 60 * 1000);
      requiredLabel = `${term.noticeDays} Days (Signed Term)`;
    } else {
      earliestDate = addCalendarMonthsClient(today, noticeMonths);
      requiredLabel = `${noticeMonths} Calendar Months (Standard)`;
    }

    const diffDays = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const meetsRequirement = targetDate.getTime() >= earliestDate.getTime();

    return {
      today,
      earliestDate,
      requiredLabel,
      diffDays,
      meetsRequirement,
      isShorterNotice: !meetsRequirement
    };
  };

  const fetchAssignedProperties = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      } else {
        setRefreshing(true);
      }
      
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) {
        setError('Authentication required');
        return;
      }

      const timestamp = new Date().getTime();
      const response = await fetch(`${API.getUrl(API.endpoints.tenantAssignments)}?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned properties');
      }

      const data = await response.json();
      const allAssignments = [];
      
      // Approved rented properties
      if (data.assignments?.rentedProperties) {
        data.assignments.rentedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: 'Rent',
            rentData: item.rent || null,
            assignedAt: item.rent?.term?.startDate || item.request?.approvedAt || item.property.updatedAt,
            leaseEnd: item.rent?.term?.endDate || item.request?.leaseEnd || null,
            status: item.rent?.status || 'Active',
            owner: item.property.ownerUserId || item.property.owner || item.request?.ownerId,
            requestInfo: item.request,
            unreadMessagesCount: item.request?.unreadMessagesCount || 0,
            messagesCount: item.request?.messagesCount || 0
          });
        });
      }
      
      // Owned / Purchase properties
      if (data.assignments?.ownedProperties) {
        data.assignments.ownedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: item.request ? 'Purchase' : 'Ownership',
            assignedAt: item.request?.approvedAt || item.property.updatedAt,
            leaseEnd: null,
            status: item.purchaseData?.status || item.request?.status || (item.request ? 'Approved' : 'Owned'),
            owner: item.purchaseData?.seller || item.property.ownerUserId || item.property.owner || item.request?.ownerId,
            requestInfo: item.request,
            purchaseData: item.purchaseData || null,
            unreadMessagesCount: item.request?.unreadMessagesCount || 0,
            messagesCount: item.request?.messagesCount || 0
          });
        });
      }
      
      setAssignedProperties(allAssignments);
    } catch (err) {
      console.error('Error fetching assigned properties:', err);
      if (!silent) {
        setError('Failed to load assigned properties. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const isPurchaseProperty = (prop) => {
    if (!prop) return false;
    return (
      prop.listingType === 'For Sale' ||
      prop.assignmentType === 'Purchase' ||
      prop.assignmentType === 'Ownership' ||
      prop.requestInfo?.requestType === 'Buy'
    );
  };

  const rentalProperties = useMemo(() => {
    return assignedProperties.filter(p => !isPurchaseProperty(p));
  }, [assignedProperties]);

  const purchaseRecords = useMemo(() => {
    return assignedProperties.filter(p => isPurchaseProperty(p));
  }, [assignedProperties]);

  const handleOpenMoveOutModal = (property) => {
    if (!property.rentData?._id) return;
    setSelectedRentForMoveOut(property);
    setMoveOutError('');
    setMoveOutNoticeSuccess('');
    
    // Default to the earliest compliant date (2 calendar months from today)
    const term = property.rentData.term || {};
    const noticeMonths = Number(term.noticePeriodMonths) || (term.noticeDays === 30 ? 1 : 2);
    const defaultDateObj = (term.noticeDays === 30 && term.noticePeriodUnit === 'days')
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : addCalendarMonthsClient(new Date(), noticeMonths);
      
    const defaultDateStr = defaultDateObj.toISOString().split('T')[0];
    const tenantUser = JSON.parse(localStorage.getItem('dwellSyncUser'));

    setMoveOutForm({
      intendedMoveOutDate: defaultDateStr,
      reason: 'End of lease / Relocation',
      forwardingPhone: tenantUser?.phone || tenantUser?.phoneNumber || '',
      forwardingEmail: tenantUser?.email || '',
      forwardingAddress: '',
      remarks: '',
      acknowledgedCompliance: false
    });
    setShowMoveOutModal(true);
  };

  const handleSubmitMoveOutNotice = async (e) => {
    e.preventDefault();
    if (!selectedRentForMoveOut?.rentData?._id) return;
    setMoveOutError('');

    const compliance = getNoticeCompliance(moveOutForm.intendedMoveOutDate, selectedRentForMoveOut);
    if (!compliance || compliance.diffDays < 1) {
      setMoveOutError('Move-out date must be in the future.');
      return;
    }

    if (!moveOutForm.acknowledgedCompliance) {
      setMoveOutError('Please check the confirmation box acknowledging your formal move-out notice.');
      return;
    }

    try {
      setMoveOutLoading(true);
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;
      if (!token) throw new Error('Authentication required');

      const rentId = selectedRentForMoveOut.rentData._id;
      const res = await fetch(API.getUrl(API.endpoints.submitMoveOutNotice(rentId)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intendedMoveOutDate: moveOutForm.intendedMoveOutDate,
          reason: moveOutForm.reason.trim(),
          forwardingPhone: moveOutForm.forwardingPhone.trim(),
          forwardingEmail: moveOutForm.forwardingEmail.trim(),
          forwardingAddress: moveOutForm.forwardingAddress.trim(),
          remarks: moveOutForm.remarks.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit move-out notice');
      }

      setMoveOutNoticeSuccess('Move-out notice submitted successfully! Your property owner has been formally notified.');
      setTimeout(() => {
        setShowMoveOutModal(false);
        fetchAssignedProperties(true);
      }, 1500);
    } catch (err) {
      console.error('Error submitting move-out notice:', err);
      setMoveOutError(err.message || 'Failed to submit move-out notice.');
    } finally {
      setMoveOutLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedProperties();
    const interval = setInterval(() => {
      fetchAssignedProperties(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchAssignedProperties]);

  const handleRefresh = () => {
    fetchAssignedProperties(false);
  };

  const handleViewDetails = async (property) => {
    setSelectedProperty(property);
    setShowModal(true);
    setLoadingDetails(true);
    
    try {
      const userData = JSON.parse(localStorage.getItem('dwellSyncUser'));
      const token = userData?.token;

      if (!token) return;

      const response = await fetch(`${API.getUrl(API.endpoints.tenantPropertyDetails(property._id))}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property details');
      }

      const data = await response.json();
      setSelectedPropertyDetails(data.property);
    } catch (err) {
      console.error('Error fetching property details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Active Lease';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (val, listingType) => {
    const num = Number(val || 0);
    const formatted = `৳${num.toLocaleString('en-US')}`;
    return listingType === 'For Rent' ? `${formatted} / month` : formatted;
  };

  const renderPropertyCard = (property, isHistorical = false) => {
    const isPurchase = isPurchaseProperty(property);
    const imageSrc = property.images?.[0] || property.media?.images?.[0]?.url || null;
    const ownerName = property.owner 
      ? `${property.owner.firstName || ''} ${property.owner.lastName || ''}`.trim() || property.owner.name || (isPurchase ? 'Property Seller' : 'Property Owner')
      : (isPurchase ? 'Property Seller' : 'Property Owner');

    return (
      <div key={property._id} className="house-property-card">
        {/* Property Visual Banner */}
        <div className="property-card-media">
          {imageSrc ? (
            <img 
              src={apiConfig.getImageUrl(imageSrc)} 
              alt={property.address}
              className="property-img-cover" 
            />
          ) : (
            <div className="property-img-fallback">
              <Home size={36} />
              <span>{property.propertyType || (isPurchase ? 'Land / Plot' : 'Residential Unit')}</span>
            </div>
          )}

          <div className="property-badge-row">
            <span className={`listing-type-pill ${isPurchase ? 'pill-purchase' : ''}`}>
              {isPurchase ? (isHistorical ? 'Purchase (Preserved)' : 'For Sale / Purchase') : (property.assignmentType === 'Rent' ? 'Rental Residence' : property.assignmentType)}
            </span>
            <TenantStatusBadge status={property.status || (isPurchase ? 'Approved' : 'Active')} size="sm" />
          </div>
        </div>

        {/* Property Details */}
        <div className="property-card-content">
          <div className="property-title-section">
            <h3 className="property-heading">
              {property.name || property.address}
            </h3>
            {property.location?.city && (
              <p className="property-location-line">
                <MapPin size={15} />
                <span>{property.location.city}, {property.location.state || 'BD'}</span>
              </p>
            )}
          </div>

          {/* Pricing & Agreement Metadata (Differentiated for Sale vs Rent) */}
          {isPurchase ? (
            <div className="property-meta-box">
              <div className="meta-box-item">
                <span className="meta-label">Purchase Price</span>
                <span className="meta-price">{formatPrice(property.purchaseData?.agreedPrice || property.price, 'For Sale')}</span>
              </div>

              <div className="meta-box-item">
                <span className="meta-label">Verified Paid (Stripe)</span>
                <span className="meta-val font-bold" style={{ color: '#059669' }}>
                  {formatPrice(property.purchaseData?.advancePaid || 0, 'For Sale')}
                </span>
              </div>

              <div className="meta-box-item">
                <span className="meta-label">Remaining Balance</span>
                <span className="meta-val font-bold">
                  {property.purchaseData?.remainingBalance === 0 ? '৳0 (Fully Paid)' : `৳${Number(property.purchaseData?.remainingBalance || 0).toLocaleString()}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="property-meta-box">
              <div className="meta-box-item">
                <span className="meta-label">Monthly Rent</span>
                <span className="meta-price">{formatPrice(property.price, property.listingType)}</span>
              </div>

              <div className="meta-box-item">
                <span className="meta-label">Lease Start</span>
                <span className="meta-val">{formatDate(property.assignedAt)}</span>
              </div>

              {property.leaseEnd && (
                <div className="meta-box-item">
                  <span className="meta-label">Lease End</span>
                  <span className="meta-val">{formatDate(property.leaseEnd)}</span>
                </div>
              )}

              {property.assignmentType === 'Rent' && property.rentData?.securityDeposit?.amount && (
                <div className="meta-box-item">
                  <span className="meta-label">Deposit Held</span>
                  <span className="meta-val font-bold">৳{Number(property.rentData.securityDeposit.amount).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Tenancy & Move-Out Management Block (ONLY for Rental properties) */}
          {!isPurchase && property.assignmentType === 'Rent' && (() => {
            const term = property.rentData?.term || {};
            const isDaysBased = term.noticePeriodUnit === 'days' || (term.noticeDays && term.noticeDays !== 60 && !term.noticePeriodMonths);
            const noticeLabel = isDaysBased && term.noticeDays
              ? `${term.noticeDays} days`
              : `${term.noticePeriodMonths || 2} calendar months`;

            return (
              <div className="tenancy-moveout-box" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginTop: '0.75rem' }}>
                {property.rentData?.moveOut?.noticeSubmitted ? (
                  <div className="moveout-status-active">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#D97706' }}>
                        <Clock size={14} /> Move-Out Status: {property.rentData.moveOut.status || 'Notice Submitted'}
                      </span>
                      <button
                        type="button"
                        className="ds-btn ds-btn-secondary ds-btn-sm"
                        onClick={() => handleOpenTenancyDetails(property)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                      >
                        View Notice & Progress
                      </button>
                    </div>
                    <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                      Departure: <strong>{formatDate(property.rentData.moveOut.intendedMoveOutDate)}</strong> ({property.rentData.moveOut.noticeDaysGiven} days notice; {property.rentData.moveOut.meetsRequirement ? 'Compliant' : 'Short notice'})
                    </p>
                    {property.rentData.moveOut.handoverScheduledDate && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#2563EB', fontWeight: 600 }}>
                        Handover Inspection: {formatDate(property.rentData.moveOut.handoverScheduledDate)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Move-Out Notice Requirement
                      </span>
                      <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                        Requires {noticeLabel} advance written notice prior to departure.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ds-btn ds-btn-secondary ds-btn-sm"
                      onClick={() => handleOpenMoveOutModal(property)}
                      style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                    >
                      <AlertTriangle size={13} />
                      <span>Notice to Vacate</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Owner / Seller Info Block */}
          {property.owner && (
            <div className="owner-card-snippet">
              <div className="owner-snippet-avatar">
                <User size={16} />
              </div>
              <div className="owner-snippet-text">
                <span className="owner-snippet-label">{isPurchase ? 'Property Seller / Owner' : 'Property Owner'}</span>
                <span className="owner-snippet-name">{ownerName}</span>
                {property.owner.email && (
                  <span className="owner-snippet-contact">
                    <Mail size={13} />
                    <span>{property.owner.email}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: Differentiated for Purchase vs Rental */}
          <div className="property-card-footer">
            <div className="property-card-footer-actions">
              <button 
                type="button" 
                className="ds-btn ds-btn-primary action-btn-third" 
                onClick={() => handleViewDetails(property)}
                title="View comprehensive property specifications"
              >
                <Eye size={15} />
                <span>Property Details</span>
              </button>

              {isPurchase ? (
                <button
                  type="button"
                  className="ds-btn ds-btn-navy-outline action-btn-third"
                  onClick={() => handleOpenPurchaseDetails(property)}
                  title="View purchase agreement terms, workflow, and verified payment receipts"
                >
                  <Landmark size={15} />
                  <span>Purchase Details</span>
                </button>
              ) : (
                property.assignmentType === 'Rent' && (
                  <button
                    type="button"
                    className="ds-btn ds-btn-navy-outline action-btn-third"
                    onClick={() => handleOpenTenancyDetails(property)}
                    title="View lease agreement terms and move-out requirements"
                  >
                    <FileText size={15} />
                    <span>Tenancy Details</span>
                  </button>
                )
              )}

              <button
                type="button"
                className={`ds-btn ${property.unreadMessagesCount > 0 ? 'ds-btn-message-unread' : 'ds-btn-secondary'} action-btn-third`}
                onClick={() => handleOpenMessages(property)}
                title={property.unreadMessagesCount > 0 ? `${property.unreadMessagesCount} unread message(s)` : `Direct communication with ${isPurchase ? 'seller' : 'owner'}`}
                disabled={!property.requestInfo?._id}
              >
                <MessageCircle size={15} />
                <span>Messages{property.unreadMessagesCount > 0 ? ` (${property.unreadMessagesCount})` : ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tenant-house-info-page">
      <TenantPageHeader 
        title="My Property" 
        subtitle="Information about your approved rental property and active residency."
        action={
          <button 
            type="button" 
            className="ds-btn ds-btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh residency details"
          >
            <RotateCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {error && (
        <div className="house-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="house-skeleton-grid">
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </div>
      ) : assignedProperties.length === 0 ? (
        <TenantEmptyState 
          icon={Building2}
          title="No Active Property Yet"
          description="You do not have an active tenancy record at this moment. Once an owner approves your rental application and activates your residency, your residence details and lease info will appear here."
          primaryAction={
            <Link to="/properties" className="ds-btn ds-btn-primary">
              <Building2 size={16} />
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
      ) : (
        <div className="tenant-properties-sections">
          {/* Active Rental Tenancies Section */}
          <div className="active-rentals-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Active Rental Residences
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                  Manage your active rental tenancies, monthly lease terms, and move-out requirements.
                </p>
              </div>
              {rentalProperties.length > 0 && (
                <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '1rem' }}>
                  {rentalProperties.length} {rentalProperties.length === 1 ? 'Active Lease' : 'Active Leases'}
                </span>
              )}
            </div>

            {rentalProperties.length > 0 ? (
              <div className="house-properties-grid">
                {rentalProperties.map((property) => renderPropertyCard(property, false))}
              </div>
            ) : (
              <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '0.5rem', padding: '1.75rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <Building2 size={28} color="#94A3B8" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                <h4 style={{ color: '#0F172A', margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 600 }}>No Active Rental Leases</h4>
                <p style={{ margin: '0 0 1rem 0', color: '#64748B', fontSize: '0.8125rem' }}>
                  You currently have no active tenancy agreements. Apply for an available rental property to start your lease.
                </p>
                <Link to="/properties" className="ds-btn ds-btn-primary ds-btn-sm" style={{ display: 'inline-flex' }}>
                  <Building2 size={14} />
                  <span>Browse Available Rentals</span>
                </Link>
              </div>
            )}
          </div>

          {/* Historical Purchase Records Section (Sales Paused) */}
          {purchaseRecords.length > 0 && (
            <div className="historical-purchases-section" style={{ marginTop: '2.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Historical Purchase Records
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                    Property sales workflows are temporarily paused on DwellSync. Your historical purchase applications, verified Stripe payment receipts, and agreement records are safely preserved below in read-only mode.
                  </p>
                </div>
                <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '1rem' }}>
                  {purchaseRecords.length} {purchaseRecords.length === 1 ? 'Record' : 'Records'} Preserved
                </span>
              </div>

              <div className="house-properties-grid">
                {purchaseRecords.map((property) => renderPropertyCard(property, true))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Property Details Modal */}
      {showModal && selectedProperty && (
        <div className="ds-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="ds-modal-card property-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <Building2 size={20} className="modal-header-icon" />
                <h3 className="ds-modal-title">Property & Tenancy Specifications</h3>
              </div>
              <button 
                type="button" 
                className="ds-modal-close" 
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ds-modal-body modal-scrollable-body">
              {loadingDetails ? (
                <PageLoader message="Loading property specifications..." minHeight="220px" />
              ) : (
                <div className="property-modal-sections">
                  {/* Basic Specifications */}
                  <div className="spec-group-box">
                    <h4 className="spec-group-heading">Residence Information</h4>
                    <div className="spec-detail-grid">
                      <div className="spec-item">
                        <span className="spec-label">Address</span>
                        <span className="spec-val">
                          {selectedPropertyDetails?.basicInfo?.address || selectedProperty.address}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Property Type</span>
                        <span className="spec-val">
                          {selectedPropertyDetails?.basicInfo?.propertyType || selectedProperty.propertyType || 'Apartment'}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Rent / Price</span>
                        <span className="spec-val font-bold">
                          ৳{(selectedPropertyDetails?.basicInfo?.price || selectedProperty.price)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Listing Type</span>
                        <span className="spec-val">
                          {selectedPropertyDetails?.basicInfo?.listingType || selectedProperty.listingType}
                        </span>
                      </div>
                      {selectedPropertyDetails?.basicInfo?.bedrooms && (
                        <div className="spec-item">
                          <span className="spec-label">Bedrooms</span>
                          <span className="spec-val">{selectedPropertyDetails.basicInfo.bedrooms} Beds</span>
                        </div>
                      )}
                      {selectedPropertyDetails?.basicInfo?.bathrooms && (
                        <div className="spec-item">
                          <span className="spec-label">Bathrooms</span>
                          <span className="spec-val">{selectedPropertyDetails.basicInfo.bathrooms} Baths</span>
                        </div>
                      )}
                      {selectedPropertyDetails?.basicInfo?.squareFootage && (
                        <div className="spec-item">
                          <span className="spec-label">Area</span>
                          <span className="spec-val">{selectedPropertyDetails.basicInfo.squareFootage} sqft</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Contact */}
                  {(selectedPropertyDetails?.currentOwner || selectedProperty.owner) && (
                    <div className="spec-group-box">
                      <h4 className="spec-group-heading">Owner & Management Contact</h4>
                      <div className="spec-detail-grid">
                        <div className="spec-item">
                          <span className="spec-label">Owner Name</span>
                          <span className="spec-val">
                            {selectedPropertyDetails?.currentOwner 
                              ? `${selectedPropertyDetails.currentOwner.firstName || ''} ${selectedPropertyDetails.currentOwner.lastName || ''}`.trim()
                              : `${selectedProperty.owner.firstName || ''} ${selectedProperty.owner.lastName || ''}`.trim()}
                          </span>
                        </div>
                        <div className="spec-item">
                          <span className="spec-label">Email</span>
                          <span className="spec-val">
                            {selectedPropertyDetails?.currentOwner?.email || selectedProperty.owner?.email}
                          </span>
                        </div>
                        {(selectedPropertyDetails?.currentOwner?.phoneNumber || selectedProperty.owner?.phoneNumber) && (
                          <div className="spec-item">
                            <span className="spec-label">Phone</span>
                            <span className="spec-val">
                              {selectedPropertyDetails?.currentOwner?.phoneNumber || selectedProperty.owner?.phoneNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Building Amenities */}
                  {selectedPropertyDetails?.buildingInfo?.amenities?.length > 0 && (
                    <div className="spec-group-box">
                      <h4 className="spec-group-heading">Amenities</h4>
                      <div className="amenities-tag-cloud">
                        {selectedPropertyDetails.buildingInfo.amenities.map((amenity, idx) => (
                          <span key={idx} className="amenity-pill">{amenity}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedPropertyDetails?.basicInfo?.description && (
                    <div className="spec-group-box">
                      <h4 className="spec-group-heading">Property Description</h4>
                      <p className="property-description-text">
                        {selectedPropertyDetails.basicInfo.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ds-modal-footer">
              <button 
                type="button" 
                className="ds-btn ds-btn-secondary" 
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenancy Agreement Dossier Modal */}
      {showTenancyModal && selectedPropertyForTenancy && (
        <TenancyDetailsModal
          isOpen={showTenancyModal}
          onClose={() => {
            setShowTenancyModal(false);
            setSelectedPropertyForTenancy(null);
          }}
          property={selectedPropertyForTenancy}
          onOpenNoticeModal={(prop) => {
            handleOpenMoveOutModal(prop);
          }}
        />
      )}

      {/* Purchase Agreement & Transaction Dossier Modal */}
      {showPurchaseModal && selectedPropertyForPurchase && (
        <PurchaseDetailsModal
          isOpen={showPurchaseModal}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedPropertyForPurchase(null);
          }}
          property={selectedPropertyForPurchase}
          onOpenMessages={(prop) => {
            handleOpenMessages(prop);
          }}
        />
      )}

      {/* Move-Out Notice Modal */}
      {showMoveOutModal && selectedRentForMoveOut && (() => {
        const compliance = getNoticeCompliance(moveOutForm.intendedMoveOutDate, selectedRentForMoveOut);
        const todayFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        return (
          <div className="ds-modal-backdrop" onClick={() => { if (!moveOutLoading) setShowMoveOutModal(false); }}>
            <div className="ds-modal-card" style={{ maxWidth: '38rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div className="ds-modal-header">
                <div className="modal-title-wrap">
                  <AlertTriangle size={20} color="#D97706" />
                  <h3 className="ds-modal-title">Submit Notice to Vacate</h3>
                </div>
                <button 
                  type="button" 
                  className="ds-modal-close" 
                  onClick={() => setShowMoveOutModal(false)}
                  disabled={moveOutLoading}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitMoveOutNotice} className="ds-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
                {moveOutNoticeSuccess && (
                  <div className="requests-alert alert-success" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <span>{moveOutNoticeSuccess}</span>
                  </div>
                )}

                {moveOutError && (
                  <div className="requests-alert alert-error" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.875rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} color="#DC2626" />
                    <span>{moveOutError}</span>
                  </div>
                )}

                {/* Notice Calculation Overview Strip */}
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9.5rem, 1fr))', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.02em' }}>Notice Submitted</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>{todayFormatted}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.02em' }}>Required Notice</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>{compliance?.requiredLabel || '2 Calendar Months'}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.02em' }}>Earliest Compliant</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>
                        {compliance?.earliestDate ? compliance.earliestDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#1E3A8A', borderTop: '1px solid #DBEAFE', paddingTop: '0.5rem' }}>
                    Submitting this notice informs your property owner to coordinate walkthrough inspection, key return, and security deposit reconciliation.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Requested Move-Out Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                      Intended Move-Out Date *
                    </label>
                    <input 
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={moveOutForm.intendedMoveOutDate}
                      onChange={e => setMoveOutForm({ ...moveOutForm, intendedMoveOutDate: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                    
                    {/* Compliance Indicator Banner */}
                    {compliance && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        background: compliance.meetsRequirement ? '#ECFDF5' : '#FEF3C7',
                        border: `1px solid ${compliance.meetsRequirement ? '#A7F3D0' : '#FDE68A'}`,
                        color: compliance.meetsRequirement ? '#065F46' : '#92400E'
                      }}>
                        {compliance.meetsRequirement ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
                        <div>
                          <div>
                            Notice Period Provided: <strong>{compliance.diffDays} days</strong> ({compliance.meetsRequirement ? `Meets standard ${compliance.requiredLabel}` : 'Shorter than standard notice'})
                          </div>
                          {!compliance.meetsRequirement && (
                            <div style={{ fontWeight: 400, marginTop: '0.25rem', color: '#B45309', fontSize: '0.71875rem' }}>
                              Notice provided is shorter than required. Your departure date will be flagged for owner/legal review rather than treated as standard notice.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reason for Relocation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                      Reason for Departure / Relocation
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Relocating closer to workplace, buying home..."
                      value={moveOutForm.reason}
                      onChange={e => setMoveOutForm({ ...moveOutForm, reason: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Forwarding Contact Info (Phone & Email) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                        Forwarding Phone Number
                      </label>
                      <input 
                        type="tel"
                        placeholder="+880 1700-000000"
                        value={moveOutForm.forwardingPhone}
                        onChange={e => setMoveOutForm({ ...moveOutForm, forwardingPhone: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                        Forwarding Email Address
                      </label>
                      <input 
                        type="email"
                        placeholder="tenant@example.com"
                        value={moveOutForm.forwardingEmail}
                        onChange={e => setMoveOutForm({ ...moveOutForm, forwardingEmail: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>

                  {/* Forwarding Address */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                      Forwarding Residential Address (for Deposit Disbursement)
                    </label>
                    <textarea 
                      rows="2"
                      placeholder="Provide your future physical address for legal notices and deposit disbursement..."
                      value={moveOutForm.forwardingAddress}
                      onChange={e => setMoveOutForm({ ...moveOutForm, forwardingAddress: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Additional Remarks / Handover Instructions */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                      Additional Remarks / Inspection Coordination Notes
                    </label>
                    <textarea 
                      rows="2"
                      placeholder="Any specific preferred walkthrough times, key return instructions, or notes for the landlord..."
                      value={moveOutForm.remarks}
                      onChange={e => setMoveOutForm({ ...moveOutForm, remarks: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Confirmation Checkbox */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.375rem', padding: '0.75rem 1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#1E293B' }}>
                      <input 
                        type="checkbox"
                        checked={moveOutForm.acknowledgedCompliance}
                        onChange={e => setMoveOutForm({ ...moveOutForm, acknowledgedCompliance: e.target.checked })}
                        style={{ marginTop: '0.1875rem', width: '1rem', height: '1rem', accentColor: '#2563EB' }}
                      />
                      <span>
                        I formally submit this advance notice to vacate the property on the specified date and acknowledge the walkthrough inspection and deposit settlement procedure.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="ds-modal-footer" style={{ marginTop: '1.25rem', padding: '1rem 0 0' }}>
                  <button 
                    type="button" 
                    className="ds-btn ds-btn-secondary" 
                    onClick={() => setShowMoveOutModal(false)}
                    disabled={moveOutLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="ds-btn ds-btn-primary"
                    disabled={moveOutLoading || !moveOutForm.intendedMoveOutDate || !moveOutForm.acknowledgedCompliance}
                  >
                    {moveOutLoading ? 'Submitting...' : 'Confirm & Transmit Move-Out Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Two-Way Owner-Tenant Application Messaging Modal */}
      {showMessagesModal && selectedPropertyForMessages?.requestInfo?._id && (
        <ApplicationMessagesModal
          isOpen={showMessagesModal}
          onClose={() => {
            setShowMessagesModal(false);
            setSelectedPropertyForMessages(null);
          }}
          requestId={selectedPropertyForMessages.requestInfo._id}
          requestRef={selectedPropertyForMessages.requestInfo.requestId}
          property={selectedPropertyForMessages}
          counterpartRole="Owner"
          counterpartName={
            selectedPropertyForMessages.owner
              ? `${selectedPropertyForMessages.owner.firstName || ''} ${selectedPropertyForMessages.owner.lastName || ''}`.trim() || selectedPropertyForMessages.owner.name || 'Property Owner'
              : 'Property Owner'
          }
          status={selectedPropertyForMessages.requestInfo.status || 'Approved'}
          onMessagesUpdated={() => {
            fetchAssignedProperties(true);
          }}
        />
      )}
    </div>
  );
};

export default HouseInfo;
