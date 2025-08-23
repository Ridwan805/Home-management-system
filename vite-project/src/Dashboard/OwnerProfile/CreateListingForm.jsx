import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../config/api';
import './CreateListingForm.css';

const initialState = {
  address: '',
  propertyType: '',
  bedrooms: '',
  bathrooms: '',
  squareFootage: '',
  price: '',
  description: '',
  amenities: [], // comma separated
  images: [], // files
  yearBuilt: '',
  contactEmail: '',
  contactPhone: '',
  threeDModelUrl: '',
  listingType: '',
  city: '',
  state: '',
  zipCode: '',
};

const PROPERTY_TYPES = [
  'Apartment', 'House', 'Condo', 'Townhouse', 'Villa', 'Studio', 'Duplex', 'Penthouse', 'Other'
];
const AMENITIES = [
  'Parking', 'Gym', 'Swimming Pool', 'Garden', 'Balcony', 'Security', 'Elevator', 'Playground', 'Pet Friendly', 'Furnished', 'Air Conditioning', 'Laundry Room', 'Fireplace', 'Wheelchair Accessible', 'WiFi'
];

export default function CreateListingForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ ...initialState, amenities: [] });
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
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

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) throw new Error('Not logged in');
      const token = user.token;
      // Prepare FormData for all fields and images
      const formData = new FormData();
      formData.append('address', form.address);
      formData.append('propertyType', form.propertyType);
      formData.append('bedrooms', form.bedrooms);
      formData.append('bathrooms', form.bathrooms);
      formData.append('squareFootage', form.squareFootage);
      formData.append('price', form.price);
      formData.append('description', form.description);
      formData.append('yearBuilt', form.yearBuilt);
      formData.append('contactEmail', form.contactEmail);
      formData.append('contactPhone', form.contactPhone);
      formData.append('threeDModelUrl', form.threeDModelUrl);
      formData.append('listingType', form.listingType);
      formData.append('city', form.city);
      formData.append('state', form.state);
      formData.append('zipCode', form.zipCode);
      // Append amenities as array
      form.amenities.forEach(a => formData.append('amenities', a));
      // Append images
      imageFiles.forEach(file => formData.append('images', file));
      // Send request
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
        <label>Address*</label>
        <input name="address" value={form.address} onChange={handleChange} required />
      </div>
      <div className="form-row">
        <label>Property Type*</label>
        <select name="propertyType" value={form.propertyType} onChange={handleChange} required>
          <option value="">Select</option>
          {PROPERTY_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
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
        <label>Price*</label>
        <input name="price" type="number" value={form.price} onChange={handleChange} required />
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
      <div className="form-actions">
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Listing'}</button>
        <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
      </div>
    </form>
  );
}