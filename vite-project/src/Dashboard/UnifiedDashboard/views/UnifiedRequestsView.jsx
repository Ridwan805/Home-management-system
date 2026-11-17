import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Inbox, Send, ClipboardList } from 'lucide-react';
import OwnerRequestsInbox from '../../OwnerProfile/OwnerRequestsInbox';
import MyRequests from '../../TenantDashboard/MyRequests';
import './UnifiedRequestsView.css';

const UnifiedRequestsView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read initial tab from search params (?tab=sent or ?tab=received)
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'sent') return 'sent';
    return 'received';
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
    <div className="unified-requests-view">
      <div className="requests-view-header">
        <div className="header-text-group">
          <h1 className="requests-title">Applications & Requests</h1>
          <p className="requests-subtitle">
            Manage tenancy requests for your owned properties and track applications you have submitted.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="requests-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'received'}
            className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => handleTabChange('received')}
          >
            <Inbox size={16} />
            <span>Received Applications (As Owner)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sent'}
            className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => handleTabChange('sent')}
          >
            <Send size={16} />
            <span>My Sent Applications (As Applicant)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="requests-view-content">
        {activeTab === 'received' ? (
          <div className="tab-pane-container">
            <OwnerRequestsInbox />
          </div>
        ) : (
          <div className="tab-pane-container">
            <MyRequests />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedRequestsView;
