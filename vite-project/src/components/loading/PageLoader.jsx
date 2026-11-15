import React from 'react';
import './PageLoader.css';

/**
 * PageLoader
 * Designed for page-level content loading within dashboard main content or routes.
 * Centered within its container without hiding the sidebar, navbar, or outer layout.
 *
 * @param {string} message - Meaningful status message
 * @param {string} minHeight - Minimum height of the container (default '50vh')
 * @param {string} className - Optional additional CSS class
 */
const PageLoader = ({
  message = 'Loading content...',
  minHeight = '50vh',
  className = '',
}) => {
  return (
    <div
      className={`dwellsync-page-loader ${className}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dwellsync-page-loader-inner">
        {/* Compact Animated House Outline */}
        <div className="dwellsync-page-loader-icon">
          <svg
            className="dwellsync-page-house-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="pageLoaderGradient"
                x1="20"
                y1="20"
                x2="80"
                y2="78"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
            </defs>

            {/* Chimney */}
            <path
              className="page-svg-chimney"
              d="M66 33 V21 H74 V40"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* House Perimeter */}
            <path
              className="page-svg-outline"
              d="M20 78 V46 L50 20 L80 46 V78 H20 Z"
              stroke="url(#pageLoaderGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Doorway */}
            <path
              className="page-svg-door"
              d="M42 78 V56 C42 51.6 45.6 48 50 48 C54.4 48 58 51.6 58 56 V78"
              stroke="#2563EB"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Window dot */}
            <circle
              className="page-svg-node"
              cx="50"
              cy="35"
              r="3.5"
              fill="#2563EB"
            />
          </svg>
        </div>

        {/* Brand label & Message */}
        <div className="dwellsync-page-loader-text">
          <span className="dwellsync-page-loader-brand">
            Dwell<span className="brand-accent">Sync</span>
          </span>
          {message && <p className="dwellsync-page-loader-msg">{message}</p>}
        </div>

        {/* 3 Animated Dots */}
        <div className="dwellsync-page-loader-dots" aria-hidden="true">
          <span className="page-dot dot-1" />
          <span className="page-dot dot-2" />
          <span className="page-dot dot-3" />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
