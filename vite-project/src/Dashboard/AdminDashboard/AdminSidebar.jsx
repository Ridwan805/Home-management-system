import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaTachometerAlt, FaHourglass, FaFlag, FaUsers, FaCreditCard, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './adminDashboard.css'; // Make sure your filename casing matches here

const AdminSidebar = ({ activeTab }) => {
  const { pathname } = useLocation();

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('dwellSyncUser');
    window.location.href = '/login';
  };

  return (
    <aside className="admin-sidebar">
      <h2 className="admin-logo">Admin Panel</h2>
      <nav>
        <ul>
          <li className={activeTab === 'overview' ? 'active' : ''}>
            <Link to="/admin">
              <FaTachometerAlt className="nav-icon" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={activeTab === 'pending-properties' ? 'active' : ''}>
            <Link to="/admin/pending-properties">
              <FaHourglass className="nav-icon" />
              <span>Pending Properties</span>
            </Link>
          </li>
          <li className={activeTab === 'report-management' ? 'active' : ''}>
            <Link to="/admin/reports">
              <FaFlag className="nav-icon" />
              <span>Reports</span>
            </Link>
          </li>
          <li className={activeTab === 'user-moderation' ? 'active' : ''}>
            <Link to="/admin/users">
              <FaUsers className="nav-icon" />
              <span>User Moderation</span>
            </Link>
          </li>
          <li className={activeTab === 'subscription-management' ? 'active' : ''}>
            <Link to="/admin/subscriptions">
              <FaCreditCard className="nav-icon" />
              <span>Subscriptions</span>
            </Link>
          </li>
          <li className={activeTab === 'configuration' ? 'active' : ''}>
            <Link to="/admin/configuration">
              <FaCog className="nav-icon" />
              <span>Configuration</span>
            </Link>
          </li>
          <li className="logout-item">
            <button onClick={handleLogout} className="logout-button">
              <FaSignOutAlt className="nav-icon" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
