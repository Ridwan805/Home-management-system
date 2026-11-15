import React, { useState } from 'react';
import { 
  Siren, 
  Shield, 
  Flame, 
  HeartPulse, 
  AlertTriangle, 
  Fuel, 
  Zap, 
  X,
  Phone
} from 'lucide-react';
import './QuickDialButton.css';

const QuickDialButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const emergencyContacts = [
    { name: 'Police', number: '911', icon: Shield },
    { name: 'Fire Department', number: '911', icon: Flame },
    { name: 'Ambulance', number: '911', icon: HeartPulse },
    { name: 'Poison Control', number: '1-800-222-1222', icon: AlertTriangle },
    { name: 'Gas Emergency', number: '1-800-427-2200', icon: Fuel },
    { name: 'Electric Emergency', number: '1-800-611-1911', icon: Zap }
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
              type="button"
              className="close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close emergency contacts"
            >
              <X size={18} />
            </button>
          </div>
          <div className="contacts-grid">
            {emergencyContacts.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <div 
                  key={index} 
                  className="contact-item"
                  onClick={() => handleCall(contact.number)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCall(contact.number); }}
                >
                  <span className="contact-icon">
                    <Icon size={20} />
                  </span>
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-number">{contact.number}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <button 
        type="button"
        className="quick-dial-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Emergency Quick Dial"
        aria-expanded={isOpen}
      >
        <span className="emergency-icon">
          <Siren size={20} />
        </span>
        <span className="button-text">Emergency</span>
      </button>
    </div>
  );
};

export default QuickDialButton;
