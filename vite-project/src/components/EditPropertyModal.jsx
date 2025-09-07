import React, { useState } from 'react';
import './EditPropertyModal.css';

const EditPropertyModal = ({ property, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    address: property.address || '',
    propertyType: property.propertyType || '',
    bedrooms: property.specifications?.bedrooms || property.bedrooms || '',
    bathrooms: property.specifications?.bathrooms || property.bathrooms || '',
    squareFootage: property.specifications?.squareFootage || property.squareFootage || '',
    price: property.pricing?.rent || property.pricing?.sale || property.price || '',
    description: property.description || '',
    status: property.status || 'Available',
    yearBuilt: property.yearBuilt || '',
    contactEmail: property.contactInfo?.email || property.contactEmail || '',
    contactPhone: property.contactInfo?.phone || property.contactPhone || '',
    listingType: property.listingType || '',
    city: property.location?.city || property.city || '',
    state: property.location?.state || property.state || '',
    zipCode: property.location?.zipCode || property.zipCode || '',
    location_link: property.location?.location_link || '',
    images: property.images || []
  });
  
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(property._id, formData);
      setUpdateSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setUpdateError(err.message);
    }
  };

  return (
    <div className="modal-overlay edit-form-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        <h2>Edit Property</h2>
        {updateError && <div className="error-state">Error: {updateError}</div>}
        {updateSuccess && <div className="success-state">Property updated successfully!</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="propertyType">Property Type</label>
              <input
                type="text"
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="listingType">Listing Type</label>
              <select
                id="listingType"
                name="listingType"
                value={formData.listingType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Listing Type</option>
                <option value="For Sale">For Sale</option>
                <option value="For Rent">For Rent</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="squareFootage">Square Footage</label>
              <input
                type="number"
                id="squareFootage"
                name="squareFootage"
                value={formData.squareFootage}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="yearBuilt">Year Built</label>
              <input
                type="number"
                id="yearBuilt"
                name="yearBuilt"
                value={formData.yearBuilt}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
                <option value="Reserved">Reserved</option>
                <option value="Rented">Rented</option>
                <option value="Sold">Sold</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
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
              />
            </div>
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
              title="Paste the OpenStreetMap URL for this property location"
            />
            <small style={{color: '#666', fontSize: '0.9em', marginTop: '4px', display: 'block'}}>
              Optional: Visit OpenStreetMap, find your property location, and paste the URL here
            </small>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="contactPhone">Contact Phone</label>
              <input
                type="text"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
            ></textarea>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn">Update Property</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPropertyModal;