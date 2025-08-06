import React, { useState } from 'react';
import './SecurityGuardInfo.css';

const SecurityGuardInfo = () => {
  // Mock data for security guards - in a real app, this would come from an API
  const [securityGuards, setSecurityGuards] = useState([
    {
      id: 1,
      name: 'Robert Johnson',
      phone: '(555) 123-4567',
      email: 'robert.johnson@example.com',
      shift: 'Morning (6 AM - 2 PM)',
      image: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    {
      id: 2,
      name: 'Sarah Williams',
      phone: '(555) 234-5678',
      email: 'sarah.williams@example.com',
      shift: 'Evening (2 PM - 10 PM)',
      image: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    {
      id: 3,
      name: 'Michael Davis',
      phone: '(555) 345-6789',
      email: 'michael.davis@example.com',
      shift: 'Night (10 PM - 6 AM)',
      image: 'https://randomuser.me/api/portraits/men/67.jpg'
    }
  ]);

  const [selectedGuard, setSelectedGuard] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);

  const handleContactGuard = (guard) => {
    setSelectedGuard(guard);
    setShowMessageForm(true);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    // In a real app, this would send the message to the backend
    alert(`Message sent to ${selectedGuard.name}: ${messageText}`);
    setMessageText('');
    setShowMessageForm(false);
  };

  return (
    <div className="security-guard-info">
      <h2 className="section-title">Security Guard Information</h2>
      
      <div className="emergency-contact">
        <h3>Emergency Contact</h3>
        <p>For immediate assistance, please call the security office at <strong>(555) 911-0000</strong></p>
      </div>
      
      <div className="security-guards-container">
        <h3>Security Staff</h3>
        <div className="security-guards-grid">
          {securityGuards.map(guard => (
            <div key={guard.id} className="security-guard-card">
              <div className="guard-image">
                <img src={guard.image} alt={guard.name} />
              </div>
              <div className="guard-info">
                <h4 className="guard-name">{guard.name}</h4>
                <p className="guard-shift">{guard.shift}</p>
                <div className="guard-contact">
                  <p><strong>Phone:</strong> {guard.phone}</p>
                  <p><strong>Email:</strong> {guard.email}</p>
                </div>
                <button 
                  className="btn-primary contact-btn"
                  onClick={() => handleContactGuard(guard)}
                >
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="security-info-section">
        <h3>Security Protocols</h3>
        <div className="protocol-item">
          <h4>Visitor Policy</h4>
          <p>All visitors must sign in at the front desk and be accompanied by a resident at all times.</p>
        </div>
        <div className="protocol-item">
          <h4>After Hours Access</h4>
          <p>Please use your key fob for entry after 10 PM. The main entrance is locked between 10 PM and 6 AM.</p>
        </div>
        <div className="protocol-item">
          <h4>Package Delivery</h4>
          <p>Packages will be held at the security desk. You will receive a notification when a package arrives.</p>
        </div>
        <div className="protocol-item">
          <h4>Reporting Suspicious Activity</h4>
          <p>If you notice any suspicious activity, please report it immediately to the security guard on duty.</p>
        </div>
      </div>

      {/* Message Form Modal */}
      {showMessageForm && (
        <div className="message-modal-overlay">
          <div className="message-modal">
            <div className="modal-header">
              <h3>Contact Security Guard</h3>
              <button 
                className="close-btn"
                onClick={() => setShowMessageForm(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="selected-guard-info">
                <img src={selectedGuard.image} alt={selectedGuard.name} className="guard-avatar" />
                <div>
                  <h4>{selectedGuard.name}</h4>
                  <p>{selectedGuard.shift}</p>
                </div>
              </div>
              
              <form onSubmit={handleSendMessage}>
                <div className="form-group">
                  <label htmlFor="messageText">Message</label>
                  <textarea
                    id="messageText"
                    rows="4"
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    required
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Send Message</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowMessageForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityGuardInfo;