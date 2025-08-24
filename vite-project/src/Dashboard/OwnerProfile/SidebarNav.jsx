import React, { useContext } from 'react';
import './SidebarNav.css';
import { AuthContext } from '../../App';
import { useNavigate, Link } from 'react-router-dom';

const menuItems = [
  { key: 'profile', label: 'Profile', description: 'Owner Information' },
  { key: 'create-listing', label: 'Create Listing', description: 'Add New Property' },
  { key: 'property-details', label: 'Property Details', description: 'View Listed Properties' },
  { key: 'tenant-info', label: 'Tenant Info', description: 'Manage Tenants' },
  { key: 'security-guard-info', label: 'Security Guard Info', description: 'Manage Security Guards' },
  { key: 'request-info', label: 'Request Info', description: 'View Requests' },
  { key: 'payments', label: 'Payments', description: 'Manage Payments' },
];

const SidebarNav = ({ activeSection, setActiveSection }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <nav className="sidebar-nav">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-title" style={{ textDecoration: 'none' }}>DwellSync</Link>
        <span className="sidebar-subtitle">Property Management</span>
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

export default SidebarNav;