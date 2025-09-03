import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import './SecurityGuardSidebarNav.css';

const menuItems = [
  { key: 'profile', label: 'Profile', description: 'Personal Information' },
  { key: 'looking-for-job', label: 'Looking for Job', description: 'Browse Available Positions' },
  { key: 'my-job', label: 'My Job', description: 'View Current Assignment Details' },
  { key: 'salary-input', label: 'Salary Input', description: 'Record Salary Information' },
];

const SecurityGuardSidebarNav = ({ activeSection, setActiveSection }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="security-guard-sidebar-nav">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-title" style={{ textDecoration: 'none' }}>DwellSync</Link>
        <span className="sidebar-subtitle">Security Guard Portal</span>
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

export default SecurityGuardSidebarNav;