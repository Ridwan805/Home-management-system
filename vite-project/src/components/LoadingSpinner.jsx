import React from 'react';
import CircularSpinner from './loading/CircularSpinner';
import './LoadingSpinner.css';

/**
 * Standard DwellSync LoadingSpinner
 * Backward-compatible wrapper around CircularSpinner ensuring strict 40px circular rendering.
 */
const LoadingSpinner = ({
  size = 'medium',
  color = '#2563EB',
  text = '',
  message = '',
  minHeight,
  className = '',
  ...props
}) => {
  const displayMessage = message || text;

  return (
    <CircularSpinner
      size={size}
      color={color}
      message={displayMessage}
      minHeight={minHeight}
      className={className}
      {...props}
    />
  );
};

export default LoadingSpinner;
