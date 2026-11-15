import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Building,
  User,
  Shield,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import API from '../../config/api.js';
import './ApplicationMessagesModal.css';

/**
 * Two-way messaging modal for property applications (Owner <-> Tenant).
 */
const ApplicationMessagesModal = ({
  isOpen,
  onClose,
  requestId,
  requestRef,
  property,
  counterpartRole = 'Owner',
  counterpartName = 'Property Contact',
  status = 'Submitted',
  onMessagesUpdated
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [conversationMeta, setConversationMeta] = useState(null);

  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
  const textareaRef = useRef(null);

  // Retrieve current user
  const getCurrentUser = useCallback(() => {
    try {
      const data = localStorage.getItem('dwellSyncUser');
      if (!data) return {};
      return JSON.parse(data);
    } catch {
      return {};
    }
  }, []);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser.userId || currentUser.id || currentUser._id;
  const token = currentUser.token;

  // Scroll to bottom helper
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Mark messages as read
  const markAsRead = useCallback(async (reqId) => {
    if (!reqId || !token) return;
    try {
      await fetch(API.getUrl(API.endpoints.readMessages(reqId)), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (onMessagesUpdated) {
        onMessagesUpdated();
      }
    } catch (err) {
      console.warn('Error marking messages as read:', err.message);
    }
  }, [token, onMessagesUpdated]);

  // Fetch messages from backend
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!requestId || !token) return;
    try {
      if (isInitial) setLoading(true);
      setError(null);

      const response = await fetch(API.getUrl(API.endpoints.requestMessages(requestId)), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch messages (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        setConversationMeta({
          property: data.property,
          tenant: data.tenant,
          owner: data.owner,
          requestRef: data.requestRef,
          status: data.status
        });

        // If there were unread messages for the current user, mark them read
        if (data.unreadCount > 0) {
          markAsRead(requestId);
        }
      }
    } catch (err) {
      console.error('ApplicationMessagesModal: Error fetching conversation:', err);
      if (isInitial) {
        setError(err.message || 'Could not load conversation history.');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
        setTimeout(() => scrollToBottom('auto'), 50);
      }
    }
  }, [requestId, token, markAsRead]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (!isOpen || !requestId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    // Lock body scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initial fetch
    fetchMessages(true);

    // Setup periodic polling every 5 seconds
    pollingRef.current = setInterval(() => {
      fetchMessages(false);
    }, 5000);

    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 150);

    // Keydown listener for Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      if (pollingRef.current) clearInterval(pollingRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, requestId, fetchMessages, onClose]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, loading]);

  // Send message handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newMessage.trim();

    if (!trimmed || sending || !requestId || !token) return;

    if (trimmed.length > 2000) {
      setSendError('Message exceeds maximum limit of 2000 characters.');
      return;
    }

    try {
      setSending(true);
      setSendError(null);

      const response = await fetch(API.getUrl(API.endpoints.requestMessages(requestId)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: trimmed })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send message. Please try again.');
      }

      // Append verified message
      if (data.newMessage) {
        setMessages((prev) => [...prev, data.newMessage]);
      }
      setNewMessage('');
      setTimeout(() => scrollToBottom('smooth'), 50);

      if (onMessagesUpdated) {
        onMessagesUpdated();
      }
    } catch (err) {
      console.error('ApplicationMessagesModal: Error sending message:', err);
      setSendError(err.message || 'Message could not be sent. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  // Header display details
  const displayTitle = property?.title || conversationMeta?.property?.title || property?.address || 'Property Application';
  const displayRef = requestRef || conversationMeta?.requestRef || (requestId ? requestId.slice(-8).toUpperCase() : '');
  const displayStatus = conversationMeta?.status || status || 'Active';

  // Dynamic counterpart name
  let contactLabel = counterpartName;
  if (counterpartRole === 'Owner' && conversationMeta?.owner) {
    contactLabel = `${conversationMeta.owner.firstName || ''} ${conversationMeta.owner.lastName || ''}`.trim() || 'Property Owner';
  } else if (counterpartRole === 'Applicant' && conversationMeta?.tenant) {
    contactLabel = `${conversationMeta.tenant.firstName || ''} ${conversationMeta.tenant.lastName || ''}`.trim() || 'Applicant';
  }

  return (
    <div className="app-msg-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-msg-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="app-msg-header">
          <div className="app-msg-header-left">
            <div className="app-msg-header-icon">
              <MessageSquare size={18} />
            </div>
            <div className="app-msg-header-text">
              <h3 className="app-msg-header-title">{displayTitle}</h3>
              <div className="app-msg-header-meta">
                <span className="app-msg-ref-badge">{displayRef}</span>
                <span>•</span>
                <span className="app-msg-contact-pill">
                  <User size={12} />
                  <span>{counterpartRole}: {contactLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="app-msg-header-right">
            <span className="app-msg-status-badge">{displayStatus}</span>
            <button
              type="button"
              className="app-msg-close-btn"
              onClick={onClose}
              aria-label="Close conversation"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Property Context Bar */}
        <div className="app-msg-property-bar">
          <div className="app-msg-property-info">
            <Building size={14} color="#64748B" />
            <span>{property?.address || conversationMeta?.property?.address || 'DwellSync Residence'}</span>
          </div>
          <div className="app-msg-counterpart-label">
            <span>Direct Application Thread</span>
          </div>
        </div>

        {/* Message Body */}
        <div className="app-msg-body">
          {loading ? (
            <div className="app-msg-loading-box">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <span>Loading conversation history...</span>
            </div>
          ) : error ? (
            <div className="app-msg-empty-box">
              <div className="app-msg-empty-icon" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                <AlertCircle size={24} />
              </div>
              <h4 className="app-msg-empty-title">Unable to Load Conversation</h4>
              <p className="app-msg-empty-desc">{error}</p>
              <button
                type="button"
                className="app-msg-send-btn"
                style={{ marginTop: '1rem' }}
                onClick={() => fetchMessages(true)}
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="app-msg-empty-box">
              <div className="app-msg-empty-icon">
                <MessageSquare size={24} />
              </div>
              <h4 className="app-msg-empty-title">No Messages Yet</h4>
              <p className="app-msg-empty-desc">
                Start communicating with the {counterpartRole.toLowerCase()} regarding your property application, lease terms, or requirements.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const senderIdStr = typeof msg.senderId === 'object'
                ? (msg.senderId?._id || msg.senderId?.id)?.toString()
                : msg.senderId?.toString();

              const isOutgoing = senderIdStr === currentUserId?.toString();

              const senderName = typeof msg.senderId === 'object'
                ? `${msg.senderId?.firstName || ''} ${msg.senderId?.lastName || ''}`.trim()
                : isOutgoing ? 'You' : counterpartRole;

              const initials = senderName
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || (isOutgoing ? 'ME' : 'OP');

              const timeStr = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const dateStr = msg.timestamp
                ? new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

              return (
                <div
                  key={msg._id || index}
                  className={`app-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
                >
                  <div className="app-msg-avatar" title={senderName}>
                    {initials}
                  </div>

                  <div className="app-msg-bubble-wrap">
                    <span className="app-msg-sender-name">
                      {isOutgoing ? 'You' : senderName}
                    </span>

                    <div className="app-msg-bubble">
                      {msg.message}
                    </div>

                    <span className="app-msg-time" title={`${dateStr} at ${timeStr}`}>
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Composer */}
        <div className="app-msg-footer">
          {sendError && (
            <div className="app-msg-error-banner">
              <AlertCircle size={14} />
              <span>{sendError}</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="app-msg-composer-row">
            <div className="app-msg-textarea-wrap">
              <textarea
                ref={textareaRef}
                className="app-msg-textarea"
                rows={2}
                placeholder={`Type a message to ${contactLabel}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                maxLength={2000}
                disabled={sending}
              />
              <div className="app-msg-composer-hint">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{newMessage.length} / 2000</span>
              </div>
            </div>

            <button
              type="submit"
              className="app-msg-send-btn"
              disabled={!newMessage.trim() || sending}
              aria-label="Send message"
            >
              {sending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>{sending ? 'Sending' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationMessagesModal;
