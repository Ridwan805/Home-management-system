import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Trash2, 
  Eye, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Building2, 
  RotateCw, 
  AlertCircle,
  Home
} from 'lucide-react';
import './Wishlist.css';
import { toast } from 'react-toastify';
import apiConfig from '../../config/api';
import { PropertyCardSkeleton } from '../../components/loading';
import TenantPageHeader from './components/TenantPageHeader';
import TenantEmptyState from './components/TenantEmptyState';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchWishlist = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        setError('You must be logged in to view your wishlist');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        setError('You must be logged in to view your wishlist');
        return;
      }

      const response = await fetch(apiConfig.getUrl('/api/wishlist'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }

      const data = await response.json();
      setWishlistItems(data.wishlist || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError(err.message || 'Unable to load wishlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemoveFromWishlist = async (propertyId) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      if (!userData) return;
      const token = JSON.parse(userData).token;

      const response = await fetch(apiConfig.getUrl(`/api/wishlist/remove/${propertyId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setWishlistItems(prev => prev.filter(item => item._id !== propertyId));
        toast.success('Property removed from your wishlist');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to remove from wishlist');
      }
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toast.error('An error occurred while updating wishlist');
    }
  };

  const formatPrice = (price, listingType) => {
    const num = Number(price || 0);
    const formatted = `৳${num.toLocaleString('en-US')}`;
    return listingType === 'For Rent' ? `${formatted} / month` : formatted;
  };

  return (
    <div className="tenant-wishlist-page">
      <TenantPageHeader 
        title="My Wishlist" 
        subtitle="Saved properties you've shortlisted for renting or purchasing."
        action={
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={() => fetchWishlist(true)}
            disabled={loading || refreshing}
            title="Refresh wishlist"
          >
            <RotateCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <div className="wishlist-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="wishlist-skeleton-grid">
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </div>
      ) : wishlistItems.length === 0 ? (
        <TenantEmptyState 
          icon={Heart}
          title="Your Wishlist Is Empty"
          description="Explore available apartments, homes, and land plots and save your favorites to compare or apply when ready."
          primaryAction={
            <Link to="/properties" className="ds-btn ds-btn-primary">
              <Building2 size={16} />
              <span>Browse Properties</span>
            </Link>
          }
        />
      ) : (
        <div className="wishlist-cards-grid">
          {wishlistItems.map((property) => {
            const imageSrc = property.images?.[0] || property.media?.images?.[0]?.url || null;
            const fullAddress = property.address || property.title || 'Residential Property';
            const locationStr = property.location?.city 
              ? `${property.location.city}${property.location.state ? `, ${property.location.state}` : ''}`
              : null;

            return (
              <div key={property._id} className="wishlist-property-card">
                {/* Media Image & Tag */}
                <div className="wishlist-card-media">
                  {imageSrc ? (
                    <img 
                      src={apiConfig.getImageUrl(imageSrc)} 
                      alt={fullAddress}
                      className="wishlist-card-img"
                    />
                  ) : (
                    <div className="wishlist-img-fallback">
                      <Home size={36} />
                      <span>{property.propertyType || 'Property'}</span>
                    </div>
                  )}

                  <span className="wishlist-listing-badge">
                    {property.listingType || 'For Rent'}
                  </span>
                </div>

                {/* Details */}
                <div className="wishlist-card-content">
                  <div className="wishlist-price-row">
                    <span className="wishlist-card-price">
                      {formatPrice(property.price, property.listingType)}
                    </span>
                  </div>

                  <h3 className="wishlist-card-title">{fullAddress}</h3>

                  {locationStr && (
                    <p className="wishlist-location-row">
                      <MapPin size={14} />
                      <span>{locationStr}</span>
                    </p>
                  )}

                  {/* Specs */}
                  <div className="wishlist-specs-row">
                    {property.bedrooms !== undefined && property.bedrooms !== null && (
                      <span className="spec-item" title="Bedrooms">
                        <Bed size={15} />
                        <span>{property.bedrooms} Beds</span>
                      </span>
                    )}
                    {property.bathrooms !== undefined && property.bathrooms !== null && (
                      <span className="spec-item" title="Bathrooms">
                        <Bath size={15} />
                        <span>{property.bathrooms} Baths</span>
                      </span>
                    )}
                    {property.squareFootage && (
                      <span className="spec-item" title="Area">
                        <Maximize size={15} />
                        <span>{property.squareFootage} sqft</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="wishlist-card-actions">
                    <Link 
                      to={`/properties/${property._id}`} 
                      className="ds-btn ds-btn-primary ds-btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Eye size={15} />
                      <span>View Details</span>
                    </Link>

                    <button 
                      type="button"
                      onClick={() => handleRemoveFromWishlist(property._id)} 
                      className="ds-btn ds-btn-danger ds-btn-sm"
                      title="Remove from Wishlist"
                    >
                      <Trash2 size={15} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
