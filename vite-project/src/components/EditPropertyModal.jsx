import React, { useState, useEffect } from 'react';
import './EditPropertyModal.css';
import { ButtonSpinner } from './loading';
import { isPropertySalesEnabled } from '../config/features';
import {
  Building2,
  Home,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  MapPin
} from 'lucide-react';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'apartment_unit', label: 'Apartment Unit' },
  { value: 'floor', label: 'Entire Floor' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'retail', label: 'Retail Space' },
  { value: 'office', label: 'Office Space' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  'Available',
  'Processing',
  'Reserved',
  'Rented',
  'Sold',
  'Unavailable',
  'pending'
];

const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

const RESIDENTIAL_TYPES = [
  'apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'
];

const EditPropertyModal = ({ property, onClose, onUpdate }) => {
  const getInitialFormData = (prop) => {
    if (!prop) return {};
    const bId = prop.buildingId?._id || prop.buildingId || null;
    const isBuildingUnit = Boolean(bId);

    return {
      buildingId: bId,
      buildingObj: typeof prop.buildingId === 'object' ? prop.buildingId : null,
      floorNumber: prop.floorNumber ?? '',
      unitNumber: prop.unitNumber ?? '',
      address: prop.address || prop.location?.address || '',
      propertyType: prop.propertyType || '',
      listingType: (!isPropertySalesEnabled() && prop.listingType === 'For Sale') ? 'For Rent' : (prop.listingType || 'For Rent'),
      price: prop.listingType === 'For Rent'
        ? (prop.pricing?.rent || prop.price || '')
        : (!isPropertySalesEnabled() ? '' : (prop.pricing?.sale || prop.price || '')),
      deposit: prop.pricing?.deposit ?? '',
      status: prop.status || 'Available',
      bedrooms: prop.specifications?.bedrooms ?? prop.bedrooms ?? '',
      bathrooms: prop.specifications?.bathrooms ?? prop.bathrooms ?? '',
      squareFootage: prop.specifications?.squareFootage ?? prop.squareFootage ?? '',
      furnishing: prop.specifications?.furnishing || prop.furnishing || 'Unfurnished',
      parkingSpots: prop.specifications?.parkingSpots ?? prop.parkingSpots ?? 0,
      hasBalcony: Boolean(prop.specifications?.balcony?.hasBalcony || prop.hasBalcony),
      balconySize: prop.specifications?.balcony?.balconySize || prop.balconySize || '',
      hasStorage: Boolean(prop.specifications?.storage?.hasStorage || prop.hasStorage),
      storageSize: prop.specifications?.storage?.storageSize || prop.storageSize || '',
      airConditioning: Boolean(prop.specifications?.appliances?.airConditioning || prop.airConditioning),
      heating: Boolean(prop.specifications?.appliances?.heating || prop.heating),
      petsAllowed: Boolean(prop.constraints?.petPolicy?.allowed || prop.petsAllowed),
      smokingAllowed: Boolean(prop.constraints?.smokingPolicy?.allowed || prop.smokingAllowed),
      maxOccupants: prop.constraints?.occupancyLimit?.maxOccupants || prop.maxOccupants || '',
      yearBuilt: prop.yearBuilt ?? '',
      city: prop.location?.city || prop.city || '',
      state: prop.location?.state || prop.state || '',
      zipCode: prop.location?.zipCode || prop.zipCode || '',
      location_link: prop.location?.location_link || prop.location_link || '',
      contactEmail: prop.contactInfo?.email || prop.contactEmail || '',
      contactPhone: prop.contactInfo?.phone || prop.contactPhone || '',
      description: prop.description || '',
      images: prop.images || (prop.media?.images ? prop.media.images.map(img => typeof img === 'string' ? img : img.url) : [])
    };
  };

  const [formData, setFormData] = useState(() => getInitialFormData(property));
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if property prop changes
  useEffect(() => {
    setFormData(getInitialFormData(property));
    setUpdateError(null);
    setUpdateSuccess(false);
  }, [property]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  // Handle background overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const isBuildingUnit = Boolean(formData.buildingId);
  const isLand = formData.propertyType === 'land';
  const isCommercial = ['office', 'retail'].includes(formData.propertyType);
  const isResidential = RESIDENTIAL_TYPES.includes(formData.propertyType);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const numPrice = Number(formData.price);
      const numSqft = Number(formData.squareFootage);
      const numYear = (!isBuildingUnit && formData.yearBuilt) ? Number(formData.yearBuilt) : (property?.yearBuilt || undefined);

      if (numPrice <= 0) throw new Error('Price must be greater than zero');
      if (numSqft <= 0) throw new Error('Square footage must be greater than zero');

      if (formData.hasBalcony && (!formData.balconySize || Number(formData.balconySize) <= 0)) {
        throw new Error('Balcony size is required when balcony is selected');
      }

      const specifications = {
        ...(property?.specifications || {}),
        squareFootage: numSqft,
        parkingSpots: Number(formData.parkingSpots) || 0
      };

      if (isResidential) {
        specifications.bedrooms = Number(formData.bedrooms) || 0;
        specifications.bathrooms = Number(formData.bathrooms) || 0;
      }

      if (!isLand) {
        specifications.furnishing = formData.furnishing || 'Unfurnished';
        if (formData.hasBalcony) {
          specifications.balcony = {
            hasBalcony: true,
            balconySize: Number(formData.balconySize)
          };
        } else {
          specifications.balcony = { hasBalcony: false };
        }

        if (formData.hasStorage) {
          specifications.storage = {
            hasStorage: true,
            storageSize: Number(formData.storageSize) || undefined
          };
        }

        specifications.appliances = {
          ...(property?.specifications?.appliances || {}),
          airConditioning: formData.airConditioning,
          heating: formData.heating
        };
      }

      const constraints = {
        ...(property?.constraints || {}),
        petPolicy: { allowed: formData.petsAllowed },
        smokingPolicy: { allowed: formData.smokingAllowed }
      };
      if (formData.maxOccupants) {
        constraints.occupancyLimit = { maxOccupants: Number(formData.maxOccupants) };
      }

      const payload = {
        propertyType: formData.propertyType,
        listingType: formData.listingType,
        price: numPrice,
        status: formData.status,
        squareFootage: numSqft,
        description: formData.description,
        specifications,
        constraints,
        pricing: {
          ...(property?.pricing || {}),
          rent: formData.listingType === 'For Rent' ? numPrice : (property?.pricing?.rent || 0),
          sale: formData.listingType === 'For Sale' ? numPrice : (property?.pricing?.sale || 0),
          deposit: Number(formData.deposit) || 0
        },
        contactInfo: {
          ...(property?.contactInfo || {}),
          email: formData.contactEmail,
          phone: formData.contactPhone
        }
      };

      if (isResidential) {
        payload.bedrooms = Number(formData.bedrooms) || 0;
        payload.bathrooms = Number(formData.bathrooms) || 0;
      }

      if (isBuildingUnit) {
        // Floor & Unit can be updated for building units
        if (formData.floorNumber !== '') payload.floorNumber = Number(formData.floorNumber);
        if (formData.unitNumber) payload.unitNumber = formData.unitNumber.trim();
        // Address is preserved from building
        payload.address = property?.address;
      } else {
        // Standalone properties update address and location
        payload.address = formData.address;
        payload.yearBuilt = numYear;
        payload.location = {
          ...(property?.location || {}),
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          location_link: formData.location_link
        };
      }

      await onUpdate(property._id, payload);
      setUpdateSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Update property failed:', err);
      setUpdateError(err.message || 'Failed to update property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay edit-form-modal" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="edit-property-modal-title">
      <div className="modal-content edit-modal-container" onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="modal-header">
          <div className="modal-header-titles">
            <h2 id="edit-property-modal-title" className="modal-title">Edit Property Listing</h2>
            {property?.address && (
              <p className="modal-subtitle" title={property.address}>
                {property.address}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form className="edit-property-form" onSubmit={handleSubmit}>
          {/* Scrollable Form Body */}
          <div className="modal-body-scrollable">
            {/* Feedback Alerts */}
            {updateError && (
              <div className="modal-alert alert-error" role="alert">
                <AlertCircle size={18} className="alert-icon" />
                <div className="alert-text">
                  <strong>Update Failed:</strong> {updateError}
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="modal-alert alert-success" role="alert">
                <CheckCircle2 size={18} className="alert-icon" />
                <div className="alert-text">
                  <strong>Success!</strong> Property listing updated successfully.
                </div>
              </div>
            )}

            <div className="form-grid">
              {/* Inherited Building Information Card (Read-only single source of truth for building units) */}
              {isBuildingUnit && (
                <div className="edit-inherited-building-card">
                  <div className="edit-inherited-header">
                    <div className="edit-inherited-title">
                      <Building2 size={18} color="#2563EB" />
                      <span>{formData.buildingObj?.name || 'Building Complex Profile'}</span>
                    </div>
                    <span className="edit-inherited-badge">
                      <CheckCircle2 size={12} />
                      Inherited from Building Profile
                    </span>
                  </div>

                  <div className="edit-inherited-grid">
                    <div className="edit-inherited-item">
                      <span className="edit-inherited-label">Building Address:</span>
                      <span className="edit-inherited-val">{property.address || 'Inherited from Building'}</span>
                    </div>
                    <div className="edit-inherited-item">
                      <span className="edit-inherited-label">Construction Year:</span>
                      <span className="edit-inherited-val">{property.buildingId?.yearBuilt || property.yearBuilt || 'Standard'}</span>
                    </div>
                  </div>

                  <div className="edit-inherited-hint">
                    <Info size={14} />
                    <span>Address and building facilities are managed at the building level. Unit-specific values can be edited below.</span>
                  </div>
                </div>
              )}

              {/* Building Unit Floor & Unit Numbers */}
              {isBuildingUnit && (
                <>
                  <div className="form-group">
                    <label htmlFor="floorNumber">Floor Number *</label>
                    <input
                      type="number"
                      id="floorNumber"
                      name="floorNumber"
                      value={formData.floorNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. 5"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="unitNumber">Unit Number *</label>
                    <input
                      type="text"
                      id="unitNumber"
                      name="unitNumber"
                      value={formData.unitNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. Flat 5-B"
                      required
                    />
                  </div>
                </>
              )}

              {/* Standalone Address: Only editable when not linked to a building */}
              {!isBuildingUnit && (
                <div className="form-group full-width">
                  <label htmlFor="address">Street Address *</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g. House 24, Road 8A, Dhanmondi"
                    required
                  />
                </div>
              )}

              {/* Property Type */}
              <div className="form-group">
                <label htmlFor="propertyType">Property Type *</label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Property Type</option>
                  {PROPERTY_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Sale to Rental Conversion Notice Banner */}
              {property?.listingType === 'For Sale' && (
                <div style={{ gridColumn: '1 / -1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <Info size={17} color="#2563EB" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: '#1E40AF', fontSize: '0.8125rem' }}>Converting from Sale to Rental:</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#1E3A8A', lineHeight: 1.4 }}>
                        Property sales are currently paused. The historical sale price (৳{Number(property.pricing?.sale || property.price || 0).toLocaleString()}) is preserved. Please specify the new monthly rental price and security deposit.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Listing Type */}
              <div className="form-group">
                <label htmlFor="listingType">Listing Type *</label>
                <select
                  id="listingType"
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="For Rent">For Rent</option>
                  {isPropertySalesEnabled() ? (
                    <option value="For Sale">For Sale</option>
                  ) : (
                    <option value="For Sale" disabled>For Sale (Temporarily Disabled)</option>
                  )}
                </select>
              </div>

              {/* Price */}
              <div className="form-group">
                <label htmlFor="price">
                  {formData.listingType === 'For Sale' ? 'Sale Price (BDT) *' : 'Monthly Rent (BDT) *'}
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g. 45000"
                  min="1"
                  required
                />
              </div>

              {/* Security Deposit for Rental */}
              {formData.listingType === 'For Rent' && (
                <div className="form-group">
                  <label htmlFor="deposit">Security Deposit (BDT)</label>
                  <input
                    type="number"
                    id="deposit"
                    name="deposit"
                    value={formData.deposit}
                    onChange={handleInputChange}
                    placeholder="e.g. 90000"
                    min="0"
                  />
                  <small style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Configurable refundable deposit held during tenancy
                  </small>
                </div>
              )}

              {/* Status */}
              <div className="form-group">
                <label htmlFor="status">Listing Status *</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Square Footage */}
              <div className="form-group">
                <label htmlFor="squareFootage">{isLand ? 'Plot Area (sq ft) *' : 'Square Footage (sq ft) *'}</label>
                <input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  value={formData.squareFootage}
                  onChange={handleInputChange}
                  placeholder="e.g. 1850"
                  min="1"
                  required
                />
              </div>

              {/* Furnishing Status: Omitted for Land */}
              {!isLand && (
                <div className="form-group">
                  <label htmlFor="furnishing">Furnishing Status</label>
                  <select
                    id="furnishing"
                    name="furnishing"
                    value={formData.furnishing}
                    onChange={handleInputChange}
                  >
                    {FURNISHING_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bedrooms & Bathrooms: Shown only for Residential */}
              {isResidential && (
                <>
                  <div className="form-group">
                    <label htmlFor="bedrooms">Bedrooms *</label>
                    <input
                      type="number"
                      id="bedrooms"
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      placeholder="e.g. 3"
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bathrooms">Bathrooms *</label>
                    <input
                      type="number"
                      id="bathrooms"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      placeholder="e.g. 2"
                      min="0"
                      required
                    />
                  </div>
                </>
              )}

              {/* Allocated Parking Spots */}
              <div className="form-group">
                <label htmlFor="parkingSpots">Allocated Parking Spots</label>
                <input
                  type="number"
                  id="parkingSpots"
                  name="parkingSpots"
                  value={formData.parkingSpots}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
              </div>

              {/* Year Built for Standalone Properties */}
              {!isBuildingUnit && (
                <div className="form-group">
                  <label htmlFor="yearBuilt">Year Built</label>
                  <input
                    type="number"
                    id="yearBuilt"
                    name="yearBuilt"
                    value={formData.yearBuilt}
                    onChange={handleInputChange}
                    placeholder="e.g. 2022"
                    min="1800"
                    max={new Date().getFullYear() + 5}
                  />
                </div>
              )}

              {/* Balcony: De-duplicated toggle and conditional size */}
              {!isLand && (
                <div className="form-group full-width" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      name="hasBalcony"
                      checked={formData.hasBalcony}
                      onChange={handleInputChange}
                      style={{ accentColor: '#2563EB', width: '1rem', height: '1rem' }}
                    />
                    <span>Has Private Balcony</span>
                  </label>
                  {formData.hasBalcony && (
                    <div style={{ maxWidth: '15rem', marginTop: '0.25rem' }}>
                      <input
                        type="number"
                        name="balconySize"
                        value={formData.balconySize}
                        onChange={handleInputChange}
                        placeholder="Balcony Size (sq ft) *"
                        min="1"
                        required
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* In-Unit Appliances: Air Conditioning (de-duplicated) */}
              {!isLand && (
                <div className="form-group full-width" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      name="airConditioning"
                      checked={formData.airConditioning}
                      onChange={handleInputChange}
                      style={{ accentColor: '#2563EB' }}
                    />
                    <span>Air Conditioning</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      name="heating"
                      checked={formData.heating}
                      onChange={handleInputChange}
                      style={{ accentColor: '#2563EB' }}
                    />
                    <span>Heating System</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      name="petsAllowed"
                      checked={formData.petsAllowed}
                      onChange={handleInputChange}
                      style={{ accentColor: '#2563EB' }}
                    />
                    <span>Pets Allowed</span>
                  </label>
                </div>
              )}

              {/* Standalone Location Details (City, State, Zip) */}
              {!isBuildingUnit && (
                <>
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Dhaka"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="state">State / Division</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Dhaka Division"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="zipCode">Zip Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="e.g. 1205"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="location_link">OpenStreetMap Location Link</label>
                    <input
                      type="url"
                      id="location_link"
                      name="location_link"
                      value={formData.location_link}
                      onChange={handleInputChange}
                      placeholder="https://www.openstreetmap.org/..."
                    />
                  </div>
                </>
              )}

              {/* Contact Information */}
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email *</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="owner@dwellsync.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactPhone">Contact Phone *</label>
                <input
                  type="text"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="+880 1712 345678"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label htmlFor="description">Detailed Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                  placeholder="Provide updated information regarding property features, facilities, nearby landmarks, etc."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner size="small" color="#FFFFFF" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPropertyModal;
