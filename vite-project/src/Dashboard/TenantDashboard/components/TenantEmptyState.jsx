import React from 'react';
import './TenantComponents.css';

const TenantEmptyState = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction
}) => {
  return (
    <div className="tenant-empty-state-card">
      {Icon && (
        <div className="empty-state-icon-circle">
          <Icon className="empty-state-icon" aria-hidden="true" />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="empty-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default TenantEmptyState;
