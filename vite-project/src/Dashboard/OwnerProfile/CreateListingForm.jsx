import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
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
  'Parking', 'Gym', 'Swimming Pool', 'Garden', 'Balcony', 'Security', 'Elevator', 'Playground', 'Pet Friendly', 'Furnished', 'Air Conditioning', 'Laundry Room', 'Fireplace', 'Wheelchair Accessible', 'WiFi'
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
  
  // Property location state
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
    setError(''); // Clear any persisting error messages on component mount
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
        // Handle the response structure from the backend
        setOwnerBuildings(data.buildings || data || []);
      } else {
        console.error('Failed to fetch owner buildings:', response.status);
        setOwnerBuildings([]);
      }
    } catch (error) {
      console.error('Error fetching owner buildings:', error);
      setOwnerBuildings([]);
    }
  };
  
  const handlePropertyLocationChange = (e) => {
    const value = e.target.value;
    setPropertyLocation(value);
    setError(''); // Clear any existing error messages
    if (value === 'standalone') {
      setForm(prev => ({ ...prev, buildingId: null }));
      setSelectedBuilding('');
      setShowCreateBuilding(false);
    } else {
      // Reset buildingId when switching to building mode
      setForm(prev => ({ ...prev, buildingId: null }));
    }
  };
  
  const handleBuildingSelection = (e) => {
    const value = e.target.value;
    setSelectedBuilding(value);
    setError(''); // Clear any existing error messages
    
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
    setError(''); // Clear any existing error messages when user makes changes
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
    
    // Address validation
    if (!form.address.trim()) errors.push('Address is required');
    if (!form.city.trim()) errors.push('City is required');
    if (!form.state.trim()) errors.push('State is required');
    if (!form.zipCode.trim()) errors.push('Zip code is required');
    
    // Floor and unit validation (only required for building properties)
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
    
    // Additional validation for building selection
    if (propertyLocation === 'building' && !selectedBuilding && !showCreateBuilding) {
      setError('Please select a building or choose to create a new one.');
      setLoading(false);
      return;
    }
    
    if (showCreateBuilding) {
      if (!buildingForm.name.trim() || !buildingForm.address.street.trim() || 
          !buildingForm.address.city.trim() || !buildingForm.address.state.trim()) {
        setError('Please fill in all required building information.');
        setLoading(false);
        return;
      }
    }

    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) throw new Error('No authentication token found');
      
      let buildingId = null;
      
      // For building properties, use selectedBuilding if available
      if (propertyLocation === 'building' && selectedBuilding && selectedBuilding !== 'create_new') {
        buildingId = selectedBuilding;
      }
      // For standalone properties, buildingId remains null
      
      // Create new building if needed
      if (showCreateBuilding) {
        const newBuildingData = {
          ...buildingForm,
          address: {
            ...buildingForm.address,
            fullAddress: `${buildingForm.address.street}, ${buildingForm.address.city}, ${buildingForm.address.state} ${buildingForm.address.zipCode}`.trim()
          },
          status: 'Active',
          approvalStatus: 'Pending' // Requires admin approval
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
      
      // Basic property information
      formData.append('propertyType', form.propertyType);
      formData.append('listingType', form.listingType);
      formData.append('description', form.description);
      
      // Building relationship - only append buildingId if it exists (for building properties)
      if (buildingId) {
        formData.append('buildingId', buildingId);
      }
      
      // Floor and unit information - only for building properties
      if (buildingId) {
        if (form.floorNumber) formData.append('floorNumber', form.floorNumber);
        if (form.unitNumber) formData.append('unitNumber', form.unitNumber);
      }
      
      // Always append address field (required by backend validation, even if empty for building properties)
      formData.append('address', form.address ? form.address.trim() : '');
      
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
      
      // Location
      const location = {
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        country: 'Bangladesh'
      };
      formData.append('location', JSON.stringify(location));
      
      // Location link (OpenStreetMap URL)
      if (form.location_link) {
        formData.append('location_link', form.location_link);
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
      // Removed city and state fields to prevent conflict with Property model fields
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
        // Handle specific error messages from backend
        let errorMessage = data.message || 'Failed to create property';
        
        // Check for duplicate key errors and provide user-friendly messages
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
      // Enhanced error handling for network and other errors
      let displayError = err.message;
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        displayError = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('JSON')) {
        displayError = 'Server response error. Please try again.';
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-listing-form" onSubmit={handleSubmit}>
      <h2>Create New Property Listing</h2>
        {error && <div className="form-error">{error}</div>}
        
        {/* Property Location Section */}
        <div className="form-row">
          <label>Property Location*</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="propertyLocation"
                value="standalone"
                checked={propertyLocation === 'standalone'}
                onChange={handlePropertyLocationChange}
              />
              Standalone Property (Individual Address)
            </label>
            <label>
              <input
                type="radio"
                name="propertyLocation"
                value="building"
                checked={propertyLocation === 'building'}
                onChange={handlePropertyLocationChange}
              />
              Part of Building/Complex
            </label>
          </div>
        </div>
        
        {/* Building Selection */}
        {propertyLocation === 'building' && (
          <div className="form-row">
            <label>Select Building*</label>
            <select value={selectedBuilding} onChange={handleBuildingSelection} required>
              <option value="">Select Building</option>
              {ownerBuildings && ownerBuildings.length > 0 ? (
                ownerBuildings.map(building => (
                  <option key={building._id} value={building._id}>
                    {building.name} - {building.address?.fullAddress || building.address?.street}
                  </option>
                ))
              ) : (
                <option disabled>No buildings found</option>
              )}
              <option value="create_new">Create New Building</option>
            </select>
          </div>
        )}
        
        {/* Create New Building Form */}
        {showCreateBuilding && (
          <div className="create-building-section">
            <h4>Create New Building</h4>
            <div className="form-row">
              <label>Building Name*</label>
              <input
                type="text"
                name="name"
                value={buildingForm.name}
                onChange={handleBuildingFormChange}
                placeholder="e.g., Sunrise Apartments"
                required
              />
            </div>
            <div className="form-row">
              <label>Street Address*</label>
              <input
                type="text"
                name="address.street"
                value={buildingForm.address.street}
                onChange={handleBuildingFormChange}
                placeholder="e.g., 123 Main Street"
                required
              />
            </div>
            <div className="form-row">
              <label>City*</label>
              <input
                type="text"
                name="address.city"
                value={buildingForm.address.city}
                onChange={handleBuildingFormChange}
                required
              />
            </div>
            <div className="form-row">
              <label>State*</label>
              <input
                type="text"
                name="address.state"
                value={buildingForm.address.state}
                onChange={handleBuildingFormChange}
                required
              />
            </div>
            <div className="form-row">
              <label>Zip Code*</label>
              <input
                type="text"
                name="address.zipCode"
                value={buildingForm.address.zipCode}
                onChange={handleBuildingFormChange}
                required
              />
            </div>
            <div className="form-row">
              <label>Year Built</label>
              <input
                type="number"
                name="yearBuilt"
                value={buildingForm.yearBuilt}
                onChange={handleBuildingFormChange}
              />
            </div>
            <div className="form-row">
              <label>Total Floors</label>
              <input
                type="number"
                name="totalFloors"
                value={buildingForm.totalFloors}
                onChange={handleBuildingFormChange}
                min="1"
              />
            </div>
            <div className="form-row">
              <label>Building Description</label>
              <textarea
                name="description"
                value={buildingForm.description}
                onChange={handleBuildingFormChange}
                placeholder="Brief description of the building..."
                rows="3"
              />
            </div>
            <div className="form-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowCreateBuilding(false);
                  setSelectedBuilding('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
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
          <label>Address*</label>
          <input 
            name="address" 
            value={form.address} 
            onChange={handleChange} 
            placeholder="e.g., 1234 Elm Street Apt 5B Springfield, IL 62704 United States"
            required
          />
        </div>

        {propertyLocation === 'building' && (
          <>
            <div className="form-row">
              <label>Floor Number*</label>
              <input
                type="number"
                name="floorNumber"
                value={form.floorNumber}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 5"
                required
              />
            </div>
            <div className="form-row">
              <label>Unit Number*</label>
              <input
                type="text"
                name="unitNumber"
                value={form.unitNumber}
                onChange={handleChange}
                placeholder="e.g., 5A, 501, etc."
                required
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
      <div className="form-row">
        <label>OpenStreetMap Location Link</label>
        <input 
          name="location_link" 
          value={form.location_link} 
          onChange={handleChange} 
          placeholder="https://www.openstreetmap.org/..."
          title="Paste the OpenStreetMap URL for this property location"
        />
        <small style={{color: '#666', fontSize: '0.9em', marginTop: '4px', display: 'block'}}>
          Optional: Visit OpenStreetMap, find your property location, and paste the URL here
        </small>
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