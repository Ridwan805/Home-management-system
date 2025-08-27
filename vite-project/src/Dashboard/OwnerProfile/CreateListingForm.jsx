import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import './CreateListingForm.css';

const initialState = {
  // Building relationship
  buildingId: '',
  isStandalone: true,
  
  // Property identification
  address: '',
  propertyType: '',
  floorNumber: '',
  unitNumber: '',
  
  // Specifications
  bedrooms: '',
  bathrooms: '',
  squareFootage: '',
  facing: '',
  furnishing: 'Unfurnished',
  
  // Pricing
  price: '',
  deposit: '',
  utilitiesIncluded: false,
  
  // Property details
  description: '',
  amenities: [],
  images: [],
  yearBuilt: '',
  
  // Contact info
  contactEmail: '',
  contactPhone: '',
  
  // Additional fields
  threeDModelUrl: '',
  listingType: '',
  
  // Location (for standalone properties)
  city: '',
  state: '',
  zipCode: '',
  
  // Appliances
  airConditioning: false,
  heating: false,
  refrigerator: false,
  washingMachine: false,
  dishwasher: false,
  microwave: false,
  oven: false,
  
  // Additional features
  hasBalcony: false,
  balconySize: '',
  parkingSpots: '0',
  hasStorage: false,
  storageSize: '',
  
  // Policies
  petsAllowed: false,
  smokingAllowed: false,
  maxOccupants: '',
};

const PROPERTY_TYPES = [
  'apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 
  'studio', 'duplex', 'penthouse', 'retail', 'office', 'land', 'other'
];

const PROPERTY_TYPE_LABELS = {
  'apartment_unit': 'Apartment Unit',
  'floor': 'Entire Floor',
  'house': 'House',
  'condo': 'Condo',
  'townhouse': 'Townhouse',
  'villa': 'Villa',
  'studio': 'Studio',
  'duplex': 'Duplex',
  'penthouse': 'Penthouse',
  'retail': 'Retail Space',
  'office': 'Office Space',
  'land': 'Land',
  'other': 'Other'
};

const AMENITIES = [
  'Parking', 'Gym', 'Swimming Pool', 'Garden', 'Balcony', 'Security', 'Elevator', 'Playground', 'Pet Friendly', 'Furnished', 'Air Conditioning', 'Laundry Room', 'Fireplace', 'Wheelchair Accessible', 'WiFi'
];

const FACING_DIRECTIONS = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest'];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

export default function CreateListingForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ ...initialState, amenities: [] });
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [showCreateBuilding, setShowCreateBuilding] = useState(false);
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    yearBuilt: '',
    totalFloors: '',
    description: ''
  });

  // Fetch available buildings
  useEffect(() => {
    const fetchBuildings = async () => {
      setLoadingBuildings(true);
      try {
        const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
        const response = await fetch(API.getUrl('/api/buildings'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setBuildings(data.buildings || []);
        }
      } catch (err) {
        console.error('Error fetching buildings:', err);
      } finally {
        setLoadingBuildings(false);
      }
    };

    fetchBuildings();
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'amenities') {
        setForm(prev => ({
          ...prev,
          amenities: checked
            ? [...prev.amenities, value]
            : prev.amenities.filter(a => a !== value)
        }));
      } else {
        setForm(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setForm(prev => {
        const newForm = { ...prev, [name]: value };
        
        // Handle building selection logic
        if (name === 'isStandalone') {
          if (value === 'true') {
            newForm.buildingId = '';
            newForm.floorNumber = '';
            newForm.unitNumber = '';
            setShowCreateBuilding(false);
          } else {
            newForm.address = '';
          }
        }
        
        // Clear building-specific fields when switching to standalone
        if (name === 'buildingId' && value === '') {
          newForm.floorNumber = '';
          newForm.unitNumber = '';
        }
        
        return newForm;
      });
    }
  };

  const handleNewBuildingChange = e => {
    const { name, value } = e.target;
    setNewBuilding(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateBuilding = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) throw new Error('No authentication token found');
      
      const buildingData = {
        name: newBuilding.name,
        address: {
          street: newBuilding.street,
          city: newBuilding.city,
          state: newBuilding.state,
          zipCode: newBuilding.zipCode,
          country: 'Bangladesh'
        },
        yearBuilt: newBuilding.yearBuilt ? parseInt(newBuilding.yearBuilt) : undefined,
        totalFloors: newBuilding.totalFloors ? parseInt(newBuilding.totalFloors) : undefined,
        description: newBuilding.description
      };
      
      const res = await fetch(API.getUrl('/api/buildings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(buildingData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create building');
      
      // Add new building to the list and select it
      setBuildings(prev => [...prev, data.building]);
      setForm(prev => ({ ...prev, buildingId: data.building._id }));
      
      // Reset form and hide create building section
      setNewBuilding({
        name: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        yearBuilt: '',
        totalFloors: '',
        description: ''
      });
      setShowCreateBuilding(false);
      
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileChange = e => {
    setImageFiles([...e.target.files]);
  };

  const handleAmenityChange = e => {
    const { value, checked } = e.target;
    setForm(f => {
      const amenities = new Set(f.amenities);
      if (checked) amenities.add(value);
      else amenities.delete(value);
      return { ...f, amenities: Array.from(amenities) };
    });
  };

  const validateForm = () => {
    const errors = [];
    
    // Basic required fields
    if (!form.propertyType) errors.push('Property type is required');
    if (!form.listingType) errors.push('Listing type is required');
    if (!form.price || form.price <= 0) errors.push('Valid price is required');
    if (!form.squareFootage || form.squareFootage <= 0) errors.push('Valid square footage is required');
    if (!form.description.trim()) errors.push('Description is required');
    
    // Address validation based on property location
    if (form.isStandalone === 'true') {
      if (!form.address.trim()) errors.push('Address is required for standalone properties');
      if (!form.city.trim()) errors.push('City is required');
      if (!form.state.trim()) errors.push('State is required');
      if (!form.zipCode.trim()) errors.push('Zip code is required');
    } else if (form.isStandalone === 'false') {
      if (!form.buildingId && !showCreateBuilding) {
        errors.push('Please select a building or create a new one');
      }
    }
    
    // Residential property validation
    const residentialTypes = ['apartment_unit', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'];
    if (residentialTypes.includes(form.propertyType)) {
      if (!form.bedrooms || form.bedrooms < 0) errors.push('Valid number of bedrooms is required');
      if (!form.bathrooms || form.bathrooms < 0) errors.push('Valid number of bathrooms is required');
    }
    
    // Contact information validation
    if (!form.contactEmail.trim()) errors.push('Contact email is required');
    if (!form.contactPhone.trim()) errors.push('Contact phone is required');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.contactEmail && !emailRegex.test(form.contactEmail)) {
      errors.push('Please enter a valid email address');
    }
    
    // Phone format validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (form.contactPhone && !phoneRegex.test(form.contactPhone)) {
      errors.push('Please enter a valid phone number');
    }
    
    // Conditional field validation
    if (form.hasBalcony && (!form.balconySize || form.balconySize <= 0)) {
      errors.push('Balcony size is required when balcony is selected');
    }
    
    if (form.hasStorage && (!form.storageSize || form.storageSize <= 0)) {
      errors.push('Storage size is required when storage is selected');
    }
    
    if (form.parkingSpots && form.parkingSpots < 0) {
      errors.push('Parking spots cannot be negative');
    }
    
    if (form.maxOccupants && form.maxOccupants < 1) {
      errors.push('Maximum occupants must be at least 1');
    }
    
    if (form.yearBuilt && (form.yearBuilt < 1800 || form.yearBuilt > new Date().getFullYear())) {
      errors.push('Please enter a valid year built');
    }
    
    return errors;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setLoading(false);
      return;
    }
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) throw new Error('No authentication token found');
      
      const formData = new FormData();
      
      // Basic property information
      formData.append('propertyType', form.propertyType);
      formData.append('listingType', form.listingType);
      formData.append('description', form.description);
      
      // Building relationship
      if (form.isStandalone === 'false' && form.buildingId) {
        formData.append('buildingId', form.buildingId);
        if (form.floorNumber) formData.append('floorNumber', form.floorNumber);
        if (form.unitNumber) formData.append('unitNumber', form.unitNumber);
      } else {
        formData.append('address', form.address);
      }
      
      // Specifications object
      const specifications = {
        squareFootage: parseInt(form.squareFootage),
        furnishing: form.furnishing
      };
      
      // Add bedrooms/bathrooms for residential properties
      const residentialTypes = ['apartment_unit', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'];
      if (residentialTypes.includes(form.propertyType)) {
        specifications.bedrooms = parseInt(form.bedrooms);
        specifications.bathrooms = parseInt(form.bathrooms);
      }
      
      if (form.facing) specifications.facing = form.facing;
      
      // Balcony information
      if (form.hasBalcony) {
        specifications.balcony = {
          hasBalcony: true,
          balconySize: form.balconySize ? parseInt(form.balconySize) : undefined
        };
      }
      
      // Appliances
      specifications.appliances = {
        airConditioning: form.airConditioning,
        heating: form.heating,
        refrigerator: form.refrigerator,
        washingMachine: form.washingMachine,
        dishwasher: form.dishwasher,
        microwave: form.microwave,
        oven: form.oven
      };
      
      // Parking and storage
      specifications.parkingSpots = parseInt(form.parkingSpots) || 0;
      if (form.hasStorage) {
        specifications.storage = {
          hasStorage: true,
          storageSize: form.storageSize ? parseInt(form.storageSize) : undefined
        };
      }
      
      formData.append('specifications', JSON.stringify(specifications));
      
      // Pricing object
      const pricing = {
        deposit: form.deposit ? parseFloat(form.deposit) : 0,
        utilities: {
          included: form.utilitiesIncluded
        }
      };
      
      if (form.listingType === 'For Rent') {
        pricing.rent = parseFloat(form.price);
      } else {
        pricing.sale = parseFloat(form.price);
      }
      
      formData.append('pricing', JSON.stringify(pricing));
      
      // Location (for standalone properties)
      if (form.isStandalone === 'true') {
        const location = {
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: 'Bangladesh'
        };
        formData.append('location', JSON.stringify(location));
      }
      
      // Contact information
      const contactInfo = {
        email: form.contactEmail,
        phone: form.contactPhone,
        preferredContactMethod: 'both'
      };
      formData.append('contactInfo', JSON.stringify(contactInfo));
      
      // Constraints (policies)
      const constraints = {
        petPolicy: {
          allowed: form.petsAllowed
        },
        smokingPolicy: {
          allowed: form.smokingAllowed
        }
      };
      
      if (form.maxOccupants) {
        constraints.occupancyLimit = {
          maxOccupants: parseInt(form.maxOccupants)
        };
      }
      
      formData.append('constraints', JSON.stringify(constraints));
      
      // Other fields
      if (form.yearBuilt) formData.append('yearBuilt', form.yearBuilt);
      if (form.threeDModelUrl) formData.append('threeDModelUrl', form.threeDModelUrl);
      
      // Amenities
      formData.append('amenities', JSON.stringify(form.amenities));
      
      // Images
      imageFiles.forEach(file => formData.append('images', file));
      
      // Legacy fields for backward compatibility
      formData.append('price', form.price);
      formData.append('bedrooms', form.bedrooms || '0');
      formData.append('bathrooms', form.bathrooms || '0');
      formData.append('squareFootage', form.squareFootage);
      formData.append('contactEmail', form.contactEmail);
      formData.append('contactPhone', form.contactPhone);
      formData.append('city', form.city);
      formData.append('state', form.state);
      formData.append('zipCode', form.zipCode);
      
      const res = await fetch(API.getUrl(API.endpoints.properties), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create property');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-listing-form" onSubmit={handleSubmit}>
      <h2>Create New Property Listing</h2>
        {error && <div className="form-error">{error}</div>}
        
        <div className="form-row">
          <label>Property Type*</label>
          <select name="propertyType" value={form.propertyType} onChange={handleChange} required>
            <option value="">Select Property Type</option>
            {PROPERTY_TYPES.map(type => (
              <option key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>
 
        <div className="form-row">
          <label>Property Location</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="isStandalone"
                value="true"
                checked={form.isStandalone === 'true'}
                onChange={handleChange}
              />
              Standalone Property (Individual Address)
            </label>
            <label>
              <input
                type="radio"
                name="isStandalone"
                value="false"
                checked={form.isStandalone === 'false'}
                onChange={handleChange}
              />
              Part of Building/Complex
            </label>
          </div>
        </div>
        
        {form.isStandalone === 'true' && (
          <div className="form-row">
            <label>Address*</label>
            <input name="address" value={form.address} onChange={handleChange} required />
          </div>
        )}

      {form.isStandalone === 'false' && (
          <>
            <div className="form-row">
              <label>Select Building</label>
              <select
                name="buildingId"
                value={form.buildingId}
                onChange={handleChange}
                required={form.isStandalone === 'false' && !showCreateBuilding}
              >
                <option value="">Select Building</option>
                {buildings.map(building => (
                  <option key={building._id} value={building._id}>
                    {building.name} - {building.address.street}, {building.address.city}
                  </option>
                ))}
              </select>
              {loadingBuildings && <small>Loading buildings...</small>}
            </div>
            
            <div className="form-row">
              <button
                type="button"
                onClick={() => setShowCreateBuilding(!showCreateBuilding)}
                className="btn-secondary"
              >
                {showCreateBuilding ? 'Cancel' : 'Create New Building'}
              </button>
            </div>
            
            {showCreateBuilding && (
              <div className="create-building-section">
                <h4>Create New Building</h4>
                <div className="form-row">
                  <label>Building Name*</label>
                  <input
                    name="name"
                    value={newBuilding.name}
                    onChange={handleNewBuildingChange}
                    required
                    placeholder="e.g., Sunrise Apartments"
                  />
                </div>
                <div className="form-row">
                  <label>Street Address*</label>
                  <input
                    name="street"
                    value={newBuilding.street}
                    onChange={handleNewBuildingChange}
                    required
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
                <div className="form-row">
                  <label>City*</label>
                  <input
                    name="city"
                    value={newBuilding.city}
                    onChange={handleNewBuildingChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>State*</label>
                  <input
                    name="state"
                    value={newBuilding.state}
                    onChange={handleNewBuildingChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Zip Code*</label>
                  <input
                    name="zipCode"
                    value={newBuilding.zipCode}
                    onChange={handleNewBuildingChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Year Built</label>
                  <input
                    name="yearBuilt"
                    type="number"
                    value={newBuilding.yearBuilt}
                    onChange={handleNewBuildingChange}
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="form-row">
                  <label>Total Floors</label>
                  <input
                    name="totalFloors"
                    type="number"
                    value={newBuilding.totalFloors}
                    onChange={handleNewBuildingChange}
                    min="1"
                  />
                </div>
                <div className="form-row">
                  <label>Building Description</label>
                  <textarea
                    name="description"
                    value={newBuilding.description}
                    onChange={handleNewBuildingChange}
                    rows="3"
                    placeholder="Brief description of the building..."
                  />
                </div>
                <div className="form-row">
                  <button
                    type="button"
                    onClick={handleCreateBuilding}
                    className="btn-primary"
                    disabled={!newBuilding.name || !newBuilding.street || !newBuilding.city || !newBuilding.state || !newBuilding.zipCode}
                  >
                    Create Building
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      {form.isStandalone === 'false' && form.buildingId && (
        <>
          <div className="form-row">
            <label>Floor Number</label>
            <input
              type="number"
              name="floorNumber"
              value={form.floorNumber}
              onChange={handleChange}
              min="0"
              placeholder="e.g., 5"
            />
          </div>
          <div className="form-row">
            <label>Unit Number</label>
            <input
              type="text"
              name="unitNumber"
              value={form.unitNumber}
              onChange={handleChange}
              placeholder="e.g., 5A, 501, etc."
            />
          </div>
        </>
      )}
      <div className="form-row">
        <label>Bedrooms*</label>
        <input name="bedrooms" type="number" value={form.bedrooms} onChange={handleChange} required />
      </div>
      <div className="form-row">
        <label>Bathrooms*</label>
        <input name="bathrooms" type="number" value={form.bathrooms} onChange={handleChange} required />
      </div>
      <div className="form-row">
        <label>Square Footage*</label>
        <input name="squareFootage" type="number" value={form.squareFootage} onChange={handleChange} required />
      </div>

      <div className="form-row">
        <label>Facing Direction</label>
        <select name="facing" value={form.facing} onChange={handleChange}>
          <option value="">Select Direction</option>
          {FACING_DIRECTIONS.map(direction => (
            <option key={direction} value={direction}>{direction}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>Furnishing</label>
        <select name="furnishing" value={form.furnishing} onChange={handleChange}>
          {FURNISHING_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Price*</label>
        <input name="price" type="number" value={form.price} onChange={handleChange} required />
      </div>

      <div className="form-row">
        <label>Deposit</label>
        <input name="deposit" type="number" value={form.deposit} onChange={handleChange} placeholder="Security deposit amount" />
      </div>

      <div className="form-row">
        <label>
          <input
            type="checkbox"
            name="utilitiesIncluded"
            checked={form.utilitiesIncluded}
            onChange={handleChange}
          />
          Utilities Included
        </label>
      </div>
      <div className="form-row">
        <label>Description*</label>
        <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Describe the property, highlights, nearby facilities, etc." />
      </div>
      <div className="form-row">
        <label>Amenities</label>
        <ul className="amenities-list" style={{listStyle: 'none', padding: 0, margin: 0}}>
          {AMENITIES.map(amenity => (
            <li key={amenity} style={{marginBottom: '0.5rem'}}>
              <label>
                <input
                  type="checkbox"
                  value={amenity}
                  checked={form.amenities.includes(amenity)}
                  onChange={handleAmenityChange}
                  style={{marginRight: '0.5rem'}}
                />
                {amenity}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="form-row">
        <label>Images (upload one or more)</label>
        <input name="images" type="file" multiple accept="image/*" onChange={handleFileChange} />
      </div>
      <div className="form-row">
        <label>Year Built</label>
        <input name="yearBuilt" type="number" value={form.yearBuilt} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Contact Email</label>
        <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Contact Phone</label>
        <input name="contactPhone" value={form.contactPhone} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>3D Model URL</label>
        <input name="threeDModelUrl" value={form.threeDModelUrl} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Listing Type*</label>
        <select name="listingType" value={form.listingType} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="For Sale">For Sale</option>
          <option value="For Rent">For Rent</option>
        </select>
      </div>
      <div className="form-row">
        <label>City</label>
        <input name="city" value={form.city} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>State</label>
        <input name="state" value={form.state} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Zip Code</label>
        <input name="zipCode" value={form.zipCode} onChange={handleChange} />
      </div>

      <h3>Appliances</h3>
      <div className="form-row checkbox-group">
        <label>
          <input type="checkbox" name="airConditioning" checked={form.airConditioning} onChange={handleChange} />
          Air Conditioning
        </label>
        <label>
          <input type="checkbox" name="heating" checked={form.heating} onChange={handleChange} />
          Heating
        </label>
        <label>
          <input type="checkbox" name="refrigerator" checked={form.refrigerator} onChange={handleChange} />
          Refrigerator
        </label>
        <label>
          <input type="checkbox" name="washingMachine" checked={form.washingMachine} onChange={handleChange} />
          Washing Machine
        </label>
        <label>
          <input type="checkbox" name="dishwasher" checked={form.dishwasher} onChange={handleChange} />
          Dishwasher
        </label>
        <label>
          <input type="checkbox" name="microwave" checked={form.microwave} onChange={handleChange} />
          Microwave
        </label>
        <label>
          <input type="checkbox" name="oven" checked={form.oven} onChange={handleChange} />
          Oven
        </label>
      </div>

      <h3>Additional Features</h3>
      <div className="form-row">
        <label>
          <input type="checkbox" name="hasBalcony" checked={form.hasBalcony} onChange={handleChange} />
          Has Balcony
        </label>
      </div>
      {form.hasBalcony && (
        <div className="form-row">
          <label>Balcony Size (sq ft)</label>
          <input name="balconySize" type="number" value={form.balconySize} onChange={handleChange} />
        </div>
      )}

      <div className="form-row">
        <label>Parking Spots</label>
        <input name="parkingSpots" type="number" value={form.parkingSpots} onChange={handleChange} min="0" />
      </div>

      <div className="form-row">
        <label>
          <input type="checkbox" name="hasStorage" checked={form.hasStorage} onChange={handleChange} />
          Has Storage
        </label>
      </div>
      {form.hasStorage && (
        <div className="form-row">
          <label>Storage Size (sq ft)</label>
          <input name="storageSize" type="number" value={form.storageSize} onChange={handleChange} />
        </div>
      )}

      <h3>Policies</h3>
      <div className="form-row">
        <label>
          <input type="checkbox" name="petsAllowed" checked={form.petsAllowed} onChange={handleChange} />
          Pets Allowed
        </label>
      </div>
      <div className="form-row">
        <label>
          <input type="checkbox" name="smokingAllowed" checked={form.smokingAllowed} onChange={handleChange} />
          Smoking Allowed
        </label>
      </div>
      <div className="form-row">
        <label>Maximum Occupants</label>
        <input name="maxOccupants" type="number" value={form.maxOccupants} onChange={handleChange} min="1" />
      </div>
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Listing'}</button>
        <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
      </div>
      
      <style jsx>{`
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .radio-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .create-building-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 16px 0;
          border: 1px solid #e9ecef;
        }
        
        .create-building-section h4 {
          margin: 0 0 16px 0;
          color: #495057;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:hover {
          background: #0056b3;
        }
        
        .btn-primary:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .form-error {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          border: 1px solid #f5c6cb;
        }
      `}</style>
    </form>
  );
}