import React, { useContext } from 'react';
import './SidebarNav.css';
import { AuthContext } from '../../App';
import { useNavigate, Link } from 'react-router-dom';

const menuItems = [
  { key: 'profile', label: 'Profile', description: 'Owner Information', icon: '👤' },
  { key: 'create-listing', label: 'Create Listing', description: 'Add New Property', icon: '➕' },
  { key: 'property-details', label: 'Property Details', description: 'View Listed Properties', icon: '🏢' },
  { key: 'tenant-info', label: 'Tenant Info', description: 'Manage Tenants', icon: '👥' },
  { key: 'security-guard-info', label: 'Security Guard Info', description: 'Manage Security Guards', icon: '🛡️' },
  { key: 'request-info', label: 'Request Info', description: 'View Requests', icon: '📋' },
  { key: 'maintenance-reports', label: 'Maintenance Reports', description: 'View & Manage Reports', icon: '🔧' },
  { key: 'payments', label: 'Payments', description: 'Manage Payments', icon: '💳' },
];

const SidebarNav = ({ activeSection, setActiveSection }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-header">
        <div className="sidebar-brand-row">
          <Link to="/" className="sidebar-title">
            Dwell<span>Sync</span>
          </Link>
          <span className="sidebar-role-badge">Owner</span>
        </div>
        <span className="sidebar-subtitle">Property Management Portal</span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map(item => (
          <li
            key={item.key}
            className={`sidebar-menu-item${activeSection === item.key ? ' active' : ''}`}
            onClick={() => setActiveSection(item.key)}
          >
            <span className="menu-item-icon">{item.icon}</span>
            <div className="menu-item-content">
              <div className="menu-label">{item.label}</div>
              <div className="menu-description">{item.description}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="sidebar-logout">
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;