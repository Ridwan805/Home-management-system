import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
            <Link to="/admin">Dashboard</Link>
          </li>
          <li className={activeTab === 'pending-properties' ? 'active' : ''}>
            <Link to="/admin/pending-properties">Pending Properties</Link>
          </li>
          <li className={activeTab === 'report-management' ? 'active' : ''}>
            <Link to="/admin/reports">Reports</Link>
          </li>
          <li className={activeTab === 'user-moderation' ? 'active' : ''}>
            <Link to="/admin/users">User Moderation</Link>
          </li>
          <li className="logout-item">
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
