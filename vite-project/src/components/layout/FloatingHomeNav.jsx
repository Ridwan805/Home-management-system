import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  UserRound,
  LogOut
} from 'lucide-react';
import { AuthContext } from '../../App';
import './FloatingHomeNav.css';

const FloatingHomeNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Close dropdown when clicking outside or pressing Escape
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
    const role = (userRole || '').trim().toLowerCase();
    switch (role) {
      case 'owner':
        return '/dashboard';
      case 'tenant':
        return '/tenant/dashboard';
      case 'security guard':
        return '/security-guard/profile';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  const getProfilePath = () => {
    const role = (userRole || '').trim().toLowerCase();
    switch (role) {
      case 'owner':
        return '/dashboard';
      case 'tenant':
        return '/tenant/profile';
      case 'security guard':
        return '/security-guard/profile';
      case 'admin':
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

  const dashboardPath = getDashboardPath();
  const profilePath = getProfilePath();
  const isDashboardActive = location.pathname === dashboardPath;
  const isProfileActive = location.pathname === profilePath;

  return (
    <header
      className={`floating-home-nav ${isScrolled ? 'is-scrolled' : ''}`}
      role="banner"
    >
      {/* Upper-Left: Floating DwellSync Branding */}
      <div className="floating-nav-left">
        <Link to="/" className="floating-brand-link" aria-label="DwellSync Home">
          <span className="brand-building-box">
            <Building2 className="building-icon" size={20} />
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
              onClick={() => navigate(dashboardPath)}
              aria-label={`Go to ${userRole || ''} Dashboard`}
            >
              <LayoutDashboard className="btn-icon" size={17} />
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
              <ChevronDown className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} size={16} />
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
                  className={`dropdown-item ${isDashboardActive ? 'active' : ''}`}
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(dashboardPath);
                  }}
                  role="menuitem"
                >
                  <LayoutDashboard className="item-icon" size={16} />
                  <span>My Dashboard</span>
                </button>

                <button
                  type="button"
                  className={`dropdown-item ${isProfileActive ? 'active' : ''}`}
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(profilePath);
                  }}
                  role="menuitem"
                >
                  <UserRound className="item-icon" size={16} />
                  <span>My Profile</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut className="item-icon" size={16} />
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
              <ArrowRight className="btn-arrow" size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default FloatingHomeNav;