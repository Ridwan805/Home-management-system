import React, { useEffect, useState, useRef } from 'react';
import './HomePage.css';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaSearch,
  FaHome,
  FaBuilding,
  FaCheckCircle,
  FaShieldAlt,
  FaKey,
  FaTree,
  FaFileContract,
  FaUserCheck,
  FaTools,
  FaArrowRight
} from 'react-icons/fa';
import apiConfig from '../config/api';
import { PropertyCardSkeleton } from '../components/loading';

// Assets from local assets directory
import heroBg from '../assets/flats.jpg';
import elevatorImg from '../assets/elevator.jpg';
import flatsImg from '../assets/flats.jpg';
import landscapeImg from '../assets/landscape.jpg';
import openFieldImg from '../assets/open field.avif';
import parkImg from '../assets/a park.jpg';
import skylineImg from '../assets/landscape2.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIntent, setActiveIntent] = useState('all'); // 'all' | 'rent' | 'buy' | 'land'

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, [recommended, loading]);

  // Fetch live properties from backend
  const fetchTopProperties = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      setLoading(true);
      setError(null);
      const url = apiConfig.getUrl(apiConfig.endpoints.topProperties);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
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

  // Handle Search Submission with Intent
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    if (activeIntent === 'rent') {
      params.append('listingType', 'For Rent');
    } else if (activeIntent === 'buy') {
      params.append('listingType', 'For Sale');
    } else if (activeIntent === 'land') {
      params.append('propertyType', 'land');
    }
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="dwellsync-home-wrapper">
      {/* =====================================================================
          1. HERO SECTION (Full-Screen Immersive Canvas)
          ===================================================================== */}
      <section
        className="home-hero-section"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="home-hero-overlay" />

        <div className="home-hero-content scroll-reveal is-visible">
          <div className="hero-pill-badge">
            ✦ All-in-One Real Estate & Property Ecosystem
          </div>

          <h1 className="home-hero-title">
            Smart Living, <span className="title-accent">Seamless</span> Property Management
          </h1>

          <p className="home-hero-desc">
            Find move-in ready flats for rent, invest in luxury apartments, acquire verified land plots,
            and manage tenancies, invoices, and operations—all from one intuitive digital platform.
          </p>

          {/* Interactive Search Card */}
          <div className="hero-search-card">
            <div className="search-intent-pills">
              <button
                type="button"
                className={`intent-pill ${activeIntent === 'all' ? 'active' : ''}`}
                onClick={() => setActiveIntent('all')}
              >
                All Properties
              </button>
              <button
                type="button"
                className={`intent-pill ${activeIntent === 'rent' ? 'active' : ''}`}
                onClick={() => setActiveIntent('rent')}
              >
                Rent Flat
              </button>
              <button
                type="button"
                className={`intent-pill ${activeIntent === 'buy' ? 'active' : ''}`}
                onClick={() => setActiveIntent('buy')}
              >
                Buy Apartment
              </button>
              <button
                type="button"
                className={`intent-pill ${activeIntent === 'land' ? 'active' : ''}`}
                onClick={() => setActiveIntent('land')}
              >
                Land & Plots
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="search-form-row">
              <div className="search-input-wrap">
                <FaSearch className="search-input-icon" />
                <input
                  type="text"
                  className="hero-main-search-input"
                  placeholder="Enter neighborhood, city, address, or apartment type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="hero-search-submit-btn">
                Search Properties
              </button>
            </form>
          </div>

          {/* Primary Action Buttons */}
          <div className="hero-cta-group">
            <Link to="/properties" className="btn-hero-primary">
              Browse Properties <FaArrowRight />
            </Link>
            <Link to="/dashboard/create-listing" className="btn-hero-glass">
              List Your Property
            </Link>
          </div>

          {/* Trust Highlights Ribbon */}
          <div className="hero-stats-ribbon">
            <div className="hero-stat-item">
              <strong>500+</strong> Verified Listings
            </div>
            <div className="hero-stat-item">
              <strong>৳0</strong> Hidden Charges
            </div>
            <div className="hero-stat-item">
              <strong>100%</strong> Digital Invoicing
            </div>
            <div className="hero-stat-item">
              <strong>24/7</strong> In-App Management
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. ABOUT / INTRO SECTION (Elevator & Architectural Convenience)
          ===================================================================== */}
      <section
        className="home-about-section panel-overlapping"
        style={{ backgroundImage: `url(${elevatorImg})` }}
      >
        <div className="about-backdrop-overlay" />

        <div className="home-about-container">
          <div className="about-glass-card scroll-reveal">
            <div className="about-header-group">
              <span className="section-eyebrow">ABOUT DWELLSYNC</span>
              <h2 className="about-title">
                Elevating Convenience, Modern Living & Seamless Operations
              </h2>
              <p className="about-desc">
                From high-speed vertical living to automated monthly rent cycles, DwellSync bridges
                the gap between property owners, tenants, renters, buyers, and security guards. We
                replace messy paperwork, unverified brokers, and payment headaches with a streamlined,
                intelligent real estate experience.
              </p>
            </div>

            <div className="about-pillars-grid">
              <div className="about-pillar-card">
                <div className="pillar-icon-box">
                  <FaBuilding />
                </div>
                <h3>Unified Tenancy Management</h3>
                <p>
                  Centralized tenant directories, digital lease agreements, automated monthly invoicing,
                  and verified online or cash rent tracking with audit receipts.
                </p>
              </div>

              <div className="about-pillar-card">
                <div className="pillar-icon-box">
                  <FaKey />
                </div>
                <h3>Verified Flat & Land Sales</h3>
                <p>
                  Explore transparent property ownership transfers with comprehensive legal title records,
                  precise square footage, and direct verified owner communication.
                </p>
              </div>

              <div className="about-pillar-card">
                <div className="pillar-icon-box">
                  <FaShieldAlt />
                </div>
                <h3>Security & Service Integration</h3>
                <p>
                  Integrated visitor logging, parcel tracking, maintenance ticket tracking, and official
                  notice dispatch across all building properties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. SERVICE STORY SECTIONS (Alternating Visual Storytelling)
          ===================================================================== */}
      <section className="home-story-wrapper panel-overlapping">
        <div className="story-container">
          {/* Story 1: Flat Renting */}
          <div className="story-row scroll-reveal">
            <div className="story-text-col">
              <span className="story-tag-pill blue">Residential Rentals</span>
              <h2 className="story-heading">
                Find Your Ideal Rental Flat Without the Broker Hassle
              </h2>
              <p className="story-paragraph">
                Browse hand-picked apartments, studios, and multi-bedroom flats in prime residential
                neighborhoods. Inspect high-resolution photos, verified monthly rents, floor levels,
                and advance deposit terms before taking a tour.
              </p>
              <ul className="story-feature-list">
                <li>
                  <FaCheckCircle className="story-check-icon" /> Verified landlord identities & real photos
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Transparent advance payment & lease terms
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Secure digital payments with automated invoices
                </li>
              </ul>
              <button
                className="btn-story-cta"
                onClick={() => navigate('/properties?listingType=For%20Rent')}
              >
                Explore Rentals <FaArrowRight />
              </button>
            </div>

            <div className="story-visual-col">
              <div className="story-image-card">
                <img src={flatsImg} alt="Modern flats for rent" />
                <div className="story-floating-badge">
                  🏢 100% Verified Rental Units
                </div>
              </div>
            </div>
          </div>

          {/* Story 2: Flat Buying (Reversed) */}
          <div className="story-row reversed scroll-reveal">
            <div className="story-text-col">
              <span className="story-tag-pill emerald">Home Ownership</span>
              <h2 className="story-heading">
                Invest in Your Permanent Home with Complete Transparency
              </h2>
              <p className="story-paragraph">
                Discover contemporary family apartments, penthouses, and duplexes ready for purchase.
                Review detailed building specifications, square footage, neighborhood amenities,
                and legal ownership transfer trails directly on DwellSync.
              </p>
              <ul className="story-feature-list">
                <li>
                  <FaCheckCircle className="story-check-icon" /> Verified ownership transfer records
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Clear breakdown of purchase price & dues
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Direct inquiry & application workflow
                </li>
              </ul>
              <button
                className="btn-story-cta"
                onClick={() => navigate('/properties?listingType=For%20Sale')}
              >
                View Apartments <FaArrowRight />
              </button>
            </div>

            <div className="story-visual-col">
              <div className="story-image-card">
                <img src={landscapeImg} alt="Contemporary apartment buildings" />
                <div className="story-floating-badge">
                  🏠 Verified Ownership Records
                </div>
              </div>
            </div>
          </div>

          {/* Story 3: Land Buying & Land Rent */}
          <div className="story-row scroll-reveal">
            <div className="story-text-col">
              <span className="story-tag-pill amber">Land & Development</span>
              <h2 className="story-heading">
                Prime Land Plots for Lease, Commercial & Residential Use
              </h2>
              <p className="story-paragraph">
                Explore demarcated plots, commercial acreage, and residential building land.
                Whether you are planning to build your custom residence or secure agricultural
                and commercial land leases, find verified plots mapped with geolocation accuracy.
              </p>
              <ul className="story-feature-list">
                <li>
                  <FaCheckCircle className="story-check-icon" /> Geolocation-mapped plot coordinates
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Clear demarcation & zoning specifications
                </li>
                <li>
                  <FaCheckCircle className="story-check-icon" /> Direct communication with verified plot owners
                </li>
              </ul>
              <button
                className="btn-story-cta"
                onClick={() => navigate('/properties?propertyType=land')}
              >
                Browse Land Listings <FaArrowRight />
              </button>
            </div>

            <div className="story-visual-col">
              <div className="story-image-card">
                <img src={openFieldImg} alt="Prime land and open plots" />
                <div className="story-floating-badge">
                  🌾 Verified Land Demarcations
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. FEATURED PROPERTIES (Live Database Listings)
          ===================================================================== */}
      <section className="home-featured-section panel-overlapping">
        <div className="featured-container">
          <div className="featured-section-header scroll-reveal">
            <span className="section-eyebrow">CURATED SELECTION</span>
            <h2 className="featured-section-title">Featured Property Listings</h2>
            <p className="featured-section-subtitle">
              Explore freshly verified homes, rental flats, and plots available across prime locations.
            </p>
          </div>

          {loading ? (
            <div className="featured-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <PropertyCardSkeleton key={`home-skel-${i}`} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #FCA5A5' }}>
              <p style={{ margin: '0 0 16px 0', color: '#DC2626', fontWeight: 600 }}>⚠️ {error}</p>
              <button className="btn-hero-primary" onClick={fetchTopProperties} style={{ fontSize: '0.9rem', padding: '10px 20px' }}>
                Try Again
              </button>
            </div>
          ) : recommended.length > 0 ? (
            <div className="featured-grid">
              {recommended.slice(0, 3).map((prop) => {
                const imgUrl = apiConfig.getImageUrl(prop.images?.[0] || prop.media?.images?.[0]?.url) || flatsImg;
                const price = prop.price ? `৳${prop.price.toLocaleString()}` : (prop.pricing?.monthlyRent ? `৳${prop.pricing.monthlyRent.toLocaleString()} / mo` : 'Price on request');

                return (
                  <div
                    className="property-live-card scroll-reveal"
                    key={prop._id}
                    onClick={() => navigate(`/properties/${prop._id}`)}
                  >
                    <div className="property-card-img-wrap">
                      <img src={imgUrl} alt={prop.title || prop.address} loading="lazy" />
                      <span className="property-card-type-tag">
                        {prop.listingType || 'For Rent'}
                      </span>
                    </div>

                    <div className="property-card-body">
                      <h3 className="property-card-price">{price}</h3>
                      <div className="property-card-specs">
                        <span><strong>{prop.specifications?.bedrooms || 2}</strong> Beds</span> &bull;
                        <span><strong>{prop.specifications?.bathrooms || 2}</strong> Baths</span> &bull;
                        <span><strong>{prop.specifications?.squareFootage || 1200}</strong> sqft</span>
                      </div>
                      <p className="property-card-address">
                        {prop.title ? `${prop.title} - ` : ''}{prop.address}
                      </p>
                      <div className="property-card-footer">
                        <span>{prop.city || 'Dhaka'}</span>
                        <span>View Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
              <p style={{ color: '#64748B', fontSize: '1.05rem', margin: '0 0 16px 0' }}>No active properties listed yet.</p>
              <Link to="/properties" className="btn-hero-primary" style={{ fontSize: '0.925rem', padding: '10px 20px' }}>
                Browse All Properties
              </Link>
            </div>
          )}

          <div className="featured-cta-wrap scroll-reveal">
            <Link to="/properties" className="btn-hero-primary">
              View All Properties <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. LIFESTYLE / TRUST SECTION (Park, Serenity, Peace of Mind)
          ===================================================================== */}
      <section
        className="home-lifestyle-section panel-overlapping"
        style={{ backgroundImage: `url(${parkImg})` }}
      >
        <div className="lifestyle-backdrop-overlay" />

        <div className="lifestyle-container">
          <div className="lifestyle-card scroll-reveal">
            <div className="lifestyle-header-group">
              <span className="section-eyebrow">LIFESTYLE & PEACE OF MIND</span>
              <h2 className="lifestyle-title">
                Live in Harmony, Backed by Uncompromised Trust
              </h2>
              <p className="lifestyle-desc">
                A home is more than square footage—it is your everyday sanctuary. DwellSync connects you
                with peaceful communities, green spaces, verified owners, and transparent digital contracts,
                ensuring your property journey is grounded in security and peace of mind.
              </p>
            </div>

            <div className="lifestyle-trust-grid">
              <div className="trust-item">
                <div className="trust-icon-box">🛡️</div>
                <h4>Verified Ownership</h4>
                <p>Every listed flat and land parcel is verified with authentic ownership records.</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">📜</div>
                <h4>Digital Contracts</h4>
                <p>Formal digital lease agreements and instant automated payment receipts.</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">🌳</div>
                <h4>Serene Neighborhoods</h4>
                <p>Discover homes situated near lush parks, clean roads, and peaceful environments.</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">⚡</div>
                <h4>Rapid Maintenance</h4>
                <p>In-app problem reporting connects tenants directly to property owners in minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. FINAL CTA SECTION (Clean City Skyline Background)
          ===================================================================== */}
      <section
        className="home-final-cta-section panel-overlapping"
        style={{ backgroundImage: `url(${skylineImg})` }}
      >
        <div className="cta-backdrop-overlay" />

        <div className="cta-container scroll-reveal">
          <span className="hero-pill-badge" style={{ marginBottom: '18px' }}>
            ✦ Get Started with DwellSync
          </span>

          <h2 className="cta-heading">
            Ready to Experience Seamless Property Living?
          </h2>

          <p className="cta-description">
            Join thousands of property owners, tenants, buyers, and renters who have simplified their
            real estate journey with DwellSync. Discover verified homes or manage your portfolio today.
          </p>

          <div className="cta-actions">
            <Link to="/properties" className="btn-hero-primary">
              Browse Properties <FaArrowRight />
            </Link>
            <Link to="/dashboard/create-listing" className="btn-hero-glass">
              List Your Property
            </Link>
            <Link to="/login" className="btn-hero-glass">
              Sign In to Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
