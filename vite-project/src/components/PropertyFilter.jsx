import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './PropertyFilter.css';

const API_BASE = 'http://localhost:5000/api/properties';

const PropertyFilter = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialFilters = {
    listingType: params.get('listingType') || 'All',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    maxBedrooms: '',
    city: '',
    state: '',
    zipCode: '',
    minYearBuilt: '',
    maxYearBuilt: '',
    hasPool: false,
    hasGarage: false,
    mortgage: params.get('mortgage') === 'true',
    search: '', // New: for search bar
  };
  const [filters, setFilters] = useState(initialFilters);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build query string from filters (excluding search)
  const buildQueryString = (filters) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'search') return; // Don't send search as query param
      if (value !== '' && value !== undefined && value !== null && !(typeof value === 'boolean' && value === false)) {
        query.append(key, value);
      }
    });
    return query.toString() ? `?${query.toString()}` : '';
  };

  // Fetch properties when filters (except search) change
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = buildQueryString(filters);
        const res = await fetch(`${API_BASE}${query}`);
        if (!res.ok) throw new Error('Failed to fetch properties');
        const data = await res.json();
        setProperties(data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
    // eslint-disable-next-line
  }, [JSON.stringify({ ...filters, search: undefined })]);

  // Handlers for filter form
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const handleApply = (e) => {
    e.preventDefault();
    setFilters({ ...filters }); // Triggers useEffect
  };
  const handleClear = () => {
    setFilters({
      listingType: 'All',
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      maxBedrooms: '',
      city: '',
      state: '',
      zipCode: '',
      minYearBuilt: '',
      maxYearBuilt: '',
      hasPool: false,
      hasGarage: false,
      mortgage: false,
      search: '',
    });
  };
  // Search bar handler
  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  // Filter properties client-side by search bar
  const filteredProperties = filters.search
    ? properties.filter((p) => {
        const search = filters.search.toLowerCase();
        return (
          (p.address && p.address.toLowerCase().includes(search)) ||
          (p.city && p.city.toLowerCase().includes(search)) ||
          (p.zipCode && p.zipCode.toLowerCase().includes(search))
        );
      })
    : properties;

  return (
    <div className="property-filter-page">
      {/* Top bar with search and filters */}
      <div className="filter-header">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search address, city, or zip code..."
          className="search-input"
        />
        <form className="filter-form" onSubmit={handleApply}>
          <select 
            name="listingType" 
            value={filters.listingType} 
            onChange={handleChange}
            className="filter-select"
          >
            <option value="All">All Types</option>
            <option value="For Sale">For Sale</option>
            <option value="For Rent">For Rent</option>
          </select>
          <input 
            type="number" 
            name="minPrice" 
            value={filters.minPrice} 
            onChange={handleChange} 
            min="0" 
            placeholder="Min Price" 
            className="filter-input"
            style={{ width: '100px' }}
          />
          <input 
            type="number" 
            name="maxPrice" 
            value={filters.maxPrice} 
            onChange={handleChange} 
            min="0" 
            placeholder="Max Price" 
            className="filter-input"
            style={{ width: '100px' }}
          />
          <input 
            type="number" 
            name="minBedrooms" 
            value={filters.minBedrooms} 
            onChange={handleChange} 
            min="0" 
            placeholder="Min Beds" 
            className="filter-input"
            style={{ width: '90px' }}
          />
          <input 
            type="number" 
            name="maxBedrooms" 
            value={filters.maxBedrooms} 
            onChange={handleChange} 
            min="0" 
            placeholder="Max Beds" 
            className="filter-input"
            style={{ width: '90px' }}
          />
          <input 
            type="text" 
            name="city" 
            value={filters.city} 
            onChange={handleChange} 
            placeholder="City" 
            className="filter-input"
            style={{ width: '120px' }}
          />
          <input 
            type="text" 
            name="state" 
            value={filters.state} 
            onChange={handleChange} 
            placeholder="State" 
            className="filter-input"
            style={{ width: '80px' }}
          />
          <input 
            type="text" 
            name="zipCode" 
            value={filters.zipCode} 
            onChange={handleChange} 
            placeholder="Zip" 
            className="filter-input"
            style={{ width: '90px' }}
          />
          <input 
            type="number" 
            name="minYearBuilt" 
            value={filters.minYearBuilt} 
            onChange={handleChange} 
            min="0" 
            placeholder="Min Year" 
            className="filter-input"
            style={{ width: '100px' }}
          />
          <input 
            type="number" 
            name="maxYearBuilt" 
            value={filters.maxYearBuilt} 
            onChange={handleChange} 
            min="0" 
            placeholder="Max Year" 
            className="filter-input"
            style={{ width: '100px' }}
          />
          <label className="filter-checkbox-label">
            <input type="checkbox" name="hasPool" checked={filters.hasPool} onChange={handleChange} /> Pool
          </label>
          <label className="filter-checkbox-label">
            <input type="checkbox" name="hasGarage" checked={filters.hasGarage} onChange={handleChange} /> Garage
          </label>
          <button type="submit" className="filter-button filter-button-primary">
            Apply
          </button>
          <button type="button" onClick={handleClear} className="filter-button filter-button-secondary">
            Clear
          </button>
        </form>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="loading-state">
          Loading properties...
        </div>
      )}
      
      {error && (
        <div className="error-state">
          Error: {error}
        </div>
      )}

      {/* Grid view for properties */}
      <div className="property-list">
        {(!loading && !error && filteredProperties.length === 0) && (
          <div className="no-properties">
            No properties found matching your criteria.
          </div>
        )}
        
        {filteredProperties.map((property) => (
          <div key={property._id} className="property-card">
            {/* Property Image */}
            <div className="property-images">
              {property.images && property.images.length > 0 ? (
                <img 
                  src={property.images[0]} 
                  alt="Property" 
                  className="property-image"
                />
              ) : (
                <div className="property-image-placeholder">
                  No Image Available
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`status-badge ${property.status === 'Available' ? 'available' : 'unavailable'}`}>
                {property.status}
              </div>
            </div>

            {/* Property Information */}
            <div className="property-info">
              {/* Price */}
              <div className="property-price">
                ${property.price?.toLocaleString()}
              </div>

              {/* Type and Listing Type */}
              <div className="property-type">
                {property.propertyType} - {property.listingType}
              </div>

              {/* Address */}
              <div className="property-address">
                {property.address}, {property.city}, {property.state} {property.zipCode}
              </div>

              {/* Property Details */}
              <div className="property-details">
                <span>🛏️ {property.bedrooms} bd</span>
                <span>🚿 {property.bathrooms} ba</span>
                <span>📏 {property.squareFootage} sqft</span>
              </div>

              {/* Year Built */}
              {property.yearBuilt && (
                <div className="property-year">
                  🏗️ Built in {property.yearBuilt}
                </div>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="property-amenities">
                  🏊 {property.amenities.join(', ')}
                </div>
              )}

              {/* Contact Information */}
              <div className="property-contact">
                <div>
                  📧 {property.contactEmail}
                </div>
                <div>
                  📞 {property.contactPhone}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyFilter; 