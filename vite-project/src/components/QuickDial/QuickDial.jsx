import React, { useState, useEffect } from 'react';
import './QuickDial.css';

const QuickDial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = () => {
    const userData = localStorage.getItem('dwellSyncUser');
    if (!userData) return null;
    try {
      const user = JSON.parse(userData);
      return user.token;
    } catch (e) {
      return null;
    }
  };

  // Fetch contacts when component mounts or when panel opens
  useEffect(() => {
    if (isOpen && !contacts) {
      fetchContacts();
    }
  }, [isOpen, contacts]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/quick-dial/all-contacts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (phoneNumber, contactName, contactType) => {
    try {
      // Log the call attempt
      const token = getAuthToken();
      if (token) {
        await fetch('/api/quick-dial/log-call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phoneNumber,
            contactName,
            contactType
          })
        });
      }

      // Initiate the phone call
      window.location.href = `tel:${phoneNumber}`;
    } catch (err) {
      console.error('Error logging call:', err);
      // Still proceed with the call even if logging fails
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return (
    <div className="quick-dial">
      {/* Toggle Button */}
      <button 
        className="quick-dial-toggle"
        onClick={togglePanel}
        aria-label="Quick Dial"
        title="Quick Dial - Call Owner or Emergency Numbers"
      >
        📞
      </button>

      {/* Dial Panel */}
      <div className={`quick-dial-panel ${isOpen ? 'open' : ''}`}>
        <div className="quick-dial-header">
          <h3>Quick Dial</h3>
          <button 
            className="close-btn"
            onClick={closePanel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="quick-dial-content">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading contacts...</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>⚠️ {error}</p>
              <button 
                onClick={fetchContacts}
                className="call-btn"
                style={{ marginTop: '12px' }}
              >
                🔄 Retry
              </button>
            </div>
          )}

          {contacts && !loading && !error && (
            <>
              {/* Owner Contact Section */}
              {contacts.owner && (
                <div className="contact-section owner">
                  <h4>
                    <span className="icon">🏠</span>
                    Property Owner
                  </h4>
                  <div className="contact-item">
                    <div className="contact-info">
                      <p className="contact-name">{contacts.owner.name}</p>
                      <p className="contact-number">{contacts.owner.phone}</p>
                    </div>
                    <button 
                      className="call-btn"
                      onClick={() => handleCall(
                        contacts.owner.phone, 
                        contacts.owner.name, 
                        'owner'
                      )}
                      title={`Call ${contacts.owner.name}`}
                    >
                      <span className="icon">📞</span>
                      Call
                    </button>
                  </div>
                </div>
              )}

              {/* Emergency Contacts Section */}
              {contacts.emergency && contacts.emergency.length > 0 && (
                <div className="contact-section emergency">
                  <h4>
                    <span className="icon">🚨</span>
                    Emergency Contacts
                  </h4>
                  {contacts.emergency.map((contact, index) => (
                    <div key={index} className="contact-item">
                      <div className="contact-info">
                        <p className="contact-name">{contact.name}</p>
                        <p className="contact-number">{contact.phone}</p>
                      </div>
                      <button 
                        className="call-btn"
                        onClick={() => handleCall(
                          contact.phone, 
                          contact.name, 
                          'emergency'
                        )}
                        title={`Call ${contact.name}`}
                      >
                        <span className="icon">📞</span>
                        Call
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* No contacts available */}
              {!contacts.owner && (!contacts.emergency || contacts.emergency.length === 0) && (
                <div className="error">
                  <p>📵 No contacts available</p>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: '#6b7280' }}>
                    Contact your administrator for assistance.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickDial;