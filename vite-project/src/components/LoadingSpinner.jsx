import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = '#3498db', text = '' }) => {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="loading-spinner" style={{ borderTopColor: color }}></div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;