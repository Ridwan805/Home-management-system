import React, { useEffect, useState } from 'react';
import './HomePage.css';
import { useNavigate, Link } from 'react-router-dom';
import { FaSearch, FaHome, FaBuilding, FaMoneyBillWave } from 'react-icons/fa';
import apiConfig from '../config/api';

const HomePage = () => {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTopProperties = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    try {
      setLoading(true);
      setError(null);
      const url = apiConfig.getUrl(apiConfig.endpoints.topProperties);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to load properties (${response.status}: ${response.statusText})`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.properties || data?.data || []);
      setRecommended(list);
      setError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      const isTimeout = err.name === 'AbortError';
      setError(
        isTimeout
          ? 'Connecting to cloud service took longer than expected. Please retry.'
          : (err.message || 'Unable to load properties at this time.')
      );
      setRecommended([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProperties();
  }, []);

  return (
    <div className="homepage-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find Your Perfect Home</h1>
          <p className="hero-subtitle">Discover properties for sale and rent across the country</p>
          <form className="search-bar" onSubmit={(e) => {
            e.preventDefault();
            navigate(`/properties?search=${encodeURIComponent(searchQuery)}`);
          }}>
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Enter an address, neighborhood, city, or ZIP code" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="search-button">Search</button>
          </form>
          <div className="action-buttons">
            <button 
              className="action-button buy-button" 
              onClick={() => navigate('/properties?listingType=For%20Sale')}
            >
              <FaHome className="button-icon" /> Buy
            </button>
            <button 
              className="action-button rent-button" 
              onClick={() => navigate('/properties?listingType=For%20Rent')}
            >
              <FaBuilding className="button-icon" /> Rent
            </button>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="featured-properties-section">
        <h2 className="section-title">Featured Properties</h2>
        <div className="properties-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading top properties...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p style={{ margin: '0 0 1rem 0', fontWeight: 500 }}>⚠️ {error}</p>
              <button 
                type="button"
                className="browse-all-button"
                onClick={() => fetchTopProperties()}
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
              >
                Try Again
              </button>
            </div>
          ) : recommended.length > 0 ? (
            <div className="property-cards">
              {recommended.map((prop) => (
                <div className="property-card" key={prop._id} onClick={() => navigate(`/properties/${prop._id}`)}>
                  <div className="property-image-container">
                    <img 
                      src={apiConfig.getImageUrl(prop.images?.[0] || prop.media?.images?.[0]?.url) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='} 
                      alt={prop.address} 
                      className="property-image" 
                    />
                    <div className="property-badges">
                      <span className="badge featured">Featured</span>
                      <span className="badge location">{prop.city || 'Preferred location'}</span>
                    </div>
                    <div className="property-type-badge">{prop.listingType}</div>
                  </div>
                  <div className="property-details">
                    <h3 className="property-price">৳{prop.price ? prop.price.toLocaleString() : 'Price not available'}</h3>
                    <p className="property-specs">
                      <span className="spec"><strong>{prop.specifications?.bedrooms || 'N/A'}</strong> beds</span>
                      <span className="spec"><strong>{prop.specifications?.bathrooms || 'N/A'}</strong> baths</span>
                      <span className="spec"><strong>{prop.specifications?.squareFootage || 'N/A'}</strong> sqft</span>
                    </p>
                    <p className="property-address">{prop.address}</p>
                    <p className="property-type">{prop.propertyType}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-properties">
              <p>No properties found.</p>
              <button className="browse-all-button" onClick={() => navigate('/properties')}>Browse All Properties</button>
            </div>
          )}
        </div>
        <div className="view-all-container">
          <Link to="/properties" className="view-all-button">View All Properties</Link>
        </div>
      </section>

      {/* Affordability Calculator Section */}
      <section className="affordability-section">
        <div className="affordability-content">
          <div className="affordability-text">
            <h2>Find homes within your budget</h2>
            <p>Use our affordability calculator to discover properties that match your financial goals</p>
            <div className="affordability-features">
              <div className="feature">
                <FaMoneyBillWave className="feature-icon" />
                <div>
                  <h3>Budget Planning</h3>
                  <p>Set your price range and monthly payment goals</p>
                </div>
              </div>
              <div className="feature">
                <FaHome className="feature-icon" />
                <div>
                  <h3>Property Matching</h3>
                  <p>We'll show you homes that fit your budget</p>
                </div>
              </div>
            </div>
            <button className="calculator-button" onClick={() => navigate('/properties')}>Start Calculating</button>
          </div>
          <div className="affordability-image">
            <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80" alt="Modern home interior" />
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="services-section">
        <h2 className="section-title">Our Services</h2>
        <div className="services-container">
          <div className="service-card">
            <div className="service-icon buy-icon"></div>
            <h3>Buy a Home</h3>
            <p>Find your place with an immersive photo experience and the most listings, including things you won't find anywhere else.</p>
            <Link to="/properties?listingType=For%20Sale" className="service-link">Browse Homes</Link>
          </div>
          
          <div className="service-card">
            <div className="service-icon rent-icon"></div>
            <h3>Rent a Home</h3>
            <p>We're creating a seamless online experience from shopping on the largest rental network, to applying, to paying rent.</p>
            <Link to="/properties?listingType=For%20Rent" className="service-link">Find Rentals</Link>
          </div>
          
          <div className="service-card">
            <div className="service-icon sell-icon"></div>
            <h3>Sell a Home</h3>
            <p>No matter what path you take to sell your home, we can help you navigate a successful sale.</p>
            <Link to="/dashboard/create-listing" className="service-link">List Your Property</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;