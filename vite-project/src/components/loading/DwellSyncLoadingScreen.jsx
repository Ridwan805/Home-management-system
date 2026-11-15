import React from 'react';
import './DwellSyncLoadingScreen.css';

/**
 * DwellSyncLoadingScreen
 * Modern, professional branded loading screen with animated SVG house-outline drawing,
 * DwellSync royal blue / navy branding, tagline, and three animated dots.
 *
 * @param {string} message - Meaningful status message for the current action
 * @param {string} tagline - Subtitle tagline (defaults to "Your home, simplified.")
 * @param {boolean} fullScreen - Whether to display as full viewport overlay or inline
 * @param {string} className - Optional additional CSS class
 */
const DwellSyncLoadingScreen = ({
  message = '',
  tagline = 'Your home, simplified.',
  fullScreen = true,
  className = '',
}) => {
  return (
    <div
      className={`dwellsync-loading-wrapper ${fullScreen ? 'fullscreen' : 'inline'} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dwellsync-loading-container">
        {/* Animated House-Outline SVG Icon */}
        <div className="dwellsync-icon-card">
          <svg
            className="dwellsync-house-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="dwellsyncHouseGradient"
                x1="20"
                y1="20"
                x2="80"
                y2="78"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="60%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
            </defs>

            {/* Chimney Outline */}
            <path
              className="dwellsync-svg-chimney"
              d="M66 33 V21 H74 V40"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* House Silhouette Outline (Roof, Walls & Foundation) */}
            <path
              className="dwellsync-svg-outline"
              d="M20 78 V46 L50 20 L80 46 V78 H20 Z"
              stroke="url(#dwellsyncHouseGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Arched Modern Doorway */}
            <path
              className="dwellsync-svg-door"
              d="M42 78 V56 C42 51.6 45.6 48 50 48 C54.4 48 58 51.6 58 56 V78"
              stroke="#2563EB"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Modern Accent Node / Window */}
            <circle
              className="dwellsync-svg-accent-node"
              cx="50"
              cy="35"
              r="3.5"
              fill="#2563EB"
            />
          </svg>
        </div>

        {/* Brand Name Typography */}
        <div className="dwellsync-brand-group">
          <h1 className="dwellsync-brand-title">
            Dwell<span className="brand-sync-accent">Sync</span>
          </h1>
          {tagline && <p className="dwellsync-tagline">{tagline}</p>}
        </div>

        {/* Contextual Action Message (if provided) */}
        {message && (
          <p className="dwellsync-status-message">{message}</p>
        )}

        {/* Three Animated Loading Dots */}
        <div className="dwellsync-dots-cluster" aria-hidden="true">
          <span className="dwellsync-loading-dot dot-1" />
          <span className="dwellsync-loading-dot dot-2" />
          <span className="dwellsync-loading-dot dot-3" />
        </div>
      </div>
    </div>
  );
};

export default DwellSyncLoadingScreen;
