import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './LoadingSpinner.css';

const PaymentStatusIndicator = ({ 
  status, 
  isPolling = false, 
  lastUpdate = null, 
  onRetry = null,
  showTimestamp = true 
}) => {
  const [notification, setNotification] = useState(null);

  // Show notification when status changes
  useEffect(() => {
    if (status && lastUpdate) {
      const statusMessages = {
        'processing': 'Payment is being processed...',
        'completed': 'Payment completed successfully!',
        'failed': 'Payment failed. Please try again.',
        'pending': 'Waiting for payment confirmation...',
        'AdvancePaid': 'Advance payment received!',
        'Paid/Completed': 'Payment completed successfully!'
      };

      const message = statusMessages[status] || `Status updated to: ${status}`;
      const type = status === 'completed' || status === 'AdvancePaid' || status === 'Paid/Completed' ? 'success' : 
                   status === 'failed' ? 'error' : 'info';

      setNotification({ message, type });

      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, lastUpdate]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'processing':
      case 'pending':
        return {
          className: 'processing',
          icon: '⏳',
          text: 'Processing payment...'
        };
      case 'completed':
      case 'AdvancePaid':
      case 'Paid/Completed':
        return {
          className: 'success',
          icon: '✅',
          text: 'Payment completed'
        };
      case 'failed':
        return {
          className: 'error',
          icon: '❌',
          text: 'Payment failed'
        };
      default:
        return {
          className: 'waiting',
          icon: '⏸️',
          text: status || 'Waiting for update'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <>
      {/* Status Indicator */}
      <div className={`payment-status-indicator ${statusConfig.className}`}>
        {isPolling ? (
          <LoadingSpinner size="small" color="currentColor" />
        ) : (
          <span>{statusConfig.icon}</span>
        )}
        <span>{statusConfig.text}</span>
        {isPolling && (
          <span className="polling-text">(Live updates active)</span>
        )}
        {onRetry && statusConfig.className === 'error' && (
          <button 
            onClick={onRetry}
            className="retry-btn"
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '4px',
              color: 'inherit',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </div>

      {/* Timestamp */}
      {showTimestamp && lastUpdate && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#666', 
          marginTop: '4px',
          textAlign: 'center'
        }}>
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`payment-update-notification ${notification.type}`}>
          <span>
            {notification.type === 'success' ? '✅' : 
             notification.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              marginLeft: 'auto',
              fontSize: '1.2rem',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default PaymentStatusIndicator;