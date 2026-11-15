import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaArrowRight,
  FaChevronDown,
  FaThLarge,
  FaUser,
  FaSignOutAlt
} from 'react-icons/fa';
import { AuthContext } from '../../App';
import './FloatingHomeNav.css';

const FloatingHomeNav = () => {
  const navigate = useNavigate();
  const { isLoggedIn, logout, userRole, setPopupMessage, currentUser } = useContext(AuthContext);

  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Monitor scroll position to apply subtle compact glass backdrop
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Role-appropriate destination links
  const getDashboardPath = () => {
    switch (userRole) {
      case 'Owner':
        return '/dashboard';
      case 'Tenant':
        return '/tenant/requests';
      case 'Security Guard':
        return '/security-guard';
      case 'Admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  const getProfilePath = () => {
    switch (userRole) {
      case 'Owner':
        return '/dashboard';
      case 'Tenant':
        return '/tenant/profile';
      case 'Security Guard':
        return '/security-guard/profile';
      case 'Admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    if (setPopupMessage) {
      setPopupMessage('Logged out successfully');
      setTimeout(() => setPopupMessage(''), 2500);
    }
    navigate('/');
  };

  // User display name & initial
  const displayName = currentUser?.firstName || currentUser?.name || userRole || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className={`floating-home-nav ${isScrolled ? 'is-scrolled' : ''}`}
      role="banner"
    >
      {/* Upper-Left: Floating DwellSync Branding */}
      <div className="floating-nav-left">
        <Link to="/" className="floating-brand-link" aria-label="DwellSync Home">
          <span className="brand-building-box">
            <FaBuilding className="building-icon" />
          </span>
          <span className="brand-wordmark">
            Dwell<span className="wordmark-sync">Sync</span>
          </span>
        </Link>
      </div>

      {/* Upper-Right: Floating Authentication Controls */}
      <div className="floating-nav-right">
        {isLoggedIn ? (
          <div className="floating-auth-actions authenticated" ref={dropdownRef}>
            {/* Direct Role Dashboard Button */}
            <button
              type="button"
              className="btn-floating-dashboard"
              onClick={() => navigate(getDashboardPath())}
              aria-label={`Go to ${userRole || ''} Dashboard`}
            >
              <FaThLarge className="btn-icon" />
              <span className="btn-label">Dashboard</span>
            </button>

            {/* Profile Dropdown Trigger */}
            <button
              type="button"
              className={`btn-floating-profile ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <span className="avatar-initial">{initial}</span>
              <span className="user-firstname">{displayName}</span>
              <FaChevronDown className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div className="floating-profile-dropdown" role="menu">
                <div className="dropdown-user-header">
                  <span className="header-greeting">Signed in as</span>
                  <span className="header-name">{currentUser?.email || displayName}</span>
                  <span className="header-role-badge">{userRole || 'Member'}</span>
                </div>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(getDashboardPath());
                  }}
                  role="menuitem"
                >
                  <FaThLarge className="item-icon" />
                  <span>My Dashboard</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(getProfilePath());
                  }}
                  role="menuitem"
                >
                  <FaUser className="item-icon" />
                  <span>My Profile</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <FaSignOutAlt className="item-icon" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="floating-auth-actions unauthenticated">
            {/* Transparent Glass Outlined Login Button */}
            <button
              type="button"
              className="btn-floating-login"
              onClick={() => navigate('/login')}
            >
              Log In
            </button>

            {/* Solid Royal Blue Pill Button */}
            <button
              type="button"
              className="btn-floating-get-started"
              onClick={() => navigate('/register')}
            >
              <span>Get Started</span>
              <FaArrowRight className="btn-arrow" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default FloatingHomeNav;
