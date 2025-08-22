import React, { useEffect, useState } from 'react';
import './HomePage.css';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/properties/top');
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
          <h1>Agents. Tours. Loans. Homes.</h1>
          <form className="search-bar">
            <input type="text" placeholder="Enter an address, neighborhood, city, or ZIP code" />
            <button type="submit">Search</button>
          </form>
          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <button onClick={() => navigate('/properties?listingType=For%20Sale')}>Buy</button>
            <button onClick={() => navigate('/properties?listingType=For%20Rent')}>Rent</button>
          </div>
        </div>
      </section>

      {/* Recommendations Section */}
      <section className="recommendations-section">
        {loading ? (
          <div className="recommendations-card">Loading top properties...</div>
        ) : error ? (
          <div className="recommendations-card">Error: {error}</div>
        ) : recommended.length > 0 ? (
          recommended.map((prop) => (
            <div className="recommendations-card" key={prop._id}>
              <div className="recommendation-badges">
                <span className="badge green">Recommended</span>
                <span className="badge orange">{prop.city || 'Preferred location'}</span>
              </div>
              <div className="recommendation-info">
                <img 
                  src={prop.images && prop.images.length > 0 ? `http://localhost:5000${prop.images[0]}` : 'https://via.placeholder.com/120x80'} 
                  alt="Home" 
                  className="home-img" 
                />
                <div>
                  <div className="price">${prop.price.toLocaleString()}</div>
                  <div className="details">
                    {prop.bedrooms} bd | {prop.bathrooms} ba | {prop.squareFootage} sqft | {prop.propertyType} for {prop.listingType}
                  </div>
                  <div className="address">{prop.address}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="recommendations-card">No properties found.</div>
        )}
      </section>

      {/* BuyAbility Section */}
      <section className="buyability-section">
        <h2>Find homes you can afford with BuyAbility™</h2>
        <div className="buyability-cards">
          <div className="buyability-summary">
            <div>Zillow Home Loans</div>
            <div>Suggested target price: $--</div>
            <div>BuyAbility™: $--</div>
            <div>Mo. payment: $--</div>
            <div>Today's rate: --%</div>
            <div>APR: --%</div>
            <button>Let's get started</button>
          </div>
          <div className="buyability-home-cards">
            <div className="home-card">
              <img src="https://via.placeholder.com/120x80" alt="Home 1" />
              <div>Within BuyAbility</div>
            </div>
            <div className="home-card">
              <img src="https://via.placeholder.com/120x80" alt="Home 2" />
              <div>Within BuyAbility</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;