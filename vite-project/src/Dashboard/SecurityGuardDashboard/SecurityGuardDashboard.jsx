import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SecurityGuardSidebarNav from './SecurityGuardSidebarNav';
import SecurityGuardProfile from './SecurityGuardProfile';
import LookingForJob from './LookingForJob';
import MyJob from './MyJob';
import SalaryInput from './SalaryInput';
import './SecurityGuardDashboard.css';

const SecurityGuardDashboard = () => {
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
    navigate(`/security-guard/${section}`);
  };

  return (
    <div className="security-guard-dashboard">
      <SecurityGuardSidebarNav 
        activeSection={activeSection} 
        setActiveSection={handleSectionChange} 
      />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {activeSection === 'profile' && <SecurityGuardProfile />}
          {activeSection === 'looking-for-job' && <LookingForJob />}
          {activeSection === 'my-job' && <MyJob />}
          {activeSection === 'salary-input' && <SalaryInput />}
        </div>
      </main>
    </div>
  );
};

export default SecurityGuardDashboard;