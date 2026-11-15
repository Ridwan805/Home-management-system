import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import apiConfig, { authenticatedFetch } from '../../config/api';
import ExplorerHeader from './ExplorerHeader';
import PropertyFilterSidebar from './PropertyFilterSidebar';
import PropertyResultsPanel from './PropertyResultsPanel';
import ExplorerMap from './ExplorerMap';
import MobileFilterDrawer from './MobileFilterDrawer';
import MobileViewToggle from './MobileViewToggle';
import { getPropertyCoordinates, getPropertyPriceNumber } from './propertyUtils';
import './PropertyExplorer.css';

const PropertyExplorer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useContext(AuthContext);

  // 1. Synchronized Filter State from URL
  const filters = useMemo(() => {
    const amenitiesParam = searchParams.get('amenities');
    const amenitiesList = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : [];

    return {
      listingType: searchParams.get('listingType') || '',
      propertyType: searchParams.get('propertyType') || '',
      city: searchParams.get('city') || '',
      area: searchParams.get('area') || '',
      search: searchParams.get('search') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      minBedrooms: searchParams.get('minBedrooms') || '',
      maxBedrooms: searchParams.get('maxBedrooms') || '',
      minBathrooms: searchParams.get('minBathrooms') || '',
      minArea: searchParams.get('minArea') || '',
      maxArea: searchParams.get('maxArea') || '',
      amenities: amenitiesList,
      sort: searchParams.get('sort') || 'newest'
    };
  }, [searchParams]);

  // Compute number of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.propertyType) count++;
    if (filters.city) count++;
    if (filters.area) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minBedrooms) count++;
    if (filters.minBathrooms) count++;
    if (filters.minArea || filters.maxArea) count++;
    if (filters.amenities && filters.amenities.length > 0) count += filters.amenities.length;
    return count;
  }, [filters]);

  // UI States
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [searchAsMoveMap, setSearchAsMoveMap] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map' (for mobile)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Helper to update URL search params without page reload
  const updateUrlParams = useCallback((newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        if (Array.isArray(val)) {
          if (val.length > 0) params.set(key, val.join(','));
        } else {
          params.set(key, val);
        }
      }
    });
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Filter change handler
  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    updateUrlParams(updated);
  };

  // Reset filters
  const handleResetFilters = () => {
    // Preserve listingType (Rent vs Buy tab)
    const reset = {
      listingType: filters.listingType,
      sort: 'newest'
    };
    updateUrlParams(reset);
    setMapBounds(null);
  };

  // Switch listing type (All / Buy / Rent)
  const handleListingTypeChange = (type) => {
    const updated = {
      ...filters,
      listingType: type,
      // Clear price filters when switching between Rent and Buy to avoid mismatched scales
      minPrice: '',
      maxPrice: ''
    };
    updateUrlParams(updated);
    setSelectedPropertyId(null);
  };

  // Fetch Wishlist for authenticated user
  const fetchWishlist = useCallback(async () => {
    try {
      const stored = localStorage.getItem('dwellSyncUser');
      if (!stored) return;
      const user = JSON.parse(stored);
      if (!user?.token) return;

      const res = await fetch(apiConfig.getUrl('/api/wishlist'), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const ids = (data.wishlist || []).map(item => item._id || item);
        setWishlistIds(ids);
      }
    } catch {
      // Ignore wishlist fetch error
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist, isLoggedIn]);

  // Wishlist Toggle Handler
  const handleToggleWishlist = async (propertyId) => {
    const stored = localStorage.getItem('dwellSyncUser');
    if (!stored) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (!user?.token) {
      navigate('/login');
      return;
    }

    const isAlreadyWishlisted = wishlistIds.includes(propertyId);
    // Optimistic UI update
    setWishlistIds(prev =>
      isAlreadyWishlisted ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
    );

    try {
      const endpoint = isAlreadyWishlisted
        ? apiConfig.getUrl(`/api/wishlist/remove/${propertyId}`)
        : apiConfig.getUrl('/api/wishlist/add');

      const response = await fetch(endpoint, {
        method: isAlreadyWishlisted ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: isAlreadyWishlisted ? undefined : JSON.stringify({ propertyId })
      });

      if (!response.ok) {
        // Rollback optimistic update
        setWishlistIds(prev =>
          isAlreadyWishlisted ? [...prev, propertyId] : prev.filter(id => id !== propertyId)
        );
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      // Rollback
      setWishlistIds(prev =>
        isAlreadyWishlisted ? [...prev, propertyId] : prev.filter(id => id !== propertyId)
      );
    }
  };

  // 2. Fetch Properties from Backend
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filters.listingType && filters.listingType !== 'All') {
        queryParams.set('listingType', filters.listingType);
      }
      if (filters.minPrice) queryParams.set('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice);
      if (filters.minBedrooms) queryParams.set('minBedrooms', filters.minBedrooms);
      if (filters.city) queryParams.set('city', filters.city);
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.sort) queryParams.set('sort', filters.sort);
      if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);

      const apiUrl = `${apiConfig.getUrl(apiConfig.endpoints.properties)}?${queryParams.toString()}`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error(`Failed to load properties (${res.status})`);
      }

      const data = await res.json();
      const allProps = data.properties || [];
      setProperties(allProps);
    } catch (err) {
      console.error('PropertyExplorer: Error fetching properties:', err);
      setError(err.message || 'Error connecting to the property service.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.listingType,
    filters.minPrice,
    filters.maxPrice,
    filters.minBedrooms,
    filters.city,
    filters.search,
    filters.sort,
    filters.propertyType
  ]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // 3. Client-side refinement (Amenities, area, search-as-move bounds, and sorting)
  const filteredAndSortedProperties = useMemo(() => {
    let result = [...properties];

    // Status safety check: only display public statuses
    const publicStatuses = ['Available', 'Sold', 'Rented', 'Reserved'];
    result = result.filter(p => publicStatuses.includes(p.status) || !p.status);

    // Property type alias matching (e.g. Apartment matches apartment_unit, condo, studio, duplex, floor)
    if (filters.propertyType && filters.propertyType !== 'all') {
      const targetType = filters.propertyType.toLowerCase();
      result = result.filter(p => {
        const pType = (p.propertyType || '').toLowerCase();
        if (targetType === 'apartment_unit') {
          return ['apartment_unit', 'condo', 'studio', 'duplex', 'floor'].includes(pType);
        }
        if (targetType === 'house') {
          return ['house', 'townhouse', 'villa'].includes(pType);
        }
        if (targetType === 'office') {
          return ['office', 'retail'].includes(pType);
        }
        return pType === targetType;
      });
    }

    // Neighborhood / Area filter
    if (filters.area) {
      const q = filters.area.toLowerCase().trim();
      result = result.filter(p => {
        const address = (p.address || '').toLowerCase();
        const fullAddress = (p.fullAddress || '').toLowerCase();
        const state = (p.location?.state || p.state || '').toLowerCase();
        return address.includes(q) || fullAddress.includes(q) || state.includes(q);
      });
    }

    // Bathrooms filter
    if (filters.minBathrooms) {
      const minBaths = Number(filters.minBathrooms);
      result = result.filter(p => {
        const baths = p.specifications?.bathrooms ?? p.bathrooms ?? 0;
        return baths >= minBaths;
      });
    }

    // Floor area filter
    if (filters.minArea) {
      const minA = Number(filters.minArea);
      result = result.filter(p => {
        const sqft = p.specifications?.squareFootage ?? p.squareFootage ?? p.size ?? 0;
        return sqft >= minA;
      });
    }
    if (filters.maxArea) {
      const maxA = Number(filters.maxArea);
      result = result.filter(p => {
        const sqft = p.specifications?.squareFootage ?? p.squareFootage ?? p.size ?? 0;
        return sqft > 0 && sqft <= maxA;
      });
    }

    // Amenities filter: property must include all selected amenities
    if (filters.amenities && filters.amenities.length > 0) {
      result = result.filter(p => {
        const propAmenities = Array.isArray(p.amenities) ? p.amenities : [];
        return filters.amenities.every(reqAm =>
          propAmenities.some(a => a.toLowerCase().includes(reqAm.toLowerCase()))
        );
      });
    }

    // Map bounds filter (when "Search as I move the map" is enabled)
    if (searchAsMoveMap && mapBounds) {
      result = result.filter(p => {
        const coords = getPropertyCoordinates(p);
        if (!coords) return false;
        const [lat, lng] = coords;
        return lat >= mapBounds.south && lat <= mapBounds.north &&
               lng >= mapBounds.west && lng <= mapBounds.east;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = getPropertyPriceNumber(a);
      const priceB = getPropertyPriceNumber(b);

      if (filters.sort === 'price_asc') {
        return priceA - priceB;
      }
      if (filters.sort === 'price_desc') {
        return priceB - priceA;
      }
      // 'newest' default
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [properties, filters, searchAsMoveMap, mapBounds]);

  // Selected property object
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return filteredAndSortedProperties.find(p => p._id === selectedPropertyId) ||
           properties.find(p => p._id === selectedPropertyId) || null;
  }, [selectedPropertyId, filteredAndSortedProperties, properties]);

  const handleSelectProperty = (property) => {
    setSelectedPropertyId(property._id);
  };

  const handleClosePreview = () => {
    setSelectedPropertyId(null);
  };

  return (
    <div className="property-explorer-layout">
      {/* 1. Top Compact Application Header */}
      <ExplorerHeader
        searchQuery={filters.search}
        onSearchChange={(val) => handleFilterChange('search', val)}
        activeListingType={filters.listingType}
        onListingTypeChange={handleListingTypeChange}
        onOpenMobileFilters={() => setMobileFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* 2. Main 3-Column Content Body */}
      <main className="explorer-body-container">
        {/* Left: Dark Navy Filter Sidebar (Desktop) */}
        <div className="explorer-sidebar-pane">
          <PropertyFilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onApplyFilters={fetchProperties}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Center: Scrollable Property Results Panel */}
        <div className={`explorer-results-pane ${viewMode === 'map' ? 'mobile-hidden' : ''}`}>
          <PropertyResultsPanel
            properties={filteredAndSortedProperties}
            loading={loading}
            error={error}
            onRetry={fetchProperties}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={handleSelectProperty}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            listingType={filters.listingType}
            selectedCity={filters.city}
            selectedArea={filters.area}
            sortBy={filters.sort}
            onSortChange={(val) => handleFilterChange('sort', val)}
            onResetFilters={handleResetFilters}
            onBrowseAll={() => handleListingTypeChange('')}
            hasActiveFilters={activeFilterCount > 0}
          />
        </div>

        {/* Right: Large Interactive Map */}
        <div className={`explorer-map-pane ${viewMode === 'list' ? 'mobile-hidden' : ''}`}>
          <ExplorerMap
            properties={filteredAndSortedProperties}
            selectedProperty={selectedProperty}
            onSelectProperty={handleSelectProperty}
            onClosePreview={handleClosePreview}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            searchAsMoveMap={searchAsMoveMap}
            onToggleSearchAsMoveMap={(val) => setSearchAsMoveMap(val)}
            onBoundsChanged={(bounds) => setMapBounds(bounds)}
          />
        </div>
      </main>

      {/* 3. Mobile Components */}
      {/* Mobile Bottom Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onApplyFilters={fetchProperties}
        activeFilterCount={activeFilterCount}
      />

      {/* Mobile Floating List / Map Toggle */}
      <MobileViewToggle
        viewMode={viewMode}
        onToggleView={(mode) => setViewMode(mode)}
      />
    </div>
  );
};

export default PropertyExplorer;