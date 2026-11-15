import React from 'react';
import './CircularSpinner.css';

/**
 * CircularSpinner
 * High-performance, distortion-proof circular loading spinner.
 * Features a circular gray track (#E2E8F0) and blue rotating segment (#2563EB).
 *
 * @param {string} message - Optional status message displayed below spinner
 * @param {string} size - 'small' (20px), 'medium' (40px, default), or 'large' (56px)
 * @param {string} color - Segment color override (default: #2563EB)
 * @param {string} trackColor - Background track override (default: #E2E8F0)
 * @param {string} minHeight - Minimum container height (e.g. '220px', default 'auto')
 * @param {string} className - Optional container class
 * @param {boolean} inline - Whether the spinner is embedded inline with other text/elements
 */
const CircularSpinner = ({
  message = '',
  size = 'medium',
  color = '#2563EB',
  trackColor = '#E2E8F0',
  minHeight = 'auto',
  className = '',
  inline = false,
}) => {
  const pixelDimensions = {
    small: 20,
    medium: 40,
    large: 56,
  }[size] || 40;

  const strokeWidth = size === 'small' ? 3 : 3.5;

  return (
    <div
      className={`dwellsync-spinner-container ${size} ${inline ? 'is-inline' : ''} ${className}`}
      style={minHeight && minHeight !== 'auto' ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dwellsync-spinner-visual">
        <svg
          className="dwellsync-circular-spinner"
          width={pixelDimensions}
          height={pixelDimensions}
          viewBox="0 0 40 40"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Static Light-Gray Circular Track */}
          <circle
            className="dwellsync-spinner-track"
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />

          {/* Smooth Blue Rotating Segment */}
          <circle
            className="dwellsync-spinner-segment"
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="28 72"
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {message && (
        <p className="dwellsync-spinner-message">{message}</p>
      )}
    </div>
  );
};

export default CircularSpinner;
