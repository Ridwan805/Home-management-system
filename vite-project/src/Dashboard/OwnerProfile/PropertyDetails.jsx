import React, { useState, useEffect } from 'react';
import './PropertyDetails.css';

const PropertyDetails = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(null);

  const statusOptions = ['Available', 'Not Available', 'Sold', 'Rented'];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }
<<<<<<< HEAD:vite-project/src/Dashboard/PropertyDetails.jsx
        
        const user = JSON.parse(userData);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/properties/user`, {
=======

        const response = await fetch('http://localhost:5000/api/properties/user', {
          method: 'GET',
>>>>>>> main:vite-project/src/Dashboard/OwnerProfile/PropertyDetails.jsx
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProperties(data.properties || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.status-action')) {
        setShowStatusDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedProperty(null);
  };

  const handleEditClick = (property) => {
    setEditingProperty(property);
    setFormData({
      address: property.address || '',
      propertyType: property.propertyType || '',
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      squareFootage: property.squareFootage || '',
      price: property.price || '',
      listingType: property.listingType || '',
      status: property.status || '',
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zipCode || '',
      description: property.description || '',
      yearBuilt: property.yearBuilt || '',
      contactEmail: property.contactEmail || '',
      contactPhone: property.contactPhone || '',
      amenities: property.amenities || []
    });
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
    setFormData({});
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, newImages: files }));
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'newImages' && formData[key]) {
          formData[key].forEach(file => {
            formDataToSend.append('images', file);
          });
        } else if (key === 'amenities') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== undefined && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

<<<<<<< HEAD:vite-project/src/Dashboard/PropertyDetails.jsx
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/properties/${editingProperty}`, {
=======
      const response = await fetch(`http://localhost:5000/api/properties/${editingProperty._id}`, {
>>>>>>> main:vite-project/src/Dashboard/OwnerProfile/PropertyDetails.jsx
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }

      const updatedProperty = await response.json();
      setProperties(prev => prev.map(prop => 
        prop._id === editingProperty._id ? updatedProperty.property : prop
      ));
      
      setUpdateSuccess(true);
      setTimeout(() => {
        handleCancelEdit();
      }, 2000);
      
    } catch (err) {
      console.error('Error updating property:', err);
      setUpdateError(err.message);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
<<<<<<< HEAD:vite-project/src/Dashboard/PropertyDetails.jsx
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/properties/${propertyId}`, {
=======
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`, {
>>>>>>> main:vite-project/src/Dashboard/OwnerProfile/PropertyDetails.jsx
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      setProperties(prev => prev.filter(prop => prop._id !== propertyId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting property:', err);
      setError(err.message);
    }
  };

  const handleStatusUpdate = async (propertyId, newStatus) => {
    try {
<<<<<<< HEAD:vite-project/src/Dashboard/PropertyDetails.jsx
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/properties/${propertyId}/status`, {
        method: 'PUT',
=======
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}/status`, {
        method: 'PATCH',
>>>>>>> main:vite-project/src/Dashboard/OwnerProfile/PropertyDetails.jsx
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedProperty = await response.json();
      setProperties(prev => prev.map(prop => 
        prop._id === propertyId ? { ...prop, status: newStatus } : prop
      ));
      
      setShowStatusDropdown(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  return (
    <div className="property-details-container">
      <h1>Property Details</h1>
      <p className="subtitle">View and manage your property listings</p>

      {loading && <div className="loading-state">Loading properties...</div>}

      {error && <div className="error-state">Error: {error}</div>}

      {!loading && !error && properties.length === 0 && (
        <div className="no-properties">
          <p>You haven't listed any properties yet.</p>
          <button className="add-property-btn" onClick={() => window.location.href = '/dashboard/create-listing'}>
            Add Your First Property
          </button>
        </div>
      )}
      
      {!loading && !error && properties.length > 0 && (
        <div className="properties-grid">
          {properties.map(property => (
            <div key={property._id} className="property-card">
              <div className="property-image">
                {property.images && property.images.length > 0 ? (
                  <img src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}${property.images[0]}`} alt="Property" />
                ) : (
                  <div className="property-placeholder">No Image Available</div>
                )}
                <span className={`status-badge ${property.status?.toLowerCase().replace(/ /g, '-')}`}>
                  {property.status}
                </span>
              </div>
              
              <div className="property-info">
                <h3>৳{property.price?.toLocaleString()}</h3>
                <p className="property-address">{property.address}</p>
                <p className="property-location">{property.city}, {property.state} {property.zipCode}</p>
                
                <div className="property-specs">
                  <span>🛏️ {property.bedrooms} bd</span>
                  <span>🚿 {property.bathrooms} ba</span>
                  <span>📏 {property.squareFootage} sqft</span>
                </div>
                
                <div className="property-type-info">
                  <span className="property-type">{property.propertyType}</span>
                  <span className="listing-type">{property.listingType}</span>
                </div>
                
                {property.description && (
                  <p className="property-description">{property.description}</p>
                )}
                
                <div className="property-actions">
                  <button className="view-details-btn" onClick={() => handleViewDetails(property)}>View Details</button>
                  <button className="edit-btn" onClick={() => handleEditClick(property)} disabled={property.status === 'pending'}>Edit</button>
                  
                  <div className="status-action">
                    <button
                      className={`status-btn status-dropdown-btn ${property.status?.toLowerCase().replace(/ /g, '-')}`}
                      onClick={() => property.status === 'pending' ? null : setShowStatusDropdown(showStatusDropdown === property._id ? null : property._id)}
                      disabled={property.status === 'pending'}
                    >
                      Status: {property.status} <span style={{marginLeft: 6, fontSize: 12}}>▼</span>
                    </button>
                    {showStatusDropdown === property._id && property.status !== 'pending' && (
                      <ul className="status-dropdown-menu">
                        {statusOptions.map(option => (
                          <li key={option}>
                            <button
                              className="status-dropdown-option"
                              onClick={() => {
                                handleStatusUpdate(property._id, option);
                                setShowStatusDropdown(null);
                              }}
                            >
                              {option}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {deleteConfirm === property._id ? (
                    <div className="delete-confirm">
                      <p>Are you sure?</p>
                      <div className="confirm-actions">
                        <button 
                          className="confirm-yes" 
                          onClick={() => handleDeleteProperty(property._id)}
                        >
                          Yes
                        </button>
                        <button 
                          className="confirm-no" 
                          onClick={() => setDeleteConfirm(null)}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="delete-btn" 
                      onClick={() => setDeleteConfirm(property._id)} 
                      disabled={property.status === 'pending'}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      {showDetailsModal && selectedProperty && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseDetailsModal}>&times;</button>
            <h2>{selectedProperty.address}</h2>
            
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="modal-image-gallery">
                {selectedProperty.images.map((image, index) => (
                  <img key={index} src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}${image}`} alt={`Property ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="modal-details-grid">
              <div className="modal-detail-item"><strong>Price:</strong> <span>৳{selectedProperty.price?.toLocaleString()}</span></div>
              <div className="modal-detail-item"><strong>Type:</strong> <span>{selectedProperty.propertyType}</span></div>
              <div className="modal-detail-item"><strong>Bedrooms:</strong> <span>{selectedProperty.bedrooms}</span></div>
              <div className="modal-detail-item"><strong>Bathrooms:</strong> <span>{selectedProperty.bathrooms}</span></div>
              <div className="modal-detail-item"><strong>Square Footage:</strong> <span>{selectedProperty.squareFootage} sqft</span></div>
              <div className="modal-detail-item"><strong>Listing Type:</strong> <span>{selectedProperty.listingType}</span></div>
              <div className="modal-detail-item"><strong>Status:</strong> <span>{selectedProperty.status}</span></div>
              {selectedProperty.yearBuilt && <div className="modal-detail-item"><strong>Year Built:</strong> <span>{selectedProperty.yearBuilt}</span></div>}
              {selectedProperty.city && <div className="modal-detail-item"><strong>Location:</strong> <span>{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}</span></div>}
              {selectedProperty.contactEmail && <div className="modal-detail-item"><strong>Contact Email:</strong> <span>{selectedProperty.contactEmail}</span></div>}
              {selectedProperty.contactPhone && <div className="modal-detail-item"><strong>Contact Phone:</strong> <span>{selectedProperty.contactPhone}</span></div>}
            </div>

            {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
              <div className="modal-amenities">
                <h3>Amenities:</h3>
                <div className="modal-amenities-list">
                  {selectedProperty.amenities.map((amenity, index) => (
                    <span key={index} className="modal-amenity-item">{amenity}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedProperty.description && (
              <div className="modal-description">
                <h3>Description:</h3>
                <p className="modal-description-full">{selectedProperty.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="modal-overlay edit-form-modal" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCancelEdit}>&times;</button>
            <h2>Edit Property</h2>
            {updateError && <div className="error-state">Error: {updateError}</div>}
            {updateSuccess && <div className="loading-state">Property updated successfully!</div>}
            
            <form onSubmit={handleUpdateSubmit}>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="propertyType">Property Type</label>
                <input
                  type="text"
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bedrooms">Bedrooms</label>
                <input
                  type="number"
                  id="bedrooms"
                  name="bedrooms"
                  value={formData.bedrooms || ''}
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
                  value={formData.bathrooms || ''}
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
                  value={formData.squareFootage || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="price">Price</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="listingType">Listing Type</label>
                <select
                  id="listingType"
                  name="listingType"
                  value={formData.listingType || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="For Sale">For Sale</option>
                  <option value="For Rent">For Rent</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleInputChange}
                  required
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="zipCode">Zip Code</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="description">Description*</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows="4"
                  required
                  placeholder="Describe the property, highlights, nearby facilities, etc."
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="yearBuilt">Year Built</label>
                <input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  value={formData.yearBuilt || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="contactPhone">Contact Phone</label>
                <input
                  type="text"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group file-input-group">
                <label htmlFor="newImages">Add New Images</label>
                <input
                  type="file"
                  id="newImages"
                  name="newImages"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                />
<<<<<<< HEAD:vite-project/src/Dashboard/PropertyDetails.jsx
                {formData.images && formData.images.length > 0 && (
                  <div className="current-images">
                    {formData.images.map((image, index) => (
                      <div key={index} className="current-image-item">
                        <img src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}${image}`} alt={`Current ${index + 1}`} />
                        <button 
                          type="button" 
                          className="remove-image-btn" 
                          onClick={() => handleRemoveImage(index)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
=======
>>>>>>> main:vite-project/src/Dashboard/OwnerProfile/PropertyDetails.jsx
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">Update Property</button>
                <button type="button" className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;