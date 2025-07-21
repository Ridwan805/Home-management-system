import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  // Hide navbar on login and register pages
  if (location.pathname === '/login' || location.pathname === '/register') return null;

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="navbar-title">DwellSync</Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/buy">Buy</Link></li>
        <li><Link to="/rent">Rent</Link></li>
        <li><Link to="/sell">Sell</Link></li>
        <li><Link to="/mortgage">Get a mortgage</Link></li>
        <li><Link to="/agent">Find an Agent</Link></li>
        <li><Link to="/manage">Manage Rentals</Link></li>
        <li><Link to="/advertise">Advertise</Link></li>
        <li><Link to="/help">Help</Link></li>
        <li><Link to="/login" className="navbar-signin">Sign In</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar; 