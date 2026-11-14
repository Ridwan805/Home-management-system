import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPickerMap.css';

// Default tile URL and attribution (100% Free OpenStreetMap)
const DEFAULT_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Default center: Dhaka, Bangladesh
const DHAKA_COORDINATES = [23.8103, 90.4125];

// ============================================================================
// Google Maps Style Category Quick Filters
// ============================================================================
export const GOOGLE_MAP_CATEGORIES = [
  { id: 'transit', label: 'Transit / Bus', icon: '🚏', query: 'bus stop' },
  { id: 'dining', label: 'Restaurants', icon: '🍽️', query: 'restaurant' },
  { id: 'hospital', label: 'Hospitals', icon: '🏥', query: 'hospital' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', query: 'shopping mall' },
  { id: 'education', label: 'Schools', icon: '🎓', query: 'school college university' },
  { id: 'park', label: 'Parks & Lakes', icon: '🌳', query: 'park lake' },
  { id: 'mosque', label: 'Mosques', icon: '🕌', query: 'mosque' },
];

// ============================================================================
// Curated Fast-Lookup Database for Famous Dhaka Landmarks, Roads & Blocks
// (Instant offline-grade search fallback that matches Google Maps colloquial searches)
// ============================================================================
export const DHAKA_LANDMARKS_DB = [
  {
    name: 'Dhanmondi 27 Bus Stop',
    subtitle: 'Mirpur Road, Sobhanbag, Dhanmondi, Dhaka',
    road: 'Mirpur Road (Old 27)',
    block: 'Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.756032,
    lng: 90.375721,
    category: 'Bus Stop / Transit',
    icon: '🚏',
    keywords: ['dhanmondi 27', 'old 27', '27 bus stop', 'sobhanbag 27', '27 stand', 'dhanmondi 27 no']
  },
  {
    name: 'Dhanmondi 27 Police Box',
    subtitle: 'Old 27 Crossing, Mirpur Road, Dhanmondi, Dhaka',
    road: 'Old 27 (Road 16)',
    block: 'Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.756200,
    lng: 90.375500,
    category: 'Police Box / Landmark',
    icon: '🏛️',
    keywords: ['dhanmondi 27', 'police box 27', '27 police', 'dhanmondi 27 police box']
  },
  {
    name: 'Road 27 (Old) / Road 16',
    subtitle: 'Dhanmondi Residential Area, Dhaka 1209',
    road: 'Road 16 (Old 27)',
    block: 'Dhanmondi R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.755800,
    lng: 90.374200,
    category: 'Road / Street',
    icon: '🛣️',
    keywords: ['dhanmondi 27', 'road 27', 'road 16', 'dhanmondi road 27', 'road 27 old']
  },
  {
    name: '27 Dhanmondi Lake Walkway & Park',
    subtitle: 'Dhanmondi Lake West Side, Dhanmondi, Dhaka',
    road: 'Lake West Road',
    block: 'Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.754800,
    lng: 90.372900,
    category: 'Park / Lake / Nature',
    icon: '🌳',
    keywords: ['dhanmondi 27', '27 lake', 'dhanmondi 27 lake', 'lake road 27']
  },
  {
    name: 'Dhanmondi 32 Memorial & Lake',
    subtitle: 'Road 32, Dhanmondi Residential Area, Dhaka',
    road: 'Road 32',
    block: 'Dhanmondi R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.751300,
    lng: 90.377700,
    category: 'Landmark / Heritage',
    icon: '🏛️',
    keywords: ['dhanmondi 32', 'road 32', '32 museum', 'bangabandhu museum', '32 lake']
  },
  {
    name: 'Dhanmondi 32 Bus Stop',
    subtitle: 'Mirpur Road, Sukrabad / Dhanmondi 32, Dhaka',
    road: 'Mirpur Road',
    block: 'Dhanmondi / Sukrabad',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.751900,
    lng: 90.378900,
    category: 'Bus Stop / Transit',
    icon: '🚏',
    keywords: ['dhanmondi 32 bus stop', '32 bus stop', 'dhanmondi 32 stand']
  },
  {
    name: 'Road 8A Dhanmondi',
    subtitle: 'Dhanmondi Residential Area, Dhaka 1209',
    road: 'Road 8A',
    block: 'Dhanmondi R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.748300,
    lng: 90.372500,
    category: 'Road / Street',
    icon: '🛣️',
    keywords: ['road 8a', 'dhanmondi 8a', '8a dhanmondi', 'road 8a dhanmondi']
  },
  {
    name: 'Dhanmondi 15 Bus Stop / Staff Quarter',
    subtitle: 'Satmasjid Road / Road 8A, Dhanmondi, Dhaka',
    road: 'Satmasjid Road',
    block: 'Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1209',
    lat: 23.746500,
    lng: 90.371200,
    category: 'Bus Stop / Transit',
    icon: '🚏',
    keywords: ['dhanmondi 15', '15 bus stop', 'road 15', '15 stand']
  },
  {
    name: 'Dhanmondi 4 / Kalabagan',
    subtitle: 'Road 4, Dhanmondi / Kalabagan, Dhaka',
    road: 'Road 4',
    block: 'Dhanmondi / Kalabagan',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1205',
    lat: 23.744100,
    lng: 90.381200,
    category: 'Road / Street',
    icon: '🛣️',
    keywords: ['dhanmondi 4', 'road 4', 'dhanmondi road 4']
  },
  {
    name: 'Dhanmondi Lake Park & Rabindra Sarobar',
    subtitle: 'Road 8, Dhanmondi R/A, Dhaka 1205',
    road: 'Road 8',
    block: 'Dhanmondi R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1205',
    lat: 23.747800,
    lng: 90.378900,
    category: 'Park / Lake / Culture',
    icon: '🌳',
    keywords: ['rabindra sarobar', 'dhanmondi lake', 'lake park', 'road 8 lake']
  },
  {
    name: 'Gulshan 2 Circle',
    subtitle: 'Gulshan 2, Gulshan Avenue, Dhaka 1212',
    road: 'Gulshan Avenue',
    block: 'Gulshan 2',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    lat: 23.792500,
    lng: 90.415000,
    category: 'Commercial / Circle',
    icon: '🏢',
    keywords: ['gulshan 2', 'gulshan 2 circle', 'gulshan golchokkor']
  },
  {
    name: 'Gulshan 1 Circle',
    subtitle: 'Gulshan 1, Gulshan Avenue, Dhaka 1212',
    road: 'Gulshan Avenue',
    block: 'Gulshan 1',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1212',
    lat: 23.778800,
    lng: 90.417200,
    category: 'Commercial / Circle',
    icon: '🏢',
    keywords: ['gulshan 1', 'gulshan 1 circle', 'gulshan 1 golchokkor']
  },
  {
    name: 'Banani 11 Commercial Hub',
    subtitle: 'Road 11, Banani, Dhaka 1213',
    road: 'Road 11',
    block: 'Banani',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1213',
    lat: 23.793700,
    lng: 90.404500,
    category: 'Shopping & Dining',
    icon: '🛍️',
    keywords: ['banani 11', 'road 11 banani', 'banani road 11']
  },
  {
    name: 'Uttara Sector 3',
    subtitle: 'Sector 3, Uttara Model Town, Dhaka 1230',
    road: 'Rabindra Sarani / Road 2',
    block: 'Sector 3, Uttara',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1230',
    lat: 23.868700,
    lng: 90.398600,
    category: 'Block / Sector',
    icon: '🏘️',
    keywords: ['uttara sector 3', 'sector 3 uttara', 'uttara 3']
  },
  {
    name: 'Bashundhara Block C',
    subtitle: 'Block C, Bashundhara Residential Area, Dhaka',
    road: 'Main Avenue, Block C',
    block: 'Block C, Bashundhara R/A',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1229',
    lat: 23.816400,
    lng: 90.428500,
    category: 'Block / Sector',
    icon: '🏘️',
    keywords: ['bashundhara block c', 'block c bashundhara', 'bashundhara c block']
  },
  {
    name: 'Mirpur 10 Circle & Metro Station',
    subtitle: 'Begum Rokeya Sarani, Mirpur 10, Dhaka 1216',
    road: 'Begum Rokeya Sarani',
    block: 'Mirpur 10',
    city: 'Dhaka',
    state: 'Dhaka Division',
    zipCode: '1216',
    lat: 23.807000,
    lng: 90.368500,
    category: 'Metro / Transit Station',
    icon: '🚊',
    keywords: ['mirpur 10', 'mirpur 10 circle', 'mirpur 10 metro', 'mirpur 10 golchokkor']
  }
];

// Helper to identify categories, icons, and tags for roads, blocks, areas, and buildings
export function getLandmarkMeta(item) {
  const c = item.class || item.osm_key || '';
  const t = item.type || item.osm_value || '';
  const addr = item.address || item.properties || {};

  // Transit
  if (c === 'highway' && (t === 'bus_stop' || t === 'station') || t === 'bus_stop' || t === 'station' || t === 'subway_entrance' || t === 'halt') {
    return { icon: '🚏', tag: 'Bus Stop / Transit' };
  }
  // Dining
  if ((c === 'amenity' || c === 'tourism') && (t === 'restaurant' || t === 'cafe' || t === 'fast_food' || t === 'food_court' || t === 'bar')) {
    return { icon: '🍽️', tag: 'Restaurant / Dining' };
  }
  // Healthcare
  if (c === 'amenity' && (t === 'hospital' || t === 'clinic' || t === 'pharmacy' || t === 'doctors')) {
    return { icon: '🏥', tag: 'Hospital / Healthcare' };
  }
  // Shopping / Commercial
  if (c === 'shop' || t === 'mall' || t === 'supermarket' || t === 'department_store' || t === 'marketplace') {
    return { icon: '🛍️', tag: 'Shopping / Retail' };
  }
  // Education
  if (c === 'amenity' && (t === 'university' || t === 'college' || t === 'school' || t === 'kindergarten' || t === 'research_institute')) {
    return { icon: '🎓', tag: 'Education / Campus' };
  }
  // Historic / Tourism / Government
  if (c === 'historic' || c === 'tourism' || t === 'museum' || t === 'monument' || t === 'police' || t === 'townhall' || t === 'government') {
    return { icon: '🏛️', tag: 'Landmark / Government' };
  }
  // Parks & Nature
  if (c === 'leisure' || c === 'water' || t === 'park' || t === 'garden' || t === 'lake' || t === 'stadium' || t === 'sports_centre') {
    return { icon: '🌳', tag: 'Park / Lake / Nature' };
  }
  // Worship
  if (c === 'amenity' && (t === 'place_of_worship' || t === 'mosque' || t === 'temple' || t === 'church')) {
    return { icon: '🕌', tag: 'Place of Worship' };
  }
  // Roads and Streets
  if (c === 'highway' || t === 'road' || t === 'residential' || t === 'primary' || t === 'secondary' || t === 'tertiary' || t === 'living_street' || t === 'street') {
    return { icon: '🛣️', tag: 'Road / Street' };
  }
  // Blocks, Sectors, and Neighborhoods
  if (t === 'suburb' || t === 'neighbourhood' || t === 'quarter' || t === 'block' || t === 'sector' || c === 'place') {
    return { icon: '🏘️', tag: 'Block / Sector / Area' };
  }
  // Buildings / Offices
  if (c === 'building' || c === 'office' || t === 'commercial') {
    return { icon: '🏢', tag: 'Building / Complex' };
  }
  // Default to Road if road address detail exists
  if (addr.road || addr.street) {
    return { icon: '🛣️', tag: 'Road / Street' };
  }
  return { icon: '📍', tag: 'Address / Location' };
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

  const coordRegex = /(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const match = trimmed.match(coordRegex);
  if (match && match.length === 3) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

// Custom modern SVG map marker (Google Maps style pin)
function createMarkerIcon(color = '#2563eb') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="34" height="46">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M16 2 C8.268 2 2 8.268 2 16 C2 26 16 42 16 42 C16 42 30 26 30 16 C30 8.268 23.732 2 16 2 Z"
            fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)" />
      <circle cx="16" cy="15" r="5.5" fill="#ffffff"/>
      <circle cx="16" cy="15" r="2.5" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker-pin',
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -44],
  });
}

// Leaflet click handler component
function MapClickHandler({ onSelectLocation, isLocked }) {
  useMapEvents({
    click(e) {
      if (isLocked) return;
      onSelectLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Smooth Google Maps Style FlyTo Controller
function MapFlyController({ position, zoom }) {
  const map = useMap();
  const prevPositionRef = useRef(null);

  useEffect(() => {
    if (position) {
      const [lat, lng] = position;
      const prev = prevPositionRef.current;
      
      // If position actually changed, execute smooth Google Maps flyTo
      if (!prev || prev[0] !== lat || prev[1] !== lng) {
        prevPositionRef.current = position;
        map.flyTo(position, zoom || 17, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    }
  }, [position, zoom, map]);

  return null;
}

// Map invalidation resizer
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

export default function LocationPickerMap({
  initialLocation = null,
  onLocationChange = null,
  isConfirmed = false,
  onConfirmChange = null,
  locationLink = '',
  onLocationLinkChange = null,
  onAddressSelect = null,
  required = false,
  title = "Property Location"
}) {
  const [position, setPosition] = useState(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      return [Number(initialLocation.latitude), Number(initialLocation.longitude)];
    }
    if (initialLocation?.coordinates?.latitude && initialLocation?.coordinates?.longitude) {
      return [Number(initialLocation.coordinates.latitude), Number(initialLocation.coordinates.longitude)];
    }
    return null;
  });

  const [internalLink, setInternalLink] = useState(locationLink || '');
  const [copied, setCopied] = useState(false);
  const [localConfirmed, setLocalConfirmed] = useState(isConfirmed);

  // Real-time Road / Block / Address resolution state
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  // Google Maps Search Engine state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const markerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const searchContainerRef = useRef(null);

  const activeConfirmed = onConfirmChange ? isConfirmed : localConfirmed;
  const activeLink = locationLink || internalLink;
  const centerCoordinates = position || DHAKA_COORDINATES;

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResultsDropdown(false);
        setIsFocused(false);
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
    return createMarkerIcon(activeConfirmed ? '#10b981' : '#2563eb');
  }, [activeConfirmed]);

  // Real-time Reverse Geocoding: Look up exact road, block, sector, neighborhood, and city from OpenStreetMap
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsResolvingAddress(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;

          // Road identification (e.g. Road 8A, Mirpur Road, Pragati Sarani)
          const road = addr.road || addr.pedestrian || addr.street || addr.highway || addr.path || '';

          // Block / Sector / Neighborhood (e.g. Block C, Sector 4, Dhanmondi, Bashundhara R/A)
          const block = addr.block || addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || '';

          // House / Plot / Building number
          const house = addr.house_number || addr.building || '';

          // City & State
          const city = addr.city || addr.town || addr.city_district || addr.county || 'Dhaka';
          const state = addr.state || 'Dhaka Division';
          const zipCode = addr.postcode || '';

          // Build precise formatted street address
          let formattedStreet = '';
          if (house && road) {
            formattedStreet = `House ${house}, ${road}`;
          } else if (road) {
            formattedStreet = road;
          }
          if (block && formattedStreet) {
            formattedStreet = `${formattedStreet}, ${block}`;
          } else if (block) {
            formattedStreet = block;
          }
          if (!formattedStreet) {
            formattedStreet = data.display_name.split(',').slice(0, 3).join(',').trim();
          }

          const primaryName = road || block || data.display_name.split(',')[0];
          const info = {
            name: primaryName,
            road: road,
            block: block,
            fullName: data.display_name,
            formattedStreet: formattedStreet,
            city: city,
            state: state,
            zipCode: zipCode,
            category: road ? 'Road / Street' : (block ? 'Block / Sector' : 'Identified Location'),
            icon: road ? '🛣️' : (block ? '🏘️' : '📍')
          };

          setResolvedLocation(info);

          // Update parent form's address, city, state, zipCode automatically in real time!
          if (onAddressSelect) {
            onAddressSelect({
              address: formattedStreet,
              city: city,
              state: state,
              zipCode: zipCode,
              landmark: primaryName
            });
          }
        }
      }
    } catch (err) {
      console.warn('Real-time reverse geocode error:', err);
    } finally {
      setIsResolvingAddress(false);
    }
  }, [onAddressSelect]);

  // Update location and auto-generate OSM link
  const updateLocationState = (lat, lng, confirmed = false, locationMeta = null) => {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));
    const newLink = generateOsmLink(roundedLat, roundedLng);

    setPosition([roundedLat, roundedLng]);
    setInternalLink(newLink);

    if (locationMeta) {
      setResolvedLocation(locationMeta);
    } else {
      // Trigger real-time reverse lookup for road and block
      reverseGeocode(roundedLat, roundedLng);
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
        landmark: locationMeta
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
          landmark: resolvedLocation
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
        landmark: resolvedLocation
      });
    }
  };

  // ============================================================================
  // GOOGLE MAPS STYLE DUAL-ENGINE SEARCH (Photon Elasticsearch + Curated DB + Nominatim)
  // ============================================================================
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

    const qLower = q.toLowerCase();
    const aggregatedResults = [];
    const seenCoordKeys = new Set();

    const addCandidate = (item) => {
      const key = `${item.title.toLowerCase()}_${item.lat.toFixed(4)}_${item.lng.toFixed(4)}`;
      if (!seenCoordKeys.has(key)) {
        seenCoordKeys.add(key);
        aggregatedResults.push(item);
      }
    };

    // 1. Check Fast Curated Landmarks DB first (handles colloquial queries like "dhanmondi 27", "road 27", "dhanmondi 32")
    const dbMatches = DHAKA_LANDMARKS_DB.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(qLower);
      const subMatch = item.subtitle.toLowerCase().includes(qLower);
      const kwMatch = item.keywords.some(k => k.includes(qLower) || qLower.includes(k));
      return nameMatch || subMatch || kwMatch;
    });

    dbMatches.forEach(item => {
      addCandidate({
        id: `curated-${item.name}-${item.lat}`,
        title: item.name,
        subtitle: item.subtitle,
        road: item.road,
        block: item.block,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        category: item.category,
        icon: item.icon,
        lat: item.lat,
        lng: item.lng,
        isCurated: true,
      });
    });

    // 2. Query Live OpenStreetMap Search Engine (Photon Elasticsearch API + Nominatim API)
    try {
      const currentLat = position ? position[0] : DHAKA_COORDINATES[0];
      const currentLon = position ? position[1] : DHAKA_COORDINATES[1];

      // Prepare search queries including colloquial number variations (e.g. "dhanmondi 27" -> "road 27 dhanmondi")
      const queriesToTry = [q];
      if (/\d+/.test(q)) {
        queriesToTry.push(q.replace(/(\d+)/, 'road $1'));
      }

      // Execute live Photon queries with Dhaka / current viewport bias
      const photonPromises = queriesToTry.map(queryItem => {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryItem)}&lat=${currentLat}&lon=${currentLon}&limit=8`;
        return fetch(photonUrl).then(r => r.ok ? r.json() : null).catch(() => null);
      });

      // Execute live Nominatim query in parallel
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=bd&limit=6&addressdetails=1`;
      const nomPromise = fetch(nomUrl, { headers: { 'Accept': 'application/json' } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const [photonResults, nomResults] = await Promise.all([
        Promise.all(photonPromises),
        nomPromise
      ]);

      // Process Photon features
      if (Array.isArray(photonResults)) {
        photonResults.forEach(pData => {
          if (pData && Array.isArray(pData.features)) {
            pData.features.forEach(f => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates;
              if (coords && coords.length >= 2) {
                const lng = coords[0];
                const lat = coords[1];
                const meta = getLandmarkMeta(f);

                const primaryName = p.name || p.street || q;
                const road = p.street || (p.osm_key === 'highway' ? p.name : '') || '';
                const block = p.district || p.suburb || p.neighbourhood || '';
                const city = p.city || 'Dhaka';
                const state = p.state || 'Dhaka Division';
                const zipCode = p.postcode || '';

                const subDetails = [road, block, city].filter(Boolean).join(', ');

                addCandidate({
                  id: `photon-${p.osm_id || Math.random()}`,
                  title: primaryName,
                  subtitle: subDetails || `${city}, Bangladesh`,
                  road: road,
                  block: block,
                  city: city,
                  state: state,
                  zipCode: zipCode,
                  category: meta.tag,
                  icon: meta.icon,
                  lat: lat,
                  lng: lng,
                  isCurated: false,
                });
              }
            });
          }
        });
      }

      // Process Nominatim results
      if (Array.isArray(nomResults)) {
        nomResults.forEach(item => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            const addr = item.address || {};
            const meta = getLandmarkMeta(item);
            const road = addr.road || addr.street || '';
            const block = addr.block || addr.neighbourhood || addr.suburb || '';
            const city = addr.city || addr.town || addr.city_district || 'Dhaka';
            const state = addr.state || 'Dhaka Division';
            const zipCode = addr.postcode || '';
            const primaryName = road || block || item.name || item.display_name.split(',')[0];

            addCandidate({
              id: `nom-${item.place_id || Math.random()}`,
              title: primaryName,
              subtitle: item.display_name.split(',').slice(0, 4).join(', '),
              road: road,
              block: block,
              city: city,
              state: state,
              zipCode: zipCode,
              category: meta.tag,
              icon: meta.icon,
              lat: lat,
              lng: lng,
              isCurated: false,
            });
          }
        });
      }

      if (aggregatedResults.length > 0) {
        setSearchResults(aggregatedResults);
        setSearchError('');
      } else {
        setSearchResults([]);
        if (isExplicit) {
          setSearchError(`No places found for "${q}". Try typing the road name, block, or area.`);
        }
      }
    } catch (err) {
      console.error('Location search error:', err);
      if (aggregatedResults.length > 0) {
        setSearchResults(aggregatedResults);
      } else if (isExplicit) {
        setSearchError('Search request timed out. Please try clicking directly on the map.');
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, position]);

  // Live auto-complete search as user types
  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    setActiveCategory(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(text, false);
      }, 300);
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

  // Google Maps Category Chip Quick Search
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.id);
    // Search for this category near currently pinned location or Dhaka center
    const areaName = resolvedLocation?.block || resolvedLocation?.name || 'Dhaka';
    const query = `${cat.query} ${areaName}`;
    setSearchQuery(cat.label);
    executeSearch(query, true);
  };

  // When user selects a road, block, or location result from the Google Maps dropdown
  const handleSelectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Build structured street address
      let formattedStreet = '';
      if (result.road && result.block) {
        formattedStreet = `${result.road}, ${result.block}`;
      } else if (result.road) {
        formattedStreet = result.road;
      } else if (result.block) {
        formattedStreet = result.block;
      } else {
        formattedStreet = result.title;
      }

      const locationInfo = {
        name: result.title,
        road: result.road || '',
        block: result.block || '',
        fullName: `${result.title}, ${result.subtitle}`,
        formattedStreet: formattedStreet,
        city: result.city || 'Dhaka',
        state: result.state || 'Dhaka Division',
        zipCode: result.zipCode || '',
        category: result.category,
        icon: result.icon
      };

      updateLocationState(lat, lng, false, locationInfo);
      setShowResultsDropdown(false);
      setIsFocused(false);
      setSearchQuery(result.title);

      if (onAddressSelect) {
        onAddressSelect({
          address: formattedStreet,
          city: result.city || 'Dhaka',
          state: result.state || 'Dhaka Division',
          zipCode: result.zipCode || '',
          landmark: result.title
        });
      }
    }
  };

  // Handle manual edits or pasted links in OpenStreetMap link input
  const handleLinkInputChange = (e) => {
    const val = e.target.value;
    setInternalLink(val);
    if (onLocationLinkChange) {
      onLocationLinkChange(val);
    }

    const parsed = parseOsmCoordinates(val);
    if (parsed) {
      setPosition([parsed.lat, parsed.lng]);
      reverseGeocode(parsed.lat, parsed.lng);
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
    if (!activeLink) return;
    navigator.clipboard.writeText(activeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="location-picker-container">
      {/* Header */}
      <div className="location-picker-header">
        <h3 className="location-picker-title">
          <span>📍</span> {title} {required && <span className="location-required">*</span>}
        </h3>
        <div className={`location-status-badge ${activeConfirmed ? 'confirmed' : 'pending'}`}>
          {activeConfirmed ? '✓ Location Confirmed' : '⚠️ Location Unconfirmed'}
        </div>
      </div>

      <p className={`location-picker-instructions ${activeConfirmed ? 'locked' : ''}`}>
        {activeConfirmed ? (
          '✓ Property location confirmed on real-time map. Click "Edit Location" below to make changes.'
        ) : (
          '⚡ Search any road, block, bus stop, landmark (like Google Maps), or click directly anywhere on the map.'
        )}
      </p>

      {/* Google Maps Style Search & Filter Bar */}
      {!activeConfirmed && (
        <div className="location-search-wrapper" ref={searchContainerRef}>
          <form className="location-search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-group">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="location-search-input"
                placeholder="Search Google Maps style: e.g. Dhanmondi 27, Road 8A, Gulshan 2, Uttara 3..."
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => {
                  setIsFocused(true);
                  setShowResultsDropdown(true);
                }}
              />
              {isSearching && <span className="search-input-spinner"></span>}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResultsDropdown(false);
                    setActiveCategory(null);
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

          {/* Google Maps Quick Filter Category Chips */}
          <div className="gmap-category-pills-bar">
            {GOOGLE_MAP_CATEGORIES.map(cat => (
              <button
                type="button"
                key={cat.id}
                className={`gmap-category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span className="gmap-cat-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Autocomplete Search Dropdown (Google Maps Floating Style) */}
          {showResultsDropdown && (
            <div className="location-search-dropdown">
              {isSearching && searchResults.length === 0 && (
                <div className="search-dropdown-loading">
                  <div className="search-spinner"></div> Searching Google Maps places & roads in real time...
                </div>
              )}
              {searchError && (
                <div className="search-dropdown-error">
                  {searchError}
                </div>
              )}

              {/* Real-time search results list */}
              {searchResults.length > 0 && (
                <ul className="search-dropdown-list">
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      className="search-dropdown-item"
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      <div className="search-item-badge-icon" title={result.category}>
                        {result.icon}
                      </div>
                      <div className="search-item-text">
                        <div className="search-item-header-row">
                          <strong className="search-item-title">{result.title}</strong>
                          <span className="search-landmark-category-tag">{result.category}</span>
                        </div>
                        <span className="search-item-address">{result.subtitle}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Google Maps Style Popular Recommendations on Empty Focus */}
              {searchResults.length === 0 && !isSearching && !searchError && isFocused && (
                <div className="search-empty-focus-suggestions">
                  <div className="search-suggestions-header">
                    <span>🕒</span> POPULAR PLACES IN DHAKA
                  </div>
                  <ul className="search-dropdown-list">
                    {DHAKA_LANDMARKS_DB.slice(0, 6).map((item) => (
                      <li
                        key={`pop-${item.name}`}
                        className="search-dropdown-item"
                        onClick={() => handleSelectSearchResult({
                          id: `pop-${item.name}`,
                          title: item.name,
                          subtitle: item.subtitle,
                          road: item.road,
                          block: item.block,
                          city: item.city,
                          state: item.state,
                          zipCode: item.zipCode,
                          category: item.category,
                          icon: item.icon,
                          lat: item.lat,
                          lng: item.lng,
                        })}
                      >
                        <div className="search-item-badge-icon">
                          {item.icon}
                        </div>
                        <div className="search-item-text">
                          <div className="search-item-header-row">
                            <strong className="search-item-title">{item.name}</strong>
                            <span className="search-landmark-category-tag">{item.category}</span>
                          </div>
                          <span className="search-item-address">{item.subtitle}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map Viewer with Smooth Google Maps FlyTo */}
      <div className={`location-map-wrapper ${activeConfirmed ? 'locked' : ''}`}>
        <MapContainer
          center={centerCoordinates}
          zoom={position ? 16 : 13}
          scrollWheelZoom={true}
          className="location-picker-map"
        >
          <TileLayer
            attribution={MAP_ATTRIBUTION}
            url={DEFAULT_TILE_URL}
          />
          <MapResizer />
          {position && <MapFlyController position={position} zoom={17} />}
          <MapClickHandler onSelectLocation={handleSelectLocation} isLocked={activeConfirmed} />

          {position && (
            <Marker
              position={position}
              draggable={!activeConfirmed}
              icon={markerIcon}
              eventHandlers={{
                dragend: handleDragEnd
              }}
              ref={markerRef}
            >
              <Popup>
                <div style={{ textAlign: 'center', padding: '6px', maxWidth: '240px' }}>
                  {resolvedLocation ? (
                    <>
                      <div style={{ fontSize: '1rem', marginBottom: '3px' }}>
                        {resolvedLocation.icon || '📍'} <strong>{resolvedLocation.road || resolvedLocation.name}</strong>
                      </div>
                      {resolvedLocation.block && (
                        <div style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600, marginBottom: '3px' }}>
                          🏘️ {resolvedLocation.block}
                        </div>
                      )}
                      <span style={{ fontSize: '0.78rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px', border: '1px solid #bfdbfe' }}>
                        {resolvedLocation.category}
                      </span>
                    </>
                  ) : (
                    <strong>Property Location Pin</strong>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Lat: {position[0].toFixed(6)} | Lng: {position[1].toFixed(6)}
                  </div>
                  {!activeConfirmed && (
                    <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '5px', fontWeight: 500 }}>
                      👉 Drag pin to any road or building to update
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Real-time Resolved Place Details Card (Google Maps Style Place Preview) */}
      {resolvedLocation && !activeConfirmed && (
        <div className="realtime-resolved-card">
          <div className="resolved-card-header">
            <span className="resolved-card-badge">
              <span className="live-pulse-dot" style={{ marginRight: '6px' }}></span>
              Google Maps Style Pinned Location
            </span>
            {isResolvingAddress && <span className="resolving-indicator">Identifying road & block...</span>}
          </div>
          <div className="resolved-card-body">
            <div className="resolved-main-line">
              <span className="resolved-road-icon">{resolvedLocation.icon || '📍'}</span>
              <div>
                <strong className="resolved-road-name">
                  {resolvedLocation.road || resolvedLocation.formattedStreet || resolvedLocation.name}
                </strong>
                {resolvedLocation.block && (
                  <span className="resolved-block-tag">Area: {resolvedLocation.block}</span>
                )}
                {resolvedLocation.category && (
                  <span className="search-landmark-category-tag" style={{ marginLeft: '6px' }}>
                    {resolvedLocation.category}
                  </span>
                )}
              </div>
            </div>
            <div className="resolved-full-addr">
              {resolvedLocation.fullName}
            </div>
          </div>
        </div>
      )}

      {/* OpenStreetMap Location Link (Unified right below map) */}
      <div className="osm-link-integration-card">
        <div className="osm-link-header">
          <label htmlFor="osm-location-link-input" className="osm-link-label">
            🌐 OpenStreetMap Real-Time Link
          </label>
          <span className="osm-link-auto-tag">
            ⚡ {activeLink ? 'Auto-synchronized with pin' : 'Auto-generates when pinned'}
          </span>
        </div>

        <div className="osm-link-input-row">
          <input
            id="osm-location-link-input"
            type="text"
            className="osm-link-input"
            value={activeLink}
            onChange={handleLinkInputChange}
            disabled={activeConfirmed}
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
          💡 100% Free real-time live map. Searching, clicking, or dragging the pin automatically identifies the exact road, block, and coordinates.
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
          {activeConfirmed ? (
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
