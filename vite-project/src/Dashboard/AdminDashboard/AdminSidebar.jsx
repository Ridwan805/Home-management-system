import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Flag,
  Users,
  LogOut,
  X
} from 'lucide-react';
import './adminDashboard.css';

const menuItems = [
  {
    key: 'overview',
    path: '/admin',
    label: 'Dashboard',
    description: 'Overview & Metrics',
    icon: <LayoutDashboard size={18} />
  },
  {
    key: 'pending-properties',
    path: '/admin/pending-properties',
    label: 'Property Approvals',
    description: 'Review & Moderation',
    icon: <Building2 size={18} />
  },
  {
    key: 'report-management',
    path: '/admin/reports',
    label: 'Reports',
    description: 'System & User Reports',
    icon: <Flag size={18} />
  },
  {
    key: 'user-moderation',
    path: '/admin/users',
    label: 'User Moderation',
    description: 'Accounts & Access',
    icon: <Users size={18} />
  }
];

const AdminSidebar = ({ isMobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
    } catch {
      return {};
    }
  })();
  const adminEmail = currentUser.email || (currentUser.user && currentUser.user.email) || 'admin@dwell.com';
  const adminName = currentUser.name || (currentUser.user && currentUser.user.name) || adminEmail.split('@')[0] || 'Administrator';

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    localStorage.removeItem('dwellSyncUser');
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand-row">
            <Link to="/admin" className="admin-sidebar-title" onClick={handleLinkClick}>
              Dwell<span>Sync</span>
            </Link>
            <span className="admin-portal-badge">Admin Portal</span>
            {onCloseMobile && (
              <button
                type="button"
                className="admin-sidebar-close-btn"
                onClick={onCloseMobile}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <span className="admin-sidebar-subtitle">Platform Moderation & Ops</span>
        </div>

        {/* Navigation Menu */}
        <nav className="admin-sidebar-nav" aria-label="Admin Navigation">
          <ul className="admin-sidebar-menu">
            {menuItems.map((item) => {
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin' || location.pathname === '/admin/'
                  : location.pathname.startsWith(item.path);

              return (
                <li key={item.key} className="admin-menu-item-wrapper">
                  <Link
                    to={item.path}
                    className={`admin-menu-item ${isActive ? 'active' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <span className="admin-menu-icon">{item.icon}</span>
                    <div className="admin-menu-text">
                      <div className="admin-menu-label">{item.label}</div>
                      <div className="admin-menu-desc">{item.description}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Section Anchored at Bottom with Admin Profile Pill */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-profile-card">
            <div className="admin-user-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">Super Admin</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
            title="Sign out of Admin Portal"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
