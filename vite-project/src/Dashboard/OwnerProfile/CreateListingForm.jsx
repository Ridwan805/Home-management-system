import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import LocationPickerMap from '../../components/LocationPickerMap';
import { ButtonSpinner } from '../../components/loading';
import './CreateListingForm.css';

const initialState = {
  // Building relationship
  buildingId: null,
  
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
  location_link: '',
  
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
  'Parking', 'Gym', 'Swimming Pool', 'Garden', 'Balcony', 'Security', 'Elevator', 
  'Playground', 'Pet Friendly', 'Furnished', 'Air Conditioning', 'Laundry Room', 
  'Fireplace', 'Wheelchair Accessible', 'WiFi'
];

const APPLIANCES_LIST = [
  { key: 'airConditioning', label: 'Air Conditioning' },
  { key: 'heating', label: 'Heating System' },
  { key: 'refrigerator', label: 'Refrigerator' },
  { key: 'washingMachine', label: 'Washing Machine' },
  { key: 'dishwasher', label: 'Dishwasher' },
  { key: 'microwave', label: 'Microwave' },
  { key: 'oven', label: 'Oven' }
];

const FACING_DIRECTIONS = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest', 'Southeast', 'Southwest'];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

export default function CreateListingForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ 
    ...initialState, 
    amenities: []
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Property map location state
  const [locationCoordinates, setLocationCoordinates] = useState({ latitude: null, longitude: null });
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  
  // Property location state (standalone vs building)
  const [propertyLocation, setPropertyLocation] = useState('standalone'); // 'standalone' or 'building'
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [showCreateBuilding, setShowCreateBuilding] = useState(false);
  const [ownerBuildings, setOwnerBuildings] = useState([]);
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    yearBuilt: '',
    totalFloors: '',
    description: ''
  });
  
  // Fetch owner's buildings on component mount and clear any errors
  useEffect(() => {
    fetchOwnerBuildings();
    setError('');
  }, []);
  
  const fetchOwnerBuildings = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      const response = await fetch(API.getUrl(API.endpoints.ownerBuildings), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOwnerBuildings(data.buildings || data || []);
      } else {
        console.error('Failed to fetch owner buildings:', response.status);
        setOwnerBuildings([]);
      }
    } catch (err) {
      console.error('Error fetching owner buildings:', err);
      setOwnerBuildings([]);
    }
  };
  
  const handlePropertyLocationChange = (e) => {
    const value = e.target.value;
    setPropertyLocation(value);
    setError('');
    if (value === 'standalone') {
      setForm(prev => ({ ...prev, buildingId: null }));
      setSelectedBuilding('');
      setShowCreateBuilding(false);
    } else {
      setForm(prev => ({ ...prev, buildingId: null }));
    }
  };
  
  const handleBuildingSelection = (e) => {
    const value = e.target.value;
    setSelectedBuilding(value);
    setError('');
    
    if (value === 'create_new') {
      setShowCreateBuilding(true);
      setForm(prev => ({ ...prev, buildingId: null }));
    } else if (value) {
      setShowCreateBuilding(false);
      setForm(prev => ({ ...prev, buildingId: value }));
    } else {
      setShowCreateBuilding(false);
      setForm(prev => ({ ...prev, buildingId: null }));
    }
  };
  
  const handleBuildingFormChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setBuildingForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBuildingForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setError('');
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
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = e => {
    setImageFiles([...e.target.files]);
  };

  const handleAmenityChange = (amenity) => {
    setForm(f => {
      const amenities = new Set(f.amenities);
      if (amenities.has(amenity)) {
        amenities.delete(amenity);
      } else {
        amenities.add(amenity);
      }
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
    
    // Address validation
    if (!form.address.trim()) errors.push('Street address is required');
    if (!form.city.trim()) errors.push('City is required');
    if (!form.state.trim()) errors.push('State is required');
    if (!form.zipCode.trim()) errors.push('Zip code is required');

    // Map Location validation
    if (!locationCoordinates?.latitude || !locationCoordinates?.longitude) {
      errors.push('Please pinpoint a property location on the map');
    } else if (!isLocationConfirmed) {
      errors.push('Please click "Confirm Location" on the map to confirm your coordinates');
    }
    
    // Floor and unit validation for buildings
    if (propertyLocation === 'building') {
      if (!form.floorNumber || form.floorNumber < 0) {
        errors.push('Floor number is required for building properties');
      }
      if (!form.unitNumber || !form.unitNumber.trim()) {
        errors.push('Unit number is required for building properties');
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
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.contactEmail && !emailRegex.test(form.contactEmail)) {
      errors.push('Please enter a valid email address');
    }
    
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
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (propertyLocation === 'building' && !selectedBuilding && !showCreateBuilding) {
      setError('Please select a building or choose to create a new one.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (showCreateBuilding) {
      if (!buildingForm.name.trim() || !buildingForm.address.street.trim() || 
          !buildingForm.address.city.trim() || !buildingForm.address.state.trim()) {
        setError('Please fill in all required building information.');
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) throw new Error('No authentication token found');
      
      let buildingId = null;
      if (propertyLocation === 'building' && selectedBuilding && selectedBuilding !== 'create_new') {
        buildingId = selectedBuilding;
      }
      
      if (showCreateBuilding) {
        const newBuildingData = {
          ...buildingForm,
          address: {
            ...buildingForm.address,
            fullAddress: `${buildingForm.address.street}, ${buildingForm.address.city}, ${buildingForm.address.state} ${buildingForm.address.zipCode}`.trim()
          },
          status: 'Active',
          approvalStatus: 'Pending'
        };
        
        const buildingResponse = await fetch(API.getUrl(API.endpoints.buildings), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newBuildingData)
        });
        
        if (!buildingResponse.ok) {
          const buildingError = await buildingResponse.json();
          throw new Error(buildingError.message || 'Failed to create building');
        }
        
        const createdBuilding = await buildingResponse.json();
        buildingId = createdBuilding._id;
      }
      
      const formData = new FormData();
      formData.append('propertyType', form.propertyType);
      formData.append('listingType', form.listingType);
      formData.append('description', form.description);
      
      if (buildingId) {
        formData.append('buildingId', buildingId);
        if (form.floorNumber) formData.append('floorNumber', form.floorNumber);
        if (form.unitNumber) formData.append('unitNumber', form.unitNumber);
      }
      
      formData.append('address', form.address ? form.address.trim() : '');
      
      const specifications = {
        squareFootage: parseInt(form.squareFootage),
        furnishing: form.furnishing
      };
      
      const residentialTypes = ['apartment_unit', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'];
      if (residentialTypes.includes(form.propertyType)) {
        specifications.bedrooms = parseInt(form.bedrooms);
        specifications.bathrooms = parseInt(form.bathrooms);
      }
      
      if (form.facing) specifications.facing = form.facing;
      
      if (form.hasBalcony) {
        specifications.balcony = {
          hasBalcony: true,
          balconySize: form.balconySize ? parseInt(form.balconySize) : undefined
        };
      }
      
      specifications.appliances = {
        airConditioning: form.airConditioning,
        heating: form.heating,
        refrigerator: form.refrigerator,
        washingMachine: form.washingMachine,
        dishwasher: form.dishwasher,
        microwave: form.microwave,
        oven: form.oven
      };
      
      specifications.parkingSpots = parseInt(form.parkingSpots) || 0;
      if (form.hasStorage) {
        specifications.storage = {
          hasStorage: true,
          storageSize: form.storageSize ? parseInt(form.storageSize) : undefined
        };
      }
      
      formData.append('specifications', JSON.stringify(specifications));
      
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
      
      const location = {
        latitude: locationCoordinates.latitude,
        longitude: locationCoordinates.longitude,
        coordinates: {
          latitude: locationCoordinates.latitude,
          longitude: locationCoordinates.longitude
        },
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        country: 'Bangladesh'
      };
      formData.append('location', JSON.stringify(location));
      
      if (form.location_link) {
        formData.append('location_link', form.location_link);
      }
      
      const contactInfo = {
        email: form.contactEmail,
        phone: form.contactPhone,
        preferredContactMethod: 'both'
      };
      formData.append('contactInfo', JSON.stringify(contactInfo));
      
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
      
      if (form.yearBuilt) formData.append('yearBuilt', form.yearBuilt);
      if (form.threeDModelUrl) formData.append('threeDModelUrl', form.threeDModelUrl);
      
      formData.append('amenities', JSON.stringify(form.amenities));
      imageFiles.forEach(file => formData.append('images', file));
      
      formData.append('price', form.price);
      formData.append('bedrooms', form.bedrooms || '0');
      formData.append('bathrooms', form.bathrooms || '0');
      formData.append('squareFootage', form.squareFootage);
      formData.append('contactEmail', form.contactEmail);
      formData.append('contactPhone', form.contactPhone);
      formData.append('zipCode', form.zipCode);
      
      const res = await fetch(API.getUrl(API.endpoints.properties), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = data.message || 'Failed to create property';
        if (errorMessage.includes('duplicate key') || errorMessage.includes('E11000')) {
          if (errorMessage.includes('unitNumber') || errorMessage.includes('buildingId_1_unitNumber_1')) {
            errorMessage = 'A property with this unit number already exists in the selected building. Please choose a different unit number.';
          } else {
            errorMessage = 'This property information already exists. Please check your input and try again.';
          }
        }
        throw new Error(errorMessage);
      }
      onSuccess();
    } catch (err) {
      let displayError = err.message;
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        displayError = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('JSON')) {
        displayError = 'Server response error. Please try again.';
      }
      setError(displayError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clf-container">
      {/* Header */}
      <div className="clf-header">
        <h1 className="clf-header-title">Create New Property Listing</h1>
        <p className="clf-header-subtitle">
          Fill in the details below to list your property. Fields are organized logically for quick completion.
        </p>
      </div>

      {error && (
        <div className="clf-error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: Category & Pricing */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">🏷️</div>
            <div>
              <h2 className="clf-card-title">Category & Pricing</h2>
              <p className="clf-card-desc">Define the transaction type, property category, and financial terms.</p>
            </div>
          </div>

          <div className="clf-grid-2">
            <div className="clf-field">
              <label className="clf-label">
                Listing Type <span className="clf-required">*</span>
              </label>
              <select 
                className="clf-select" 
                name="listingType" 
                value={form.listingType} 
                onChange={handleChange} 
                required
              >
                <option value="">Select Listing Type</option>
                <option value="For Rent">For Rent</option>
                <option value="For Sale">For Sale</option>
              </select>
            </div>

            <div className="clf-field">
              <label className="clf-label">
                Property Type <span className="clf-required">*</span>
              </label>
              <select 
                className="clf-select" 
                name="propertyType" 
                value={form.propertyType} 
                onChange={handleChange} 
                required
              >
                <option value="">Select Property Type</option>
                {PROPERTY_TYPES.map(type => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="clf-grid-3" style={{ marginTop: '1.25rem' }}>
            <div className="clf-field">
              <label className="clf-label">
                {form.listingType === 'For Sale' ? 'Sale Price (৳)' : 'Monthly Rent (৳)'} <span className="clf-required">*</span>
              </label>
              <div className="clf-input-prefix-wrapper">
                <span className="clf-input-prefix">৳</span>
                <input 
                  className="clf-input" 
                  name="price" 
                  type="number" 
                  value={form.price} 
                  onChange={handleChange} 
                  placeholder="e.g. 45000" 
                  required 
                  min="0"
                />
              </div>
            </div>

            <div className="clf-field">
              <label className="clf-label">Security Deposit (৳)</label>
              <div className="clf-input-prefix-wrapper">
                <span className="clf-input-prefix">৳</span>
                <input 
                  className="clf-input" 
                  name="deposit" 
                  type="number" 
                  value={form.deposit} 
                  onChange={handleChange} 
                  placeholder="Optional deposit" 
                  min="0"
                />
              </div>
            </div>

            <div className="clf-field" style={{ justifyContent: 'flex-end' }}>
              <label className={`clf-toggle-card ${form.utilitiesIncluded ? 'active' : ''}`} style={{ height: '42px', boxSizing: 'border-box' }}>
                <input
                  type="checkbox"
                  name="utilitiesIncluded"
                  checked={form.utilitiesIncluded}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">Utilities Included in Rent</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: Space Specifications */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">📐</div>
            <div>
              <h2 className="clf-card-title">Property Dimensions & Features</h2>
              <p className="clf-card-desc">Bedrooms, bathrooms, square footage, and facing orientation.</p>
            </div>
          </div>

          <div className="clf-grid-4">
            <div className="clf-field">
              <label className="clf-label">
                Bedrooms <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="bedrooms" 
                type="number" 
                value={form.bedrooms} 
                onChange={handleChange} 
                placeholder="e.g. 3" 
                min="0"
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">
                Bathrooms <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="bathrooms" 
                type="number" 
                value={form.bathrooms} 
                onChange={handleChange} 
                placeholder="e.g. 3" 
                min="0"
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">
                Square Footage (sq ft) <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="squareFootage" 
                type="number" 
                value={form.squareFootage} 
                onChange={handleChange} 
                placeholder="e.g. 1850" 
                min="1"
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">Furnishing Status</label>
              <select className="clf-select" name="furnishing" value={form.furnishing} onChange={handleChange}>
                {FURNISHING_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="clf-grid-4" style={{ marginTop: '1.25rem' }}>
            <div className="clf-field">
              <label className="clf-label">Facing Orientation</label>
              <select className="clf-select" name="facing" value={form.facing} onChange={handleChange}>
                <option value="">Select Facing Direction</option>
                {FACING_DIRECTIONS.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            </div>

            <div className="clf-field">
              <label className="clf-label">Year Built</label>
              <input 
                className="clf-input" 
                name="yearBuilt" 
                type="number" 
                value={form.yearBuilt} 
                onChange={handleChange} 
                placeholder="e.g. 2021" 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">Parking Spots</label>
              <input 
                className="clf-input" 
                name="parkingSpots" 
                type="number" 
                value={form.parkingSpots} 
                onChange={handleChange} 
                min="0" 
                placeholder="0"
              />
            </div>

            <div className="clf-field" style={{ justifyContent: 'flex-end' }}>
              <label className={`clf-toggle-card ${form.hasBalcony ? 'active' : ''}`} style={{ height: '42px', boxSizing: 'border-box' }}>
                <input
                  type="checkbox"
                  name="hasBalcony"
                  checked={form.hasBalcony}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">Has Balcony</span>
              </label>
            </div>
          </div>

          {/* Conditional Balcony and Storage sizes */}
          <div className="clf-grid-2" style={{ marginTop: (form.hasBalcony || form.hasStorage) ? '1.25rem' : '0' }}>
            {form.hasBalcony && (
              <div className="clf-field">
                <label className="clf-label">
                  Balcony Size (sq ft) <span className="clf-required">*</span>
                </label>
                <input 
                  className="clf-input" 
                  name="balconySize" 
                  type="number" 
                  value={form.balconySize} 
                  onChange={handleChange} 
                  placeholder="e.g. 75" 
                  min="1"
                  required
                />
              </div>
            )}

            <div className="clf-field">
              <label className={`clf-toggle-card ${form.hasStorage ? 'active' : ''}`} style={{ marginTop: form.hasBalcony ? '1.5rem' : '0' }}>
                <input
                  type="checkbox"
                  name="hasStorage"
                  checked={form.hasStorage}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">Dedicated Storage Space</span>
              </label>
              {form.hasStorage && (
                <div style={{ marginTop: '0.5rem' }}>
                  <input 
                    className="clf-input" 
                    name="storageSize" 
                    type="number" 
                    value={form.storageSize} 
                    onChange={handleChange} 
                    placeholder="Storage Size (sq ft)" 
                    min="1"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Location, Address & Map (Everything Location-Related Together!) */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">📍</div>
            <div>
              <h2 className="clf-card-title">Location, Address & Map Pin</h2>
              <p className="clf-card-desc">
                Everything for location in one place: street address, city details, and interactive map pinpointing.
              </p>
            </div>
          </div>

          {/* Standalone vs Building Switch */}
          <div className="clf-radio-tabs">
            <label className={`clf-radio-tab ${propertyLocation === 'standalone' ? 'active' : ''}`}>
              <input
                type="radio"
                name="propertyLocation"
                value="standalone"
                checked={propertyLocation === 'standalone'}
                onChange={handlePropertyLocationChange}
              />
              🏡 Standalone Property (Individual House / Villa / Land)
            </label>
            <label className={`clf-radio-tab ${propertyLocation === 'building' ? 'active' : ''}`}>
              <input
                type="radio"
                name="propertyLocation"
                value="building"
                checked={propertyLocation === 'building'}
                onChange={handlePropertyLocationChange}
              />
              🏢 Part of Building / Complex (Apartment / Floor)
            </label>
          </div>

          {/* Building Selection if building */}
          {propertyLocation === 'building' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="clf-grid-3">
                <div className="clf-field">
                  <label className="clf-label">
                    Select Building <span className="clf-required">*</span>
                  </label>
                  <select 
                    className="clf-select" 
                    value={selectedBuilding} 
                    onChange={handleBuildingSelection} 
                    required
                  >
                    <option value="">Select Existing Building</option>
                    {ownerBuildings && ownerBuildings.length > 0 ? (
                      ownerBuildings.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.name} - {b.address?.fullAddress || b.address?.street}
                        </option>
                      ))
                    ) : (
                      <option disabled>No saved buildings found</option>
                    )}
                    <option value="create_new">+ Create New Building</option>
                  </select>
                </div>

                <div className="clf-field">
                  <label className="clf-label">
                    Floor Number <span className="clf-required">*</span>
                  </label>
                  <input
                    className="clf-input"
                    type="number"
                    name="floorNumber"
                    value={form.floorNumber}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g. 5"
                    required
                  />
                </div>

                <div className="clf-field">
                  <label className="clf-label">
                    Unit Number <span className="clf-required">*</span>
                  </label>
                  <input
                    className="clf-input"
                    type="text"
                    name="unitNumber"
                    value={form.unitNumber}
                    onChange={handleChange}
                    placeholder="e.g. Flat 5-B"
                    required
                  />
                </div>
              </div>

              {/* Inline Building Creator */}
              {showCreateBuilding && (
                <div className="clf-inline-building-box" style={{ marginTop: '1.25rem' }}>
                  <h4 className="clf-inline-building-title">🏢 Create New Building Profile</h4>
                  <div className="clf-grid-2">
                    <div className="clf-field">
                      <label className="clf-label">Building Name <span className="clf-required">*</span></label>
                      <input
                        className="clf-input"
                        type="text"
                        name="name"
                        value={buildingForm.name}
                        onChange={handleBuildingFormChange}
                        placeholder="e.g. Green Valley Residence"
                        required
                      />
                    </div>
                    <div className="clf-field">
                      <label className="clf-label">Street Address <span className="clf-required">*</span></label>
                      <input
                        className="clf-input"
                        type="text"
                        name="address.street"
                        value={buildingForm.address.street}
                        onChange={handleBuildingFormChange}
                        placeholder="e.g. Road 12, Sector 4, Uttara"
                        required
                      />
                    </div>
                  </div>
                  <div className="clf-grid-3" style={{ marginTop: '0.75rem' }}>
                    <div className="clf-field">
                      <label className="clf-label">City <span className="clf-required">*</span></label>
                      <input
                        className="clf-input"
                        type="text"
                        name="address.city"
                        value={buildingForm.address.city}
                        onChange={handleBuildingFormChange}
                        placeholder="Dhaka"
                        required
                      />
                    </div>
                    <div className="clf-field">
                      <label className="clf-label">State <span className="clf-required">*</span></label>
                      <input
                        className="clf-input"
                        type="text"
                        name="address.state"
                        value={buildingForm.address.state}
                        onChange={handleBuildingFormChange}
                        placeholder="Dhaka Division"
                        required
                      />
                    </div>
                    <div className="clf-field">
                      <label className="clf-label">Zip Code <span className="clf-required">*</span></label>
                      <input
                        className="clf-input"
                        type="text"
                        name="address.zipCode"
                        value={buildingForm.address.zipCode}
                        onChange={handleBuildingFormChange}
                        placeholder="1230"
                        required
                      />
                    </div>
                  </div>
                  <div className="clf-grid-2" style={{ marginTop: '0.75rem' }}>
                    <div className="clf-field">
                      <label className="clf-label">Total Floors</label>
                      <input
                        className="clf-input"
                        type="number"
                        name="totalFloors"
                        value={buildingForm.totalFloors}
                        onChange={handleBuildingFormChange}
                        min="1"
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div className="clf-field">
                      <label className="clf-label">Year Built</label>
                      <input
                        className="clf-input"
                        type="number"
                        name="yearBuilt"
                        value={buildingForm.yearBuilt}
                        onChange={handleBuildingFormChange}
                        placeholder="e.g. 2020"
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="clf-btn clf-btn-secondary"
                      onClick={() => {
                        setShowCreateBuilding(false);
                        setSelectedBuilding('');
                      }}
                    >
                      Cancel New Building
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address Fields Together */}
          <div className="clf-field" style={{ marginBottom: '1rem' }}>
            <label className="clf-label">
              Street Address <span className="clf-required">*</span>
            </label>
            <input 
              className="clf-input" 
              name="address" 
              value={form.address} 
              onChange={handleChange} 
              placeholder="e.g. House 24, Road 8A, Dhanmondi, Dhaka"
              required
            />
          </div>

          <div className="clf-grid-3" style={{ marginBottom: '1.5rem' }}>
            <div className="clf-field">
              <label className="clf-label">
                City <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="city" 
                value={form.city} 
                onChange={handleChange} 
                placeholder="e.g. Dhaka" 
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">
                State / Division <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="state" 
                value={form.state} 
                onChange={handleChange} 
                placeholder="e.g. Dhaka Division" 
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">
                Zip Code <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="zipCode" 
                value={form.zipCode} 
                onChange={handleChange} 
                placeholder="e.g. 1209" 
                required 
              />
            </div>
          </div>

          {/* Interactive Map directly under Address fields */}
          <div style={{ marginTop: '1rem' }}>
            <LocationPickerMap
              initialLocation={locationCoordinates.latitude ? locationCoordinates : null}
              onLocationChange={({ latitude, longitude, location_link, isConfirmed }) => {
                setLocationCoordinates({ latitude, longitude });
                setIsLocationConfirmed(isConfirmed);
                if (location_link) {
                  setForm(prev => ({ ...prev, location_link }));
                }
                setError('');
              }}
              isConfirmed={isLocationConfirmed}
              onConfirmChange={(confirmed) => {
                setIsLocationConfirmed(confirmed);
                setError('');
              }}
              locationLink={form.location_link}
              onLocationLinkChange={(newLink) => {
                setForm(prev => ({ ...prev, location_link: newLink }));
              }}
              onAddressSelect={({ address, city, state, zipCode }) => {
                setForm(prev => ({
                  ...prev,
                  address: address || prev.address,
                  city: city || prev.city,
                  state: state || prev.state,
                  zipCode: zipCode || prev.zipCode
                }));
              }}
              required={true}
              title="Pinpoint Exact Location on Map"
            />
          </div>
        </div>

        {/* SECTION 4: Amenities & Appliances */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">✨</div>
            <div>
              <h2 className="clf-card-title">Amenities & Appliances</h2>
              <p className="clf-card-desc">Select available property facilities, in-unit appliances, and living policies.</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="clf-label" style={{ marginBottom: '0.65rem' }}>Community & Building Amenities</label>
            <div className="clf-pills-grid">
              {AMENITIES.map(amenity => {
                const isSelected = form.amenities.includes(amenity);
                return (
                  <label key={amenity} className={`clf-pill-label ${isSelected ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      value={amenity}
                      checked={isSelected}
                      onChange={() => handleAmenityChange(amenity)}
                    />
                    <span>{amenity}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <label className="clf-label" style={{ marginBottom: '0.65rem' }}>Appliances Included</label>
            <div className="clf-pills-grid">
              {APPLIANCES_LIST.map(({ key, label }) => {
                const isChecked = !!form[key];
                return (
                  <label key={key} className={`clf-pill-label ${isChecked ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      name={key}
                      checked={isChecked}
                      onChange={handleChange}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <label className="clf-label" style={{ marginBottom: '0.65rem' }}>Policies & Occupancy</label>
            <div className="clf-grid-3">
              <label className={`clf-toggle-card ${form.petsAllowed ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  name="petsAllowed"
                  checked={form.petsAllowed}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">🐾 Pets Allowed</span>
              </label>

              <label className={`clf-toggle-card ${form.smokingAllowed ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  name="smokingAllowed"
                  checked={form.smokingAllowed}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">🚬 Smoking Allowed</span>
              </label>

              <div className="clf-field">
                <input 
                  className="clf-input" 
                  name="maxOccupants" 
                  type="number" 
                  value={form.maxOccupants} 
                  onChange={handleChange} 
                  placeholder="Max Occupants (e.g. 5)" 
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Description, Media & Contact Info */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">📷</div>
            <div>
              <h2 className="clf-card-title">Description, Photos & Contact</h2>
              <p className="clf-card-desc">Add property description, high-resolution photos, and owner contact details.</p>
            </div>
          </div>

          <div className="clf-field" style={{ marginBottom: '1.25rem' }}>
            <label className="clf-label">
              Detailed Property Description <span className="clf-required">*</span>
            </label>
            <textarea 
              className="clf-textarea" 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              required 
              placeholder="Describe what makes this property special: spacious layout, natural ventilation, proximity to schools, security features..." 
              rows="4"
            />
          </div>

          <div className="clf-field" style={{ marginBottom: '1.25rem' }}>
            <label className="clf-label">Property Photos</label>
            <div className="clf-upload-dropzone">
              <input 
                className="clf-upload-input"
                name="images" 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <div className="clf-upload-icon">📸</div>
              <p className="clf-upload-text">Click or drag images here to upload</p>
              <p className="clf-upload-hint">Upload one or multiple photos (PNG, JPG, WebP)</p>
            </div>
            {imageFiles.length > 0 && (
              <div className="clf-file-list-preview">
                {imageFiles.map((file, idx) => (
                  <span key={idx} className="clf-file-badge">
                    🖼️ {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="clf-field" style={{ marginBottom: '1.25rem' }}>
            <label className="clf-label">3D Virtual Tour / Model URL</label>
            <input 
              className="clf-input" 
              name="threeDModelUrl" 
              value={form.threeDModelUrl} 
              onChange={handleChange} 
              placeholder="https://my.matterport.com/show/?m=... (optional)" 
            />
          </div>

          <div className="clf-grid-2">
            <div className="clf-field">
              <label className="clf-label">
                Contact Email <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="contactEmail" 
                type="email" 
                value={form.contactEmail} 
                onChange={handleChange} 
                placeholder="owner@dwellsync.com" 
                required 
              />
            </div>

            <div className="clf-field">
              <label className="clf-label">
                Contact Phone <span className="clf-required">*</span>
              </label>
              <input 
                className="clf-input" 
                name="contactPhone" 
                value={form.contactPhone} 
                onChange={handleChange} 
                placeholder="+880 1712-345678" 
                required 
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Sticky Action Footer */}
        <div className="clf-actions-bar">
          <button 
            type="button" 
            className="clf-btn clf-btn-secondary" 
            onClick={onCancel} 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="clf-btn clf-btn-primary" 
            disabled={loading}
          >
            {loading ? (
              <>
                <ButtonSpinner size="small" color="#FFFFFF" />
                <span>Publishing Listing...</span>
              </>
            ) : (
              'Publish Property Listing'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}