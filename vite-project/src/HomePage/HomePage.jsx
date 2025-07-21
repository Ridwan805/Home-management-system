import React from 'react';
import './HomePage.css';

const HomePage = () => {
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
        </div>
      </section>

      {/* Recommendations Section */}
      <section className="recommendations-section">
        <div className="recommendations-card">
          <div className="recommendation-badges">
            <span className="badge green">Recommended homes</span>
            <span className="badge orange">Preferred location</span>
          </div>
          <div className="recommendation-info">
            <img src="https://via.placeholder.com/120x80" alt="Home" className="home-img" />
            <div>
              <div className="price">$695,000</div>
              <div className="details">4 bd | 3 ba | 3,102 sqft | House for Sale</div>
            </div>
          </div>
        </div>
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