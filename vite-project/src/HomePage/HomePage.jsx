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
import calculatingImg from '../assets/calculating.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useContext(AuthContext);

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
    } else {
      navigate('/dashboard/create-listing');
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

    // Section base Gaussian blur map (in rem units)
    // - Active resting blur: 0.25rem (photographic depth of field)
    // - Affordability section: 0.625rem (soft luxury interior defocus)
    const SCENE_BASE_BLUR = [
      0.25,   // 0: hero
      0.25,   // 1: about
      0.25,   // 2: rentals
      0.25,   // 3: buying
      0.25,   // 4: land
      0.625,  // 5: affordability
      0.25,   // 6: lifestyle
      0.25    // 7: cta
    ];

    const scenes = document.querySelectorAll('.cinematic-bg-stage .bg-stage-scene');

    // If reduced motion is requested, display resting state without scroll transitions
    if (prefersReduced) {
      if (scenes.length > 0) {
        scenes[0].style.opacity = '1';
        scenes[0].style.visibility = 'visible';
      }
      return () => {
        sections.forEach((sec) => observer.unobserve(sec));
      };
    }

    // 2. Cinematic Background Cross-Dissolve & Independent Card Transitions
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const vh = window.innerHeight || 1;
          const isMobile = window.innerWidth <= 768;

          if (isMobile) {
            // Mobile: natural document scroll
            const mid = vh / 2;
            let activeIdx = 0;
            let bestDist = Infinity;

            sections.forEach((sec, idx) => {
              const rect = sec.getBoundingClientRect();
              const secMid = rect.top + rect.height / 2;
              const dist = Math.abs(secMid - mid);
              if (dist < bestDist) {
                bestDist = dist;
                activeIdx = idx;
              }
              const content = sec.querySelector('.section-content');
              if (content) {
                content.style.transform = 'none';
                content.style.opacity = '1';
                content.style.filter = 'none';
                content.style.pointerEvents = 'auto';
              }
            });

            scenes.forEach((scene, sIdx) => {
              const bgImg = scene.querySelector('.section-bg-img');
              const baseBlur = SCENE_BASE_BLUR[sIdx] ?? 0.25;
              if (sIdx === activeIdx) {
                scene.style.opacity = '1';
                scene.style.visibility = 'visible';
                if (bgImg) bgImg.style.filter = `blur(${baseBlur}rem)`;
              } else {
                scene.style.opacity = '0';
                scene.style.visibility = 'hidden';
              }
            });

            ticking = false;
            return;
          }

          // Desktop / Tablet (> 768px):
          // Identify which adjacent sections are transitioning:
          let activeIdx = 0;
          let transitionP = 0; // 0 to 1 as sections[activeIdx + 1] approaches

          for (let i = 0; i < sections.length - 1; i++) {
            const nextRect = sections[i + 1].getBoundingClientRect();
            if (nextRect.top < vh && nextRect.top > 0) {
              activeIdx = i;
              transitionP = Math.max(0, Math.min(1, 1 - (nextRect.top / vh)));
              break;
            } else if (nextRect.top <= 0) {
              activeIdx = i + 1;
              transitionP = 0;
            }
          }

          // 1. Fullscreen Background Cross-Dissolve across Fixed Stage:
          scenes.forEach((scene, sIdx) => {
            const bgImg = scene.querySelector('.section-bg-img');
            const bokeh = scene.querySelector('.section-bokeh-layer');
            const baseBlur = SCENE_BASE_BLUR[sIdx] ?? 0.25;

            if (transitionP > 0.005) {
              if (sIdx === activeIdx) {
                // Outgoing background photograph:
                const p = transitionP;
                const opacity = Math.max(0, 1 - (p * 1.05));
                const maxBlur = 1.0625;
                const currentBlur = (baseBlur + p * (maxBlur - baseBlur)).toFixed(4);
                const brightness = (1 - (p * 0.16)).toFixed(3);
                const scale = (1 - (p * 0.015)).toFixed(4);

                scene.style.opacity = `${opacity.toFixed(3)}`;
                scene.style.visibility = 'visible';
                if (bgImg) {
                  bgImg.style.filter = `blur(${currentBlur}rem) brightness(${brightness}) contrast(1.04) saturate(1.06)`;
                  bgImg.style.transform = `scale(${scale}) translateZ(0)`;
                }
                if (bokeh) {
                  bokeh.style.opacity = (0.55 * (1 - p)).toFixed(3);
                  bokeh.style.transform = `scale(${1 + p * 0.06}) translateZ(0)`;
                }
              } else if (sIdx === activeIdx + 1) {
                // Incoming background photograph:
                const p = transitionP;
                const opacity = Math.min(1, p * 1.05);
                const currentBlur = (baseBlur + (1 - p) * 0.45).toFixed(4);
                const brightness = (0.86 + (p * 0.14)).toFixed(3);
                const scale = (1 + ((1 - p) * 0.015)).toFixed(4);

                scene.style.opacity = `${opacity.toFixed(3)}`;
                scene.style.visibility = 'visible';
                if (bgImg) {
                  bgImg.style.filter = `blur(${currentBlur}rem) brightness(${brightness}) contrast(1.04) saturate(1.06)`;
                  bgImg.style.transform = `scale(${scale}) translateZ(0)`;
                }
                if (bokeh) {
                  bokeh.style.opacity = (0.55 * p).toFixed(3);
                  bokeh.style.transform = `scale(${1 + (1 - p) * 0.06}) translateZ(0)`;
                }
              } else {
                scene.style.opacity = '0';
                scene.style.visibility = 'hidden';
              }
            } else {
              // Stationary resting on activeIdx:
              if (sIdx === activeIdx) {
                scene.style.opacity = '1';
                scene.style.visibility = 'visible';
                if (bgImg) {
                  bgImg.style.filter = `blur(${baseBlur}rem) brightness(1) contrast(1) saturate(1)`;
                  bgImg.style.transform = 'translateZ(0)';
                }
                if (bokeh) {
                  bokeh.style.opacity = '0.55';
                  bokeh.style.transform = 'translateZ(0)';
                }
              } else {
                scene.style.opacity = '0';
                scene.style.visibility = 'hidden';
              }
            }
          });

          // 2. Content Card Independent Dissolve & Subtle Motion:
          sections.forEach((sec, idx) => {
            const content = sec.querySelector('.section-content');
            if (!content) return;

            if (transitionP > 0.005) {
              if (idx === activeIdx) {
                // Outgoing content card:
                const p = transitionP;
                const opacity = Math.max(0, 1 - (p * 1.35));
                const translateY = (-p * 2).toFixed(3);
                const scale = (1 - (p * 0.03)).toFixed(3);

                content.style.opacity = `${opacity.toFixed(3)}`;
                content.style.transform = `translateY(${translateY}rem) scale(${scale}) translateZ(0)`;
                content.style.pointerEvents = p > 0.4 ? 'none' : 'auto';
                content.style.filter = 'none';
              } else if (idx === activeIdx + 1) {
                // Incoming content card:
                const p = transitionP;
                const cardP = p < 0.15 ? 0 : (p - 0.15) / 0.85;
                const opacity = Math.min(1, Math.max(0, cardP));
                const translateY = ((1 - cardP) * 2).toFixed(3);

                content.style.opacity = `${opacity.toFixed(3)}`;
                content.style.transform = `translateY(${translateY}rem) translateZ(0)`;
                content.style.pointerEvents = cardP > 0.7 ? 'auto' : 'none';
                content.style.filter = 'none';
              } else {
                content.style.opacity = '0';
                content.style.pointerEvents = 'none';
                content.style.filter = 'none';
              }
            } else {
              // Resting state on activeIdx:
              if (idx === activeIdx) {
                content.style.opacity = '1';
                content.style.transform = 'none';
                content.style.pointerEvents = 'auto';
                content.style.filter = 'none';
              } else {
                content.style.opacity = '0';
                content.style.pointerEvents = 'none';
                content.style.filter = 'none';
              }
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
          SHARED CINEMATIC BACKGROUND STAGE: Fullscreen Cross-Dissolve Scenes
          ===================================================================== */}
      <div className="cinematic-bg-stage" aria-hidden="true">
        {/* Scene 0: Hero */}
        <div className="bg-stage-scene scene-hero active-init">
          <img
            src={heroApartmentImg}
            alt="DwellSync luxury city apartments and modern residential buildings"
            className="section-bg-img hero-bg-img"
            loading="eager"
            fetchpriority="high"
          />
          <div className="section-bokeh-layer hero-bokeh" />
          <div className="section-overlay hero-overlay" />
        </div>

        {/* Scene 1: About */}
        <div className="bg-stage-scene scene-about">
          <img
            src={elevatorImg}
            alt="Modern architectural living elevator"
            className="section-bg-img about-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer about-bokeh" />
          <div className="section-overlay about-overlay" />
        </div>

        {/* Scene 2: Rentals */}
        <div className="bg-stage-scene scene-rentals">
          <img
            src={landscapeImg}
            alt="Scenic residential apartments for rent"
            className="section-bg-img rentals-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer rentals-bokeh" />
          <div className="section-overlay rentals-overlay" />
        </div>

        {/* Scene 3: Buying */}
        <div className="bg-stage-scene scene-buying">
          <img
            src={landscape2Img}
            alt="Contemporary city skyline and premium apartments"
            className="section-bg-img buying-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer buying-bokeh" />
          <div className="section-overlay buying-overlay" />
        </div>

        {/* Scene 4: Land */}
        <div className="bg-stage-scene scene-land">
          <img
            src={openFieldImg}
            alt="Scenic expansive open land plot"
            className="section-bg-img land-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer land-bokeh" />
          <div className="section-overlay land-overlay" />
        </div>

        {/* Scene 5: Affordability */}
        <div className="bg-stage-scene scene-affordability">
          <img
            src={calculatingImg}
            alt="Modern luxury apartment living room with floor-to-ceiling windows and warm natural lighting"
            className="section-bg-img affordability-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer affordability-bokeh" />
          <div className="section-overlay affordability-overlay" />
        </div>

        {/* Scene 6: Lifestyle */}
        <div className="bg-stage-scene scene-lifestyle">
          <img
            src={parkImg}
            alt="Tranquil park with lush green trees"
            className="section-bg-img lifestyle-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer lifestyle-bokeh" />
          <div className="section-overlay lifestyle-overlay" />
        </div>

        {/* Scene 7: CTA */}
        <div className="bg-stage-scene scene-cta">
          <img
            src={landscape2Img}
            alt="City skyline at dusk"
            className="section-bg-img cta-bg-img"
            loading="lazy"
          />
          <div className="section-bokeh-layer cta-bokeh" />
          <div className="section-overlay cta-overlay" />
        </div>
      </div>


      {/* =====================================================================
          1. CINEMATIC HERO SECTION — apartmment.jpg
          ===================================================================== */}
      <section id="hero" className="cinematic-section section-hero is-revealed" data-scene-idx="0">
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
      <section id="about" className="cinematic-section section-about" data-scene-idx="1">
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
      <section id="rentals" className="cinematic-section section-rentals" data-scene-idx="2">
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
      <section id="buying" className="cinematic-section section-buying" data-scene-idx="3">
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
      <section id="land" className="cinematic-section section-land" data-scene-idx="4">
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
      <section id="affordability" className="cinematic-section section-affordability" data-scene-idx="5">
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
      <section id="lifestyle" className="cinematic-section section-lifestyle" data-scene-idx="6">
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
      <section id="cta" className="cinematic-section section-cta" data-scene-idx="7">
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
