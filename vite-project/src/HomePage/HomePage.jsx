import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaChevronDown,
  FaBuilding,
  FaUsers,
  FaCheckCircle,
  FaTree,
  FaShieldAlt,
  FaCompass,
  FaHome,
  FaMoneyBillWave,
  FaCalculator
} from 'react-icons/fa';
import { AuthContext } from '../App';
import AffordabilityCalculatorModal from '../components/AffordabilityCalculatorModal';
import FloatingHomeNav from '../components/layout/FloatingHomeNav';
import './HomePage.css';

// Exact image assets as required
import heroApartmentImg from '../assets/apartmment.jpg';
import elevatorImg from '../assets/elevator.jpg';
import landscapeImg from '../assets/landscape.jpg';
import landscape2Img from '../assets/landscape2.jpg';
import openFieldImg from '../assets/open field.jpg';
import parkImg from '../assets/a park.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userRole } = useContext(AuthContext);

  // Affordability Calculator Modal State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState('buy'); // 'buy' or 'rent'

  // Smooth scroll handler for hero explore indicator
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // List property routing logic
  const handleListProperty = () => {
    if (!isLoggedIn) {
      navigate('/login');
    } else if (userRole === 'Owner') {
      navigate('/create-listing');
    } else {
      navigate('/dashboard');
    }
  };

  // Get started routing logic
  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  // Scroll reveal observer & Overlapping scroll scaling
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = document.querySelectorAll('.cinematic-section');

    // 1. Entrance reveal observer for staggered entrance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.15 }
    );

    sections.forEach((sec) => observer.observe(sec));

    // If reduced motion is requested, stop here
    if (prefersReduced) {
      return () => {
        sections.forEach((sec) => observer.unobserve(sec));
      };
    }

    // Section base Gaussian blur map (in rem units)
    // Section 3 requirements:
    // - Active section background: 0rem to 0.125rem blur (subtle resting blur)
    // - Outgoing section background: gradually increase to approximately 0.375rem
    // - Do not blur the incoming section (resting blur 0rem)
    const SECTION_BASE_BLUR = {
      hero: 0.0625,
      about: 0.0625,
      rentals: 0,
      buying: 0,
      land: 0,
      lifestyle: 0,
      cta: 0.0625
    };

    // 2. Cinematic overlapping scroll transitions with background defocus & depth-of-field
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const vh = window.innerHeight || 1;
          const isMobile = window.innerWidth <= 768;

          sections.forEach((sec, idx) => {
            const nextSec = sections[idx + 1];
            const bgImg = sec.querySelector('.section-bg-img');
            const content = sec.querySelector('.section-content');
            const baseBlur = SECTION_BASE_BLUR[sec.id] ?? 0;

            if (isMobile) {
              // On mobile, ensure stable natural scrolling without sticky transform conflicts
              if (bgImg) {
                bgImg.style.transform = 'none';
                bgImg.style.filter = baseBlur > 0 ? `blur(${baseBlur}rem)` : 'none';
              }
              if (content) {
                content.style.transform = 'none';
                content.style.opacity = '1';
                content.style.filter = 'none';
              }
              sec.style.borderTopLeftRadius = '0';
              sec.style.borderTopRightRadius = '0';
              return;
            }

            if (nextSec) {
              const nextRect = nextSec.getBoundingClientRect();

              // Only process sections within or adjacent to the active viewport
              if (nextRect.top > vh * 2 || nextRect.bottom < -vh) {
                return;
              }

              // Progress: 0 (nextSec not visible) to 1 (nextSec fully covers sec)
              const progress = Math.max(0, Math.min(1, 1 - (nextRect.top / vh)));

              // 1. Dynamic border-radius docking:
              // While nextSec is rising over sec (nextRect.top > 0), nextSec displays its
              // intentional rounded top card edge (2rem) and shadow.
              // As nextSec docks at top: 0, its top border-radius smoothly flattens to 0,
              // covering sec edge-to-edge with ZERO exposed corner strips or gaps.
              const dockThreshold = 0.12 * vh;
              const nextRadius = nextRect.top <= 1
                ? '0'
                : `${(Math.min(1, nextRect.top / dockThreshold) * 2).toFixed(3)}rem`;
              nextSec.style.borderTopLeftRadius = nextRadius;
              nextSec.style.borderTopRightRadius = nextRadius;

              // Outgoing section (sec): Ensure its own top corners stay flat while docked at top: 0
              if (idx > 0) {
                const secTop = sec.getBoundingClientRect().top;
                sec.style.borderTopLeftRadius = secTop <= 1 ? '0' : '2rem';
                sec.style.borderTopRightRadius = secTop <= 1 ? '0' : '2rem';
              }

              // 2. Photographic Background Layer Defocus & Darkening
              if (bgImg) {
                if (progress > 0.005) {
                  // Gradually increase blur up to 0.375rem as section transitions out
                  const maxBlur = 0.375;
                  const currentBlur = (baseBlur + (progress * (maxBlur - baseBlur))).toFixed(4);
                  // Slightly darken outgoing section (1.0 down to 0.75)
                  const brightness = (1 - (progress * 0.25)).toFixed(3);
                  // Subtle recession scale (1.0 down to 0.98)
                  const scale = (1 - (progress * 0.02)).toFixed(4);

                  bgImg.style.transform = `scale(${scale}) translateZ(0)`;
                  bgImg.style.transformOrigin = 'center center';
                  bgImg.style.filter = `blur(${currentBlur}rem) brightness(${brightness})`;
                } else {
                  // Reset to resting state with subtle resting blur (or none)
                  bgImg.style.transform = 'translateZ(0)';
                  bgImg.style.filter = baseBlur > 0 ? `blur(${baseBlur}rem) brightness(1)` : 'none';
                }
              }

              // 3. Content Layer: STABLE vertical positioning (NO translateY drift)
              // Only gently reduce prominence via opacity as the next section covers it
              if (content) {
                if (progress > 0.005) {
                  const opacity = (1 - (progress * 0.45)).toFixed(3);
                  content.style.opacity = `${opacity}`;
                  content.style.transform = 'none';
                  content.style.filter = 'none';
                } else {
                  content.style.transform = 'none';
                  content.style.opacity = '1';
                  content.style.filter = 'none';
                }
              }

              // 4. Affordability Section background subtle dimming
              if (sec.id === 'affordability') {
                if (progress > 0.005) {
                  sec.style.filter = `brightness(${(1 - (progress * 0.12)).toFixed(3)})`;
                } else {
                  sec.style.filter = 'none';
                }
              }

              // 5. Click-interception prevention: disable pointer events when heavily covered
              if (progress > 0.85) {
                sec.style.pointerEvents = 'none';
              } else {
                sec.style.pointerEvents = 'auto';
              }
            } else {
              // Final section (CTA) has no next section and always remains 100% focused
              if (bgImg) {
                bgImg.style.transform = 'translateZ(0)';
                bgImg.style.filter = baseBlur > 0 ? `blur(${baseBlur}rem) brightness(1)` : 'none';
              }
              if (content) {
                content.style.transform = 'none';
                content.style.opacity = '1';
                content.style.filter = 'none';
              }
              sec.style.pointerEvents = 'auto';
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      sections.forEach((sec) => observer.unobserve(sec));
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="dwellsync-cinematic-home">
      {/* Floating DwellSync Branding & Minimal Authentication Controls */}
      <FloatingHomeNav />

      {/* =====================================================================
          1. CINEMATIC HERO SECTION — apartmment.jpg
          ===================================================================== */}
      <section id="hero" className="cinematic-section section-hero is-revealed">
        <div className="section-bg-wrap">
          <img
            src={heroApartmentImg}
            alt="DwellSync luxury city apartments and modern residential buildings"
            className="section-bg-img hero-bg-img"
            loading="eager"
            fetchpriority="high"
          />
          <div className="section-overlay hero-overlay" />
        </div>

        <div className="section-container hero-container">
          <div className="section-content hero-content">
            <span className="section-eyebrow hero-eyebrow">
              ✦ ALL-IN-ONE REAL ESTATE ECOSYSTEM
            </span>
            <h1 className="hero-headline">
              Your Property Journey <span className="text-gradient">Starts Here.</span>
            </h1>
            <p className="hero-supporting-text">
              Discover beautiful apartments, find the perfect rental, explore land opportunities, and manage your properties effortlessly with DwellSync.
            </p>
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-cinematic-primary"
                onClick={() => navigate('/properties')}
              >
                Explore Properties <FaArrowRight className="btn-icon" />
              </button>
              <button
                type="button"
                className="btn-cinematic-glass"
                onClick={handleListProperty}
              >
                List Your Property
              </button>
            </div>
          </div>

          <div
            className="hero-scroll-indicator"
            onClick={() => scrollTo('about')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && scrollTo('about')}
            aria-label="Scroll to explore"
          >
            <span className="scroll-text">Scroll to Explore</span>
            <FaChevronDown className="scroll-chevron" />
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. ABOUT SECTION — elevator.jpg
          ===================================================================== */}
      <section id="about" className="cinematic-section section-about">
        <div className="section-bg-wrap">
          <img
            src={elevatorImg}
            alt="Modern architectural living elevator"
            className="section-bg-img about-bg-img"
            loading="lazy"
          />
          <div className="section-overlay about-overlay" />
        </div>

        <div className="section-container about-container">
          <div className="section-content about-content">
            <div className="about-glass-panel">
              <span className="section-eyebrow">ABOUT DWELLSYNC</span>
              <h2 className="section-headline">
                Elevating the Way <span className="text-gradient">You Live.</span>
              </h2>
              <p className="section-supporting-text">
                DwellSync brings property discovery and management together in one seamless experience. Whether you're searching for your next home or managing multiple properties, everything you need is connected.
              </p>

              <div className="about-highlights-grid">
                <div className="highlight-card">
                  <div className="highlight-icon-box">
                    <FaCompass />
                  </div>
                  <h3 className="highlight-title">Discover Properties</h3>
                  <p className="highlight-desc">
                    Explore curated rental flats, modern residential apartments, and verified plots with clear details and pricing.
                  </p>
                </div>

                <div className="highlight-card">
                  <div className="highlight-icon-box">
                    <FaBuilding />
                  </div>
                  <h3 className="highlight-title">Manage Your Rentals</h3>
                  <p className="highlight-desc">
                    Simplify tenant workflows, automate invoicing, track payments, and resolve maintenance tickets from one portal.
                  </p>
                </div>

                <div className="highlight-card">
                  <div className="highlight-icon-box">
                    <FaUsers />
                  </div>
                  <h3 className="highlight-title">Stay Connected</h3>
                  <p className="highlight-desc">
                    Foster direct communication between owners, tenants, and staff with official notice dispatch and message trails.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. FLAT RENTALS SECTION — landscape.jpg
          ===================================================================== */}
      <section id="rentals" className="cinematic-section section-rentals">
        <div className="section-bg-wrap">
          <img
            src={landscapeImg}
            alt="Scenic residential apartments for rent"
            className="section-bg-img rentals-bg-img"
            loading="lazy"
          />
          <div className="section-overlay rentals-overlay" />
        </div>

        <div className="section-container align-left">
          <div className="section-content story-glass-card">
            <span className="section-eyebrow tag-blue">RESIDENTIAL RENTALS</span>
            <h2 className="section-headline">
              Find a Place to <span className="text-gradient">Call Home.</span>
            </h2>
            <p className="section-supporting-text">
              Explore rental apartments across your preferred locations. Compare properties, discover available spaces, and find a home that matches your lifestyle and budget.
            </p>

            <ul className="story-specs-list">
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Move-in ready apartments & studios across prime neighborhoods</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Transparent monthly rent, advance deposit, and lease terms</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Direct inquiries with property owners—no broker runarounds</span>
              </li>
            </ul>

            <div className="story-cta-wrap">
              <button
                type="button"
                className="btn-cinematic-primary"
                onClick={() => navigate('/properties?listingType=For%20Rent')}
              >
                Explore Rentals <FaArrowRight className="btn-icon" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. APARTMENT BUYING SECTION — landscape2.jpg
          ===================================================================== */}
      <section id="buying" className="cinematic-section section-buying">
        <div className="section-bg-wrap">
          <img
            src={landscape2Img}
            alt="Contemporary city skyline and premium apartments"
            className="section-bg-img buying-bg-img"
            loading="lazy"
          />
          <div className="section-overlay buying-overlay" />
        </div>

        <div className="section-container align-right">
          <div className="section-content story-glass-card">
            <span className="section-eyebrow tag-emerald">PERMANENT RESIDENCES</span>
            <h2 className="section-headline">
              Own the Space <span className="text-gradient">You Deserve.</span>
            </h2>
            <p className="section-supporting-text">
              Discover apartments and residential properties designed for your future. Explore locations, compare listings, and take the next step toward owning your ideal home.
            </p>

            <ul className="story-specs-list">
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Premium multi-bedroom flats, penthouses, and family duplexes</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Verified building specifications, floor plans, and square footage</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Transparent purchase pricing with direct owner negotiation</span>
              </li>
            </ul>

            <div className="story-cta-wrap">
              <button
                type="button"
                className="btn-cinematic-primary"
                onClick={() => navigate('/properties?listingType=For%20Sale')}
              >
                Explore Apartments for Sale <FaArrowRight className="btn-icon" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. LAND BUYING AND RENTING SECTION — open field.jpg
          ===================================================================== */}
      <section id="land" className="cinematic-section section-land">
        <div className="section-bg-wrap">
          <img
            src={openFieldImg}
            alt="Scenic expansive open land plot"
            className="section-bg-img land-bg-img"
            loading="lazy"
          />
          <div className="section-overlay land-overlay" />
        </div>

        <div className="section-container align-left">
          <div className="section-content story-glass-card">
            <span className="section-eyebrow tag-amber">LAND & DEVELOPMENT</span>
            <h2 className="section-headline">
              Build Your Future <span className="text-gradient">From the Ground Up.</span>
            </h2>
            <p className="section-supporting-text">
              Discover land opportunities for residential, commercial, or long-term investment purposes. Explore available land for purchase or rent in locations that suit your plans.
            </p>

            <ul className="story-specs-list">
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Demarcated plots with verified boundaries and acreage details</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Opportunities zoned for commercial development or custom residential build</span>
              </li>
              <li>
                <FaCheckCircle className="spec-icon" />
                <span>Flexible arrangements for outright purchase or long-term lease</span>
              </li>
            </ul>

            <div className="story-button-row">
              <button
                type="button"
                className="btn-cinematic-primary"
                onClick={() => navigate('/properties?listingType=For%20Sale&search=land')}
              >
                Buy Land <FaArrowRight className="btn-icon" />
              </button>
              <button
                type="button"
                className="btn-cinematic-glass"
                onClick={() => navigate('/properties?listingType=For%20Rent&search=land')}
              >
                Rent Land
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. AFFORDABILITY CALCULATOR SECTION — Find homes within your budget
          ===================================================================== */}
      <section id="affordability" className="cinematic-section section-affordability">
        <div className="section-container affordability-section-container">
          <div className="section-content affordability-card">
            {/* Left Content Side */}
            <div className="affordability-text-side">
              <span className="section-eyebrow">✦ FINANCIAL PLANNING</span>
              <h2 className="affordability-title">
                Find homes within <span className="text-gradient">your budget</span>
              </h2>
              <p className="affordability-desc">
                Use our affordability calculator to discover properties that match your financial goals
              </p>

              <div className="affordability-features-list">
                <div className="affordability-feature-item">
                  <div className="feature-icon-box icon-blue">
                    <FaMoneyBillWave />
                  </div>
                  <div className="feature-info">
                    <h3>Budget Planning</h3>
                    <p>Set your price range and monthly payment goals</p>
                  </div>
                </div>

                <div className="affordability-feature-item">
                  <div className="feature-icon-box icon-emerald">
                    <FaHome />
                  </div>
                  <div className="feature-info">
                    <h3>Property Matching</h3>
                    <p>We'll show you homes that fit your budget</p>
                  </div>
                </div>
              </div>

              <div className="affordability-cta-group">
                <button
                  type="button"
                  className="calculator-button"
                  onClick={() => {
                    setCalculatorMode('buy');
                    setIsCalculatorOpen(true);
                  }}
                >
                  <FaCalculator /> Start Calculating <FaArrowRight className="btn-icon" />
                </button>
                <button
                  type="button"
                  className="affordability-secondary-link"
                  onClick={() => {
                    setCalculatorMode('rent');
                    setIsCalculatorOpen(true);
                  }}
                >
                  Calculate Rent Budget &rarr;
                </button>
              </div>
            </div>

            {/* Right Photograph Side */}
            <div className="affordability-image-side">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"
                alt="House keys and miniature home model representing home affordability"
                loading="lazy"
              />
              <div className="affordability-image-badge">
                <FaHome /> Smart Budget Matching
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. LIFESTYLE AND COMMUNITY SECTION — a park.jpg
          ===================================================================== */}
      <section id="lifestyle" className="cinematic-section section-lifestyle">
        <div className="section-bg-wrap">
          <img
            src={parkImg}
            alt="Tranquil park with lush green trees"
            className="section-bg-img lifestyle-bg-img"
            loading="lazy"
          />
          <div className="section-overlay lifestyle-overlay" />
        </div>

        <div className="section-container align-center">
          <div className="section-content lifestyle-panel">
            <span className="section-eyebrow tag-green">LIFESTYLE & COMMUNITY</span>
            <h2 className="section-headline">
              More Than a Home. <span className="text-gradient">A Better Way to Live.</span>
            </h2>
            <p className="section-supporting-text centered-text">
              Finding the right property is about more than walls and rooms. It's about comfort, convenience, community, and choosing a place where life can flourish.
            </p>

            <div className="lifestyle-benefits-grid">
              <div className="benefit-card">
                <div className="benefit-icon-box">
                  <FaTree />
                </div>
                <h3 className="benefit-title">Comfortable Living</h3>
                <p className="benefit-desc">
                  Thoughtfully planned residential environments surrounded by open spaces and peaceful greenery.
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon-box">
                  <FaUsers />
                </div>
                <h3 className="benefit-title">Connected Communities</h3>
                <p className="benefit-desc">
                  Neighborhoods close to essential schools, medical facilities, transport links, and active communities.
                </p>
              </div>

              <div className="benefit-card">
                <div className="benefit-icon-box">
                  <FaShieldAlt />
                </div>
                <h3 className="benefit-title">Simplified Management</h3>
                <p className="benefit-desc">
                  Digital payment processing, organized tenancy records, and prompt maintenance support in one app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. FINAL CALL TO ACTION SECTION — landscape2.jpg
          ===================================================================== */}
      <section id="cta" className="cinematic-section section-cta">
        <div className="section-bg-wrap">
          <img
            src={landscape2Img}
            alt="City skyline at dusk"
            className="section-bg-img cta-bg-img"
            loading="lazy"
          />
          <div className="section-overlay cta-overlay" />
        </div>

        <div className="section-container align-center">
          <div className="section-content cta-panel">
            <span className="section-eyebrow">START TODAY</span>
            <h2 className="section-headline cta-headline">
              Your Next Chapter Begins with <span className="text-gradient">DwellSync.</span>
            </h2>
            <p className="section-supporting-text centered-text cta-subtext">
              Explore properties, discover new opportunities, or list your space with a platform built to make property management simpler.
            </p>

            <div className="cta-button-group">
              <button
                type="button"
                className="btn-cinematic-primary"
                onClick={() => navigate('/properties')}
              >
                Browse Properties <FaArrowRight className="btn-icon" />
              </button>
              <button
                type="button"
                className="btn-cinematic-glass"
                onClick={handleGetStarted}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Affordability Calculator Modal */}
      <AffordabilityCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialMode={calculatorMode}
      />
    </div>
  );
};

export default HomePage;
