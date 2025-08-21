import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TenantSidebarNav from './TenantSidebarNav';
import TenantProfile from './TenantProfile';
import PaymentInfo from './PaymentInfo';
import HouseInfo from './HouseInfo';
import SecurityGuardInfo from '../OwnerProfile/SecurityGuardInfo';
import ReportProblem from './ReportProblem';
import Wishlist from './Wishlist';
import TenantMyRequests from './TenantMyRequests';
import './TenantDashboard.css';

const TenantDashboard = () => {
  const { section } = useParams();
  const [activeSection, setActiveSection] = useState(section || 'profile');
  const navigate = useNavigate();

  // Update active section when route parameter changes
  useEffect(() => {
    if (section) {
      setActiveSection(section);
    }
  }, [section]);

  // Handle navigation between different sections
  const handleSectionChange = (section) => {
    setActiveSection(section);
    navigate(`/tenant/${section}`);
  };

  return (
    <div className="tenant-dashboard">
      <TenantSidebarNav 
        activeSection={activeSection} 
        setActiveSection={handleSectionChange} 
      />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeSection === 'profile' && <TenantProfile />}
          {activeSection === 'payment' && <PaymentInfo />}
          {activeSection === 'house-info' && <HouseInfo />}
          {activeSection === 'security-guard-info' && <SecurityGuardInfo />}
          {activeSection === 'report-problem' && <ReportProblem />}
          {activeSection === 'wishlist' && <Wishlist />}
          {activeSection === 'request-info' && <TenantMyRequests />}
        </div>
      </main>
    </div>
  );
};

export default TenantDashboard;