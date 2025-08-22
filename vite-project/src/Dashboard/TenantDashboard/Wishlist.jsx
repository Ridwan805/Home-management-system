import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Wishlist.css';
import { toast } from 'react-toastify';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
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

        const response = await fetch('http://localhost:5000/api/wishlist', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch wishlist');
        }

        const data = await response.json();
        setWishlistItems(data.wishlist);
      } catch (err) {
        console.error('Error fetching wishlist:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const handleRemoveFromWishlist = async (propertyId) => {
    try {
      const userData = localStorage.getItem('dwellSyncUser');
      
      if (!userData) {
        toast.error('You must be logged in to manage your wishlist');
        return;
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      if (!token) {
        toast.error('You must be logged in to manage your wishlist');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/wishlist/remove/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove the item from the local state
        setWishlistItems(wishlistItems.filter(item => item._id !== propertyId));
        toast.success('Property removed from wishlist');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to remove from wishlist');
      }
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toast.error('An error occurred while updating wishlist');
    }
  };

  if (loading) {
    return (
      <div className="wishlist">
        <h2 className="section-title">My Wishlist</h2>
        <div className="loading-message">Loading your wishlist...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wishlist">
        <h2 className="section-title">My Wishlist</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="wishlist">
      <h2 className="section-title">My Wishlist</h2>
      
      {wishlistItems.length === 0 ? (
        <div className="empty-wishlist">
          <p>Your wishlist is empty. Browse properties and add them to your wishlist!</p>
          <Link to="/properties" className="browse-properties-btn">Browse Properties</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlistItems.map(property => (
            <div key={property._id} className="wishlist-item">
              <div className="wishlist-item-image">
                {property.images && property.images.length > 0 ? (
                  <img src={`http://localhost:5000${property.images[0]}`} alt={property.address} />
                ) : (
                  <div className="no-image">No Image Available</div>
                )}
              </div>
              
              <div className="wishlist-item-details">
                <h3>{property.address}</h3>
                <p className="price">৳{property.price.toLocaleString()} {property.listingType === 'For Rent' ? '/month' : ''}</p>
                <p>{property.bedrooms} beds • {property.bathrooms} baths • {property.squareFootage} sqft</p>
                <p className="listing-type">{property.listingType}</p>
              </div>
              
              <div className="wishlist-item-actions">
                <Link to={`/properties/${property._id}`} className="view-details-btn">View Details</Link>
                <button 
                  onClick={() => handleRemoveFromWishlist(property._id)} 
                  className="remove-wishlist-btn"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;