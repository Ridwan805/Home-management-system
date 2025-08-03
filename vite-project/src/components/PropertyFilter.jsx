import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = '/api/properties';

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
    <div className="property-filter-page" style={{ padding: 0, minHeight: '100vh', background: '#fafbfc' }}>
      {/* Top bar with search and filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #eee',
        gap: 24,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search address, city, or zip code..."
          style={{ padding: 8, minWidth: 220, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <form className="property-filter-form" onSubmit={handleApply} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: 0 }}>
          <select name="listingType" value={filters.listingType} onChange={handleChange}>
            <option value="All">All Types</option>
            <option value="For Sale">For Sale</option>
            <option value="For Rent">For Rent</option>
          </select>
          <input type="number" name="minPrice" value={filters.minPrice} onChange={handleChange} min="0" placeholder="Min Price" style={{ width: 90 }} />
          <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleChange} min="0" placeholder="Max Price" style={{ width: 90 }} />
          <input type="number" name="minBedrooms" value={filters.minBedrooms} onChange={handleChange} min="0" placeholder="Min Beds" style={{ width: 80 }} />
          <input type="number" name="maxBedrooms" value={filters.maxBedrooms} onChange={handleChange} min="0" placeholder="Max Beds" style={{ width: 80 }} />
          <input type="text" name="city" value={filters.city} onChange={handleChange} placeholder="City" style={{ width: 100 }} />
          <input type="text" name="state" value={filters.state} onChange={handleChange} placeholder="State" style={{ width: 60 }} />
          <input type="text" name="zipCode" value={filters.zipCode} onChange={handleChange} placeholder="Zip" style={{ width: 70 }} />
          <input type="number" name="minYearBuilt" value={filters.minYearBuilt} onChange={handleChange} min="0" placeholder="Min Year" style={{ width: 90 }} />
          <input type="number" name="maxYearBuilt" value={filters.maxYearBuilt} onChange={handleChange} min="0" placeholder="Max Year" style={{ width: 90 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" name="hasPool" checked={filters.hasPool} onChange={handleChange} /> Pool
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" name="hasGarage" checked={filters.hasGarage} onChange={handleChange} /> Garage
          </label>
          <button type="submit" style={{ padding: '6px 14px' }}>Apply</button>
          <button type="button" onClick={handleClear} style={{ padding: '6px 14px' }}>Clear</button>
        </form>
      </div>
      {/* Grid view for properties */}
      <div className="property-list" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        padding: 32,
      }}>
        {loading && <div>Loading properties...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {(!loading && filteredProperties.length === 0) && <div>No properties found.</div>}
        {filteredProperties.map((property) => (
          <div key={property._id} className="property-card" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="property-images">
              {property.images && property.images.length > 0 ? (
                <img src={property.images[0]} alt="Property" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{ width: '100%', height: 180, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>No Image</div>
              )}
            </div>
            <div className="property-info">
              <div className="property-price" style={{ fontWeight: 600, fontSize: 20 }}>${property.price?.toLocaleString()}</div>
              <div className="property-type">{property.propertyType} - {property.listingType}</div>
              <div className="property-address">{property.address}, {property.city}, {property.state} {property.zipCode}</div>
              <div className="property-details">{property.bedrooms} bd | {property.bathrooms} ba | {property.squareFootage} sqft</div>
              <div className="property-status">Status: {property.status}</div>
              <div className="property-year">Year Built: {property.yearBuilt || 'N/A'}</div>
              <div className="property-amenities">Amenities: {property.amenities?.join(', ') || 'None'}</div>
              <div className="property-contact">Contact: {property.contactEmail} | {property.contactPhone}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyFilter; 