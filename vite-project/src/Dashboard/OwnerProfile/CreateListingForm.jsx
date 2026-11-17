import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import LocationPickerMap from '../../components/LocationPickerMap';
import { ButtonSpinner } from '../../components/loading';
import { isPropertySalesEnabled } from '../../config/features';
import {
  Tag,
  Building2,
  Building,
  Home,
  Ruler,
  Sparkles,
  ShieldCheck,
  Camera,
  Upload,
  FileImage,
  CheckCircle2,
  Info,
  MapPin,
  AlertCircle,
  X,
  PawPrint,
  Cigarette
} from 'lucide-react';
import './CreateListingForm.css';

const initialState = {
  // Category & Pricing
  listingType: '',
  propertyType: '',
  price: '',
  deposit: '',
  utilitiesIncluded: false,

  // Building / Location
  propertyLocation: 'standalone', // 'standalone' | 'building'
  buildingId: null,
  floorNumber: '',
  unitNumber: '',

  // Standalone address & location
  address: '',
  city: '',
  state: '',
  zipCode: '',
  location_link: '',

  // Dimensions & Features
  bedrooms: '',
  bathrooms: '',
  squareFootage: '',
  facing: '',
  furnishing: 'Unfurnished',
  yearBuilt: '',
  parkingSpots: '0',
  hasBalcony: false,
  balconySize: '',
  hasStorage: false,
  storageSize: '',

  // Amenities & In-Unit Appliances
  amenities: [],
  airConditioning: false,
  heating: false,
  refrigerator: false,
  washingMachine: false,
  dishwasher: false,
  microwave: false,
  oven: false,
  fireplace: false,

  // Policies
  petsAllowed: false,
  smokingAllowed: false,
  maxOccupants: '',

  // Description & Contact
  description: '',
  threeDModelUrl: '',
  contactEmail: '',
  contactPhone: '',
};

const PROPERTY_TYPES = [
  'apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 
  'studio', 'duplex', 'penthouse', 'office', 'retail', 'land', 'other'
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
  'office': 'Office Space',
  'retail': 'Retail Space',
  'land': 'Land',
  'other': 'Other'
};

const BUILDING_PROPERTY_TYPES = [
  'apartment_unit', 'floor', 'condo', 'studio', 'duplex', 'penthouse'
];

const STANDALONE_PROPERTY_TYPES = [
  'house', 'townhouse', 'villa', 'land'
];

const COMMERCIAL_PROPERTY_TYPES = [
  'office', 'retail'
];

const RESIDENTIAL_TYPES = [
  'apartment_unit', 'floor', 'house', 'condo', 'townhouse', 'villa', 'studio', 'duplex', 'penthouse'
];

// Standalone Property Facilities (distinct from in-unit appliances, no duplicate balcony/AC/pets/furnishing/parking)
const STANDALONE_FACILITIES = [
  'Elevator',
  'Security',
  'Gym',
  'Swimming Pool',
  'Playground',
  'Garden',
  'Shared Parking',
  'Common Laundry Room',
  'Wheelchair Accessible',
  'WiFi'
];

// Shared Building Facilities used in building profile creation
const BUILDING_SHARED_FACILITIES = [
  { key: 'elevator', label: 'Elevator' },
  { key: 'security', label: 'Security & CCTV' },
  { key: 'gym', label: 'Gym / Fitness' },
  { key: 'pool', label: 'Swimming Pool' },
  { key: 'playground', label: 'Playground' },
  { key: 'garden', label: 'Shared Garden / Rooftop' },
  { key: 'parking', label: 'Shared Parking Facility' },
  { key: 'laundry', label: 'Common Laundry Room' },
  { key: 'accessibility', label: 'Building Accessibility' }
];

// Unit-Specific Appliances
const IN_UNIT_APPLIANCES = [
  { key: 'airConditioning', label: 'Air Conditioning' },
  { key: 'heating', label: 'Heating System' },
  { key: 'refrigerator', label: 'Refrigerator' },
  { key: 'washingMachine', label: 'Washing Machine' },
  { key: 'dishwasher', label: 'Dishwasher' },
  { key: 'microwave', label: 'Microwave' },
  { key: 'oven', label: 'Oven' },
  { key: 'fireplace', label: 'Fireplace' }
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
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1200'
    },
    yearBuilt: '',
    totalFloors: '',
    description: '',
    selectedFacilities: []
  });

  // Fetch owner's buildings on mount
  useEffect(() => {
    fetchOwnerBuildings();
    setError('');
  }, []);

  const fetchOwnerBuildings = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) return;
      const response = await fetch(API.getUrl(API.endpoints.ownerBuildings), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOwnerBuildings(data.buildings || data || []);
      } else {
        setOwnerBuildings([]);
      }
    } catch (err) {
      console.error('Error fetching owner buildings:', err);
      setOwnerBuildings([]);
    }
  };

  // Helper to extract active building facilities list from building object
  const extractBuildingFacilities = (b) => {
    if (!b) return [];
    const list = [];
    if (Array.isArray(b.amenitiesList)) return b.amenitiesList;
    if (Array.isArray(b.amenities)) return b.amenities;
    const am = b.amenities || {};
    if (am.elevators?.count > 0 || am.elevators?.available) list.push('Elevator');
    if (am.security?.securityGuard || am.security?.cctv || am.security?.accessControl) list.push('Security');
    if (am.recreational?.gym) list.push('Gym');
    if (am.recreational?.pool) list.push('Swimming Pool');
    if (am.recreational?.playground) list.push('Playground');
    if (am.recreational?.rooftop) list.push('Shared Garden');
    if (am.parking?.totalSpots > 0 || am.parking?.available) list.push('Shared Parking');
    if (am.utilities?.internet) list.push('Internet / WiFi');
    if (am.commonLaundry) list.push('Common Laundry Room');
    if (am.wheelchairAccessible) list.push('Building Accessibility');
    return list;
  };

  const selectedBuildingData = ownerBuildings.find(b => b._id === selectedBuilding);

  // Property type selection with smart structure assignment
  const handlePropertyTypeChange = (e) => {
    const pType = e.target.value;
    setError('');
    
    let newLocationType = propertyLocation;
    if (BUILDING_PROPERTY_TYPES.includes(pType)) {
      newLocationType = 'building';
    } else if (STANDALONE_PROPERTY_TYPES.includes(pType)) {
      newLocationType = 'standalone';
    }

    setPropertyLocation(newLocationType);
    setForm(prev => ({
      ...prev,
      propertyType: pType,
      buildingId: newLocationType === 'building' ? prev.buildingId : null
    }));
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

  const handleBuildingFacilityToggle = (facilityLabel) => {
    setBuildingForm(prev => {
      const current = prev.selectedFacilities || [];
      const updated = current.includes(facilityLabel)
        ? current.filter(f => f !== facilityLabel)
        : [...current, facilityLabel];
      return { ...prev, selectedFacilities: updated };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError('');
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStandaloneFacilityToggle = (facility) => {
    setForm(f => {
      const amenities = new Set(f.amenities);
      if (amenities.has(facility)) {
        amenities.delete(facility);
      } else {
        amenities.add(facility);
      }
      return { ...f, amenities: Array.from(amenities) };
    });
  };

  const handleFileChange = (e) => {
    setImageFiles([...e.target.files]);
  };

  // Form Validation
  const validateForm = () => {
    const errors = [];
    const isLand = form.propertyType === 'land';
    const isCommercial = COMMERCIAL_PROPERTY_TYPES.includes(form.propertyType);
    const isResidential = RESIDENTIAL_TYPES.includes(form.propertyType);

    // Basic Category & Pricing
    if (!form.propertyType) errors.push('Property type is required');
    if (!form.listingType) errors.push('Listing type is required');
    if (!form.price || Number(form.price) <= 0) errors.push('Valid price is required');
    if (!form.squareFootage || Number(form.squareFootage) <= 0) errors.push('Valid square footage is required');
    if (!form.description.trim()) errors.push('Detailed property description is required');

    // Building vs Standalone Location
    if (propertyLocation === 'building') {
      if (!selectedBuilding && !showCreateBuilding) {
        errors.push('Please select a building or choose to create a new one');
      }
      if (!form.floorNumber && form.floorNumber !== 0) {
        errors.push('Floor number is required for building units');
      }
      if (!form.unitNumber || !form.unitNumber.trim()) {
        errors.push('Unit number is required for building units');
      }
      if (showCreateBuilding) {
        if (!buildingForm.name.trim()) errors.push('Building name is required');
        if (!buildingForm.address.street.trim()) errors.push('Building street address is required');
        if (!buildingForm.address.city.trim()) errors.push('Building city is required');
        if (!buildingForm.address.state.trim()) errors.push('Building state/division is required');
        if (!buildingForm.address.zipCode.trim()) errors.push('Building zip code is required');
      }
    } else {
      // Standalone address & map pin
      if (!form.address.trim()) errors.push('Street address is required');
      if (!form.city.trim()) errors.push('City is required');
      if (!form.state.trim()) errors.push('State / Division is required');
      if (!form.zipCode.trim()) errors.push('Zip code is required');
      if (!locationCoordinates?.latitude || !locationCoordinates?.longitude) {
        errors.push('Please pinpoint the property location on the map');
      } else if (!isLocationConfirmed) {
        errors.push('Please click "Confirm Location" on the map to confirm coordinates');
      }
    }

    // Residential Specifications
    if (isResidential) {
      if (form.bedrooms === '' || Number(form.bedrooms) < 0) errors.push('Valid number of bedrooms is required');
      if (form.bathrooms === '' || Number(form.bathrooms) < 0) errors.push('Valid number of bathrooms is required');
    }

    // Conditional Balcony & Storage Sizes
    if (!isLand) {
      if (form.hasBalcony && (!form.balconySize || Number(form.balconySize) <= 0)) {
        errors.push('Balcony size is required when balcony is selected');
      }
      if (form.hasStorage && (!form.storageSize || Number(form.storageSize) <= 0)) {
        errors.push('Storage size is required when storage space is selected');
      }
    }

    if (form.parkingSpots && Number(form.parkingSpots) < 0) {
      errors.push('Allocated parking spots cannot be negative');
    }

    if (form.maxOccupants && Number(form.maxOccupants) < 1) {
      errors.push('Maximum occupants must be at least 1');
    }

    if (propertyLocation === 'standalone' && form.yearBuilt) {
      const year = Number(form.yearBuilt);
      if (year < 1800 || year > new Date().getFullYear() + 5) {
        errors.push('Please enter a valid construction year built');
      }
    }

    // Contact Information
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

    return errors;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
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

    let createdInlineBuildingId = null;

    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
      if (!token) throw new Error('No authentication token found. Please log in again.');

      let buildingId = null;
      let effectiveAddress = form.address ? form.address.trim() : '';
      let effectiveCity = form.city;
      let effectiveState = form.state;
      let effectiveZip = form.zipCode;
      let effectiveYearBuilt = form.yearBuilt ? Number(form.yearBuilt) : null;
      let effectiveLatitude = locationCoordinates.latitude;
      let effectiveLongitude = locationCoordinates.longitude;

      // Handle Building Assignment & Inline Creation
      if (propertyLocation === 'building') {
        if (showCreateBuilding) {
          const newBuildingData = {
            name: buildingForm.name.trim(),
            address: {
              street: buildingForm.address.street.trim(),
              city: buildingForm.address.city.trim(),
              state: buildingForm.address.state.trim(),
              zipCode: buildingForm.address.zipCode.trim(),
              country: 'Bangladesh',
              fullAddress: `${buildingForm.address.street}, ${buildingForm.address.city}, ${buildingForm.address.state} ${buildingForm.address.zipCode}`.trim()
            },
            location: {
              type: 'Point',
              coordinates: [90.4125, 23.8103] // Default or centered coordinates
            },
            yearBuilt: buildingForm.yearBuilt ? Number(buildingForm.yearBuilt) : undefined,
            totalFloors: buildingForm.totalFloors ? Number(buildingForm.totalFloors) : undefined,
            description: buildingForm.description || '',
            amenitiesList: buildingForm.selectedFacilities || [],
            amenities: {
              elevators: { count: (buildingForm.selectedFacilities || []).includes('Elevator') ? 1 : 0 },
              security: { securityGuard: (buildingForm.selectedFacilities || []).includes('Security & CCTV') },
              recreational: {
                gym: (buildingForm.selectedFacilities || []).includes('Gym / Fitness'),
                pool: (buildingForm.selectedFacilities || []).includes('Swimming Pool'),
                playground: (buildingForm.selectedFacilities || []).includes('Playground'),
                rooftop: (buildingForm.selectedFacilities || []).includes('Shared Garden / Rooftop')
              },
              parking: { totalSpots: (buildingForm.selectedFacilities || []).includes('Shared Parking Facility') ? 10 : 0 }
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
            const bErr = await buildingResponse.json().catch(() => ({}));
            if (buildingResponse.status === 401) {
              throw new Error('Your session has expired. Please sign in again.');
            }
            if (buildingResponse.status === 403) {
              throw new Error('Your account does not have permission to create building profiles.');
            }
            throw new Error(bErr.message || 'Building profile creation failed. Please check your building details and retry.');
          }

          const createdBuildingRes = await buildingResponse.json();
          const createdB = createdBuildingRes.building || createdBuildingRes;
          buildingId = createdB._id;
          createdInlineBuildingId = createdB._id;
          effectiveAddress = createdB.address?.fullAddress || createdB.address?.street || '';
          effectiveCity = createdB.address?.city || 'Dhaka';
          effectiveState = createdB.address?.state || 'Dhaka Division';
          effectiveZip = createdB.address?.zipCode || '1200';
          effectiveYearBuilt = createdB.yearBuilt || null;
        } else if (selectedBuilding) {
          buildingId = selectedBuilding;
          if (selectedBuildingData) {
            effectiveAddress = selectedBuildingData.address?.fullAddress || selectedBuildingData.address?.street || '';
            effectiveCity = selectedBuildingData.address?.city || 'Dhaka';
            effectiveState = selectedBuildingData.address?.state || 'Dhaka Division';
            effectiveZip = selectedBuildingData.address?.zipCode || '1200';
            effectiveYearBuilt = selectedBuildingData.yearBuilt || null;
            if (selectedBuildingData.location?.coordinates) {
              effectiveLongitude = selectedBuildingData.location.coordinates[0];
              effectiveLatitude = selectedBuildingData.location.coordinates[1];
            }
          }
        }
      }

      const formData = new FormData();
      formData.append('propertyType', form.propertyType);
      formData.append('listingType', form.listingType);
      formData.append('description', form.description.trim());

      if (buildingId) {
        formData.append('buildingId', buildingId);
        if (form.floorNumber !== '') formData.append('floorNumber', form.floorNumber);
        if (form.unitNumber) formData.append('unitNumber', form.unitNumber.trim());
      }

      formData.append('address', effectiveAddress);

      // Specifications (De-duplicated)
      const specifications = {
        squareFootage: Number(form.squareFootage),
        parkingSpots: Number(form.parkingSpots) || 0
      };

      const isLand = form.propertyType === 'land';
      const isResidential = RESIDENTIAL_TYPES.includes(form.propertyType);

      if (isResidential) {
        specifications.bedrooms = Number(form.bedrooms);
        specifications.bathrooms = Number(form.bathrooms);
      }

      if (!isLand) {
        specifications.furnishing = form.furnishing || 'Unfurnished';
        if (form.facing) specifications.facing = form.facing;
        
        if (form.hasBalcony) {
          specifications.balcony = {
            hasBalcony: true,
            balconySize: form.balconySize ? Number(form.balconySize) : undefined
          };
        }

        if (form.hasStorage) {
          specifications.storage = {
            hasStorage: true,
            storageSize: form.storageSize ? Number(form.storageSize) : undefined
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
      }

      formData.append('specifications', JSON.stringify(specifications));

      // Pricing
      const pricing = {
        deposit: (!isLand && form.listingType === 'For Rent' && form.deposit) ? Number(form.deposit) : 0,
        utilities: {
          included: !isLand && form.listingType === 'For Rent' ? form.utilitiesIncluded : false
        }
      };

      if (form.listingType === 'For Rent') {
        pricing.rent = Number(form.price);
      } else {
        pricing.sale = Number(form.price);
      }
      formData.append('pricing', JSON.stringify(pricing));

      // Location Object
      const location = {
        latitude: effectiveLatitude,
        longitude: effectiveLongitude,
        coordinates: {
          latitude: effectiveLatitude,
          longitude: effectiveLongitude
        },
        address: effectiveAddress,
        city: effectiveCity,
        state: effectiveState,
        zipCode: effectiveZip,
        country: 'Bangladesh'
      };
      formData.append('location', JSON.stringify(location));

      if (form.location_link) {
        formData.append('location_link', form.location_link.trim());
      }

      // Contact Info
      const contactInfo = {
        email: form.contactEmail.trim(),
        phone: form.contactPhone.trim(),
        preferredContactMethod: 'both'
      };
      formData.append('contactInfo', JSON.stringify(contactInfo));

      // Policies
      if (!isLand) {
        const constraints = {
          petPolicy: { allowed: form.petsAllowed },
          smokingPolicy: { allowed: form.smokingAllowed }
        };
        if (form.maxOccupants) {
          constraints.occupancyLimit = { maxOccupants: Number(form.maxOccupants) };
        }
        formData.append('constraints', JSON.stringify(constraints));
      }

      if (effectiveYearBuilt) {
        formData.append('yearBuilt', effectiveYearBuilt);
      }
      if (form.threeDModelUrl) {
        formData.append('threeDModelUrl', form.threeDModelUrl.trim());
      }

      // Amenities: Include extra private / standalone facilities plus Fireplace if selected
      const finalAmenities = [...form.amenities];
      if (form.fireplace && !finalAmenities.includes('Fireplace')) {
        finalAmenities.push('Fireplace');
      }
      formData.append('amenities', JSON.stringify(finalAmenities));

      // Image uploads
      imageFiles.forEach(file => formData.append('images', file));

      // Compatibility legacy fields
      formData.append('price', form.price);
      if (isResidential) {
        formData.append('bedrooms', form.bedrooms || '0');
        formData.append('bathrooms', form.bathrooms || '0');
      }
      formData.append('squareFootage', form.squareFootage);
      formData.append('contactEmail', form.contactEmail.trim());
      formData.append('contactPhone', form.contactPhone.trim());
      formData.append('zipCode', effectiveZip);

      const res = await fetch(API.getUrl(API.endpoints.properties), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Rollback inline building creation if property creation fails
        if (createdInlineBuildingId) {
          try {
            await fetch(`${API.getUrl(API.endpoints.buildings)}/${createdInlineBuildingId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (delErr) {
            console.warn('Failed to rollback inline building after property creation failure:', delErr);
          }
        }

        if (res.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        }
        if (res.status === 403) {
          throw new Error('Your account does not have permission to publish listings or modify the selected building.');
        }

        let msg = data.message || 'Failed to create property';
        if (msg.includes('duplicate key') || msg.includes('E11000')) {
          if (msg.includes('unitNumber') || msg.includes('buildingId_1_unitNumber_1')) {
            msg = 'A property with this unit number already exists in the selected building. Please choose a different unit number.';
          } else {
            msg = 'This property information already exists in the system. Please verify your input and try again.';
          }
        }
        throw new Error(msg);
      }

      onSuccess();
    } catch (err) {
      if (createdInlineBuildingId) {
        try {
          const token = JSON.parse(localStorage.getItem('dwellSyncUser'))?.token;
          if (token) {
            await fetch(`${API.getUrl(API.endpoints.buildings)}/${createdInlineBuildingId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
        } catch (delErr) {
          console.warn('Failed to rollback inline building in catch block:', delErr);
        }
      }

      let displayError = err.message || 'An error occurred while creating listing';
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        displayError = 'Network error. Please check your connection and try again.';
      }
      setError(displayError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const isLand = form.propertyType === 'land';
  const isCommercial = COMMERCIAL_PROPERTY_TYPES.includes(form.propertyType);
  const isResidential = RESIDENTIAL_TYPES.includes(form.propertyType);

  return (
    <div className="clf-container">
      {/* Header */}
      <div className="clf-header">
        <h1 className="clf-header-title">Create Property Listing</h1>
        <p className="clf-header-subtitle">
          Configure listing details, location, facilities, and specifications with normalized, non-duplicate inputs.
        </p>
      </div>

      {error && (
        <div className="clf-error-banner">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: Category & Pricing */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="clf-card-title">1. Category & Pricing</h2>
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
                {isPropertySalesEnabled() ? (
                  <option value="For Sale">For Sale</option>
                ) : (
                  <option value="For Sale" disabled>For Sale (Temporarily Disabled)</option>
                )}
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
                onChange={handlePropertyTypeChange} 
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
                {form.listingType === 'For Sale' ? 'Sale Price (BDT)' : 'Monthly Rent (BDT)'} <span className="clf-required">*</span>
              </label>
              <div className="clf-input-prefix-wrapper">
                <span className="clf-input-prefix">BDT</span>
                <input 
                  className="clf-input" 
                  name="price" 
                  type="number" 
                  value={form.price} 
                  onChange={handleChange} 
                  placeholder="e.g. 45000" 
                  required 
                  min="1"
                />
              </div>
            </div>

            {form.listingType === 'For Rent' && !isLand && (
              <>
                <div className="clf-field">
                  <label className="clf-label">Security Deposit (BDT)</label>
                  <div className="clf-input-prefix-wrapper">
                    <span className="clf-input-prefix">BDT</span>
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
                  <label className={`clf-toggle-card ${form.utilitiesIncluded ? 'active' : ''}`} style={{ height: '2.625rem', boxSizing: 'border-box' }}>
                    <input
                      type="checkbox"
                      name="utilitiesIncluded"
                      checked={form.utilitiesIncluded}
                      onChange={handleChange}
                    />
                    <span className="clf-toggle-text">Utilities Included in Rent</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 2: Building / Location */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="clf-card-title">2. Building & Location</h2>
              <p className="clf-card-desc">
                Select building complex to inherit shared facilities and address, or define standalone property coordinates.
              </p>
            </div>
          </div>

          {/* Standalone vs Building Selector */}
          <div className="clf-radio-tabs">
            <label className={`clf-radio-tab ${propertyLocation === 'standalone' ? 'active' : ''}`}>
              <input
                type="radio"
                name="propertyLocation"
                value="standalone"
                checked={propertyLocation === 'standalone'}
                onChange={handlePropertyLocationChange}
              />
              <Home size={18} />
              <span>Standalone Property (House / Villa / Land)</span>
            </label>
            <label className={`clf-radio-tab ${propertyLocation === 'building' ? 'active' : ''}`}>
              <input
                type="radio"
                name="propertyLocation"
                value="building"
                checked={propertyLocation === 'building'}
                onChange={handlePropertyLocationChange}
              />
              <Building size={18} />
              <span>Part of Building / Complex (Apartment / Floor)</span>
            </label>
          </div>

          {/* Building Selection & Floor/Unit Details */}
          {propertyLocation === 'building' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="clf-grid-3">
                <div className="clf-field">
                  <label className="clf-label">
                    Select Building Complex <span className="clf-required">*</span>
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
                      <option disabled>No existing buildings found</option>
                    )}
                    <option value="create_new">+ Create New Building Profile</option>
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
                    min="-5"
                    max="200"
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

              {/* Inherited Building Information Card (Read-only single source of truth) */}
              {selectedBuilding && selectedBuilding !== 'create_new' && selectedBuildingData && (
                <div className="clf-inherited-card">
                  <div className="clf-inherited-header">
                    <div className="clf-inherited-title-wrap">
                      <Building2 size={18} color="#2563EB" />
                      <span>{selectedBuildingData.name}</span>
                    </div>
                    <span className="clf-inherited-badge">
                      <CheckCircle2 size={12} />
                      Inherited from Building Profile
                    </span>
                  </div>

                  <div className="clf-inherited-grid">
                    <div className="clf-inherited-item">
                      <span className="clf-inherited-item-label">Full Address</span>
                      <span className="clf-inherited-item-value">
                        {selectedBuildingData.address?.fullAddress || selectedBuildingData.address?.street}
                      </span>
                    </div>

                    <div className="clf-inherited-item">
                      <span className="clf-inherited-item-label">City & Division</span>
                      <span className="clf-inherited-item-value">
                        {selectedBuildingData.address?.city}, {selectedBuildingData.address?.state} ({selectedBuildingData.address?.zipCode})
                      </span>
                    </div>

                    <div className="clf-inherited-item">
                      <span className="clf-inherited-item-label">Construction Year</span>
                      <span className="clf-inherited-item-value">
                        {selectedBuildingData.yearBuilt || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {extractBuildingFacilities(selectedBuildingData).length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className="clf-inherited-item-label">Shared Building Facilities:</span>
                      <div className="clf-inherited-amenities">
                        {extractBuildingFacilities(selectedBuildingData).map((fac, idx) => (
                          <span key={idx} className="clf-inherited-chip">
                            <Sparkles size={12} color="#2563EB" />
                            {fac}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="clf-inherited-footer-hint">
                    <Info size={14} />
                    <span>Location, street address, and shared facilities are inherited automatically from this building profile.</span>
                  </div>
                </div>
              )}

              {/* Inline Building Creator */}
              {showCreateBuilding && (
                <div className="clf-inline-building-box">
                  <h4 className="clf-inline-building-title">
                    <Building size={18} />
                    Create New Building Profile
                  </h4>
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
                      <label className="clf-label">State / Division <span className="clf-required">*</span></label>
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
                      <label className="clf-label">Building Year Built</label>
                      <input
                        className="clf-input"
                        type="number"
                        name="yearBuilt"
                        value={buildingForm.yearBuilt}
                        onChange={handleBuildingFormChange}
                        placeholder="e.g. 2021"
                      />
                    </div>
                  </div>

                  {/* Shared Building Facilities */}
                  <div style={{ marginTop: '1rem' }}>
                    <label className="clf-label" style={{ marginBottom: '0.5rem' }}>
                      Shared Building Facilities
                    </label>
                    <div className="clf-pills-grid">
                      {BUILDING_SHARED_FACILITIES.map(({ key, label }) => {
                        const isChecked = (buildingForm.selectedFacilities || []).includes(label);
                        return (
                          <label key={key} className={`clf-pill-label ${isChecked ? 'active' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBuildingFacilityToggle(label)}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
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

          {/* Standalone Property Address Fields & Interactive Map */}
          {propertyLocation === 'standalone' && (
            <div>
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

              {/* Interactive Location Map */}
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
          )}
        </div>

        {/* SECTION 3: Property Dimensions & Features */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">
              <Ruler size={20} />
            </div>
            <div>
              <h2 className="clf-card-title">3. Property Dimensions & Features</h2>
              <p className="clf-card-desc">
                {isLand 
                  ? 'Specify total land area and zoning characteristics.' 
                  : 'Bedrooms, bathrooms, square footage, and unit-specific features.'}
              </p>
            </div>
          </div>

          <div className="clf-grid-4">
            {/* Bedrooms & Bathrooms: Omitted for Land; optional for Commercial; required for Residential */}
            {isResidential && (
              <>
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
                    placeholder="e.g. 2" 
                    min="0"
                    required 
                  />
                </div>
              </>
            )}

            {isCommercial && (
              <div className="clf-field">
                <label className="clf-label">Restrooms / Washrooms</label>
                <input 
                  className="clf-input" 
                  name="bathrooms" 
                  type="number" 
                  value={form.bathrooms} 
                  onChange={handleChange} 
                  placeholder="e.g. 1" 
                  min="0"
                />
              </div>
            )}

            <div className="clf-field">
              <label className="clf-label">
                {isLand ? 'Plot Area (sq ft)' : 'Square Footage (sq ft)'} <span className="clf-required">*</span>
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

            {!isLand && (
              <div className="clf-field">
                <label className="clf-label">Furnishing Status</label>
                <select className="clf-select" name="furnishing" value={form.furnishing} onChange={handleChange}>
                  {FURNISHING_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!isLand && (
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

              {/* Year built: Only editable for standalone properties; inherited for building units */}
              {propertyLocation === 'standalone' ? (
                <div className="clf-field">
                  <label className="clf-label">Year Built</label>
                  <input 
                    className="clf-input" 
                    name="yearBuilt" 
                    type="number" 
                    value={form.yearBuilt} 
                    onChange={handleChange} 
                    placeholder="e.g. 2021" 
                    min="1800"
                    max={new Date().getFullYear() + 5}
                  />
                </div>
              ) : (
                <div className="clf-field">
                  <label className="clf-label">Building Construction Year</label>
                  <input 
                    className="clf-input" 
                    value={selectedBuildingData?.yearBuilt ? `${selectedBuildingData.yearBuilt} (Inherited)` : 'Inherited from Building'} 
                    disabled 
                  />
                </div>
              )}

              {/* Allocated Parking Spots (distinct from building shared parking) */}
              <div className="clf-field">
                <label className="clf-label">Allocated Parking Spots</label>
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

              {/* Private Balcony toggle */}
              <div className="clf-field" style={{ justifyContent: 'flex-end' }}>
                <label className={`clf-toggle-card ${form.hasBalcony ? 'active' : ''}`} style={{ height: '2.625rem', boxSizing: 'border-box' }}>
                  <input
                    type="checkbox"
                    name="hasBalcony"
                    checked={form.hasBalcony}
                    onChange={handleChange}
                  />
                  <span className="clf-toggle-text">Private Balcony</span>
                </label>
              </div>
            </div>
          )}

          {/* Conditional Balcony and Storage sizes */}
          {!isLand && (form.hasBalcony || form.hasStorage) && (
            <div className="clf-grid-2" style={{ marginTop: '1.25rem' }}>
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
                <label className={`clf-toggle-card ${form.hasStorage ? 'active' : ''}`}>
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
          )}
        </div>

        {/* SECTION 4: Amenities & Appliances (Omitted for Land) */}
        {!isLand && (
          <div className="clf-card">
            <div className="clf-card-header">
              <div className="clf-card-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="clf-card-title">4. Amenities & Appliances</h2>
                <p className="clf-card-desc">
                  {propertyLocation === 'building' 
                    ? 'In-unit appliances and exclusive facilities for this apartment unit.' 
                    : 'Property facilities and in-home appliances.'}
                </p>
              </div>
            </div>

            {/* Standalone Property Facilities (Only for standalone properties; building units inherit from building) */}
            {propertyLocation === 'standalone' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="clf-label" style={{ marginBottom: '0.65rem' }}>
                  Property Facilities & Shared Amenities
                </label>
                <div className="clf-pills-grid">
                  {STANDALONE_FACILITIES.map(fac => {
                    const isSelected = form.amenities.includes(fac);
                    return (
                      <label key={fac} className={`clf-pill-label ${isSelected ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          value={fac}
                          checked={isSelected}
                          onChange={() => handleStandaloneFacilityToggle(fac)}
                        />
                        <span>{fac}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In-Unit Appliances (Single source of truth: Air Conditioning, Refrigerator, etc.) */}
            <div style={{ paddingTop: propertyLocation === 'standalone' ? '1rem' : '0', borderTop: propertyLocation === 'standalone' ? '1px solid #f1f5f9' : 'none' }}>
              <label className="clf-label" style={{ marginBottom: '0.65rem' }}>
                In-Unit Appliances & Fixtures
              </label>
              <div className="clf-pills-grid">
                {IN_UNIT_APPLIANCES.map(({ key, label }) => {
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
          </div>
        )}

        {/* SECTION 5: Policies & Occupancy (Omitted for Land) */}
        {!isLand && (
          <div className="clf-card">
            <div className="clf-card-header">
              <div className="clf-card-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="clf-card-title">5. Policies & Occupancy</h2>
                <p className="clf-card-desc">Tenancy rules, pet accommodation, and occupancy limits.</p>
              </div>
            </div>

            <div className="clf-grid-3">
              <label className={`clf-toggle-card ${form.petsAllowed ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  name="petsAllowed"
                  checked={form.petsAllowed}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">
                  <PawPrint size={16} />
                  Pets Allowed
                </span>
              </label>

              <label className={`clf-toggle-card ${form.smokingAllowed ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  name="smokingAllowed"
                  checked={form.smokingAllowed}
                  onChange={handleChange}
                />
                <span className="clf-toggle-text">
                  <Cigarette size={16} />
                  Smoking Allowed
                </span>
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
        )}

        {/* SECTION 6: Description, Photos & Contact */}
        <div className="clf-card">
          <div className="clf-card-header">
            <div className="clf-card-icon">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="clf-card-title">6. Description, Photos & Contact</h2>
              <p className="clf-card-desc">Add detailed description, media showcase, and direct owner contact information.</p>
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
              placeholder="Describe what makes this property special: interior layout, natural lighting, ventilation, neighborhood highlights, nearby schools or transit..." 
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
              <div className="clf-upload-icon">
                <Upload size={32} />
              </div>
              <p className="clf-upload-text">Click or drag images here to upload</p>
              <p className="clf-upload-hint">Upload one or multiple photos (PNG, JPG, WebP)</p>
            </div>
            {imageFiles.length > 0 && (
              <div className="clf-file-list-preview">
                {imageFiles.map((file, idx) => (
                  <span key={idx} className="clf-file-badge">
                    <FileImage size={14} />
                    {file.name}
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
                type="tel" 
                value={form.contactPhone} 
                onChange={handleChange} 
                placeholder="+880 1712-345678" 
                required 
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
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
