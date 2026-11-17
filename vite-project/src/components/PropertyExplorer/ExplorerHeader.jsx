import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Search,
  SlidersHorizontal,
  LayoutDashboard,
  UserRound,
  LogOut,
  ChevronDown,
  X
} from 'lucide-react';
import { AuthContext } from '../../App';
import { isPropertySalesEnabled } from '../../config/features';
import './ExplorerHeader.css';

const ExplorerHeader = ({
  searchQuery = '',
  onSearchChange = () => {},
  activeListingType = '',
  onListingTypeChange = () => {},
  onOpenMobileFilters = () => {},
  activeFilterCount = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logout, userRole, setPopupMessage, currentUser } = useContext(AuthContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const displayName = currentUser?.firstName || currentUser?.name || userRole || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const normalizedType = (activeListingType || '').trim().toLowerCase();
  const isAllActive = !activeListingType || normalizedType === 'all';
  const isBuyActive = normalizedType === 'for sale' || normalizedType === 'buy' || normalizedType === 'sale';
  const isRentActive = normalizedType === 'for rent' || normalizedType === 'rent';

  return (
    <header className="explorer-header" role="banner">
      <div className="explorer-header-inner">
        {/* Left: Brand Logo & Navigation Tabs */}
        <div className="explorer-header-left">
          <Link to="/" className="explorer-brand-link" aria-label="DwellSync Home">
            <span className="brand-logo-icon">
              <Building2 size={19} />
            </span>
            <span className="brand-title-text">
              Dwell<span className="brand-accent-text">Sync</span>
            </span>
          </Link>

          {/* All / Buy / Rent Navigation Pills */}
          <nav className="explorer-tabs-nav" aria-label="Property listing types">
            <button
              type="button"
              className={`explorer-tab-pill ${isAllActive ? 'active' : ''}`}
              onClick={() => onListingTypeChange('')}
              aria-current={isAllActive ? 'page' : undefined}
            >
              All Properties
            </button>
            <button
              type="button"
              className={`explorer-tab-pill ${isRentActive ? 'active' : ''}`}
              onClick={() => onListingTypeChange('For Rent')}
              aria-current={isRentActive ? 'page' : undefined}
            >
              Rent
            </button>
            <button
              type="button"
              className={`explorer-tab-pill ${isBuyActive ? 'active' : ''}`}
              onClick={() => onListingTypeChange('For Sale')}
              aria-current={isBuyActive ? 'page' : undefined}
            >
              Buy
            </button>
          </nav>
        </div>

        {/* Center: Global Search Bar */}
        <div className="explorer-header-center">
          <div className="header-search-wrap">
            <Search size={16} className="search-lead-icon" aria-hidden="true" />
            <input
              type="text"
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by city, area, address, or zip code..."
              aria-label="Search properties"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => onSearchChange('')}
                aria-label="Clear search input"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Filter Trigger (Mobile/Tablet) & Auth Controls */}
        <div className="explorer-header-right">
          {/* Mobile/Tablet Filter Trigger */}
          <button
            type="button"
            className="mobile-filter-trigger-btn"
            onClick={onOpenMobileFilters}
            aria-label="Open filter sidebar"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-count-badge">{activeFilterCount}</span>
            )}
          </button>

          {/* Authentication Actions */}
          {isLoggedIn ? (
            <div className="explorer-auth-wrap" ref={dropdownRef}>
              <button
                type="button"
                className="btn-header-dashboard"
                onClick={() => navigate(getDashboardPath())}
                aria-label={`Go to ${userRole || ''} Dashboard`}
              >
                <LayoutDashboard size={15} />
                <span className="btn-label-text">Dashboard</span>
              </button>

              <button
                type="button"
                className={`btn-header-profile ${dropdownOpen ? 'open' : ''}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <span className="avatar-initial-circle">{initial}</span>
                <span className="user-name-text">{displayName}</span>
                <ChevronDown size={14} className={`chevron-arrow ${dropdownOpen ? 'rotated' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="header-profile-dropdown" role="menu">
                  <div className="dropdown-account-header">
                    <span className="account-greeting">Signed in as</span>
                    <span className="account-email">{currentUser?.email || displayName}</span>
                    <span className="account-role-tag">{userRole || 'Member'}</span>
                  </div>

                  <div className="dropdown-divider-line" />

                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(getDashboardPath());
                    }}
                    role="menuitem"
                  >
                    <LayoutDashboard size={15} />
                    <span>My Dashboard</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(getProfilePath());
                    }}
                    role="menuitem"
                  >
                    <UserRound size={15} />
                    <span>My Profile</span>
                  </button>

                  <div className="dropdown-divider-line" />

                  <button
                    type="button"
                    className="dropdown-menu-link logout-link"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="explorer-unauth-wrap">
              <Link to="/login" className="btn-header-login">
                Log In
              </Link>
              <Link to="/register" className="btn-header-signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ExplorerHeader;