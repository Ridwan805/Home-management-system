// MapShareService.js - Handles map sharing and external app integration

class MapShareService {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  // Generate shareable map link for property
  generatePropertyMapLink(property, options = {}) {
    const {
      zoom = 15,
      includeUserLocation = false,
      showRouting = false,
      mapType = 'standard'
    } = options;

    const params = new URLSearchParams({
      propertyId: property._id,
      lat: property.coordinates?.lat || '',
      lng: property.coordinates?.lng || '',
      zoom: zoom.toString(),
      mapType,
      title: encodeURIComponent(property.address || 'Property Location')
    });

    if (includeUserLocation) {
      params.append('showUser', 'true');
    }

    if (showRouting) {
      params.append('routing', 'true');
    }

    return `${this.baseUrl}/map?${params.toString()}`;
  }

  // Generate embeddable map iframe code
  generateEmbedCode(property, options = {}) {
    const {
      width = '100%',
      height = '400px',
      zoom = 15,
      showControls = true,
      showPopup = true
    } = options;

    const mapLink = this.generatePropertyMapLink(property, { zoom });
    const embedParams = new URLSearchParams({
      embed: 'true',
      controls: showControls.toString(),
      popup: showPopup.toString()
    });

    const embedUrl = `${mapLink}&${embedParams.toString()}`;

    return `<iframe 
  src="${embedUrl}" 
  width="${width}" 
  height="${height}" 
  style="border: none; border-radius: 8px;" 
  allowfullscreen="true" 
  loading="lazy">
</iframe>`;
  }

  // Open location in Google Maps
  openInGoogleMaps(property, userLocation = null) {
    const { coordinates } = property;
    if (!coordinates) {
      throw new Error('Property coordinates not available');
    }

    let url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    
    if (userLocation) {
      // Add directions from user location
      url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${coordinates.lat},${coordinates.lng}`;
    }

    window.open(url, '_blank');
  }

  // Open location in Apple Maps (iOS/macOS)
  openInAppleMaps(property, userLocation = null) {
    const { coordinates } = property;
    if (!coordinates) {
      throw new Error('Property coordinates not available');
    }

    let url = `http://maps.apple.com/?q=${coordinates.lat},${coordinates.lng}`;
    
    if (userLocation) {
      url = `http://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${coordinates.lat},${coordinates.lng}`;
    }

    window.open(url, '_blank');
  }

  // Open location in Waze
  openInWaze(property) {
    const { coordinates } = property;
    if (!coordinates) {
      throw new Error('Property coordinates not available');
    }

    const url = `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes`;
    window.open(url, '_blank');
  }

  // Open location in OpenStreetMap
  openInOSM(property, zoom = 15) {
    const { coordinates } = property;
    if (!coordinates) {
      throw new Error('Property coordinates not available');
    }

    const url = `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=${zoom}/${coordinates.lat}/${coordinates.lng}`;
    window.open(url, '_blank');
  }

  // Detect user's platform and suggest appropriate map app
  getRecommendedMapApp() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'apple';
    } else if (/android/.test(userAgent)) {
      return 'google';
    } else if (/mac/.test(userAgent)) {
      return 'apple';
    } else {
      return 'google';
    }
  }

  // Open in recommended map app
  openInRecommendedApp(property, userLocation = null) {
    const recommendedApp = this.getRecommendedMapApp();
    
    switch (recommendedApp) {
      case 'apple':
        this.openInAppleMaps(property, userLocation);
        break;
      case 'google':
      default:
        this.openInGoogleMaps(property, userLocation);
        break;
    }
  }

  // Share via Web Share API (if supported)
  async shareViaWebAPI(property, options = {}) {
    if (!navigator.share) {
      throw new Error('Web Share API not supported');
    }

    const mapLink = this.generatePropertyMapLink(property, options);
    const shareData = {
      title: `Property Location - ${property.address}`,
      text: `Check out this property location: ${property.address}`,
      url: mapLink
    };

    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled sharing
        return false;
      }
      throw error;
    }
  }

  // Copy map link to clipboard
  async copyToClipboard(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(mapLink);
        return true;
      } catch (error) {
        console.error('Clipboard write failed:', error);
      }
    }
    
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = mapLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      return false;
    }
  }

  // Generate QR code for map link
  generateQRCode(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    // Using a free QR code API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mapLink)}`;
    return qrApiUrl;
  }

  // Share via email
  shareViaEmail(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    const subject = encodeURIComponent(`Property Location - ${property.address}`);
    const body = encodeURIComponent(
      `Hi,\n\nI wanted to share this property location with you:\n\n` +
      `Address: ${property.address}\n` +
      `Type: ${property.propertyType}\n` +
      `Price: ৳${property.price?.toLocaleString()}\n\n` +
      `View on map: ${mapLink}\n\n` +
      `Best regards`
    );
    
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
  }

  // Share via SMS
  shareViaSMS(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    const message = encodeURIComponent(
      `Check out this property: ${property.address} - ${mapLink}`
    );
    
    const smsUrl = `sms:?body=${message}`;
    window.open(smsUrl);
  }

  // Share via WhatsApp
  shareViaWhatsApp(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    const message = encodeURIComponent(
      `🏠 Property Location\n\n` +
      `📍 ${property.address}\n` +
      `🏢 ${property.propertyType}\n` +
      `💰 ৳${property.price?.toLocaleString()}\n\n` +
      `View location: ${mapLink}`
    );
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }

  // Share via Facebook
  shareViaFacebook(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(mapLink)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  }

  // Share via Twitter
  shareViaTwitter(property, options = {}) {
    const mapLink = this.generatePropertyMapLink(property, options);
    const text = encodeURIComponent(
      `Check out this property location: ${property.address} #RealEstate #Property`
    );
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(mapLink)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  // Get all available sharing options
  getAvailableSharingOptions() {
    const options = [
      { id: 'copy', name: 'Copy Link', icon: '🔗' },
      { id: 'email', name: 'Email', icon: '📧' },
      { id: 'sms', name: 'SMS', icon: '💬' },
      { id: 'whatsapp', name: 'WhatsApp', icon: '📱' },
      { id: 'facebook', name: 'Facebook', icon: '📘' },
      { id: 'twitter', name: 'Twitter', icon: '🐦' },
      { id: 'google', name: 'Google Maps', icon: '🗺️' },
      { id: 'apple', name: 'Apple Maps', icon: '🍎' },
      { id: 'waze', name: 'Waze', icon: '🚗' },
      { id: 'osm', name: 'OpenStreetMap', icon: '🌍' }
    ];

    // Add Web Share API if supported
    if (navigator.share) {
      options.unshift({ id: 'native', name: 'Share', icon: '📤' });
    }

    return options;
  }

  // Execute sharing action
  async executeShare(shareType, property, userLocation = null, options = {}) {
    try {
      switch (shareType) {
        case 'native':
          return await this.shareViaWebAPI(property, options);
        case 'copy':
          return await this.copyToClipboard(property, options);
        case 'email':
          this.shareViaEmail(property, options);
          return true;
        case 'sms':
          this.shareViaSMS(property, options);
          return true;
        case 'whatsapp':
          this.shareViaWhatsApp(property, options);
          return true;
        case 'facebook':
          this.shareViaFacebook(property, options);
          return true;
        case 'twitter':
          this.shareViaTwitter(property, options);
          return true;
        case 'google':
          this.openInGoogleMaps(property, userLocation);
          return true;
        case 'apple':
          this.openInAppleMaps(property, userLocation);
          return true;
        case 'waze':
          this.openInWaze(property);
          return true;
        case 'osm':
          this.openInOSM(property);
          return true;
        default:
          throw new Error(`Unknown share type: ${shareType}`);
      }
    } catch (error) {
      console.error(`Share error (${shareType}):`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const mapShareService = new MapShareService();
export default mapShareService;