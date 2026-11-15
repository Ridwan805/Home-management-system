import React from 'react';
import './TenantComponents.css';

const normalizeStatus = (status) => {
  if (!status) return 'pending';
  const s = status.toLowerCase().trim().replace(/[–—_]/g, '-');
  return s;
};

const getStatusVariant = (status) => {
  const s = normalizeStatus(status);
  
  if (['paid', 'completed', 'active', 'approved', 'resolved', 'succeeded', 'advancepaid'].some(k => s.includes(k))) {
    return 'success';
  }
  if (['pending', 'under-review', 'processing', 'submitted', 'payment-submitted', 'info-requested', 'in-progress'].some(k => s.includes(k))) {
    return 'warning';
  }
  if (['overdue', 'rejected', 'canceled', 'cancelled', 'failed', 'high'].some(k => s.includes(k))) {
    return 'danger';
  }
  if (['owned', 'purchase', 'rent', 'medium'].some(k => s.includes(k))) {
    return 'info';
  }
  return 'neutral';
};

const TenantStatusBadge = ({ status, customLabel, size = 'md' }) => {
  const variant = getStatusVariant(status);
  const displayLabel = customLabel || status || 'Pending';

  return (
    <span className={`tenant-status-badge badge-${variant} badge-size-${size}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span className="badge-text">{displayLabel}</span>
    </span>
  );
};

export default TenantStatusBadge;
