import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import LocationPickerMap from '../../components/LocationPickerMap';
import LocationViewerMap from '../../components/LocationViewerMap';
import './PropertyDetails.css';
import { CircularSpinner } from '../../components/loading';
import EditPropertyModal from '../../components/EditPropertyModal';
import { Bed, Bath, Maximize, ArrowRightLeft, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const getAuthToken = () => {
  try {
    const userData = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
    return userData?.token || localStorage.getItem('token') || null;
  } catch (e) {
    return localStorage.getItem('token') || null;
  }
};

const PropertyDetails = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({});
  const [editLocation, setEditLocation] = useState({ latitude: null, longitude: null });
  const [isEditLocationConfirmed, setIsEditLocationConfirmed] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(null);

  // Safe Property Conversion State
  const [convertModalProperty, setConvertModalProperty] = useState(null);
  const [convertRent, setConvertRent] = useState('');
  const [convertDeposit, setConvertDeposit] = useState('');
  const [convertStatus, setConvertStatus] = useState('Available');
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [convertSuccess, setConvertSuccess] = useState('');

  const statusOptions = ['Available', 'Not Available', 'Sold', 'Rented'];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(API.getUrl(API.endpoints.userProperties), {
          method: 'GET',
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

  const handleOpenConvert = (prop) => {
    setConvertModalProperty(prop);
    setConvertRent('');
    setConvertDeposit('');
    setConvertStatus('Available');
    setConvertError('');
    setConvertSuccess('');
  };

  const handleCloseConvert = () => {
    setConvertModalProperty(null);
    setConvertRent('');
    setConvertDeposit('');
    setConvertError('');
    setConvertSuccess('');
  };

  const handleExecuteConversion = async (e) => {
    e.preventDefault();
    if (!convertModalProperty) return;

    const rentNum = Number(convertRent);
    if (!rentNum || isNaN(rentNum) || rentNum <= 0) {
      setConvertError('Please enter a valid monthly rent greater than ৳0');
      return;
    }

    const salePrice = Number(convertModalProperty.pricing?.sale || convertModalProperty.price || 0);
    if (salePrice > 0 && rentNum === salePrice) {
      setConvertError(`Previous sale price (৳${salePrice.toLocaleString()}) cannot be used as monthly rent.`);
      return;
    }

    setConvertSubmitting(true);
    setConvertError('');
    setConvertSuccess('');

    try {
      const token = getAuthToken();
      const res = await fetch(API.getUrl(`/api/properties/${convertModalProperty._id}/convert-to-rental`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthlyRent: rentNum,
          securityDeposit: Number(convertDeposit) || 0,
          status: convertStatus
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Conversion failed');
      }

      setConvertSuccess(data.message || 'Property successfully converted to rental!');
      setProperties(prev => prev.map(p => 
        p._id === convertModalProperty._id ? {
          ...p,
          ...data.property,
          listingType: 'For Rent',
          price: rentNum,
          pricing: { ...(p.pricing || {}), rent: rentNum, deposit: Number(convertDeposit) || 0 }
        } : p
      ));

      setTimeout(() => {
        handleCloseConvert();
      }, 1500);
    } catch (err) {
      console.error('Error converting property:', err);
      setConvertError(err.message || 'Failed to convert property');
    } finally {
      setConvertSubmitting(false);
    }
  };

  const handleEditClick = (property) => {
    setEditingProperty(property);
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
  };

  const handleUpdateProperty = async (propertyId, updatedData) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('User not authenticated');

      const response = await fetch(API.getUrl(API.endpoints.propertyById(propertyId)), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }

      const updated = await response.json();
      setProperties(prev => prev.map(prop => 
        prop._id === propertyId ? (updated.property || updated) : prop
      ));
    } catch (err) {
      console.error('Error updating property:', err);
      throw err;
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(API.getUrl(API.endpoints.propertyById(propertyId)), {
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
      const token = getAuthToken();
      const response = await fetch(API.getUrl(API.endpoints.propertyStatus(propertyId)), {
        method: 'PATCH',
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

      {loading && <CircularSpinner message="Loading properties..." minHeight="240px" />}

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
                {(property.images?.length > 0 || property.media?.images?.length > 0) ? (
                  <img src={API.getImageUrl(property.images?.[0] || property.media?.images?.[0]?.url)} alt="Property" />
                ) : (
                  <div className="property-placeholder">No Image Available</div>
                )}
                <span className={`status-badge ${(property.effectiveAvailability || property.status || 'available').toLowerCase().replace(/\s+/g, '-')}`}>
                  {property.effectiveAvailability || property.status}
                </span>
              </div>
              
              <div className="property-info">
                <h3>
                  ৳{property.price?.toLocaleString()}
                  {property.listingType === 'For Rent' && <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}> / mo</span>}
                </h3>
                <p className="property-address">{property.address}</p>
                <p className="property-location">{property.city}, {property.state} {property.zipCode}</p>
                
                <div className="property-specs">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Bed size={14} color="#64748B" /> {property.bedrooms} bd
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Bath size={14} color="#64748B" /> {property.bathrooms} ba
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Maximize size={14} color="#64748B" /> {property.squareFootage} sqft
                  </span>
                </div>
                
                <div className="property-type-info">
                  <span className="property-type">{property.propertyType}</span>
                  <span className={`listing-type ${property.listingType === 'For Sale' ? 'sale' : 'rent'}`} style={{
                    background: property.listingType === 'For Sale' ? '#FEF3C7' : '#EFF6FF',
                    color: property.listingType === 'For Sale' ? '#B45309' : '#1D4ED8',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {property.listingType}
                  </span>
                </div>
                
                {property.description && (
                  <p className="property-description">{property.description}</p>
                )}
                
                <div className="property-actions">
                  <button className="view-details-btn" onClick={() => handleViewDetails(property)}>View Details</button>
                  <button className="edit-btn" onClick={() => handleEditClick(property)} disabled={property.status === 'pending'}>Edit</button>

                  {property.listingType === 'For Sale' && (
                    <button
                      type="button"
                      className="convert-btn"
                      onClick={() => handleOpenConvert(property)}
                      title="Convert this listing safely to For Rent"
                      style={{
                        background: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      <span>Convert to Rental</span>
                    </button>
                  )}
                  
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
                  <img key={index} src={API.getImageUrl(image)} alt={`Property ${index + 1}`} />
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

            {/* Property Location Map */}
            <div className="modal-map-section">
              <LocationViewerMap
                location={selectedProperty.location}
                address={selectedProperty.address}
                title="Property Location"
              />
            </div>
          </div>
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

      {/* Safe Property Conversion Modal */}
      {convertModalProperty && (
        <div className="modal-overlay" onClick={handleCloseConvert} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '32rem', padding: '1.5rem', borderRadius: '0.75rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={18} color="#2563EB" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Convert to For Rent</h2>
              </div>
              <button type="button" onClick={handleCloseConvert} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748B' }}>&times;</button>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1.25rem' }}>
              <strong style={{ display: 'block', fontSize: '0.8125rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
                {convertModalProperty.address || 'Property Listing'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#1E3A8A', lineHeight: 1.4 }}>
                Current Listing: <strong>For Sale</strong> (৳{Number(convertModalProperty.pricing?.sale || convertModalProperty.price || 0).toLocaleString()}).
                Converting safely transitions this listing to <strong>For Rent</strong> while permanently preserving historical sale records and verified payments.
              </p>
            </div>

            {convertError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: '#DC2626', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{convertError}</span>
              </div>
            )}

            {convertSuccess && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: '#059669', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} />
                <span>{convertSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteConversion}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.375rem' }}>
                  Monthly Rent (BDT) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="number"
                  value={convertRent}
                  onChange={e => setConvertRent(e.target.value)}
                  placeholder="e.g. 35000"
                  min="1"
                  required
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <small style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Must be the actual monthly rental price, not the previous sale price.
                </small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.375rem' }}>
                  Security Deposit (BDT)
                </label>
                <input
                  type="number"
                  value={convertDeposit}
                  onChange={e => setConvertDeposit(e.target.value)}
                  placeholder="e.g. 70000"
                  min="0"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <small style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Refundable advance security deposit held during tenancy.
                </small>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.375rem' }}>
                  Initial Rental Status
                </label>
                <select
                  value={convertStatus}
                  onChange={e => setConvertStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                >
                  <option value="Available">Available for Rent</option>
                  <option value="Processing">Processing (Under Review)</option>
                  <option value="Rented">Rented</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCloseConvert}
                  disabled={convertSubmitting}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #CBD5E1', borderRadius: '0.375rem', background: '#F8FAFC', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertSubmitting}
                  style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.375rem', background: '#2563EB', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {convertSubmitting ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;