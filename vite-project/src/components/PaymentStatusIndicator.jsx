import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PauseCircle, 
  Info,
  X
} from 'lucide-react';
import { InlineLoader } from './loading';
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
          icon: Clock,
          text: 'Processing payment...'
        };
      case 'completed':
      case 'AdvancePaid':
      case 'Paid/Completed':
        return {
          className: 'success',
          icon: CheckCircle2,
          text: 'Payment completed'
        };
      case 'failed':
        return {
          className: 'error',
          icon: AlertCircle,
          text: 'Payment failed'
        };
      default:
        return {
          className: 'waiting',
          icon: PauseCircle,
          text: status || 'Waiting for update'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <>
      {/* Status Indicator */}
      <div className={`payment-status-indicator ${statusConfig.className}`}>
        {isPolling ? (
          <InlineLoader size="small" />
        ) : (
          <StatusIcon size={14} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
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
              marginLeft: '0.5rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '0.25rem',
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
          marginTop: '0.25rem',
          textAlign: 'center'
        }}>
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`payment-update-notification ${notification.type}`}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : 
             notification.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
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
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 0.25rem'
            }}
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
};

export default PaymentStatusIndicator;
