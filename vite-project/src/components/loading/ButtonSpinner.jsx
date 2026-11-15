import React from 'react';
import './ButtonSpinner.css';

/**
 * ButtonSpinner
 * Minimalist, lightweight spinner designed specifically for buttons and form actions.
 */
const ButtonSpinner = ({
  size = 'small',
  color = 'currentColor',
  className = '',
  ...props
}) => {
  return (
    <span
      className={`dwellsync-btn-spinner ${size} ${className}`}
      style={{ borderTopColor: color }}
      aria-hidden="true"
      {...props}
    />
  );
};

export default ButtonSpinner;
