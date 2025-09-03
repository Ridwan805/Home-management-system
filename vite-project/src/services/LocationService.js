// LocationService.js - Handles geolocation, distance calculation, and routing

class LocationService {
  constructor() {
    this.userLocation = null;
    this.watchId = null;
    this.isWatching = false;
  }

  // Get user's current location
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.userLocation = location;
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        finalOptions
      );
    });
  }

  // Watch user's location for continuous updates
  watchLocation(callback, errorCallback, options = {}) {
    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation is not supported'));
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        this.userLocation = location;
        this.isWatching = true;
        callback(location);
      },
      (error) => {
        this.isWatching = false;
        errorCallback(error);
      },
      finalOptions
    );

    return this.watchId;
  }

  // Stop watching location
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lng1, lat2, lng2, unit = 'km') {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Format distance for display
  formatDistance(distance, unit = 'km') {
    if (distance < 1 && unit === 'km') {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance}${unit}`;
  }

  // Get distance from user to property
  getDistanceToProperty(property, userLocation = null) {
    const userLoc = userLocation || this.userLocation;
    
    if (!userLoc || !property.coordinates) {
      return null;
    }

    return this.calculateDistance(
      userLoc.lat,
      userLoc.lng,
      property.coordinates.lat,
      property.coordinates.lng
    );
  }

  // Get routing information using OpenRouteService (free alternative)
  async getRoute(startLat, startLng, endLat, endLng, profile = 'driving-car') {
    try {
      // Using OpenRouteService free API (requires registration for API key)
      // For demo purposes, we'll use a simple direct route calculation
      const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
      const estimatedTime = this.estimateTravelTime(distance, profile);
      
      return {
        distance: distance,
        duration: estimatedTime,
        profile: profile,
        coordinates: [
          [startLng, startLat],
          [endLng, endLat]
        ],
        instructions: [
          `Head towards ${this.getDirection(startLat, startLng, endLat, endLng)}`,
          `Continue for ${this.formatDistance(distance)}`,
          'Arrive at destination'
        ]
      };
    } catch (error) {
      console.error('Routing error:', error);
      throw new Error('Unable to calculate route');
    }
  }

  // Estimate travel time based on distance and transport mode
  estimateTravelTime(distance, profile) {
    const speeds = {
      'driving-car': 50, // km/h
      'cycling-regular': 15, // km/h
      'foot-walking': 5 // km/h
    };
    
    const speed = speeds[profile] || speeds['driving-car'];
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    return timeInMinutes;
  }

  // Get general direction between two points
  getDirection(lat1, lng1, lat2, lng2) {
    const dLng = lng2 - lng1;
    const dLat = lat2 - lat1;
    
    const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(angle / 45) % 8;
    
    return directions[index < 0 ? index + 8 : index];
  }

  // Format travel time for display
  formatTravelTime(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // Check if location services are available
  isLocationAvailable() {
    return 'geolocation' in navigator;
  }

  // Check if user has granted location permission
  async checkLocationPermission() {
    if (!navigator.permissions) {
      return 'unsupported';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      return 'unsupported';
    }
  }

  // Request location permission
  async requestLocationPermission() {
    try {
      await this.getCurrentLocation({ timeout: 5000 });
      return 'granted';
    } catch (error) {
      if (error.message.includes('denied')) {
        return 'denied';
      }
      return 'error';
    }
  }

  // Get nearby points of interest using Overpass API (OpenStreetMap)
  async getNearbyPOIs(lat, lng, radius = 1000, types = ['amenity', 'shop', 'public_transport']) {
    try {
      const queries = types.map(type => {
        return `node["${type}"]["name"](around:${radius},${lat},${lng});`;
      }).join('');
      
      const overpassQuery = `
        [out:json][timeout:25];
        (
          ${queries}
        );
        out geom;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      if (!response.ok) {
        throw new Error('POI service unavailable');
      }
      
      const data = await response.json();
      
      return data.elements.map(element => ({
        id: element.id,
        name: element.tags.name || 'Unknown',
        type: element.tags.amenity || element.tags.shop || element.tags.public_transport || 'other',
        lat: element.lat,
        lng: element.lon,
        distance: this.calculateDistance(lat, lng, element.lat, element.lon),
        tags: element.tags
      })).sort((a, b) => a.distance - b.distance);
      
    } catch (error) {
      console.error('POI fetch error:', error);
      return [];
    }
  }

  // Clean up resources
  cleanup() {
    this.stopWatching();
    this.userLocation = null;
  }
}

// Create and export singleton instance
const locationService = new LocationService();
export default locationService;