import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import PaymentInfo from '../../TenantDashboard/PaymentInfo';
import Payment from '../../OwnerProfile/Payment';
import './UnifiedPaymentsView.css';

const UnifiedPaymentsView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'collected') return 'collected';
    return 'pay';
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
    <div className="unified-payments-view">
      <div className="payments-view-header">
        <div className="header-text-group">
          <h1 className="payments-title">Payments & Billing</h1>
          <p className="payments-subtitle">
            Pay monthly rent and deposits as a tenant, and track verified tenant rent collections as a property owner.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="payments-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pay'}
            className={`tab-btn ${activeTab === 'pay' ? 'active' : ''}`}
            onClick={() => handleTabChange('pay')}
          >
            <ArrowUpRight size={16} />
            <span>Rent to Pay (As Tenant)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'collected'}
            className={`tab-btn ${activeTab === 'collected' ? 'active' : ''}`}
            onClick={() => handleTabChange('collected')}
          >
            <ArrowDownRight size={16} />
            <span>Collected Rent (As Owner)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="payments-view-content">
        {activeTab === 'pay' ? (
          <div className="tab-pane-container">
            <PaymentInfo />
          </div>
        ) : (
          <div className="tab-pane-container">
            <Payment />
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedPaymentsView;
