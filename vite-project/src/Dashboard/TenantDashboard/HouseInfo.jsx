import React, { useState, useEffect, useCallback } from 'react';
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
  Clock
} from 'lucide-react';
import './HouseInfo.css';
import API from '../../config/api';
import apiConfig from '../../config/api';
import { PropertyCardSkeleton, PageLoader } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantStatusBadge from './components/TenantStatusBadge';
import TenantEmptyState from './components/TenantEmptyState';

const HouseInfo = () => {
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPropertyDetails, setSelectedPropertyDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Move-Out Notice states
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [selectedRentForMoveOut, setSelectedRentForMoveOut] = useState(null);
  const [moveOutForm, setMoveOutForm] = useState({
    intendedMoveOutDate: '',
    reason: '',
    forwardingAddress: ''
  });
  const [moveOutLoading, setMoveOutLoading] = useState(false);
  const [moveOutError, setMoveOutError] = useState('');
  const [moveOutNoticeSuccess, setMoveOutNoticeSuccess] = useState('');

  const calculateNoticeDays = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
            owner: item.property.ownerUserId,
            requestInfo: item.request
          });
        });
      }
      
      // Owned properties
      if (data.assignments?.ownedProperties) {
        data.assignments.ownedProperties.forEach(item => {
          allAssignments.push({
            ...item.property,
            assignmentType: item.request ? 'Purchase' : 'Ownership',
            assignedAt: item.request?.approvedAt || item.property.updatedAt,
            leaseEnd: null,
            status: item.request ? 'Approved' : 'Owned',
            owner: item.property.ownerUserId,
            requestInfo: item.request
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

  const handleOpenMoveOutModal = (property) => {
    if (!property.rentData?._id) return;
    setSelectedRentForMoveOut(property);
    setMoveOutError('');
    setMoveOutNoticeSuccess('');
    // Default to 60 days from now
    const defaultDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setMoveOutForm({
      intendedMoveOutDate: defaultDate,
      reason: 'End of lease / Relocation',
      forwardingAddress: ''
    });
    setShowMoveOutModal(true);
  };

  const handleSubmitMoveOutNotice = async (e) => {
    e.preventDefault();
    if (!selectedRentForMoveOut?.rentData?._id) return;
    setMoveOutError('');

    const days = calculateNoticeDays(moveOutForm.intendedMoveOutDate);
    if (days < 1) {
      setMoveOutError('Move-out date must be in the future.');
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
          forwardingAddress: moveOutForm.forwardingAddress.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit move-out notice');
      }

      setMoveOutNoticeSuccess('Move-out notice submitted successfully! Your property owner has been notified.');
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
        <div className="house-properties-grid">
          {assignedProperties.map((property) => {
            const imageSrc = property.images?.[0] || property.media?.images?.[0]?.url || null;
            const ownerName = property.owner 
              ? `${property.owner.firstName || ''} ${property.owner.lastName || ''}`.trim() || property.owner.name || 'Property Owner'
              : 'Property Owner';

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
                      <span>{property.propertyType || 'Residential Unit'}</span>
                    </div>
                  )}

                  <div className="property-badge-row">
                    <span className="listing-type-pill">
                      {property.assignmentType === 'Rent' ? 'Rental Residence' : property.assignmentType}
                    </span>
                    <TenantStatusBadge status={property.status || 'Active'} size="sm" />
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

                  {/* Pricing & Lease Dates */}
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

                  {/* Tenancy & Move-Out Management Block */}
                  {property.assignmentType === 'Rent' && (
                    <div className="tenancy-moveout-box" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginTop: '0.75rem' }}>
                      {property.rentData?.moveOut?.noticeSubmitted ? (
                        <div className="moveout-status-active">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: '#D97706' }}>
                              <Clock size={14} /> Move-Out Notice Filed
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              Departure: {formatDate(property.rentData.moveOut.intendedMoveOutDate)}
                            </span>
                          </div>
                          <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                            Notice provided: {property.rentData.moveOut.noticeDaysGiven} days ({property.rentData.moveOut.meetsRequirement ? 'Standard 60-day notice met' : 'Under 60 days standard'})
                            • Status: {property.rentData.moveOut.ownerAcknowledged ? 'Owner Acknowledged' : 'Pending Owner Review'}
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
                              Requires {property.rentData?.term?.noticeDays || 60} days advance written notice prior to departure.
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
                  )}

                  {/* Owner Info Block */}
                  {property.owner && (
                    <div className="owner-card-snippet">
                      <div className="owner-snippet-avatar">
                        <User size={16} />
                      </div>
                      <div className="owner-snippet-text">
                        <span className="owner-snippet-label">Property Owner</span>
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

                  {/* Action */}
                  <div className="property-card-footer">
                    <button 
                      type="button" 
                      className="ds-btn ds-btn-primary" 
                      onClick={() => handleViewDetails(property)}
                      style={{ width: '100%' }}
                    >
                      <Eye size={16} />
                      <span>View Full Property Details</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Move-Out Notice Modal */}
      {showMoveOutModal && selectedRentForMoveOut && (
        <div className="ds-modal-backdrop" onClick={() => { if (!moveOutLoading) setShowMoveOutModal(false); }}>
          <div className="ds-modal-card" style={{ maxWidth: '36rem' }} onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={20} color="#D97706" />
                <h3 className="ds-modal-title">Submit Move-Out Notice</h3>
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

            <form onSubmit={handleSubmitMoveOutNotice} className="ds-modal-body">
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

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1E40AF' }}>Lease Notice Requirement: 60 Days</h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#1E3A8A' }}>
                  Submitting this notice informs your property owner of your planned move-out date to schedule a handover inspection and prepare security deposit settlement.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  {moveOutForm.intendedMoveOutDate && (() => {
                    const days = calculateNoticeDays(moveOutForm.intendedMoveOutDate);
                    const meetsReq = days >= 60;
                    return (
                      <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: meetsReq ? '#059669' : '#D97706', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {meetsReq ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        <span>Notice Period: {days} days ({meetsReq ? 'Meets standard 60-day notice requirement' : 'Under recommended 60 days'})</span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                    Reason for Relocation / Departure
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Relocating closer to workplace, buying home..."
                    value={moveOutForm.reason}
                    onChange={e => setMoveOutForm({ ...moveOutForm, reason: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.375rem' }}>
                    Forwarding Address (for Deposit Disbursement & Final Statements)
                  </label>
                  <textarea 
                    rows="2"
                    placeholder="Provide your new residential address..."
                    value={moveOutForm.forwardingAddress}
                    onChange={e => setMoveOutForm({ ...moveOutForm, forwardingAddress: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div className="ds-modal-footer" style={{ marginTop: '1.5rem', padding: '1rem 0 0' }}>
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
                  disabled={moveOutLoading || !moveOutForm.intendedMoveOutDate}
                >
                  {moveOutLoading ? 'Submitting...' : 'Confirm Move-Out Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseInfo;
