import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wrench, PlusCircle, ClipboardList } from 'lucide-react';
import ReportProblem from '../../TenantDashboard/ReportProblem';
import MaintenanceReports from '../../OwnerProfile/MaintenanceReports';
import './UnifiedMaintenanceView.css';

const UnifiedMaintenanceView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'manage') return 'manage';
    return 'report';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(location.search);
    params.set('tab', newTab);
    navigate({ search: params.toString() }, { replace: true });
  };

  return (
    <div className="unified-maintenance-view">
      <div className="maintenance-view-header">
        <div className="header-text-group">
          <h1 className="maintenance-title">Maintenance & Reports</h1>
          <p className="maintenance-subtitle">
            Submit maintenance requests for properties you rent and resolve service tickets across your owned portfolio.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="maintenance-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'report'}
            className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => handleTabChange('report')}
          >
            <PlusCircle size={16} />
            <span>Report an Issue (As Tenant)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manage'}
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => handleTabChange('manage')}
          >
            <ClipboardList size={16} />
            <span>Manage Tickets (As Owner)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="maintenance-view-content">
        {activeTab === 'report' ? (
          <div className="tab-pane-container">
            <ReportProblem />
          </div>
        ) : (
          <div className="tab-pane-container">
            <MaintenanceReports />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMaintenanceView;
