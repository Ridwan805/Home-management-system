import React from 'react';
import { List, Map } from 'lucide-react';
import './MobileViewToggle.css';

const MobileViewToggle = ({ viewMode = 'list', onToggleView = () => {} }) => {
  return (
    <div className="mobile-view-toggle-container">
      <button
        type="button"
        className={`mobile-view-pill-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onToggleView('list')}
        aria-pressed={viewMode === 'list'}
      >
        <List size={16} />
        <span>List</span>
      </button>

      <button
        type="button"
        className={`mobile-view-pill-btn ${viewMode === 'map' ? 'active' : ''}`}
        onClick={() => onToggleView('map')}
        aria-pressed={viewMode === 'map'}
      >
        <Map size={16} />
        <span>Map</span>
      </button>
    </div>
  );
};

export default MobileViewToggle;