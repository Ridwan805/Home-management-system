import React, { useState } from 'react';
import './QuickDialButton.css';

const QuickDialButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const emergencyContacts = [
    { name: 'Police', number: '911', icon: '🚔' },
    { name: 'Fire Department', number: '911', icon: '🚒' },
    { name: 'Ambulance', number: '911', icon: '🚑' },
    { name: 'Poison Control', number: '1-800-222-1222', icon: '☠️' },
    { name: 'Gas Emergency', number: '1-800-427-2200', icon: '⛽' },
    { name: 'Electric Emergency', number: '1-800-611-1911', icon: '⚡' }
  ];

  const handleCall = (number) => {
    window.open(`tel:${number}`, '_self');
  };

  return (
    <div className="quick-dial-container">
      {isOpen && (
        <div className="emergency-contacts-list">
          <div className="contacts-header">
            <h3>Emergency Contacts</h3>
            <button 
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="contacts-grid">
            {emergencyContacts.map((contact, index) => (
              <div 
                key={index} 
                className="contact-item"
                onClick={() => handleCall(contact.number)}
              >
                <span className="contact-icon">{contact.icon}</span>
                <div className="contact-info">
                  <span className="contact-name">{contact.name}</span>
                  <span className="contact-number">{contact.number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button 
        className="quick-dial-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Emergency Quick Dial"
      >
        <span className="emergency-icon">🚨</span>
        <span className="button-text">Emergency</span>
      </button>
    </div>
  );
};

export default QuickDialButton;