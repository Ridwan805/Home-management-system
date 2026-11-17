import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  RotateCw,
  Building2,
  User,
  Clock,
  ArrowRight,
  ExternalLink,
  Shield,
  Send
} from 'lucide-react';
import API from '../../../config/api';
import { CircularSpinner } from '../../../components/loading';
import ApplicationMessagesModal from '../../../components/ApplicationMessaging/ApplicationMessagesModal';
import './UnifiedMessagesView.css';

const UnifiedMessagesView = ({ searchTerm = '' }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [localSearch, setLocalSearch] = useState('');

  // Selected thread for messaging modal
  const [selectedThread, setSelectedThread] = useState(null);

  const getAuthToken = () => {
    try {
      const saved = localStorage.getItem('dwellSyncUser');
      if (!saved) return null;
      return JSON.parse(saved).token;
    } catch {
      return null;
    }
  };

  const fetchThreads = useCallback(async (isManual = false) => {
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
      // Fetch both owner requests and applicant requests to gather all message threads
      const [ownerRes, tenantRes] = await Promise.allSettled([
        fetch(API.getUrl(API.endpoints.ownerRequests), {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(API.getUrl(API.endpoints.myRequests), {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      let combined = [];

      if (ownerRes.status === 'fulfilled' && ownerRes.value.ok) {
        const ownerData = await ownerRes.value.json();
        const items = ownerData.requests || (Array.isArray(ownerData) ? ownerData : []);
        items.forEach(req => {
          combined.push({
            ...req,
            perspective: 'owner',
            contactName: req.tenantId?.name || `${req.tenantId?.firstName || ''} ${req.tenantId?.lastName || ''}`.trim() || 'Applicant',
            contactRole: 'Tenant / Applicant'
          });
        });
      }

      if (tenantRes.status === 'fulfilled' && tenantRes.value.ok) {
        const tenantData = await tenantRes.value.json();
        const items = tenantData.requests || (Array.isArray(tenantData) ? tenantData : []);
        items.forEach(req => {
          // Avoid duplicate ID if user is both
          if (!combined.some(c => c._id === req._id)) {
            combined.push({
              ...req,
              perspective: 'tenant',
              contactName: req.propertyId?.ownerUserId?.name || 'Property Owner',
              contactRole: 'Property Owner'
            });
          }
        });
      }

      // Sort by latest message or request update
      combined.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      setThreads(combined);
    } catch (err) {
      setError(err.message || 'Unable to load messaging threads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const activeQuery = (searchTerm || localSearch).trim().toLowerCase();

  const filteredThreads = threads.filter(thread => {
    if (!activeQuery) return true;
    const propertyTitle = thread.propertyId?.title || thread.propertyId?.address || '';
    const contactName = thread.contactName || '';
    const status = thread.status || '';
    return (
      propertyTitle.toLowerCase().includes(activeQuery) ||
      contactName.toLowerCase().includes(activeQuery) ||
      status.toLowerCase().includes(activeQuery)
    );
  });

  return (
    <div className="unified-messages-view">
      {/* Header */}
      <div className="unified-view-header">
        <div>
          <h1 className="unified-view-title">Messages & Inquiries</h1>
          <p className="unified-view-subtitle">
            Direct communication channels for property applications, lease clarifications, and move-in coordination
          </p>
        </div>

        <div className="messages-header-actions">
          <button
            type="button"
            className="unified-btn unified-btn-secondary"
            onClick={() => fetchThreads(true)}
            disabled={refreshing || loading}
          >
            <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="unified-alert unified-alert-error" style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="messages-search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Filter conversation by property, applicant name, or status..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="messages-search-input"
        />
      </div>

      {/* Threads Container */}
      <div className="threads-container">
        {loading ? (
          <div className="threads-loading">
            <CircularSpinner size="medium" color="#2563EB" />
            <p>Loading conversation threads...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="threads-empty">
            <div className="threads-empty-icon">
              <MessageSquare size={36} />
            </div>
            <h3>No conversations found</h3>
            <p>
              {activeQuery
                ? 'No conversations match your search criteria.'
                : 'When you apply for a property or receive tenant applications, communication threads will appear here.'}
            </p>
          </div>
        ) : (
          <div className="threads-list">
            {filteredThreads.map(thread => {
              const lastUpdated = new Date(thread.updatedAt || thread.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });

              const messageCount = Array.isArray(thread.messages) ? thread.messages.length : 0;
              const propertyTitle = thread.propertyId?.title || thread.propertyId?.address || 'Property Inquiry';

              return (
                <div
                  key={thread._id}
                  className="thread-item-card"
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="thread-avatar">
                    <User size={20} />
                  </div>

                  <div className="thread-content">
                    <div className="thread-top-row">
                      <div className="thread-sender-info">
                        <span className="thread-contact-name">{thread.contactName}</span>
                        <span className="thread-contact-badge">{thread.contactRole}</span>
                      </div>
                      <span className="thread-date">
                        <Clock size={12} />
                        <span>{lastUpdated}</span>
                      </span>
                    </div>

                    <div className="thread-property-row">
                      <Building2 size={14} className="prop-icon" />
                      <span className="thread-property-name">{propertyTitle}</span>
                      <span className={`thread-status-badge ${thread.status?.toLowerCase()}`}>
                        {thread.status || 'Pending'}
                      </span>
                    </div>

                    <div className="thread-preview-row">
                      <span className="thread-preview-text">
                        {messageCount > 0
                          ? `${messageCount} message${messageCount > 1 ? 's' : ''} in discussion thread`
                          : 'No messages exchanged yet. Click to start conversation.'}
                      </span>
                      <button
                        type="button"
                        className="thread-open-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedThread(thread);
                        }}
                      >
                        <span>Open Thread</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Way Messaging Modal */}
      {selectedThread && (
        <ApplicationMessagesModal
          isOpen={!!selectedThread}
          onClose={() => setSelectedThread(null)}
          requestId={selectedThread._id}
          requestRef={selectedThread}
          property={selectedThread.propertyId}
          counterpartRole={selectedThread.perspective === 'owner' ? 'Tenant' : 'Owner'}
          counterpartName={selectedThread.contactName}
          status={selectedThread.status}
          onMessagesUpdated={fetchThreads}
        />
      )}
    </div>
  );
};

export default UnifiedMessagesView;
