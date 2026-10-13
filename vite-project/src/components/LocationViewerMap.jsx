import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationViewerMap.css';

// Configurable tile URL and attribution
const DEFAULT_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Fixed property marker icon using SVG (100% Vite build safe)
const fixedMarkerIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="position: relative; width: 34px; height: 44px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 384 512" width="34" height="44" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
        <path fill="#ef4444" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
        <circle cx="192" cy="192" r="75" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -42]
});

// Map size invalidator on mount/render
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

export default function LocationViewerMap({
  location = null,
  address = '',
  title = 'Property Location',
  zoom = 15
}) {
  // Extract coordinates safely from location object (supports both direct lat/lng and nested coordinates)
  let lat = location?.latitude ?? location?.coordinates?.latitude ?? null;
  let lng = location?.longitude ?? location?.coordinates?.longitude ?? null;

  // Ensure they are valid numbers
  const hasValidCoordinates = lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const numericLat = hasValidCoordinates ? Number(lat) : null;
  const numericLng = hasValidCoordinates ? Number(lng) : null;

  // Display address: either passed in prop, or from location.address, or city/state/country
  const displayAddress = address || location?.address || (
    [location?.city, location?.state, location?.country].filter(Boolean).join(', ')
  );

  // Google Maps external link
  const googleMapsUrl = hasValidCoordinates
    ? `https://www.google.com/maps?q=${numericLat},${numericLng}`
    : null;

  if (!hasValidCoordinates) {
    return (
      <div className="location-viewer-card" id="property-location-section">
        <div className="location-viewer-header">
          <h3 className="location-viewer-title">📍 {title}</h3>
        </div>
        {displayAddress && (
          <div className="location-viewer-address">
            <span className="address-icon">🏠</span>
            <span>{displayAddress}</span>
          </div>
        )}
        <div className="location-viewer-empty">
          <span>🗺️</span>
          <p>Interactive map location is not available for this property listing.</p>
        </div>
      </div>
    );
  }

  const position = [numericLat, numericLng];

  return (
    <div className="location-viewer-card" id="property-location-section">
      <div className="location-viewer-header">
        <h3 className="location-viewer-title">📍 {title}</h3>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-open-google-maps"
            title="Open coordinates in Google Maps in a new tab"
          >
            🗺️ Open in Google Maps
          </a>
        )}
      </div>

      {displayAddress && (
        <div className="location-viewer-address">
          <span className="address-icon">🏠</span>
          <span>{displayAddress}</span>
        </div>
      )}

      <div className="location-viewer-map-wrapper">
        <MapContainer
          center={position}
          zoom={zoom}
          scrollWheelZoom={false}
          className="location-viewer-map"
        >
          <TileLayer
            attribution={MAP_ATTRIBUTION}
            url={DEFAULT_TILE_URL}
          />
          <MapResizer />
          <Marker position={position} icon={fixedMarkerIcon}>
            <Popup>
              <div style={{ padding: '4px', textAlign: 'center' }}>
                <strong style={{ color: '#0f172a' }}>{displayAddress || 'Property Location'}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  {numericLat.toFixed(6)}, {numericLng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="location-viewer-footer">
        <span className="location-viewer-coords">
          Coordinates: {numericLat.toFixed(6)}, {numericLng.toFixed(6)}
        </span>
        {location?.location_link && (
          <a
            href={location.location_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'underline' }}
          >
            View on OpenStreetMap
          </a>
        )}
      </div>
    </div>
  );
}
