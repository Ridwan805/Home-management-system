import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import PropertyFilterSidebar from './PropertyFilterSidebar';
import './MobileFilterDrawer.css';

const MobileFilterDrawer = ({
  isOpen = false,
  onClose = () => {},
  filters,
  onFilterChange,
  onResetFilters,
  onApplyFilters,
  activeFilterCount = 0
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-filter-drawer-overlay" onClick={onClose}>
      <div 
        className="mobile-filter-drawer-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter properties"
      >
        <div className="mobile-drawer-handle-bar">
          <div className="mobile-drawer-drag-pill" />
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={onClose}
            aria-label="Close filters drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-drawer-body">
          <PropertyFilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            onApplyFilters={onApplyFilters}
            activeFilterCount={activeFilterCount}
            isMobileDrawer={true}
            onCloseMobileDrawer={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer;