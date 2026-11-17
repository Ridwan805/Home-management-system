import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Compass,
  PlusCircle,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { AuthContext } from '../../App';
import './UnifiedHeader.css';

const UnifiedHeader = ({
  onOpenMobileMenu,
  onNavigateSection,
  unreadNotifications = 0,
  searchTerm = '',
  setSearchTerm
}) => {
  const { currentUser, logout, userRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  const getInitials = () => {
    if (!currentUser) return 'U';
    const first = currentUser.firstName ? currentUser.firstName[0] : '';
    const last = currentUser.lastName ? currentUser.lastName[0] : '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return (currentUser.name ? currentUser.name[0] : 'U').toUpperCase();
  };

  const getFullName = () => {
    if (!currentUser) return 'DwellSync Member';
    if (currentUser.firstName || currentUser.lastName) {
      return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    }
    return currentUser.name || 'DwellSync Member';
  };

  return (
    <header className="unified-top-header">
      <div className="unified-header-left">
        <button
          type="button"
          className="unified-mobile-toggle"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>

        {/* Global Search Bar */}
        <div className="unified-header-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search properties, tenants, invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="unified-header-right">
        {/* Quick Shortcut Buttons */}
        <button
          type="button"
          className="header-shortcut-btn explore-shortcut"
          onClick={() => navigate('/properties')}
          title="Explore available properties"
        >
          <Compass size={16} />
          <span>Explore Properties</span>
        </button>

        <button
          type="button"
          className="header-shortcut-btn create-shortcut"
          onClick={() => onNavigateSection ? onNavigateSection('create-listing') : navigate('/dashboard/create-listing')}
          title="Add a new property listing"
        >
          <PlusCircle size={16} />
          <span>List Property</span>
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="header-icon-btn bell-btn"
          onClick={() => onNavigateSection ? onNavigateSection('notifications') : navigate('/dashboard/notifications')}
          aria-label="View notifications"
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span className="bell-badge">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <div className="header-divider" />

        {/* User Profile Pill / Dropdown */}
        <div className="header-profile-container" ref={dropdownRef}>
          <button
            type="button"
            className="header-profile-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div className="profile-avatar">
              <span>{getInitials()}</span>
            </div>
            <div className="profile-info-text">
              <span className="profile-name">{getFullName()}</span>
              <span className="profile-role">
                {userRole === 'Security Guard' ? 'Security Guard' : (userRole === 'Service Provider' ? 'Service Provider' : (userRole === 'admin' ? 'Administrator' : 'Resident / Property Owner'))}
              </span>
            </div>
            <ChevronDown size={14} className="profile-chevron" />
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-header">
                <span className="dropdown-name">{getFullName()}</span>
                <span className="dropdown-email">{currentUser?.email || ''}</span>
              </div>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onNavigateSection) onNavigateSection('profile');
                }}
              >
                <User size={16} />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onNavigateSection) onNavigateSection('settings');
                }}
              >
                <Settings size={16} />
                <span>Account Settings</span>
              </button>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default UnifiedHeader;
