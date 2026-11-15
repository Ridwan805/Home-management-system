import React, { useState, useEffect } from 'react';
import './EditPropertyModal.css';

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
  'Unavailable',
  'Reserved',
  'Rented',
  'Sold',
  'pending'
];

const EditPropertyModal = ({ property, onClose, onUpdate }) => {
  const getInitialFormData = (prop) => {
    if (!prop) return {};
    return {
      address: prop.address || '',
      propertyType: prop.propertyType || '',
      listingType: prop.listingType || 'For Rent',
      price: prop.pricing?.rent || prop.pricing?.sale || prop.price || '',
      status: prop.status || 'Available',
      bedrooms: prop.specifications?.bedrooms ?? prop.bedrooms ?? '',
      bathrooms: prop.specifications?.bathrooms ?? prop.bathrooms ?? '',
      squareFootage: prop.specifications?.squareFootage ?? prop.squareFootage ?? '',
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
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  // Handle background overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const numPrice = Number(formData.price);
      const numBedrooms = Number(formData.bedrooms);
      const numBathrooms = Number(formData.bathrooms);
      const numSqft = Number(formData.squareFootage);
      const numYear = formData.yearBuilt ? Number(formData.yearBuilt) : undefined;

      const payload = {
        ...formData,
        price: numPrice,
        bedrooms: numBedrooms,
        bathrooms: numBathrooms,
        squareFootage: numSqft,
        yearBuilt: numYear,
        pricing: {
          ...(property?.pricing || {}),
          rent: formData.listingType === 'For Rent' ? numPrice : (property?.pricing?.rent || 0),
          sale: formData.listingType === 'For Sale' ? numPrice : (property?.pricing?.sale || 0),
        },
        specifications: {
          ...(property?.specifications || {}),
          bedrooms: numBedrooms,
          bathrooms: numBathrooms,
          squareFootage: numSqft,
        },
        contactInfo: {
          ...(property?.contactInfo || {}),
          email: formData.contactEmail,
          phone: formData.contactPhone
        },
        location: {
          ...(property?.location || {}),
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          location_link: formData.location_link
        }
      };

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
            <h2 id="edit-property-modal-title" className="modal-title">Edit Property</h2>
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
            &times;
          </button>
        </div>

        {/* Form Container */}
        <form className="edit-property-form" onSubmit={handleSubmit}>
          {/* Scrollable Form Body */}
          <div className="modal-body-scrollable">
            {/* Feedback Alerts */}
            {updateError && (
              <div className="modal-alert alert-error" role="alert">
                <span className="alert-icon" aria-hidden="true">⚠️</span>
                <div className="alert-text">
                  <strong>Update Failed:</strong> {updateError}
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="modal-alert alert-success" role="alert">
                <span className="alert-icon" aria-hidden="true">✓</span>
                <div className="alert-text">
                  <strong>Success!</strong> Property updated successfully.
                </div>
              </div>
            )}

            <div className="form-grid">
              {/* Address (Full-width row) */}
              <div className="form-group full-width">
                <label htmlFor="address">Address *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Green Road, Dhanmondi"
                  required
                />
              </div>

              {/* Property Type (Col 1) */}
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
                  {formData.propertyType && !PROPERTY_TYPE_OPTIONS.some(o => o.value === formData.propertyType) && (
                    <option value={formData.propertyType}>{formData.propertyType}</option>
                  )}
                </select>
              </div>

              {/* Listing Type (Col 2) */}
              <div className="form-group">
                <label htmlFor="listingType">Listing Type *</label>
                <select
                  id="listingType"
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Listing Type</option>
                  <option value="For Rent">For Rent</option>
                  <option value="For Sale">For Sale</option>
                </select>
              </div>

              {/* Price (Col 1) */}
              <div className="form-group">
                <label htmlFor="price">
                  {formData.listingType === 'For Sale' ? 'Sale Price (৳) *' : 'Monthly Rent (৳) *'}
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g. 25000"
                  min="0"
                  required
                />
              </div>

              {/* Status (Col 2) */}
              <div className="form-group">
                <label htmlFor="status">Status *</label>
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

              {/* Bedrooms (Col 1) */}
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

              {/* Bathrooms (Col 2) */}
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

              {/* Square Footage (Col 1) */}
              <div className="form-group">
                <label htmlFor="squareFootage">Square Footage (sqft) *</label>
                <input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  value={formData.squareFootage}
                  onChange={handleInputChange}
                  placeholder="e.g. 1450"
                  min="1"
                  required
                />
              </div>

              {/* Year Built (Col 2) */}
              <div className="form-group">
                <label htmlFor="yearBuilt">Year Built</label>
                <input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={handleInputChange}
                  placeholder="e.g. 2022"
                  min="1900"
                  max={new Date().getFullYear() + 5}
                />
              </div>

              {/* City (Col 1) */}
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

              {/* State / Division (Col 2) */}
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

              {/* Zip Code (Col 1) */}
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

              {/* Contact Phone (Col 2) */}
              <div className="form-group">
                <label htmlFor="contactPhone">Contact Phone</label>
                <input
                  type="text"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="e.g. +880 1712 345678"
                />
              </div>

              {/* Contact Email (Full width) */}
              <div className="form-group full-width">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="e.g. owner@example.com"
                />
              </div>

              {/* OpenStreetMap Location Link (Full width) */}
              <div className="form-group full-width">
                <label htmlFor="location_link">OpenStreetMap Location Link</label>
                <input
                  type="url"
                  id="location_link"
                  name="location_link"
                  value={formData.location_link}
                  onChange={handleInputChange}
                  placeholder="https://www.openstreetmap.org/..."
                  title="Paste the OpenStreetMap URL for this property location"
                />
                <span className="helper-text">
                  Optional: Visit OpenStreetMap, locate the property, and paste the share link here.
                </span>
              </div>

              {/* Description (Full width) */}
              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Provide detailed information regarding property features, facilities, nearby landmarks, etc."
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
                  <span className="btn-spinner" aria-hidden="true"></span>
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
