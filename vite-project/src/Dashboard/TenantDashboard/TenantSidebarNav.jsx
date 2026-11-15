import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  UserRound, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Wrench, 
  Heart, 
  FileText, 
  LogOut,
  X
} from 'lucide-react';
import { AuthContext } from '../../App';
import './TenantSidebarNav.css';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'profile', label: 'My Profile', icon: UserRound },
  { key: 'payment', label: 'Payments', icon: CreditCard },
  { key: 'house-info', label: 'House Information', icon: Building2 },
  { key: 'security-guard-info', label: 'Security Guard Info', icon: ShieldCheck },
  { key: 'report-problem', label: 'Report a Problem', icon: Wrench },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'request-info', label: 'My Requests', icon: FileText },
];

const TenantSidebarNav = ({ activeSection, setActiveSection, isOpen, onClose }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/');
  };

  const handleNavClick = (key) => {
    setActiveSection(key);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="tenant-sidebar-backdrop" 
          onClick={onClose}
          aria-hidden="true" 
        />
      )}

      <aside className={`tenant-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Section */}
        <div className="tenant-sidebar-brand">
          <div className="brand-logo-row">
            <Link to="/" className="brand-link" onClick={onClose}>
              <span className="brand-dwell">Dwell</span>
              <span className="brand-sync">Sync</span>
            </Link>
            {onClose && (
              <button 
                type="button" 
                className="sidebar-close-btn" 
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div className="brand-portal-badge">
            <span className="badge-dot" />
            <span>Tenant Portal</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="tenant-sidebar-menu-wrap" aria-label="Tenant navigation">
          <ul className="tenant-sidebar-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <li key={item.key} className="tenant-menu-li">
                  <button
                    type="button"
                    className={`tenant-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.key)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="tenant-nav-icon" size={20} />
                    <span className="tenant-nav-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with Logout */}
        <div className="tenant-sidebar-footer">
          <button 
            type="button" 
            className="tenant-logout-btn" 
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default TenantSidebarNav;
