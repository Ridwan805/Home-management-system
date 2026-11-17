import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Compass,
  Heart,
  PlusCircle,
  ClipboardList,
  Users,
  ScrollText,
  ShieldCheck,
  CreditCard,
  Receipt,
  BarChart3,
  MessageSquare,
  Bell,
  Wrench,
  AlertTriangle,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { AuthContext } from '../../App';
import './UnifiedSidebar.css';

const navSections = [
  {
    id: 'main',
    title: 'MAIN WORKSPACE',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard },
      { key: 'my-properties', label: 'My Properties', icon: Building2 },
      { key: 'explore', label: 'Explore Properties', icon: Compass, externalRoute: '/properties' },
      { key: 'wishlist', label: 'Wishlist', icon: Heart }
    ]
  },
  {
    id: 'property',
    title: 'PROPERTY MANAGEMENT',
    items: [
      { key: 'create-listing', label: 'Create Listing', icon: PlusCircle },
      { key: 'applications', label: 'Applications & Requests', icon: ClipboardList },
      { key: 'tenants-buyers', label: 'Tenants & Buyers', icon: Users },
      { key: 'leases', label: 'Lease Agreements', icon: ScrollText },
      { key: 'security-guards', label: 'Security Guards', icon: ShieldCheck }
    ]
  },
  {
    id: 'financial',
    title: 'FINANCIAL MANAGEMENT',
    items: [
      { key: 'payments', label: 'Payments & Billing', icon: CreditCard },
      { key: 'invoices', label: 'Invoices & Receipts', icon: Receipt },
      { key: 'financials', label: 'Financial Overview', icon: BarChart3 }
    ]
  },
  {
    id: 'communication',
    title: 'COMMUNICATION & SERVICES',
    items: [
      { key: 'messages', label: 'Messages', icon: MessageSquare },
      { key: 'notifications', label: 'Notifications', icon: Bell },
      { key: 'maintenance', label: 'Maintenance & Reports', icon: Wrench },
      { key: 'notices', label: 'Notices & Move-Out', icon: AlertTriangle }
    ]
  },
  {
    id: 'account',
    title: 'ACCOUNT',
    items: [
      { key: 'profile', label: 'My Profile', icon: UserRound },
      { key: 'settings', label: 'Settings', icon: Settings }
    ]
  }
];

const UnifiedSidebar = ({
  activeSection,
  setActiveSection,
  isOpen,
  onClose,
  unreadCounts = { notifications: 0, messages: 0 }
}) => {
  const { logout, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Collapsible state for each navigation section (default all open)
  const [collapsedSections, setCollapsedSections] = useState({
    main: false,
    property: false,
    financial: false,
    communication: false,
    account: false
  });

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (item) => {
    if (item.externalRoute) {
      if (onClose) onClose();
      navigate(item.externalRoute);
      return;
    }
    setActiveSection(item.key);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="unified-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`unified-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header / Brand */}
        <div className="unified-sidebar-brand">
          <div className="unified-brand-row">
            <Link to="/" className="unified-brand-link" onClick={onClose}>
              <span className="brand-dwell">Dwell</span>
              <span className="brand-sync">Sync</span>
            </Link>
            {onClose && (
              <button
                type="button"
                className="unified-sidebar-close"
                onClick={onClose}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="unified-brand-subtitle">
            <span>Property & Tenancy Workspace</span>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="unified-sidebar-nav" aria-label="Main Navigation">
          {navSections.map(section => {
            const isCollapsed = collapsedSections[section.id];
            return (
              <div key={section.id} className="unified-nav-group">
                <button
                  type="button"
                  className="unified-group-header"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="unified-group-title">{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight size={14} className="unified-group-chevron" />
                  ) : (
                    <ChevronDown size={14} className="unified-group-chevron" />
                  )}
                </button>

                {!isCollapsed && (
                  <ul className="unified-group-items">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.key;
                      const badgeCount =
                        item.key === 'notifications'
                          ? unreadCounts.notifications
                          : item.key === 'messages'
                          ? unreadCounts.messages
                          : 0;

                      return (
                        <li key={item.key} className="unified-item-wrapper">
                          <button
                            type="button"
                            className={`unified-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleItemClick(item)}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <span className="unified-nav-icon">
                              <Icon size={17} />
                            </span>
                            <span className="unified-nav-label">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className="unified-nav-badge">
                                {badgeCount > 9 ? '9+' : badgeCount}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="unified-sidebar-footer">
          <button
            type="button"
            className="unified-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UnifiedSidebar;
