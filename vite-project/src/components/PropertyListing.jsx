import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PropertyListing.css';
import PropertyCard from './PropertyCard';
import EditPropertyModal from './EditPropertyModal';
import API from '../config/api';

// Using API configuration from config/api.js

const PropertyListing = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
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
        
        // Fetch user's properties
        const user = JSON.parse(userData);
        const headers = {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        };
        
        const response = await fetch(API.baseUrl + API.endpoints.userProperties, { headers });
        
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
    setEditingProperty(property);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingProperty(null);
  };

  // Handle update property
  const handleUpdateProperty = async (propertyId, updatedData) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(API.baseUrl + API.endpoints.propertyById(propertyId), {
        method: 'PATCH', // Using PATCH to match backend endpoint
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) {
        // Handle non-JSON responses (like HTML error pages)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to update property');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const updatedProperty = await response.json();
      
      // Update the properties list with the updated property
      setProperties(properties.map(prop => 
        prop._id === propertyId ? updatedProperty : prop
      ));
      
      console.log('Property updated successfully:', updatedProperty);
      
      // Close the edit modal
      setEditingProperty(null);
    } catch (err) {
      console.error('Error updating property:', err);
      throw err;
    }
  };
  
  // Handle delete property
  const handleDeleteProperty = async (propertyId) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`${API_BASE}/${propertyId}`, {
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
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(API.baseUrl + API.endpoints.propertyStatus(propertyId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property status');
      }
      
      const updatedProperty = await response.json();
      
      // Update the properties list with the updated property
      setProperties(properties.map(prop => 
        prop._id === propertyId ? {
          ...prop,
          status: newStatus
        } : prop
      ));

      console.log('Status updated successfully to:', newStatus);
    } catch (err) {
      console.error('Error updating property status:', err);
      setError(err.message);
    }
  };

  const isUserView = true; // Always in user view mode since we removed filter page

  return (
    <div className="property-listing-container">
      <div className="property-listing-header">
        <h1>Property Listings</h1>
        <p className="subtitle">View and manage your property listings</p>
        <button className="add-property-btn" onClick={() => window.location.href = '/create-listing'}>
          Add New Property
        </button>
      </div>
      
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
            <PropertyCard 
              key={property._id} 
              property={property} 
              onEdit={isUserView ? handleEditClick : null}
              onStatusChange={isUserView ? handleStatusUpdate : null}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteProperty}
            />
          ))}
        </div>
      )}
      
      {/* Edit Property Modal */}
      {editingProperty && (
        <EditPropertyModal 
          property={editingProperty} 
          onClose={handleCancelEdit} 
          onUpdate={handleUpdateProperty}
        />
      )}
      
      {/* Property Details Modal */}
      {showDetailsModal && selectedProperty && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content property-details-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseDetailsModal}>&times;</button>
            <h2>{selectedProperty.address}</h2>
            
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="modal-image-gallery">
                {selectedProperty.images.map((image, index) => (
                  <img key={index} src={`http://localhost:5001${image}`} alt={`Property ${index + 1}`} />
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
    
    </div>
  );
};

export default PropertyListing;