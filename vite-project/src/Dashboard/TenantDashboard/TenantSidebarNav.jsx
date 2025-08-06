import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import './TenantSidebarNav.css';

const menuItems = [
  { key: 'profile', label: 'Profile', description: 'Personal Information' },
  { key: 'payment', label: 'Payment', description: 'Manage Bills & Payments' },
  { key: 'house-info', label: 'House Information', description: 'View Property Details' },
  { key: 'security-guard-info', label: 'Security Guard Info', description: 'Contact Security' },
  { key: 'report-problem', label: 'Report Problem', description: 'Report Issues' },
  { key: 'wishlist', label: 'Wishlist', description: 'Saved Properties' },
  { key: 'request-info', label: 'My Requests', description: 'View Request Status' },
];

const TenantSidebarNav = ({ activeSection, setActiveSection }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="tenant-sidebar-nav">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-title" style={{ textDecoration: 'none' }}>DwellSync</Link>
        <span className="sidebar-subtitle">Tenant Portal</span>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map(item => (
          <li
            key={item.key}
            className={`sidebar-menu-item${activeSection === item.key ? ' active' : ''}`}
            onClick={() => setActiveSection(item.key)}
          >
            <div className="menu-label">{item.label}</div>
            <div className="menu-description">{item.description}</div>
          </li>
        ))}
      </ul>
      <div className="sidebar-logout">
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default TenantSidebarNav;