import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PropertyFilter.css';
import { FaFilter } from 'react-icons/fa';
import apiConfig from '../config/api';
import PropertyCard from './PropertyCard';

const PropertyFilter = () => {
  // Add a visible element to the page to confirm rendering
  // Remove debug logs
  
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    maxBedrooms: '',
    city: '',
    state: '',
    zipCode: '',
    search: '',
    listingType: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);



  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build query string from filters (including search)
  const buildQueryString = (filters) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null && !(typeof value === 'boolean' && value === false)) {
        query.append(key, value);
      }
    });
    return query.toString() ? `?${query.toString()}` : '';
  };

  // Fetch properties when filters (except search) change or location.search changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      minBedrooms: params.get('minBedrooms') || '',
      maxBedrooms: params.get('maxBedrooms') || '',
      city: params.get('city') || '',
      state: params.get('state') || '',
      zipCode: params.get('zipCode') || '',
      search: params.get('search') || '', // Initialize search from URL as well
      listingType: params.get('listingType') || '',
    });

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentFilters = {
          minPrice: params.get('minPrice') || '',
          maxPrice: params.get('maxPrice') || '',
          minBedrooms: params.get('minBedrooms') || '',
          maxBedrooms: params.get('maxBedrooms') || '',
          city: params.get('city') || '',
          state: params.get('state') || '',
          zipCode: params.get('zipCode') || '',
          search: params.get('search') || '',
          listingType: params.get('listingType') || '',
        };
        const query = buildQueryString(currentFilters);
        const apiUrl = `${apiConfig.getUrl(apiConfig.endpoints.properties)}${query}`;
        
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch properties: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Handle the new API response structure
        const propertiesArray = data.properties || [];
        setProperties(propertiesArray);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
        setProperties([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
    // eslint-disable-next-line
  }, [location.search]); // Depend on location.search to re-fetch on URL changes
  


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
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null && !(typeof value === 'boolean' && value === false)) {
        query.append(key, value);
      }
    });
    navigate(`/properties?${query.toString()}`);
  };
  const handleClear = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      maxBedrooms: '',
      city: '',
      state: '',
      zipCode: '',
      search: '',
      listingType: '',
    });
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  // Search bar handler
  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  // Ensure only public statuses are shown even if backend misconfigures
  const publicStatuses = ['Available', 'Sold', 'Rented'];
  const filteredProperties = properties.filter(p => publicStatuses.includes(p.status));


  return (
    <div className="property-filter-page">
      
      {/* Top bar with search and filter button */}
      <div className="filter-header">
        <div className="search-filter-container">
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search address, city, or zip code..."
            className="search-input"
          />
          <button 
            type="button" 
            onClick={toggleFilters} 
            className="filter-toggle-button"
            aria-label="Toggle filters"
          >
            <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        {showFilters && (
          <form className="filter-form horizontal" onSubmit={handleApply}>
            <div className="filter-inputs-container">
              <input 
                type="number" 
                name="minPrice" 
                value={filters.minPrice} 
                onChange={handleChange} 
                min="0" 
                placeholder="Min Price" 
                className="filter-input"
              />
              <input 
                type="number" 
                name="maxPrice" 
                value={filters.maxPrice} 
                onChange={handleChange} 
                min="0" 
                placeholder="Max Price" 
                className="filter-input"
              />
              <input 
                type="number" 
                name="minBedrooms" 
                value={filters.minBedrooms} 
                onChange={handleChange} 
                min="0" 
                placeholder="Min Beds" 
                className="filter-input"
              />
              <input 
                type="number" 
                name="maxBedrooms" 
                value={filters.maxBedrooms} 
                onChange={handleChange} 
                min="0" 
                placeholder="Max Beds" 
                className="filter-input"
              />
              <input 
                type="text" 
                name="city" 
                value={filters.city} 
                onChange={handleChange} 
                placeholder="City" 
                className="filter-input"
              />
              <input 
                type="text" 
                name="state" 
                value={filters.state} 
                onChange={handleChange} 
                placeholder="State" 
                className="filter-input"
              />
              <input 
                type="text" 
                name="zipCode" 
                value={filters.zipCode} 
                onChange={handleChange} 
                placeholder="Zip" 
                className="filter-input"
              />
            </div>
            
            <div className="filter-buttons">
              <button type="submit" className="filter-button filter-button-primary">
                Apply
              </button>
              <button type="button" onClick={handleClear} className="filter-button filter-button-secondary">
                Clear
              </button>
            </div>
          </form>
        )}
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

      {/* Page Results Header */}
      <div className="properties-results-header">
        <div className="results-header-container">
          <div className="results-title-group">
            <h1 className="results-main-title">
              {filters.listingType === 'For Rent' 
                ? 'Properties for Rent' 
                : filters.listingType === 'For Sale' 
                ? 'Properties for Sale' 
                : 'Browse Properties'}
            </h1>
            <p className="results-subtitle">
              {filters.city ? `Explore verified properties in ${filters.city}` : 'Discover premium, verified homes and residences across Bangladesh'}
            </p>
          </div>
          <div className="results-count-badge">
            <span className="count-number">{filteredProperties.length}</span>
            <span className="count-label">{filteredProperties.length === 1 ? 'Property' : 'Properties'}</span>
          </div>
        </div>
      </div>

      {/* Grid view for properties */}
      <div className="property-list">
        {(!loading && !error && filteredProperties.length === 0) && (
          <div className="no-properties">
            <div className="no-props-icon">🏠</div>
            <h3>No properties found</h3>
            <p>We couldn't find any properties matching your current filter criteria.</p>
            <button className="filter-button filter-button-primary" onClick={handleClear} style={{ marginTop: '16px' }}>
              Reset Filters
            </button>
          </div>
        )}
        
        {filteredProperties.map((property) => (
          <PropertyCard key={property._id} property={property} />
        ))}
      </div>
    </div>
  );
};

export default PropertyFilter;