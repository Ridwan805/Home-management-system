import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import TenantSidebarNav from './TenantSidebarNav';
import TenantOverview from './TenantOverview';
import TenantProfile from './TenantProfile';
import PaymentInfo from './PaymentInfo';
import HouseInfo from './HouseInfo';
import TenantSecurityGuardInfo from './TenantSecurityGuardInfo';
import ReportProblem from './ReportProblem';
import Wishlist from './Wishlist';
import MyRequests from './MyRequests';
import QuickDialButton from '../../components/QuickDialButton/QuickDialButton';
import './TenantDashboard.css';

const sectionTitles = {
  dashboard: 'Dashboard Overview',
  profile: 'My Profile',
  payment: 'Payments & Billing',
  'house-info': 'House Information',
  'security-guard-info': 'Security Guard Information',
  'report-problem': 'Report a Problem',
  wishlist: 'Wishlist',
  'request-info': 'My Requests'
};

const TenantDashboard = () => {
  const { section } = useParams();
  const [activeSection, setActiveSection] = useState(section || 'dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  // Update active section when route parameter changes
  useEffect(() => {
    if (section) {
      setActiveSection(section);
    } else {
      setActiveSection('dashboard');
    }
  }, [section]);

  // Handle navigation between different sections
  const handleSectionChange = (newSection) => {
    setActiveSection(newSection);
    navigate(`/tenant/${newSection}`);
  };

  return (
    <div className="tenant-dashboard">
      <TenantSidebarNav 
        activeSection={activeSection} 
        setActiveSection={handleSectionChange}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="tenant-dashboard-body">
        {/* Mobile Top App Bar */}
        <header className="tenant-mobile-topbar">
          <button 
            type="button" 
            className="mobile-menu-toggle"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <div className="mobile-topbar-title">
            <span className="topbar-section-name">
              {sectionTitles[activeSection] || 'Tenant Portal'}
            </span>
          </div>

          <Link to="/" className="mobile-brand-pill">
            <span>Dwell</span><span style={{ color: '#38BDF8' }}>Sync</span>
          </Link>
        </header>

        <main className="tenant-main-content">
          <div className="tenant-page-container">
            {activeSection === 'dashboard' && <TenantOverview />}
            {activeSection === 'profile' && <TenantProfile />}
            {activeSection === 'payment' && <PaymentInfo />}
            {activeSection === 'house-info' && <HouseInfo />}
            {activeSection === 'security-guard-info' && <TenantSecurityGuardInfo />}
            {activeSection === 'report-problem' && <ReportProblem />}
            {activeSection === 'wishlist' && <Wishlist />}
            {activeSection === 'request-info' && <MyRequests />}
          </div>
        </main>
      </div>

      <QuickDialButton />
    </div>
  );
};

export default TenantDashboard;
