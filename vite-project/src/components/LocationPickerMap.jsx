import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPickerMap.css';

// Default tile URL and attribution
const DEFAULT_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Default center: Dhaka, Bangladesh
const DHAKA_COORDINATES = [23.8103, 90.4125];

// Popular quick search suggestion chips in Dhaka
const QUICK_AREAS = ['Dhanmondi', 'Gulshan 1', 'Gulshan 2', 'Banani', 'Uttara', 'Mirpur'];

// Famous landmark shortcuts (like Google Maps POIs)
const FAMOUS_LANDMARKS = [
  { name: 'Jamuna Future Park', icon: '🛍️', label: 'Jamuna Future Park' },
  { name: 'Bashundhara City', icon: '🛍️', label: 'Bashundhara City' },
  { name: 'Square Hospital', icon: '🏥', label: 'Square Hospital' },
  { name: 'Evercare Hospital', icon: '🏥', label: 'Evercare Hospital' },
  { name: 'Lalbagh Fort', icon: '🏛️', label: 'Lalbagh Fort' },
  { name: 'Hatirjheel Lake', icon: '🌊', label: 'Hatirjheel' },
  { name: 'Dhanmondi Lake', icon: '🌳', label: 'Dhanmondi Lake' },
  { name: 'BRAC University', icon: '🎓', label: 'BRAC University' }
];

// Helper to identify landmark category, icon, and label like Google Maps
export function getLandmarkMeta(item) {
  const c = item.class || '';
  const t = item.type || '';

  if (c === 'amenity' && (t === 'hospital' || t === 'clinic' || t === 'pharmacy' || t === 'doctors')) {
    return { icon: '🏥', tag: 'Hospital / Healthcare' };
  }
  if (c === 'shop' || t === 'mall' || t === 'supermarket' || t === 'department_store' || t === 'marketplace') {
    return { icon: '🛍️', tag: 'Shopping Mall / Retail' };
  }
  if (c === 'amenity' && (t === 'university' || t === 'college' || t === 'school' || t === 'research_institute')) {
    return { icon: '🎓', tag: 'Education / Campus' };
  }
  if (c === 'historic' || c === 'tourism' || t === 'museum' || t === 'monument' || t === 'memorial' || t === 'fort' || t === 'attraction') {
    return { icon: '🏛️', tag: 'Historic Landmark / Museum' };
  }
  if (c === 'leisure' || c === 'water' || t === 'park' || t === 'garden' || t === 'lake' || t === 'water' || t === 'stadium' || t === 'sports_centre') {
    return { icon: '🌳', tag: 'Park / Lake / Nature' };
  }
  if (c === 'tourism' && (t === 'hotel' || t === 'motel' || t === 'guest_house')) {
    return { icon: '🏨', tag: 'Hotel / Hospitality' };
  }
  if (c === 'aeroway' || t === 'airport' || t === 'terminal') {
    return { icon: '✈️', tag: 'Airport' };
  }
  if (c === 'building' || c === 'office' || t === 'commercial' || t === 'government') {
    return { icon: '🏢', tag: 'Commercial / Landmark' };
  }
  if (c === 'amenity' && (t === 'place_of_worship' || t === 'mosque' || t === 'temple' || t === 'church')) {
    return { icon: '🕌', tag: 'Place of Worship' };
  }
  if (c === 'amenity' && (t === 'restaurant' || t === 'cafe' || t === 'fast_food')) {
    return { icon: '🍴', tag: 'Restaurant / Dining' };
  }
  if (c === 'highway' || t === 'station' || t === 'bus_stop' || t === 'subway_entrance') {
    return { icon: '🚏', tag: 'Transit / Station' };
  }
  return { icon: '📍', tag: 'Address / Area' };
}

// Helper to generate an OpenStreetMap location link from lat/lng
export function generateOsmLink(lat, lng, zoom = 17) {
  if (lat === null || lat === undefined || lng === null || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return '';
  }
  const latFixed = Number(lat).toFixed(6);
  const lngFixed = Number(lng).toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${latFixed}&mlon=${lngFixed}#map=${zoom}/${latFixed}/${lngFixed}`;
}

// Helper to parse coordinates from OpenStreetMap links or coordinate strings
export function parseOsmCoordinates(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const mlat = url.searchParams.get('mlat');
    const mlon = url.searchParams.get('mlon');
    if (mlat && mlon && !isNaN(Number(mlat)) && !isNaN(Number(mlon))) {
      return { lat: Number(Number(mlat).toFixed(6)), lng: Number(Number(mlon).toFixed(6)) };
    }
    const hashMatch = url.hash.match(/#map=\d+\/([-\d.]+)\/([-\d.]+)/);
    if (hashMatch && hashMatch.length === 3) {
      return { lat: Number(Number(hashMatch[1]).toFixed(6)), lng: Number(Number(hashMatch[2]).toFixed(6)) };
    }
  } catch {
    // If not a full URL, fallback to regex search
  }

  const mlatMatch = trimmed.match(/mlat=([-\d.]+)/);
  const mlonMatch = trimmed.match(/mlon=([-\d.]+)/);
  if (mlatMatch && mlonMatch) {
    const lat = Number(mlatMatch[1]);
    const lng = Number(mlonMatch[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  const mapHashMatch = trimmed.match(/#map=\d+\/([-\d.]+)\/([-\d.]+)/);
  if (mapHashMatch) {
    const lat = Number(mapHashMatch[1]);
    const lng = Number(mapHashMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  const commaMatch = trimmed.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/);
  if (commaMatch) {
    const lat = Number(commaMatch[1]);
    const lng = Number(commaMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

// Custom Leaflet marker icon using inline SVG
const createMarkerIcon = (color = '#2563eb') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 34px; height: 44px; transform: translate(-50%, -100%); cursor: pointer;">
        <svg viewBox="0 0 384 512" width="34" height="44" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
          <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          <circle cx="192" cy="192" r="75" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42]
  });
};

function MapClickHandler({ onSelectLocation, isLocked }) {
  useMapEvents({
    click(e) {
      if (!isLocked) {
        onSelectLocation({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6))
        });
      }
    }
  });
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapCenterController({ position, zoom = 16 }) {
  const map = useMap();
  const prevPosRef = useRef(null);

  useEffect(() => {
    if (position && !isNaN(position[0]) && !isNaN(position[1])) {
      const prev = prevPosRef.current;
      if (!prev || prev[0] !== position[0] || prev[1] !== position[1]) {
        prevPosRef.current = position;
        map.flyTo(position, 16, { duration: 1.2 });
      }
    }
  }, [position, zoom, map]);

  return null;
}

export default function LocationPickerMap({
  initialLocation = null,
  onLocationChange,
  isConfirmed: parentIsConfirmed = null,
  onConfirmChange = null,
  locationLink = '',
  onLocationLinkChange = null,
  onAddressSelect = null,
  required = true,
  title = "Property Location"
}) {
  const initialLat = initialLocation?.latitude ?? initialLocation?.coordinates?.latitude ?? null;
  const initialLng = initialLocation?.longitude ?? initialLocation?.coordinates?.longitude ?? null;

  const [position, setPosition] = useState(() => {
    if (initialLat !== null && initialLng !== null && !isNaN(Number(initialLat)) && !isNaN(Number(initialLng))) {
      return [Number(initialLat), Number(initialLng)];
    }
    return null;
  });

  const [selectedLandmark, setSelectedLandmark] = useState(null);

  const [internalLink, setInternalLink] = useState(() => {
    if (locationLink) return locationLink;
    if (initialLat !== null && initialLng !== null) {
      return generateOsmLink(initialLat, initialLng);
    }
    return '';
  });

  const activeLink = locationLink !== undefined && locationLink !== null && locationLink !== '' 
    ? locationLink 
    : internalLink;

  const [copied, setCopied] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [activeChipTab, setActiveChipTab] = useState('landmarks'); // 'landmarks' or 'areas'
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const [localConfirmed, setLocalConfirmed] = useState(() => {
    if (initialLat !== null && initialLng !== null) {
      return true;
    }
    return false;
  });

  const isConfirmed = parentIsConfirmed !== null ? parentIsConfirmed : localConfirmed;
  const markerRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync if initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      const lat = initialLocation.latitude ?? initialLocation.coordinates?.latitude ?? null;
      const lng = initialLocation.longitude ?? initialLocation.coordinates?.longitude ?? null;
      if (lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        const roundedLat = Number(lat);
        const roundedLng = Number(lng);
        setPosition([roundedLat, roundedLng]);
        const newLink = generateOsmLink(roundedLat, roundedLng);
        setInternalLink(newLink);
        if (onLocationLinkChange && !locationLink) {
          onLocationLinkChange(newLink);
        }
      }
    }
  }, [initialLocation]);

  // Sync external locationLink if passed from parent
  useEffect(() => {
    if (locationLink && locationLink !== internalLink) {
      setInternalLink(locationLink);
      if (!position) {
        const parsed = parseOsmCoordinates(locationLink);
        if (parsed) {
          setPosition([parsed.lat, parsed.lng]);
        }
      }
    }
  }, [locationLink]);

  const markerIcon = useMemo(() => {
    return createMarkerIcon(isConfirmed ? '#10b981' : '#2563eb');
  }, [isConfirmed]);

  // Update location and auto-generate OSM link
  const updateLocationState = (lat, lng, confirmed = false, landmarkInfo = null) => {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));
    const newLink = generateOsmLink(roundedLat, roundedLng);

    setPosition([roundedLat, roundedLng]);
    setInternalLink(newLink);
    if (landmarkInfo) {
      setSelectedLandmark(landmarkInfo);
    }

    if (onLocationLinkChange) {
      onLocationLinkChange(newLink);
    }

    if (onLocationChange) {
      onLocationChange({
        latitude: roundedLat,
        longitude: roundedLng,
        location_link: newLink,
        isConfirmed: confirmed,
        landmark: landmarkInfo
      });
    }

    if (onConfirmChange) {
      onConfirmChange(confirmed);
    } else {
      setLocalConfirmed(confirmed);
    }
  };

  const handleSelectLocation = ({ lat, lng }) => {
    updateLocationState(lat, lng, false);
  };

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const { lat, lng } = marker.getLatLng();
      updateLocationState(lat, lng, false);
    }
  };

  const handleConfirmLocation = (e) => {
    e?.preventDefault();
    if (position) {
      if (onConfirmChange) {
        onConfirmChange(true);
      } else {
        setLocalConfirmed(true);
      }
      if (onLocationChange) {
        onLocationChange({
          latitude: position[0],
          longitude: position[1],
          location_link: activeLink || generateOsmLink(position[0], position[1]),
          isConfirmed: true,
          landmark: selectedLandmark
        });
      }
    }
  };

  const handleEditLocation = (e) => {
    e?.preventDefault();
    if (onConfirmChange) {
      onConfirmChange(false);
    } else {
      setLocalConfirmed(false);
    }
    if (onLocationChange && position) {
      onLocationChange({
        latitude: position[0],
        longitude: position[1],
        location_link: activeLink,
        isConfirmed: false,
        landmark: selectedLandmark
      });
    }
  };

  // Search landmarks & addresses like Google Maps
  const executeSearch = useCallback(async (queryText, isExplicit = false) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setShowResultsDropdown(true);

    try {
      // 1. Primary search with countrycodes=bd for Bangladesh landmarks/areas
      const urlWithCountry = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=bd&limit=7&accept-language=en&addressdetails=1`;
      const response = await fetch(urlWithCountry, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error('Search failed');
      let data = await response.json();

      // 2. If no results or fewer than 2, do global/Dhaka fallback query
      if (!Array.isArray(data) || data.length === 0) {
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' Dhaka')}&limit=7&accept-language=en&addressdetails=1`;
        const fbRes = await fetch(fallbackUrl);
        const fbData = await fbRes.json();
        if (Array.isArray(fbData) && fbData.length > 0) {
          data = fbData;
        } else {
          // 3. Raw global query as final fallback
          const rawUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=7&accept-language=en&addressdetails=1`;
          const rawRes = await fetch(rawUrl);
          const rawData = await rawRes.json();
          data = Array.isArray(rawData) ? rawData : [];
        }
      }

      if (data && data.length > 0) {
        setSearchResults(data);
        setSearchError('');
      } else {
        setSearchResults([]);
        if (isExplicit) {
          setSearchError(`No landmarks or places found for "${q}". Try another landmark name or area.`);
        }
      }
    } catch (err) {
      console.error('Location search error:', err);
      if (isExplicit) {
        setSearchError('Search is taking longer than usual. Please try again or click the map directly.');
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Live auto-complete search as user types (like Google Maps)
  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(text, false);
      }, 350);
    } else {
      setSearchResults([]);
      setShowResultsDropdown(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSearch(searchQuery, true);
  };

  const handleQuickChipClick = (query) => {
    setSearchQuery(query);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSearch(query, true);
  };

  // When a user selects a landmark or place result from the dropdown
  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      const primaryName = result.name || result.display_name.split(',')[0];
      const meta = getLandmarkMeta(result);
      const landmarkInfo = {
        name: primaryName,
        fullName: result.display_name,
        category: meta.tag,
        icon: meta.icon,
        address: result.address
      };

      updateLocationState(lat, lng, false, landmarkInfo);
      setShowResultsDropdown(false);
      setSearchResults([]);
      setSearchQuery(primaryName);

      // If parent supplied onAddressSelect, offer address details
      if (onAddressSelect && result.display_name) {
        onAddressSelect({
          address: result.display_name,
          city: result.address?.city || result.address?.town || result.address?.suburb || 'Dhaka',
          state: result.address?.state || 'Dhaka Division',
          zipCode: result.address?.postcode || '',
          landmark: primaryName
        });
      }
    }
  };

  // Handle manual edits or pasted links in the OpenStreetMap link input
  const handleLinkInputChange = (e) => {
    const val = e.target.value;
    setInternalLink(val);
    if (onLocationLinkChange) {
      onLocationLinkChange(val);
    }

    const parsed = parseOsmCoordinates(val);
    if (parsed) {
      setPosition([parsed.lat, parsed.lng]);
      if (onLocationChange) {
        onLocationChange({
          latitude: parsed.lat,
          longitude: parsed.lng,
          location_link: val,
          isConfirmed: false
        });
      }
      if (onConfirmChange) {
        onConfirmChange(false);
      } else {
        setLocalConfirmed(false);
      }
    }
  };

  const handleCopyLink = () => {
    if (activeLink) {
      navigator.clipboard.writeText(activeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const centerCoordinates = position || DHAKA_COORDINATES;

  return (
    <div className="location-picker-container" id="property-location-section">
      {/* Module Header */}
      <div className="location-picker-header">
        <h4 className="location-picker-title">
          📍 {title} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </h4>
        {position && (
          <span className={`location-status-badge ${isConfirmed ? 'confirmed' : 'pending'}`}>
            {isConfirmed ? '✓ Location Confirmed' : '⚠️ Pending Confirmation'}
          </span>
        )}
      </div>

      <p className={`location-picker-instructions ${isConfirmed ? 'locked' : ''}`}>
        {isConfirmed ? (
          '✓ Location is locked and confirmed. Click "Edit Location" below if you need to adjust.'
        ) : position ? (
          'Search landmarks/areas below or drag the pin to pinpoint the exact building. Then click "Confirm Location".'
        ) : (
          'Search like Google Maps by landmark (e.g. Jamuna Future Park, Square Hospital) or area, or click the map.'
        )}
      </p>

      {/* Google Maps Style Landmark & Location Search Bar */}
      {!isConfirmed && (
        <div className="location-search-wrapper" ref={searchContainerRef}>
          <form className="location-search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-group">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="location-search-input"
                placeholder="Search landmarks (e.g. Jamuna Future Park, Square Hospital, Lalbagh Fort, Dhanmondi 32)..."
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResultsDropdown(true);
                }}
              />
              {isSearching && (
                <div className="search-input-spinner" title="Searching..."></div>
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResultsDropdown(false);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn-search-location"
              disabled={isSearching || !searchQuery.trim()}
            >
              Search
            </button>
          </form>

          {/* Landmark / Area Filter Tabs & Quick Chips (Google Maps Style) */}
          <div className="landmark-chips-section">
            <div className="chips-tab-row">
              <button
                type="button"
                className={`chips-tab-btn ${activeChipTab === 'landmarks' ? 'active' : ''}`}
                onClick={() => setActiveChipTab('landmarks')}
              >
                🏛️ Famous Landmarks
              </button>
              <button
                type="button"
                className={`chips-tab-btn ${activeChipTab === 'areas' ? 'active' : ''}`}
                onClick={() => setActiveChipTab('areas')}
              >
                📍 Popular Areas
              </button>
            </div>

            <div className="location-quick-chips">
              {activeChipTab === 'landmarks' ? (
                FAMOUS_LANDMARKS.map((lm) => (
                  <button
                    key={lm.name}
                    type="button"
                    className="quick-chip-btn landmark-chip"
                    onClick={() => handleQuickChipClick(lm.name)}
                  >
                    <span>{lm.icon}</span> {lm.label}
                  </button>
                ))
              ) : (
                QUICK_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleQuickChipClick(area)}
                  >
                    📍 {area}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Google Maps Style Autocomplete Search Dropdown */}
          {showResultsDropdown && (
            <div className="location-search-dropdown">
              {isSearching && searchResults.length === 0 && (
                <div className="search-dropdown-loading">
                  <div className="search-spinner"></div> Searching landmarks & locations...
                </div>
              )}
              {searchError && (
                <div className="search-dropdown-error">
                  {searchError}
                </div>
              )}
              {searchResults.length > 0 && (
                <ul className="search-dropdown-list">
                  {searchResults.map((result, idx) => {
                    const primaryName = result.name || result.display_name.split(',')[0];
                    const fullAddress = result.display_name;
                    const meta = getLandmarkMeta(result);
                    return (
                      <li
                        key={result.place_id || idx}
                        className="search-dropdown-item"
                        onClick={() => handleSelectSearchResult(result)}
                      >
                        <div className="search-item-badge-icon" title={meta.tag}>
                          {meta.icon}
                        </div>
                        <div className="search-item-text">
                          <div className="search-item-header-row">
                            <strong className="search-item-title">{primaryName}</strong>
                            <span className="search-landmark-category-tag">{meta.tag}</span>
                          </div>
                          <span className="search-item-address">{fullAddress}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map Viewer */}
      <div className={`location-map-wrapper ${isConfirmed ? 'locked' : ''}`}>
        <MapContainer
          center={centerCoordinates}
          zoom={position ? 16 : 12}
          scrollWheelZoom={true}
          className="location-picker-map"
        >
          <TileLayer
            attribution={MAP_ATTRIBUTION}
            url={DEFAULT_TILE_URL}
          />
          <MapResizer />
          {position && <MapCenterController position={position} zoom={16} />}
          <MapClickHandler onSelectLocation={handleSelectLocation} isLocked={isConfirmed} />

          {position && (
            <Marker
              position={position}
              draggable={!isConfirmed}
              icon={markerIcon}
              eventHandlers={{
                dragend: handleDragEnd
              }}
              ref={markerRef}
            >
              <Popup>
                <div style={{ textAlign: 'center', padding: '6px', maxWidth: '220px' }}>
                  {selectedLandmark ? (
                    <>
                      <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{selectedLandmark.icon} <strong>{selectedLandmark.name}</strong></div>
                      <span style={{ fontSize: '0.78rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px' }}>
                        {selectedLandmark.category}
                      </span>
                    </>
                  ) : (
                    <strong>Property Location Pin</strong>
                  )}
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                    Lat: {position[0].toFixed(6)} | Lng: {position[1].toFixed(6)}
                  </div>
                  {!isConfirmed && (
                    <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
                      👉 Drag pin to fine-tune exact building
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Selected Landmark Hint / Banner */}
      {selectedLandmark && !isConfirmed && (
        <div className="selected-landmark-banner">
          <div className="landmark-banner-info">
            <span className="landmark-banner-icon">{selectedLandmark.icon}</span>
            <div>
              <strong>Near {selectedLandmark.name}</strong> ({selectedLandmark.category})
              <div className="landmark-banner-sub">{selectedLandmark.fullName}</div>
            </div>
          </div>
          <div className="landmark-banner-actions">
            {onAddressSelect && (
              <button
                type="button"
                className="btn-use-landmark-address"
                onClick={() => {
                  onAddressSelect({
                    address: selectedLandmark.fullName,
                    city: selectedLandmark.address?.city || selectedLandmark.address?.town || selectedLandmark.address?.suburb || 'Dhaka',
                    state: selectedLandmark.address?.state || 'Dhaka Division',
                    zipCode: selectedLandmark.address?.postcode || '',
                    landmark: selectedLandmark.name
                  });
                }}
                title="Fill property address form with this landmark location"
              >
                📝 Use this Address
              </button>
            )}
            <span className="landmark-banner-tip">💡 Drag pin to set exact apartment/flat</span>
          </div>
        </div>
      )}

      {/* OpenStreetMap Location Link (Unified right below map) */}
      <div className="osm-link-integration-card">
        <div className="osm-link-header">
          <label htmlFor="osm-location-link-input" className="osm-link-label">
            🌐 OpenStreetMap Location Link
          </label>
          <span className="osm-link-auto-tag">
            ⚡ {activeLink ? 'Auto-generated from pin' : 'Auto-generates when pinned'}
          </span>
        </div>

        <div className="osm-link-input-row">
          <input
            id="osm-location-link-input"
            type="text"
            className="osm-link-input"
            value={activeLink}
            onChange={handleLinkInputChange}
            disabled={isConfirmed}
            placeholder="Pin a location on the map or paste an OpenStreetMap URL (https://www.openstreetmap.org/...)"
            title="Auto-generates with coordinates. You can also paste an OpenStreetMap URL directly here."
          />
          <div className="osm-link-button-group">
            <button
              type="button"
              className={`btn-copy-osm-link ${copied ? 'copied' : ''}`}
              onClick={handleCopyLink}
              disabled={!activeLink}
              title="Copy OpenStreetMap link to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            {activeLink && (
              <a
                href={activeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-preview-osm-link"
                title="Preview this exact pin in OpenStreetMap"
              >
                ↗ Open in OSM
              </a>
            )}
          </div>
        </div>
        <small className="osm-link-helper-text">
          💡 This link is automatically synchronized in real time when you search landmarks, click, or drag the map pin. You can also paste an existing OpenStreetMap link to position the pin automatically.
        </small>
      </div>

      {/* Bottom Coordinates & Confirmation Action Bar */}
      <div className="location-picker-info-bar">
        <div className="coordinates-display">
          <span>Coordinates:</span>
          {position ? (
            <>
              <span className="coordinate-chip">Lat: {position[0].toFixed(6)}</span>
              <span className="coordinate-chip">Lng: {position[1].toFixed(6)}</span>
            </>
          ) : (
            <span className="no-location-selected">No location selected on map</span>
          )}
        </div>

        <div className="location-picker-actions">
          {isConfirmed ? (
            <button
              type="button"
              className="btn-edit-location"
              onClick={handleEditLocation}
            >
              ✏️ Edit Location
            </button>
          ) : (
            <button
              type="button"
              className="btn-confirm-location"
              disabled={!position}
              onClick={handleConfirmLocation}
            >
              ✓ Confirm Location
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
