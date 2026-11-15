import React from 'react';
import './Skeleton.css';

/**
 * Base generic Skeleton element with shimmer wave
 */
export const Skeleton = ({
  width,
  height,
  borderRadius,
  className = '',
  style = {},
  ...props
}) => {
  return (
    <div
      className={`dwellsync-skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius: borderRadius || '6px',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * PropertyCardSkeleton
 * Matches the layout and dimensions of PropertyCard.jsx
 * Prevents layout shift during property queries and filter applications.
 */
export const PropertyCardSkeleton = ({ className = '' }) => {
  return (
    <div className={`dwellsync-property-card-skeleton ${className}`} aria-hidden="true">
      {/* Image Thumbnail Placeholder */}
      <div className="skeleton-image-wrapper">
        <Skeleton width="100%" height="100%" borderRadius="12px 12px 0 0" />
        <div className="skeleton-overlay-badge left" />
        <div className="skeleton-overlay-heart right" />
      </div>

      {/* Card Content Body */}
      <div className="skeleton-card-body">
        {/* Price & Status Row */}
        <div className="skeleton-row space-between">
          <Skeleton width="120px" height="26px" borderRadius="6px" />
          <Skeleton width="70px" height="22px" borderRadius="12px" />
        </div>

        {/* Property Title / Address */}
        <Skeleton width="85%" height="20px" borderRadius="6px" style={{ marginTop: '10px' }} />

        {/* Location Subtitle */}
        <Skeleton width="60%" height="16px" borderRadius="6px" style={{ marginTop: '6px' }} />

        {/* Specs Grid (Bedrooms, Bathrooms, Square Footage) */}
        <div className="skeleton-specs-row">
          <Skeleton width="30%" height="34px" borderRadius="8px" />
          <Skeleton width="30%" height="34px" borderRadius="8px" />
          <Skeleton width="30%" height="34px" borderRadius="8px" />
        </div>

        {/* Action Button Placeholder */}
        <div className="skeleton-footer-row">
          <Skeleton width="100%" height="42px" borderRadius="8px" style={{ marginTop: '14px' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * DashboardCardSkeleton
 * Matches KPI statistic cards in Owner, Tenant, and Admin Dashboards.
 */
export const DashboardCardSkeleton = ({ className = '' }) => {
  return (
    <div className={`dwellsync-dashboard-card-skeleton ${className}`} aria-hidden="true">
      <Skeleton width="48px" height="48px" borderRadius="12px" className="skeleton-stat-icon" />
      <div className="skeleton-stat-content">
        <Skeleton width="90px" height="14px" borderRadius="4px" />
        <Skeleton width="130px" height="28px" borderRadius="6px" style={{ margin: '8px 0 6px 0' }} />
        <Skeleton width="150px" height="12px" borderRadius="4px" />
      </div>
    </div>
  );
};

/**
 * TableSkeleton
 * Clean, structured placeholder for tables (invoices, visitor logs, user lists, etc.)
 */
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`dwellsync-table-skeleton ${className}`} aria-hidden="true">
      {/* Table Header Row */}
      <div className="table-skeleton-head">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={`th-${c}`} height="16px" width={c === 0 ? '60%' : '80%'} borderRadius="4px" />
        ))}
      </div>

      {/* Table Body Rows */}
      <div className="table-skeleton-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="table-skeleton-row">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={`td-${r}-${c}`}
                height="18px"
                width={c === 0 ? '75%' : c === columns - 1 ? '50%' : '90%'}
                borderRadius="4px"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ProfileSkeleton
 * Form & details card placeholder for User / Owner / Tenant / Guard profiles.
 */
export const ProfileSkeleton = ({ className = '' }) => {
  return (
    <div className={`dwellsync-profile-skeleton ${className}`} aria-hidden="true">
      <div className="profile-skeleton-header">
        <Skeleton width="72px" height="72px" borderRadius="50%" />
        <div className="profile-skeleton-titles">
          <Skeleton width="160px" height="24px" borderRadius="6px" />
          <Skeleton width="100px" height="16px" borderRadius="4px" style={{ marginTop: '8px' }} />
        </div>
      </div>
      <div className="profile-skeleton-grid">
        <div className="profile-skeleton-field">
          <Skeleton width="80px" height="14px" borderRadius="4px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" style={{ marginTop: '6px' }} />
        </div>
        <div className="profile-skeleton-field">
          <Skeleton width="80px" height="14px" borderRadius="4px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" style={{ marginTop: '6px' }} />
        </div>
        <div className="profile-skeleton-field full">
          <Skeleton width="100px" height="14px" borderRadius="4px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" style={{ marginTop: '6px' }} />
        </div>
        <div className="profile-skeleton-field full">
          <Skeleton width="100px" height="14px" borderRadius="4px" />
          <Skeleton width="100%" height="40px" borderRadius="8px" style={{ marginTop: '6px' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * ListItemSkeleton
 * Card list rows for requests, notices, inbox items, and activity feeds.
 */
export const ListItemSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div className={`dwellsync-list-skeleton-container ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`item-${i}`} className="dwellsync-list-item-skeleton">
          <div className="list-skeleton-left">
            <Skeleton width="40px" height="40px" borderRadius="8px" />
            <div className="list-skeleton-lines">
              <Skeleton width="180px" height="18px" borderRadius="4px" />
              <Skeleton width="120px" height="14px" borderRadius="4px" style={{ marginTop: '6px' }} />
            </div>
          </div>
          <div className="list-skeleton-right">
            <Skeleton width="80px" height="24px" borderRadius="12px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
