import React, { useEffect, useState } from 'react';
import './HomePage.css';
import { useNavigate, Link } from 'react-router-dom';
import { FaSearch, FaHome, FaBuilding, FaMoneyBillWave } from 'react-icons/fa';

const HomePage = () => {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTopProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5001/api/properties/top');
        if (!response.ok) {
          throw new Error('Failed to fetch properties');
        }
        const data = await response.json();
        setRecommended(data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err.message);
        setRecommended([]);
      } finally {
        setLoading(false);
      }
    };

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
              <p>Error: {error}</p>
            </div>
          ) : recommended.length > 0 ? (
            <div className="property-cards">
              {recommended.map((prop) => (
                <div className="property-card" key={prop._id} onClick={() => navigate(`/properties/${prop._id}`)}>
                  <div className="property-image-container">
                    <img 
                      src={prop.images && prop.images.length > 0 ? `http://localhost:5001${prop.images[0]}` : 'https://via.placeholder.com/400x300'} 
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
                    <h3 className="property-price">৳{prop.price.toLocaleString()}</h3>
                    <p className="property-specs">
                      <span className="spec"><strong>{prop.bedrooms}</strong> beds</span>
                      <span className="spec"><strong>{prop.bathrooms}</strong> baths</span>
                      <span className="spec"><strong>{prop.squareFootage}</strong> sqft</span>
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