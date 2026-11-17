import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiConfig from '../../config/api';

// Components
import UnifiedSidebar from './UnifiedSidebar';
import UnifiedHeader from './UnifiedHeader';
import QuickDialButton from '../../components/QuickDialButton/QuickDialButton';

// Views
import UnifiedOverview from './UnifiedOverview';
import UnifiedPropertiesView from './views/UnifiedPropertiesView';
import CreateListingForm from '../OwnerProfile/CreateListingForm';
import UnifiedRequestsView from './views/UnifiedRequestsView';
import UnifiedTenantsBuyersView from './views/UnifiedTenantsBuyersView';
import UnifiedLeaseAgreements from './views/UnifiedLeaseAgreements';
import UnifiedSecurityGuards from './views/UnifiedSecurityGuards';
import UnifiedPaymentsView from './views/UnifiedPaymentsView';
import UnifiedInvoicesView from './views/UnifiedInvoicesView';
import UnifiedFinancialsView from './views/UnifiedFinancialsView';
import UnifiedMaintenanceView from './views/UnifiedMaintenanceView';
import UnifiedNoticesView from './views/UnifiedNoticesView';
import Wishlist from '../TenantDashboard/Wishlist';
import UnifiedMessagesView from './views/UnifiedMessagesView';
import UnifiedNotificationsView from './views/UnifiedNotificationsView';
import UnifiedProfileView from './views/UnifiedProfileView';
import UnifiedSettingsView from './views/UnifiedSettingsView';

import './UnifiedDashboard.css';

// Mapping for legacy and alternate section names
const SECTION_ALIASES = {
  '': 'overview',
  dashboard: 'overview',
  overview: 'overview',
  'my-properties': 'my-properties',
  'property-details': 'my-properties',
  'house-info': 'my-properties',
  properties: 'my-properties',
  'create-listing': 'create-listing',
  applications: 'applications',
  'request-info': 'applications',
  'my-requests': 'applications',
  requests: 'applications',
  'tenants-buyers': 'tenants-buyers',
  'tenant-info': 'tenants-buyers',
  tenants: 'tenants-buyers',
  leases: 'leases',
  'lease-agreements': 'leases',
  'security-guards': 'security-guards',
  'security-guard-info': 'security-guards',
  payments: 'payments',
  payment: 'payments',
  billing: 'payments',
  invoices: 'invoices',
  receipts: 'invoices',
  financials: 'financials',
  messages: 'messages',
  notifications: 'notifications',
  maintenance: 'maintenance',
  'maintenance-reports': 'maintenance',
  'report-problem': 'maintenance',
  notices: 'notices',
  'move-out': 'notices',
  wishlist: 'wishlist',
  profile: 'profile',
  settings: 'settings'
};

const UnifiedDashboard = () => {
  const { section } = useParams();
  const navigate = useNavigate();

  // Normalize current active section
  const currentKey = section ? section.toLowerCase() : 'overview';
  const resolvedSection = SECTION_ALIASES[currentKey] || 'overview';

  const [activeSection, setActiveSection] = useState(resolvedSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Sync state with URL params
  useEffect(() => {
    const key = section ? section.toLowerCase() : 'overview';
    const resolved = SECTION_ALIASES[key] || 'overview';
    setActiveSection(resolved);
    window.scrollTo(0, 0);
  }, [section]);

  // Fetch unread notifications count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) return;
      const token = JSON.parse(saved).token;
      if (!token) return;

      const res = await fetch(apiConfig.getUrl('/api/notifications/unread-count'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === 'number') {
          setUnreadNotifications(data.unreadCount);
        }
      }
    } catch {
      // Quietly ignore background poll error
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000); // Check every 45s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Navigate to another section cleanly
  const handleNavigateSection = (targetKey) => {
    const target = SECTION_ALIASES[targetKey] || targetKey;
    setActiveSection(target);
    setMobileMenuOpen(false);

    if (target === 'overview') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${target}`);
    }
  };

  // Render the selected view
  const renderActiveView = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <UnifiedOverview
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'my-properties':
        return (
          <UnifiedPropertiesView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'create-listing':
        return (
          <div className="unified-create-listing-wrapper">
            <CreateListingForm
              onSuccess={() => handleNavigateSection('my-properties')}
              onCancel={() => handleNavigateSection('overview')}
            />
          </div>
        );

      case 'applications':
        return (
          <UnifiedRequestsView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'tenants-buyers':
        return (
          <UnifiedTenantsBuyersView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'leases':
        return (
          <UnifiedLeaseAgreements
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'security-guards':
        return (
          <UnifiedSecurityGuards
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'payments':
        return (
          <UnifiedPaymentsView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'invoices':
        return (
          <UnifiedInvoicesView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'financials':
        return (
          <UnifiedFinancialsView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'maintenance':
        return (
          <UnifiedMaintenanceView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'notices':
        return (
          <UnifiedNoticesView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'wishlist':
        return (
          <div className="unified-embedded-view">
            <Wishlist onNavigateSection={handleNavigateSection} />
          </div>
        );

      case 'messages':
        return (
          <UnifiedMessagesView
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );

      case 'notifications':
        return (
          <UnifiedNotificationsView
            onNavigateSection={handleNavigateSection}
            onUnreadCountChange={setUnreadNotifications}
          />
        );

      case 'profile':
        return (
          <UnifiedProfileView
            onNavigateSection={handleNavigateSection}
          />
        );

      case 'settings':
        return (
          <UnifiedSettingsView
            onNavigateSection={handleNavigateSection}
          />
        );

      default:
        return (
          <UnifiedOverview
            onNavigateSection={handleNavigateSection}
            searchTerm={searchTerm}
          />
        );
    }
  };

  return (
    <div className="unified-dashboard-layout">
      {/* Dark Navy Persistent Sidebar */}
      <UnifiedSidebar
        activeSection={activeSection}
        setActiveSection={handleNavigateSection}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        unreadCounts={{ notifications: unreadNotifications, messages: 0 }}
      />

      {/* Main Container */}
      <div className="unified-dashboard-content-area">
        {/* Top Header */}
        <UnifiedHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigateSection={handleNavigateSection}
          unreadNotifications={unreadNotifications}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Content View */}
        <main className="unified-dashboard-main">
          <div className="unified-content-inner">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <QuickDialButton />
    </div>
  );
};

export default UnifiedDashboard;
