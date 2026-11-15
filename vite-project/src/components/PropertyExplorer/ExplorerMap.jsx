import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getPropertyCoordinates,
  formatCompactPrice
} from './propertyUtils';
import PropertyMapPreview from './PropertyMapPreview';
import { Layers, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import './ExplorerMap.css';

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_CENTER = [23.6850, 90.3563]; // Bangladesh center
const DEFAULT_ZOOM = 7;

/**
 * Creates a custom DivIcon with formatted price
 */
const createCustomMarker = (property, isSelected = false) => {
  const priceText = formatCompactPrice(property);
  const isRent = property.listingType === 'For Rent';

  const markerClass = `explorer-custom-marker ${isSelected ? 'is-selected' : ''} ${isRent ? 'rent-marker' : 'sale-marker'}`;

  return L.divIcon({
    className: markerClass,
    html: `
      <div class="marker-pill-container">
        <span class="marker-price-text">${priceText}</span>
        <div class="marker-pin-tip"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

/**
 * Map Bounds Listener for "Search as I move the map"
 */
function MapBoundsListener({ enabled, onBoundsChanged }) {
  const map = useMapEvents({
    moveend: () => {
      if (!enabled || !onBoundsChanged) return;
      const bounds = map.getBounds();
      onBoundsChanged({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    }
  });
  return null;
}

/**
 * Map Controller for Pan/Zoom, InvalidateSize, and Auto-fitting bounds
 */
function MapController({ selectedCoords, boundsToFit, shouldFitBounds }) {
  const map = useMap();

  // Invalidate size on mount / panel layout changes
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Center on selected property
  useEffect(() => {
    if (selectedCoords && selectedCoords[0] && selectedCoords[1]) {
      map.flyTo(selectedCoords, 15, {
        duration: 0.8,
        easeLinearity: 0.25
      });
    }
  }, [selectedCoords, map]);

  // Auto-fit bounds when listings change
  useEffect(() => {
    if (shouldFitBounds && boundsToFit && boundsToFit.length > 0) {
      if (boundsToFit.length === 1) {
        map.setView(boundsToFit[0], 14);
      } else {
        const leafletBounds = L.latLngBounds(boundsToFit);
        map.fitBounds(leafletBounds, {
          padding: [50, 50],
          maxZoom: 15
        });
      }
    }
  }, [boundsToFit, shouldFitBounds, map]);

  return null;
}

const ExplorerMap = ({
  properties = [],
  selectedProperty = null,
  onSelectProperty = () => {},
  onClosePreview = () => {},
  wishlistIds = [],
  onToggleWishlist = () => {},
  searchAsMoveMap = false,
  onToggleSearchAsMoveMap = () => {},
  onBoundsChanged = () => {}
}) => {
  // Extract all valid markers with coordinates
  const markersData = useMemo(() => {
    return properties
      .map(p => {
        const coords = getPropertyCoordinates(p);
        return coords ? { property: p, coords } : null;
      })
      .filter(Boolean);
  }, [properties]);

  const allCoords = useMemo(() => markersData.map(m => m.coords), [markersData]);

  const selectedCoords = useMemo(() => {
    if (!selectedProperty) return null;
    return getPropertyCoordinates(selectedProperty);
  }, [selectedProperty]);

  // Debounced bounds callback
  const debounceTimerRef = useRef(null);
  const handleMapBoundsChanged = useCallback((bounds) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onBoundsChanged(bounds);
    }, 450);
  }, [onBoundsChanged]);

  // Track initial auto-fit
  const [shouldFitBounds, setShouldFitBounds] = useState(true);

  useEffect(() => {
    setShouldFitBounds(true);
  }, [properties]);

  const defaultCenter = allCoords.length > 0 ? allCoords[0] : DEFAULT_CENTER;
  const defaultZoom = allCoords.length > 0 ? 12 : DEFAULT_ZOOM;

  return (
    <div className="explorer-map-container" aria-label="Interactive Property Map">
      {/* Top Floating Controls */}
      <div className="map-top-controls">
        <label className="search-as-move-toggle" title="Search as you move the map">
          <input
            type="checkbox"
            checked={searchAsMoveMap}
            onChange={(e) => onToggleSearchAsMoveMap(e.target.checked)}
          />
          <span className="toggle-label-text">Search as I move the map</span>
        </label>
      </div>

      {/* React Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="leaflet-explorer-map"
        scrollWheelZoom={true}
        zoomControl={false} // Custom controls can be placed or standard
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          selectedCoords={selectedCoords}
          boundsToFit={allCoords}
          shouldFitBounds={shouldFitBounds}
        />

        <MapBoundsListener
          enabled={searchAsMoveMap}
          onBoundsChanged={handleMapBoundsChanged}
        />

        {/* Render Markers for all properties with valid coordinates */}
        {markersData.map(({ property, coords }) => {
          const isSelected = selectedProperty?._id === property._id;
          const markerIcon = createCustomMarker(property, isSelected);

          return (
            <Marker
              key={property._id}
              position={coords}
              icon={markerIcon}
              zIndexOffset={isSelected ? 1000 : 1}
              eventHandlers={{
                click: () => {
                  setShouldFitBounds(false);
                  onSelectProperty(property);
                }
              }}
            />
          );
        })}
      </MapContainer>

      {/* Floating Property Preview Card */}
      {selectedProperty && (
        <PropertyMapPreview
          property={selectedProperty}
          onClose={onClosePreview}
          isWishlisted={wishlistIds.includes(selectedProperty._id)}
          onToggleWishlist={onToggleWishlist}
        />
      )}
    </div>
  );
};

export default ExplorerMap;