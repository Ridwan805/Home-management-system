import React from 'react';
import './InlineLoader.css';

/**
 * InlineLoader
 * Compact loader for dropdown data, search dropdowns, filters, and small widgets.
 *
 * @param {string} text - Optional text next to spinner (e.g. "Searching...", "Loading options...")
 * @param {string} size - 'small' (14px), 'medium' (18px)
 * @param {string} color - Spinner color (default '#2563EB')
 * @param {string} className - Optional custom class
 */
const InlineLoader = ({
  text = '',
  size = 'medium',
  color = '#2563EB',
  className = '',
}) => {
  return (
    <div className={`dwellsync-inline-loader ${size} ${className}`} role="status" aria-live="polite">
      <span
        className="inline-spinner"
        style={{ borderTopColor: color }}
        aria-hidden="true"
      />
      {text && <span className="inline-loader-text">{text}</span>}
    </div>
  );
};

export default InlineLoader;
