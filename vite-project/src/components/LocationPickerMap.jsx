import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPickerMap.css';

// Default tile URL and attribution
const DEFAULT_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Default center: Dhaka, Bangladesh
const DHAKA_COORDINATES = [23.8103, 90.4125];

// Custom Leaflet marker icon using inline SVG (safe for Vite production bundles)
const createMarkerIcon = (color = '#2563eb') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 32px; height: 42px; transform: translate(-50%, -100%); cursor: pointer;">
        <svg viewBox="0 0 384 512" width="32" height="42" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
          <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          <circle cx="192" cy="192" r="75" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -40]
  });
};

// Component to handle clicks on the map
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

// Invalidate map size on render to prevent tile glitches inside modals or dynamic layouts
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

// Component to recenter the map smoothly when coordinates change externally
function MapCenterController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && !isNaN(position[0]) && !isNaN(position[1])) {
      map.panTo(position, { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function LocationPickerMap({
  initialLocation = null,
  onLocationChange,
  isConfirmed: parentIsConfirmed = null,
  onConfirmChange = null,
  required = true,
  title = "Property Location"
}) {
  // Parse initial coordinates if provided
  const initialLat = initialLocation?.latitude ?? initialLocation?.coordinates?.latitude ?? null;
  const initialLng = initialLocation?.longitude ?? initialLocation?.coordinates?.longitude ?? null;

  const [position, setPosition] = useState(() => {
    if (initialLat !== null && initialLng !== null && !isNaN(Number(initialLat)) && !isNaN(Number(initialLng))) {
      return [Number(initialLat), Number(initialLng)];
    }
    return null;
  });

  // Local confirmation state if not controlled by parent
  const [localConfirmed, setLocalConfirmed] = useState(() => {
    // If initial coordinates exist and parent hasn't passed isConfirmed, default to true
    if (initialLat !== null && initialLng !== null) {
      return true;
    }
    return false;
  });

  const isConfirmed = parentIsConfirmed !== null ? parentIsConfirmed : localConfirmed;
  const markerRef = useRef(null);

  // Sync if initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      const lat = initialLocation.latitude ?? initialLocation.coordinates?.latitude ?? null;
      const lng = initialLocation.longitude ?? initialLocation.coordinates?.longitude ?? null;
      if (lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        setPosition([Number(lat), Number(lng)]);
      }
    }
  }, [initialLocation]);

  const markerIcon = useMemo(() => {
    return createMarkerIcon(isConfirmed ? '#10b981' : '#2563eb');
  }, [isConfirmed]);

  const handleSelectLocation = ({ lat, lng }) => {
    setPosition([lat, lng]);
    if (onLocationChange) {
      onLocationChange({
        latitude: lat,
        longitude: lng,
        isConfirmed: false
      });
    }
    if (onConfirmChange) {
      onConfirmChange(false);
    } else {
      setLocalConfirmed(false);
    }
  };

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const { lat, lng } = marker.getLatLng();
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));
      setPosition([roundedLat, roundedLng]);
      if (onLocationChange) {
        onLocationChange({
          latitude: roundedLat,
          longitude: roundedLng,
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
          isConfirmed: true
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
        isConfirmed: false
      });
    }
  };

  const centerCoordinates = position || DHAKA_COORDINATES;

  return (
    <div className="location-picker-container" id="property-location-section">
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
          'Click anywhere on the map or drag the marker to adjust the exact location. Click "Confirm Location" when ready.'
        ) : (
          'Click anywhere on the map to place the property marker. Drag the marker to adjust exact coordinates.'
        )}
      </p>

      <div className={`location-map-wrapper ${isConfirmed ? 'locked' : ''}`}>
        <MapContainer
          center={centerCoordinates}
          zoom={position ? 15 : 12}
          scrollWheelZoom={true}
          className="location-picker-map"
        >
          <TileLayer
            attribution={MAP_ATTRIBUTION}
            url={DEFAULT_TILE_URL}
          />
          <MapResizer />
          {position && <MapCenterController position={position} />}
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
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <strong>Property Location</strong>
                  <br />
                  <span>Lat: {position[0].toFixed(6)}</span>
                  <br />
                  <span>Lng: {position[1].toFixed(6)}</span>
                  {!isConfirmed && (
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                      Drag marker to adjust
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

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
