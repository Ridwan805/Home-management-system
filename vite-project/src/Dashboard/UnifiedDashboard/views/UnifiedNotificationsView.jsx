import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  CreditCard,
  ClipboardList,
  Wrench,
  AlertTriangle,
  RotateCw,
  Clock,
  Shield,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import apiConfig from '../../../config/api';
import { CircularSpinner } from '../../../components/loading';
import './UnifiedNotificationsView.css';

const UnifiedNotificationsView = ({ onNavigateSection, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, payment, request, maintenance, notice
  const [error, setError] = useState(null);

  const getAuthToken = () => {
    try {
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) return null;
      return JSON.parse(saved).token;
    } catch {
      return null;
    }
  };

  const fetchNotifications = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch(apiConfig.getUrl('/api/notifications?limit=50&filter=all'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load notifications');
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        if (onUnreadCountChange && typeof data.unreadCount === 'number') {
          onUnreadCountChange(data.unreadCount);
        }
      } else {
        setNotifications([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(apiConfig.getUrl(`/api/notifications/${notificationId}/read`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        if (onUnreadCountChange && typeof data.unreadCount === 'number') {
          onUnreadCountChange(data.unreadCount);
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(apiConfig.getUrl('/api/notifications/read-all'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(apiConfig.getUrl(`/api/notifications/${notificationId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={18} className="icon-payment" />;
      case 'request_status':
      case 'new_application':
        return <ClipboardList size={18} className="icon-request" />;
      case 'maintenance':
        return <Wrench size={18} className="icon-maintenance" />;
      case 'notice':
        return <AlertTriangle size={18} className="icon-notice" />;
      default:
        return <Bell size={18} className="icon-general" />;
    }
  };

  const handleActionClick = (notification) => {
    // Automatically mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    if (notification.type === 'payment' && onNavigateSection) {
      onNavigateSection('payments');
    } else if ((notification.type === 'request_status' || notification.type === 'new_application') && onNavigateSection) {
      onNavigateSection('applications');
    } else if (notification.type === 'maintenance' && onNavigateSection) {
      onNavigateSection('maintenance');
    } else if (notification.type === 'notice' && onNavigateSection) {
      onNavigateSection('notices');
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(item => {
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'payment') return item.type === 'payment';
    if (activeFilter === 'request') return item.type === 'request_status' || item.type === 'new_application';
    if (activeFilter === 'maintenance') return item.type === 'maintenance';
    if (activeFilter === 'notice') return item.type === 'notice';
    return true;
  });

  const unreadTotal = notifications.filter(n => !n.isRead).length;

  return (
    <div className="unified-notifications-view">
      {/* View Header */}
      <div className="unified-view-header">
        <div>
          <h1 className="unified-view-title">Notifications</h1>
          <p className="unified-view-subtitle">
            System notices, rent receipts, tenancy updates, and application alerts
          </p>
        </div>

        <div className="notif-header-actions">
          <button
            type="button"
            className="unified-btn unified-btn-secondary"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing || loading}
            title="Refresh notifications"
          >
            <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
          {unreadTotal > 0 && (
            <button
              type="button"
              className="unified-btn unified-btn-primary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="unified-alert unified-alert-error" style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="notif-filters-bar">
        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span>All</span>
          <span className="pill-count">{notifications.length}</span>
        </button>

        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveFilter('unread')}
        >
          <span>Unread</span>
          {unreadTotal > 0 && <span className="pill-count unread">{unreadTotal}</span>}
        </button>

        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveFilter('payment')}
        >
          <span>Payments</span>
        </button>

        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'request' ? 'active' : ''}`}
          onClick={() => setActiveFilter('request')}
        >
          <span>Applications</span>
        </button>

        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveFilter('maintenance')}
        >
          <span>Maintenance</span>
        </button>

        <button
          type="button"
          className={`notif-filter-pill ${activeFilter === 'notice' ? 'active' : ''}`}
          onClick={() => setActiveFilter('notice')}
        >
          <span>Notices</span>
        </button>
      </div>

      {/* Notification List Container */}
      <div className="notif-list-container">
        {loading ? (
          <div className="notif-loading-state">
            <CircularSpinner size="medium" color="#2563EB" />
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="empty-bell-icon">
              <Bell size={36} />
            </div>
            <h3>No notifications found</h3>
            <p>
              {activeFilter === 'unread'
                ? "You're all caught up! No unread notifications."
                : 'No notifications in this category at this time.'}
            </p>
          </div>
        ) : (
          <div className="notif-items-list">
            {filteredNotifications.map(item => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item._id}
                  className={`notif-item-card ${!item.isRead ? 'unread' : ''}`}
                  onClick={() => handleActionClick(item)}
                >
                  <div className="notif-icon-col">
                    <div className={`notif-icon-bubble ${item.type || 'general'}`}>
                      {getNotificationIcon(item.type)}
                    </div>
                  </div>

                  <div className="notif-body-col">
                    <div className="notif-header-row">
                      <div className="notif-title-wrap">
                        <span className="notif-title">{item.title}</span>
                        {!item.isRead && <span className="unread-dot" />}
                      </div>
                      <span className="notif-time">
                        <Clock size={12} />
                        <span>{formattedDate}</span>
                      </span>
                    </div>

                    <p className="notif-message">{item.message}</p>

                    <div className="notif-footer-row">
                      <span className="notif-category-tag">
                        {item.type?.replace('_', ' ') || 'Notice'}
                      </span>
                      <div className="notif-actions">
                        {!item.isRead && (
                          <button
                            type="button"
                            className="notif-action-btn read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(item._id);
                            }}
                            title="Mark as read"
                          >
                            <Check size={14} />
                            <span>Mark read</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="notif-action-btn delete-btn"
                          onClick={(e) => handleDeleteNotification(item._id, e)}
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedNotificationsView;
