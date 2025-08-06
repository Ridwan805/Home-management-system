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

  // Status options for properties
  const statusOptions = ['Available', 'Not Available', 'Sold', 'Rented'];

  // Fetch user properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) {
          // Redirect to login page if user is not logged in
          window.location.href = '/login'; 
          return;
        }
        
        const user = JSON.parse(userData);
        const response = await fetch('http://localhost:5000/api/Properties/user', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch properties');
        }
        
        const data = await response.json();
        setProperties(data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);

  // Handle view details button click
  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  // Handle close details modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedProperty(null);
  };

  // Handle edit button click
  const handleEditClick = (property) => {
    setEditingProperty(property._id);
    setFormData({
      address: property.address,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFootage: property.squareFootage,
      price: property.price,
      description: property.description || '',
      status: property.status,
      yearBuilt: property.yearBuilt || '',
      contactEmail: property.contactEmail || '',
      contactPhone: property.contactPhone || '',
      listingType: property.listingType,
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zipCode || '',
      images: property.images || [] // Include existing images
    });
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingProperty(null);
    setFormData({});
    setUpdateSuccess(false);
    setUpdateError(null);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    setFormData(prev => ({
      ...prev,
      newImages: e.target.files
    }));
  };

  // Handle removing an existing image
  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Handle form submission for updating property
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdateError(null);
      setUpdateSuccess(false);
      
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userData);
      const data = new FormData();
      for (const key in formData) {
        if (key === 'newImages') {
          for (let i = 0; i < formData.newImages.length; i++) {
            data.append('images', formData.newImages[i]);
          }
        } else if (key === 'images') {
          // Append existing image URLs separately if your backend expects them
          // Or handle them as part of the main JSON data if not re-uploading
          formData.images.forEach(img => data.append('existingImages', img));
        } else {
          data.append(key, formData[key]);
        }
      }

      const response = await fetch(`http://localhost:5000/api/Properties/${editingProperty}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }
      
      const updatedProperty = await response.json();
      
      // Update the properties list with the updated property
      setProperties(properties.map(prop => 
        prop._id === editingProperty ? updatedProperty.property : prop
      ));
      
      setUpdateSuccess(true);
      setTimeout(() => {
        setEditingProperty(null);
        setUpdateSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error updating property:', err);
      setUpdateError(err.message);
    }
  };

  // Handle delete property
  const handleDeleteProperty = async (propertyId) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`http://localhost:5000/api/Properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete property');
      }
      
      // Remove the deleted property from the list
      setProperties(properties.filter(prop => prop._id !== propertyId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting property:', err);
      setError(err.message);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (propertyId, newStatus) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`http://localhost:5000/api/Properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const updatedProperty = await response.json();
      setProperties(properties.map(prop => 
        prop._id === propertyId ? updatedProperty.property : prop
      ));
      setShowStatusDropdown(null); // Close dropdown after update
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
          <button className="add-property-btn" onClick={() => window.location.href = '/create-listing'}>
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
                  <img src={`http://localhost:5000${property.images[0]}`} alt="Property" />
                ) : (
                  <div className="property-placeholder">No Image Available</div>
                )}
                <span className={`status-badge ${property.status?.toLowerCase().replace(/ /g, '-')}`}>
                  {property.status}
                </span>
              </div>
              
              <div className="property-info">
                <h3>${property.price?.toLocaleString()}</h3>
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
                  <button className="edit-btn" onClick={() => handleEditClick(property)}>Edit</button>
                <div className="status-action" style={{ position: "relative" }}>
                  <button
                    className={`status-btn status-dropdown-btn ${property.status?.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() =>
                      setShowStatusDropdown(showStatusDropdown === property._id ? null : property._id)
                    }
                    style={{ fontWeight: 500 }}
                  >
                    Status: {property.status} <span style={{marginLeft: 6, fontSize: 12}}>▼</span>
                  </button>
                  {showStatusDropdown === property._id && (
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseDetailsModal}>&times;</button>
            <h2>{selectedProperty.address}</h2>
            
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="modal-image-gallery">
                {selectedProperty.images.map((image, index) => (
                  <img key={index} src={`http://localhost:5000${image}`} alt={`Property ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="modal-details-grid">
              <div className="modal-detail-item"><strong>Price:</strong> <span>${selectedProperty.price?.toLocaleString()}</span></div>
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows="4"
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
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                {formData.images && formData.images.length > 0 && (
                  <div className="current-images">
                    {formData.images.map((image, index) => (
                      <div key={index} className="current-image-item">
                        <img src={`http://localhost:5000${image}`} alt={`Current ${index + 1}`} />
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
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn">Save Changes</button>
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