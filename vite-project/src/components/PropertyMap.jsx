import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom property marker icon
const propertyIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="#e74c3c" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="white" cx="12" cy="9" r="3"/>
      <path fill="#c0392b" d="M12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// User location marker icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle fill="#3498db" cx="12" cy="12" r="10"/>
      <circle fill="white" cx="12" cy="12" r="6"/>
      <circle fill="#2980b9" cx="12" cy="12" r="3"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Component to handle map events and updates
const MapController = ({ center, zoom, onMapReady }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 15);
    }
    if (onMapReady) {
      onMapReady(map);
    }
  }, [center, zoom, map, onMapReady]);
  
  return null;
};

const PropertyMap = ({ 
  property, 
  userLocation = null, 
  showUserLocation = true,
  height = '400px',
  zoom = 15,
  onMapReady = null,
  className = '',
  showRouting = false
}) => {
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Default to Dhaka
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [geocodingError, setGeocodingError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUserLocation, setCurrentUserLocation] = useState(userLocation);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);

  // Check online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check geolocation permission status
  const checkLocationPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state);
        
        permission.addEventListener('change', () => {
          setLocationPermission(permission.state);
        });
      } catch (err) {
        console.warn('Permission API not supported:', err);
      }
    }
  }, []);

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // Geocode property address with retry logic
  const geocodeProperty = useCallback(async (retryAttempt = 0) => {
    if (!property?.address) {
      setError('Property address not available');
      setIsLoading(false);
      return;
    }

    if (isOffline) {
      setError('Map requires internet connection');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setGeocodingError(null);
      
      // Use Nominatim (OpenStreetMap) geocoding service
      const address = `${property.address}, ${property.city || ''}, ${property.state || ''}, Bangladesh`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setRetryCount(0);
      } else {
        // Fallback to city coordinates if available
        if (property.city) {
          const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(property.city + ', Bangladesh')}&limit=1`
          );
          const cityData = await cityResponse.json();
          if (cityData && cityData.length > 0) {
            const lat = parseFloat(cityData[0].lat);
            const lon = parseFloat(cityData[0].lon);
            setMapCenter([lat, lon]);
            setRetryCount(0);
          } else {
            throw new Error('Unable to find property location');
          }
        } else {
          throw new Error('Unable to find property location');
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      
      if (retryAttempt < 2) {
        // Retry up to 2 times with exponential backoff
        setTimeout(() => {
          setRetryCount(retryAttempt + 1);
          geocodeProperty(retryAttempt + 1);
        }, Math.pow(2, retryAttempt) * 1000);
        setGeocodingError(`Retrying... (${retryAttempt + 1}/3)`);
      } else {
        setError('Failed to locate property address. Please check the address and try again.');
        setGeocodingError(null);
      }
    } finally {
      if (retryAttempt === 0) {
        setIsLoading(false);
      }
    }
  }, [property?.address, property?.city, property?.state, isOffline]);

  useEffect(() => {
    geocodeProperty();
  }, [geocodeProperty]);

  // Get user location with permission handling
  const getUserLocation = useCallback(async () => {
    if (!showUserLocation) return;
    
    if (locationPermission === 'denied') {
      console.warn('Geolocation permission denied');
      return;
    }

    if (isOffline) {
      console.warn('Cannot get location while offline');
      return;
    }
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });
      
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setCurrentUserLocation(location);
      
      // Start watching location for real-time updates
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (newPosition) => {
          const newLocation = {
            lat: newPosition.coords.latitude,
            lng: newPosition.coords.longitude
          };
          setCurrentUserLocation(newLocation);
        },
        (err) => {
          console.warn('Location watch error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } catch (err) {
      console.warn('Could not get user location:', err);
      if (err.code === 1) {
        setLocationPermission('denied');
      }
    }
  }, [showUserLocation, locationPermission, isOffline]);

  useEffect(() => {
    getUserLocation();
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [getUserLocation]);

  // Handle retry for failed operations
  const handleRetry = () => {
    setError(null);
    setGeocodingError(null);
    setRetryCount(0);
    geocodeProperty();
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      await getUserLocation();
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className={`property-map-container ${className}`} style={{ height }}>
        <div className="map-loading">
          <div className="loading-spinner">🗺️</div>
          <div>
            <p>Loading map...</p>
            {geocodingError && (
              <div className="geocoding-status">{geocodingError}</div>
            )}
            {isOffline && (
              <div className="offline-indicator">⚠️ Offline Mode</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`property-map-container ${className}`} style={{ height }}>
        <div className="map-error">
          <div className="error-icon">⚠️</div>
          <div>
            <div className="error-message">{error}</div>
            {isOffline && (
              <div className="offline-message">
                Please check your internet connection
              </div>
            )}
            <div className="error-actions">
              <button className="retry-btn" onClick={handleRetry}>
                Retry
              </button>
              {isOffline && (
                <button 
                  className="refresh-btn"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`property-map-container ${className}`} style={{ height }}>
      {/* Offline Indicator */}
      {isOffline && (
        <div className="offline-banner">
          <span className="offline-icon">⚠️</span>
          <span>Offline Mode - Limited functionality</span>
        </div>
      )}
      
      {/* Location Permission Banner */}
      {showUserLocation && locationPermission === 'denied' && (
        <div className="permission-banner">
          <span className="permission-icon">🔒</span>
          <span>Location access denied</span>
          <button 
            className="permission-btn"
            onClick={requestLocationPermission}
          >
            Enable Location
          </button>
        </div>
      )}
      
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapController 
          center={mapCenter} 
          zoom={zoom} 
          onMapReady={onMapReady}
        />
        
        {/* Property marker */}
        <Marker position={mapCenter} icon={propertyIcon}>
          <Popup>
            <div className="property-popup">
              <h3>{property.address}</h3>
              <div className="popup-details">
                <p><strong>Type:</strong> {property.propertyType}</p>
                <p><strong>Price:</strong> ৳{property.price?.toLocaleString()}</p>
                {property.bedrooms && (
                  <p><strong>Bedrooms:</strong> {property.bedrooms}</p>
                )}
                {property.bathrooms && (
                  <p><strong>Bathrooms:</strong> {property.bathrooms}</p>
                )}
                {property.squareFootage && (
                  <p><strong>Area:</strong> {property.squareFootage} sqft</p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
        
        {/* User location marker */}
        {showUserLocation && currentUserLocation && (
          <Marker position={[currentUserLocation.lat, currentUserLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="user-popup">
                <h4>Your Location</h4>
                <p>Current position</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default PropertyMap;