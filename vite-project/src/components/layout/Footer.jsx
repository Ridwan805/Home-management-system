import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>DwellSync</h3>
            <p>Your trusted home management system for seamless property management and tenant services.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/properties">Properties</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li><a href="#">Property Management</a></li>
              <li><a href="#">Tenant Services</a></li>
              <li><a href="#">Maintenance Reports</a></li>
              <li><a href="#">Payment Processing</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Contact Info</h4>
            <p>📧 support@dwellsync.com</p>
            <p>📞 +1 (555) 123-4567</p>
            <p>📍 123 Property St, City, State 12345</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 DwellSync. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;