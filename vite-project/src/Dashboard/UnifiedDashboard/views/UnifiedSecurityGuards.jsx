import React, { useState } from 'react';
import { ShieldCheck, Building2, UserCheck } from 'lucide-react';
import SecurityGuardInfo from '../../OwnerProfile/SecurityGuardInfo';
import TenantSecurityGuardInfo from '../../TenantDashboard/TenantSecurityGuardInfo';
import './UnifiedSecurityGuards.css';

const UnifiedSecurityGuards = () => {
  const [activeTab, setActiveTab] = useState('owner'); // 'owner' | 'tenant'

  return (
    <div className="unified-security-view">
      <div className="security-view-header">
        <div className="header-text-group">
          <h1 className="security-title">Security Guards</h1>
          <p className="security-subtitle">
            Manage assigned building security personnel, visitor logs, and verify guard contact details.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="security-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'owner'}
            className={`tab-btn ${activeTab === 'owner' ? 'active' : ''}`}
            onClick={() => setActiveTab('owner')}
          >
            <ShieldCheck size={16} />
            <span>Assigned Guards (For Owned Buildings)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tenant'}
            className={`tab-btn ${activeTab === 'tenant' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenant')}
          >
            <UserCheck size={16} />
            <span>Building Security (For Rented Residence)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="security-view-content">
        {activeTab === 'owner' ? (
          <div className="tab-pane-container">
            <SecurityGuardInfo />
          </div>
        ) : (
          <div className="tab-pane-container">
            <TenantSecurityGuardInfo />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSecurityGuards;
