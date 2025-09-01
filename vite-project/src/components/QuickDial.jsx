import React, { useState } from 'react';
import './QuickDial.css';
import { authenticatedFetch } from '../config/api';
import { useNavigate } from 'react-router-dom';

const QuickDial = ({ userType = 'tenant' }) => {
  const [contacts] = useState({
    emergency: [
      { name: 'Police', number: '999', type: 'police' },
      { name: 'Fire Service', number: '199', type: 'fire' },
      { name: 'Ambulance', number: '199', type: 'ambulance' },
      { name: 'National Emergency', number: '999', type: 'emergency' }
    ]
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();



  const makeCall = (phoneNumber, contactName) => {
    if (!phoneNumber) {
      alert('Phone number not available');
      return;
    }

    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/[^+\d]/g, '');
    
    // Log the call attempt
    console.log(`Initiating call to ${contactName}: ${cleanNumber}`);
    
    // Show confirmation and handle call
    if (window.confirm(`Call ${contactName} at ${phoneNumber}?`)) {
      // Log the call attempt
      logCallAttempt(contactName, phoneNumber);
      
      // Create tel: URL for mobile devices
      const telUrl = `tel:${cleanNumber}`;
      
      // Try to open the phone dialer
      try {
        // Use window.open instead of window.location.href to avoid navigation errors
        window.open(telUrl, '_self');
      } catch (error) {
        console.log('Phone dialer not available on this device');
        // Fallback: copy number to clipboard
        navigator.clipboard.writeText(cleanNumber).then(() => {
          alert(`Phone number ${phoneNumber} copied to clipboard`);
        }).catch(() => {
          alert(`Please call: ${phoneNumber}`);
        });
      }
    }
  };

  const logCallAttempt = async (contactName, phoneNumber) => {
    try {
      await authenticatedFetch(
        '/api/quick-dial/log-call',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactName,
            phoneNumber,
            userType,
            timestamp: new Date().toISOString()
          })
        },
        navigate
      );
    } catch (err) {
      console.error('Error logging call attempt:', err);
    }
  };

  const getContactIcon = (type) => {
    switch (type) {
      case 'police':
        return '🚔';
      case 'fire':
        return '🚒';
      case 'ambulance':
        return '🚑';
      case 'emergency':
        return '🆘';
      default:
        return '📞';
    }
  };

  return (
    <div className={`quick-dial-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="quick-dial-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="quick-dial-title">
          <span className="quick-dial-icon">📞</span>
          <span>Quick Dial</span>
        </div>
        <span className={`expand-arrow ${isExpanded ? 'rotated' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="quick-dial-content">
          {/* Emergency Contacts */}
          <div className="contact-section">
            <h4 className="section-title">Emergency Numbers</h4>
            <div className="emergency-contacts">
              {contacts.emergency.map((contact, index) => (
                <div key={index} className="contact-item emergency-contact">
                  <div className="contact-info">
                    <span className="contact-icon">{getContactIcon(contact.type)}</span>
                    <div className="contact-details">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-number">{contact.number}</span>
                    </div>
                  </div>
                  <button 
                    className={`call-button emergency-call ${contact.type}`}
                    onClick={() => makeCall(contact.number, contact.name)}
                    title={`Call ${contact.name}`}
                  >
                    📞
                  </button>
                </div>
              ))}
            </div>
          </div>


        </div>
      )}
    </div>
  );
};

export default QuickDial;