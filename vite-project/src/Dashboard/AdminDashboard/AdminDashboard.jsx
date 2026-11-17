import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import DashboardOverview from './DashboardOverview';
import PendingProperties from './PendingProperties';
import ReportManagement from './ReportManagement';
import UserModeration from './UserModeration';
import QuickDialButton from '../../components/QuickDialButton/QuickDialButton';
import './adminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Check if user is logged in and has admin role
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('dwellSyncUser') || '{}');
      const token = user.token || user.accessToken || (user.user && user.user.token) || localStorage.getItem('token');
      const role = (user.role || (user.user && user.user.role) || '').toLowerCase();
      if (!token || role !== 'admin') {
        navigate('/login', { replace: true });
      }
    } catch {
      navigate('/login', { replace: true });
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
    <div className="admin-dashboard-container">
      {/* Mobile Top Navigation Bar */}
      <header className="admin-mobile-topbar">
        <button
          type="button"
          className="admin-mobile-toggle-btn"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open Admin Menu"
        >
          <Menu size={20} />
        </button>
        <div className="admin-mobile-brand">
          <span>Dwell</span><span className="brand-sync">Sync</span>
          <span className="admin-mobile-badge">Admin</span>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <main className="admin-dashboard-main">
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/pending-properties" element={<PendingProperties />} />
          <Route path="/reports" element={<ReportManagement />} />
          <Route path="/users" element={<UserModeration />} />
          <Route path="*" element={<DashboardOverview />} />
        </Routes>
      </main>

      <QuickDialButton />
    </div>
  );
};

export default AdminDashboard;
