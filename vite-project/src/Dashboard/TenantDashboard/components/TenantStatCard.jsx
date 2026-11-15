import React from 'react';
import './TenantComponents.css';

const TenantStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue', // 'blue' | 'emerald' | 'amber' | 'rose' | 'navy'
  highlightColor,
  onClick
}) => {
  return (
    <div 
      className={`tenant-stat-card variant-${variant} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-top">
        <div className="stat-card-info">
          <span className="stat-card-title">{title}</span>
          <span 
            className="stat-card-value" 
            style={highlightColor ? { color: highlightColor } : undefined}
          >
            {value}
          </span>
        </div>
        {Icon && (
          <div className="stat-icon-wrapper">
            <Icon className="stat-icon" aria-hidden="true" />
          </div>
        )}
      </div>
      {subtitle && <div className="stat-card-subtext">{subtitle}</div>}
    </div>
  );
};

export default TenantStatCard;
