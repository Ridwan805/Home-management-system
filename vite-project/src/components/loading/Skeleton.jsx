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
        height: height || '1.25rem',
        borderRadius: borderRadius || '0.375rem',
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
        <Skeleton width="100%" height="100%" borderRadius="0.75rem 0.75rem 0 0" />
        <div className="skeleton-overlay-badge left" />
        <div className="skeleton-overlay-heart right" />
      </div>

      {/* Card Content Body */}
      <div className="skeleton-card-body">
        {/* Price & Status Row */}
        <div className="skeleton-row space-between">
          <Skeleton width="7.5rem" height="1.625rem" borderRadius="0.375rem" />
          <Skeleton width="4.375rem" height="1.375rem" borderRadius="0.75rem" />
        </div>

        {/* Property Title / Address */}
        <Skeleton width="85%" height="1.25rem" borderRadius="0.375rem" style={{ marginTop: '0.625rem' }} />

        {/* Location Subtitle */}
        <Skeleton width="60%" height="1rem" borderRadius="0.375rem" style={{ marginTop: '0.375rem' }} />

        {/* Specs Grid (Bedrooms, Bathrooms, Square Footage) */}
        <div className="skeleton-specs-row">
          <Skeleton width="30%" height="2.125rem" borderRadius="0.5rem" />
          <Skeleton width="30%" height="2.125rem" borderRadius="0.5rem" />
          <Skeleton width="30%" height="2.125rem" borderRadius="0.5rem" />
        </div>

        {/* Action Button Placeholder */}
        <div className="skeleton-footer-row">
          <Skeleton width="100%" height="2.625rem" borderRadius="0.5rem" style={{ marginTop: '0.875rem' }} />
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
      <Skeleton width="3rem" height="3rem" borderRadius="0.75rem" className="skeleton-stat-icon" />
      <div className="skeleton-stat-content">
        <Skeleton width="5.625rem" height="0.875rem" borderRadius="0.25rem" />
        <Skeleton width="8.125rem" height="1.75rem" borderRadius="0.375rem" style={{ margin: '0.5rem 0 0.375rem 0' }} />
        <Skeleton width="9.375rem" height="0.75rem" borderRadius="0.25rem" />
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
          <Skeleton key={`th-${c}`} height="1rem" width={c === 0 ? '60%' : '80%'} borderRadius="0.25rem" />
        ))}
      </div>

      {/* Table Body Rows */}
      <div className="table-skeleton-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="table-skeleton-row">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={`td-${r}-${c}`}
                height="1.125rem"
                width={c === 0 ? '75%' : c === columns - 1 ? '50%' : '90%'}
                borderRadius="0.25rem"
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
        <Skeleton width="4.5rem" height="4.5rem" borderRadius="50%" />
        <div className="profile-skeleton-titles">
          <Skeleton width="10rem" height="1.5rem" borderRadius="0.375rem" />
          <Skeleton width="6.25rem" height="1rem" borderRadius="0.25rem" style={{ marginTop: '0.5rem' }} />
        </div>
      </div>
      <div className="profile-skeleton-grid">
        <div className="profile-skeleton-field">
          <Skeleton width="5rem" height="0.875rem" borderRadius="0.25rem" />
          <Skeleton width="100%" height="2.5rem" borderRadius="0.5rem" style={{ marginTop: '0.375rem' }} />
        </div>
        <div className="profile-skeleton-field">
          <Skeleton width="5rem" height="0.875rem" borderRadius="0.25rem" />
          <Skeleton width="100%" height="2.5rem" borderRadius="0.5rem" style={{ marginTop: '0.375rem' }} />
        </div>
        <div className="profile-skeleton-field full">
          <Skeleton width="6.25rem" height="0.875rem" borderRadius="0.25rem" />
          <Skeleton width="100%" height="2.5rem" borderRadius="0.5rem" style={{ marginTop: '0.375rem' }} />
        </div>
        <div className="profile-skeleton-field full">
          <Skeleton width="6.25rem" height="0.875rem" borderRadius="0.25rem" />
          <Skeleton width="100%" height="2.5rem" borderRadius="0.5rem" style={{ marginTop: '0.375rem' }} />
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
            <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.5rem" />
            <div className="list-skeleton-lines">
              <Skeleton width="11.25rem" height="1.125rem" borderRadius="0.25rem" />
              <Skeleton width="7.5rem" height="0.875rem" borderRadius="0.25rem" style={{ marginTop: '0.375rem' }} />
            </div>
          </div>
          <div className="list-skeleton-right">
            <Skeleton width="5rem" height="1.5rem" borderRadius="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
