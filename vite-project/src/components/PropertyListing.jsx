import React, { useState, useEffect } from 'react';
import PropertyCard from './PropertyCard';
import EditPropertyModal from './EditPropertyModal';
import './PropertyListing.css';

const PropertyListing = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);

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
        const response = await fetch('http://localhost:5000/api/properties/user', {
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

  // Handle edit button click
  const handleEditClick = (property) => {
    setEditingProperty(property);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingProperty(null);
  };

  // Handle update property
  const handleUpdateProperty = async (propertyId, formData) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      
      const user = JSON.parse(userData);
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }
      
      const updatedProperty = await response.json();
      
      // Update the properties list with the updated property
      setProperties(properties.map(prop => 
        prop._id === propertyId ? updatedProperty.property : prop
      ));
      
      return updatedProperty;
    } catch (err) {
      console.error('Error updating property:', err);
      throw err;
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
      const response = await fetch(`http://localhost:5000/api/properties/${propertyId}`, {
        method: 'PATCH',
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
        prop._id === propertyId ? updatedProperty.property : prop
      ));
    } catch (err) {
      console.error('Error updating property status:', err);
      setError(err.message);
    }
  };

  return (
    <div className="property-listing-container">
      <h1>Property Listings</h1>
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
            <PropertyCard 
              key={property._id} 
              property={property} 
              onEdit={handleEditClick}
              onStatusChange={handleStatusUpdate}
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
    </div>
  );
};

export default PropertyListing;