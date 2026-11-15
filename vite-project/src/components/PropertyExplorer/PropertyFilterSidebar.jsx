import React from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Building2,
  Home,
  Crown,
  Briefcase,
  Trees,
  LayoutGrid,
  MapPin,
  Search,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  ShieldCheck,
  Car,
  ArrowUpDown,
  Wind,
  Zap,
  DoorOpen,
  Flower2,
  Heart
} from 'lucide-react';
import './PropertyFilterSidebar.css';

const propertyTypes = [
  { id: 'all', label: 'All Types', icon: LayoutGrid },
  { id: 'apartment_unit', label: 'Apartment', icon: Building2 },
  { id: 'house', label: 'House', icon: Home },
  { id: 'penthouse', label: 'Penthouse', icon: Crown },
  { id: 'office', label: 'Office', icon: Briefcase },
  { id: 'land', label: 'Land', icon: Trees },
];

const bangladeshCities = [
  'All Cities',
  'Dhaka',
  'Chattogram',
  'Sylhet',
  'Cox\'s Bazar',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Cumilla',
  'Gazipur',
  'Narayanganj'
];

const bedroomOptions = ['Any', '1', '2', '3', '4', '5+'];
const bathroomOptions = ['Any', '1', '2', '3', '4+'];

const amenityOptions = [
  { id: 'Parking', label: 'Parking', icon: Car },
  { id: 'Elevator', label: 'Elevator', icon: ArrowUpDown },
  { id: 'Security', label: 'Security', icon: ShieldCheck },
  { id: 'Air Conditioning', label: 'Air Conditioning', icon: Wind },
  { id: 'Generator', label: 'Generator', icon: Zap },
  { id: 'Balcony', label: 'Balcony', icon: DoorOpen },
  { id: 'Garden', label: 'Garden', icon: Flower2 },
  { id: 'Pet Friendly', label: 'Pet Friendly', icon: Heart },
];

const PropertyFilterSidebar = ({
  filters,
  onFilterChange,
  onResetFilters,
  onApplyFilters,
  activeFilterCount = 0,
  isMobileDrawer = false,
  onCloseMobileDrawer
}) => {
  const isLand = filters.propertyType === 'land';
  const isRent = filters.listingType === 'For Rent';

  const handleTypeSelect = (typeId) => {
    onFilterChange('propertyType', typeId === 'all' ? '' : typeId);
  };

  const handleBedSelect = (val) => {
    onFilterChange('minBedrooms', val === 'Any' ? '' : val.replace('+', ''));
  };

  const handleBathSelect = (val) => {
    onFilterChange('minBathrooms', val === 'Any' ? '' : val.replace('+', ''));
  };

  const handleAmenityToggle = (amenityId) => {
    const current = Array.isArray(filters.amenities) ? [...filters.amenities] : [];
    const index = current.indexOf(amenityId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(amenityId);
    }
    onFilterChange('amenities', current);
  };

  return (
    <aside className={`property-filter-sidebar ${isMobileDrawer ? 'mobile-drawer-view' : ''}`}>
      {/* Sidebar Header */}
      <div className="filter-sidebar-header">
        <div className="filter-header-title-row">
          <div className="filter-title-group">
            <SlidersHorizontal size={18} className="sidebar-header-icon" />
            <h2 className="sidebar-main-title">Filters</h2>
          </div>
          {activeFilterCount > 0 && (
            <span className="sidebar-active-badge">{activeFilterCount} Active</span>
          )}
        </div>
        <button
          type="button"
          className="sidebar-reset-btn"
          onClick={onResetFilters}
          title="Reset all filters"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      <div className="filter-sidebar-body">
        {/* 1. Property Type Selector */}
        <section className="filter-section">
          <h3 className="filter-section-title">Property Type</h3>
          <div className="property-types-grid">
            {propertyTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = (!filters.propertyType && t.id === 'all') || filters.propertyType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`type-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleTypeSelect(t.id)}
                >
                  <Icon size={17} className="type-btn-icon" />
                  <span className="type-btn-label">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Location Filter */}
        <section className="filter-section">
          <h3 className="filter-section-title">Location</h3>
          
          <div className="filter-field-group">
            <label className="filter-field-label">City</label>
            <div className="filter-select-wrap">
              <MapPin size={15} className="select-lead-icon" />
              <select
                className="filter-select"
                value={filters.city || 'All Cities'}
                onChange={(e) => onFilterChange('city', e.target.value === 'All Cities' ? '' : e.target.value)}
              >
                {bangladeshCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-field-group" style={{ marginTop: '0.625rem' }}>
            <label className="filter-field-label">Neighborhood / Area</label>
            <div className="filter-input-wrap">
              <Search size={15} className="input-lead-icon" />
              <input
                type="text"
                className="filter-text-input"
                value={filters.area || ''}
                onChange={(e) => onFilterChange('area', e.target.value)}
                placeholder="e.g. Dhanmondi, Gulshan, Banani..."
              />
            </div>
          </div>
        </section>

        {/* 3. Price Range (BDT) */}
        <section className="filter-section">
          <div className="price-header-row">
            <h3 className="filter-section-title">
              {isRent ? 'Monthly Rent (BDT)' : 'Price Range (BDT)'}
            </h3>
          </div>

          <div className="price-inputs-row">
            <div className="price-input-col">
              <span className="price-unit-prefix">৳</span>
              <input
                type="number"
                min="0"
                step="500"
                className="price-number-input"
                value={filters.minPrice || ''}
                onChange={(e) => onFilterChange('minPrice', e.target.value)}
                placeholder="Min"
              />
            </div>
            <span className="price-separator">—</span>
            <div className="price-input-col">
              <span className="price-unit-prefix">৳</span>
              <input
                type="number"
                min="0"
                step="500"
                className="price-number-input"
                value={filters.maxPrice || ''}
                onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                placeholder="Max"
              />
            </div>
          </div>
        </section>

        {/* 4. Specifications (Bedrooms, Bathrooms, Area) - Adapted for Land */}
        {!isLand && (
          <section className="filter-section">
            <h3 className="filter-section-title">Bedrooms</h3>
            <div className="specs-pills-row">
              {bedroomOptions.map((opt) => {
                const currentVal = filters.minBedrooms ? `${filters.minBedrooms}` : 'Any';
                const isSelected = (currentVal === 'Any' && opt === 'Any') ||
                                  (opt.startsWith(currentVal) && currentVal !== 'Any');
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`spec-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleBedSelect(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <h3 className="filter-section-title" style={{ marginTop: '1rem' }}>Bathrooms</h3>
            <div className="specs-pills-row">
              {bathroomOptions.map((opt) => {
                const currentVal = filters.minBathrooms ? `${filters.minBathrooms}` : 'Any';
                const isSelected = (currentVal === 'Any' && opt === 'Any') ||
                                  (opt.startsWith(currentVal) && currentVal !== 'Any');
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`spec-pill-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleBathSelect(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Floor Area (sq ft) */}
        <section className="filter-section">
          <h3 className="filter-section-title">
            {isLand ? 'Plot Area (sq ft)' : 'Floor Area (sq ft)'}
          </h3>
          <div className="price-inputs-row">
            <div className="price-input-col">
              <input
                type="number"
                min="0"
                step="50"
                className="price-number-input"
                value={filters.minArea || ''}
                onChange={(e) => onFilterChange('minArea', e.target.value)}
                placeholder="Min sq ft"
              />
            </div>
            <span className="price-separator">—</span>
            <div className="price-input-col">
              <input
                type="number"
                min="0"
                step="50"
                className="price-number-input"
                value={filters.maxArea || ''}
                onChange={(e) => onFilterChange('maxArea', e.target.value)}
                placeholder="Max sq ft"
              />
            </div>
          </div>
        </section>

        {/* 6. Amenities */}
        {!isLand && (
          <section className="filter-section">
            <h3 className="filter-section-title">Amenities</h3>
            <div className="amenities-tags-grid">
              {amenityOptions.map((a) => {
                const Icon = a.icon;
                const isChecked = Array.isArray(filters.amenities) && filters.amenities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`amenity-chip ${isChecked ? 'active' : ''}`}
                    onClick={() => handleAmenityToggle(a.id)}
                    aria-pressed={isChecked}
                  >
                    <Icon size={14} className="amenity-icon" />
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="filter-sidebar-footer">
        <button
          type="button"
          className="sidebar-apply-btn"
          onClick={() => {
            if (onApplyFilters) onApplyFilters();
            if (onCloseMobileDrawer) onCloseMobileDrawer();
          }}
        >
          Apply Filters
        </button>
      </div>
    </aside>
  );
};

export default PropertyFilterSidebar;