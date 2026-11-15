import React from 'react';
import './TenantComponents.css';

const TenantPageHeader = ({ title, subtitle, action, badge }) => {
  return (
    <header className="tenant-page-header">
      <div className="tenant-page-header-text">
        <div className="tenant-page-header-title-row">
          <h1 className="tenant-page-title">{title}</h1>
          {badge && <span className="tenant-header-badge">{badge}</span>}
        </div>
        {subtitle && <p className="tenant-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="tenant-page-header-actions">{action}</div>}
    </header>
  );
};

export default TenantPageHeader;
