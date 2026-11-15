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
  AlertCircle
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
            assignedAt: item.request?.approvedAt || item.property.updatedAt,
            leaseEnd: item.request?.leaseEnd || null,
            status: 'Approved',
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
                  </div>

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
    </div>
  );
};

export default HouseInfo;
