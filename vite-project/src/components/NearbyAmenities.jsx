import React, { useState, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import locationService from '../services/LocationService';
import './NearbyAmenities.css';

// Icons for different amenity types
const amenityIcons = {
  restaurant: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#ff6b6b" cx="12" cy="12" r="10"/>
        <path fill="white" d="M8.5 8.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v3h-5v-3zm7 0v7h-1v-7c0-2-1.5-3.5-3.5-3.5s-3.5 1.5-3.5 3.5v7h-1v-7c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  hospital: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#e74c3c" cx="12" cy="12" r="10"/>
        <path fill="white" d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  school: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#3498db" cx="12" cy="12" r="10"/>
        <path fill="white" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6zM18.82 9L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  bank: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#f39c12" cx="12" cy="12" r="10"/>
        <path fill="white" d="M11.5 1L2 6v2h20V6l-9.5-5zM4 9v10h3v-8h2v8h2v-8h2v8h2v-8h3v8h3V9H4z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  pharmacy: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#2ecc71" cx="12" cy="12" r="10"/>
        <path fill="white" d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  bus_stop: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#9b59b6" cx="12" cy="12" r="10"/>
        <path fill="white" d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }),
  
  default: new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle fill="#95a5a6" cx="12" cy="12" r="10"/>
        <circle fill="white" cx="12" cy="12" r="3"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  })
};

const NearbyAmenities = ({ 
  propertyLocation, 
  radius = 1000, 
  showAmenities = true,
  amenityTypes = ['restaurant', 'hospital', 'school', 'bank', 'pharmacy', 'bus_stop']
}) => {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(amenityTypes);

  // Fetch nearby amenities
  useEffect(() => {
    const fetchAmenities = async () => {
      if (!propertyLocation || !propertyLocation.lat || !propertyLocation.lng) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const pois = await locationService.getNearbyPOIs(
          propertyLocation.lat,
          propertyLocation.lng,
          radius,
          ['amenity', 'shop', 'public_transport']
        );

        // Filter and categorize POIs
        const categorizedAmenities = pois
          .filter(poi => poi.name && poi.name !== 'Unknown')
          .map(poi => {
            const category = categorizeAmenity(poi);
            return {
              ...poi,
              category,
              icon: amenityIcons[category] || amenityIcons.default
            };
          })
          .filter(amenity => selectedTypes.includes(amenity.category))
          .slice(0, 50); // Limit to 50 amenities for performance

        setAmenities(categorizedAmenities);
      } catch (err) {
        console.error('Error fetching amenities:', err);
        setError('Unable to load nearby amenities');
      } finally {
        setLoading(false);
      }
    };

    fetchAmenities();
  }, [propertyLocation, radius, selectedTypes]);

  // Categorize amenity based on tags
  const categorizeAmenity = (poi) => {
    const tags = poi.tags || {};
    
    // Restaurant/Food
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || 
        tags.amenity === 'fast_food' || tags.shop === 'bakery') {
      return 'restaurant';
    }
    
    // Healthcare
    if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || 
        tags.amenity === 'doctors') {
      return 'hospital';
    }
    
    // Education
    if (tags.amenity === 'school' || tags.amenity === 'university' || 
        tags.amenity === 'college' || tags.amenity === 'kindergarten') {
      return 'school';
    }
    
    // Banking
    if (tags.amenity === 'bank' || tags.amenity === 'atm') {
      return 'bank';
    }
    
    // Pharmacy
    if (tags.amenity === 'pharmacy') {
      return 'pharmacy';
    }
    
    // Public Transport
    if (tags.public_transport === 'stop_position' || 
        tags.highway === 'bus_stop' || 
        tags.public_transport === 'platform') {
      return 'bus_stop';
    }
    
    return 'default';
  };

  // Get amenity display name
  const getAmenityDisplayName = (category) => {
    const names = {
      restaurant: 'Restaurants',
      hospital: 'Healthcare',
      school: 'Education',
      bank: 'Banking',
      pharmacy: 'Pharmacy',
      bus_stop: 'Transport',
      default: 'Other'
    };
    return names[category] || 'Other';
  };

  // Toggle amenity type visibility
  const toggleAmenityType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!showAmenities) {
    return null;
  }

  return (
    <>
      {/* Amenity Filter Controls */}
      <div className="amenity-controls">
        <h4>Nearby Amenities</h4>
        <div className="amenity-filters">
          {amenityTypes.map(type => {
            const count = amenities.filter(a => a.category === type).length;
            return (
              <button
                key={type}
                className={`amenity-filter ${selectedTypes.includes(type) ? 'active' : ''}`}
                onClick={() => toggleAmenityType(type)}
                disabled={loading}
              >
                <span className="filter-icon">
                  {type === 'restaurant' && '🍽️'}
                  {type === 'hospital' && '🏥'}
                  {type === 'school' && '🏫'}
                  {type === 'bank' && '🏦'}
                  {type === 'pharmacy' && '💊'}
                  {type === 'bus_stop' && '🚌'}
                </span>
                <span className="filter-name">{getAmenityDisplayName(type)}</span>
                {count > 0 && <span className="filter-count">({count})</span>}
              </button>
            );
          })}
        </div>
        
        {loading && (
          <div className="amenity-loading">
            <span className="loading-spinner">🔄</span>
            Loading nearby amenities...
          </div>
        )}
        
        {error && (
          <div className="amenity-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      {/* Amenity Markers */}
      {amenities.map(amenity => (
        <Marker
          key={`${amenity.id}-${amenity.category}`}
          position={[amenity.lat, amenity.lng]}
          icon={amenity.icon}
        >
          <Popup>
            <div className="amenity-popup">
              <div className="amenity-header">
                <h4>{amenity.name}</h4>
                <span className="amenity-category">
                  {getAmenityDisplayName(amenity.category)}
                </span>
              </div>
              
              <div className="amenity-details">
                <div className="amenity-distance">
                  📍 {locationService.formatDistance(amenity.distance)} away
                </div>
                
                {amenity.tags.opening_hours && (
                  <div className="amenity-hours">
                    🕒 {amenity.tags.opening_hours}
                  </div>
                )}
                
                {amenity.tags.phone && (
                  <div className="amenity-phone">
                    📞 {amenity.tags.phone}
                  </div>
                )}
                
                {amenity.tags.website && (
                  <div className="amenity-website">
                    <a 
                      href={amenity.tags.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      🌐 Website
                    </a>
                  </div>
                )}
              </div>
              
              <div className="amenity-actions">
                <button
                  className="directions-btn"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/${propertyLocation.lat},${propertyLocation.lng}/${amenity.lat},${amenity.lng}`;
                    window.open(url, '_blank');
                  }}
                >
                  🧭 Directions
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default NearbyAmenities;