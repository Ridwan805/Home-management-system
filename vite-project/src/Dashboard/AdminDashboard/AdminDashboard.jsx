import React, { useState, useEffect } from 'react'; // Required for React components and hooks
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import DashboardOverview from './DashboardOverview';
import PendingProperties from './PendingProperties';
import ReportManagement from './ReportManagement';
import UserModeration from './UserModeration';
import './adminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if user is logged in and has admin role
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
    if (!user.token || user.role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      setActiveTab('overview');
    } else if (path === '/admin/pending-properties') {
      setActiveTab('pending-properties');
    } else if (path === '/admin/reports') {
      setActiveTab('report-management');
    } else if (path === '/admin/users') {
      setActiveTab('user-moderation');
    }
  }, [location.pathname]);

  return (
    <div className="admin-dashboard">
      <AdminSidebar activeTab={activeTab} />
      <main className="admin-dashboard-main">
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/pending-properties" element={<PendingProperties />} />
          <Route path="/reports" element={<ReportManagement />} />
          <Route path="/users" element={<UserModeration />} />
          <Route path="*" element={<DashboardOverview />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
