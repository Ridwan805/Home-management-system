import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBuilding } from 'react-icons/fa';
import './Navbar.css';
import { AuthContext } from '../../App';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout, setPopupMessage, userRole } = useContext(AuthContext);

  // Hide navbar on login and register pages and dashboard routes
  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/create-listing' ||
    location.pathname.startsWith('/tenant') ||
    location.pathname.startsWith('/security-guard')
  ) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setPopupMessage('Logout successful!');
    setTimeout(() => setPopupMessage(''), 2000);
    navigate('/');
  };

  const handleProfileClick = () => {
    if (userRole === 'Owner') {
      navigate('/dashboard');
    } else if (userRole === 'Tenant') {
      navigate('/tenant/profile');
    } else if (userRole === 'Security Guard') {
      navigate('/security-guard/profile');
    } else {
      navigate('/login');
    }
  };

  const isBuyActive = location.pathname === '/properties' && location.search.includes('listingType=For%20Sale');
  const isRentActive = location.pathname === '/properties' && location.search.includes('listingType=For%20Rent');
  const isPropertiesActive = location.pathname === '/properties' && !location.search;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="navbar-logo">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon-box">
              <FaBuilding className="brand-icon" />
            </span>
            <span className="brand-text">
              Dwell<span className="brand-accent">Sync</span>
            </span>
          </Link>
        </div>

        {/* Main Navigation Links */}
        <ul className="navbar-links">
          <li>
            <button
              onClick={() => navigate('/properties')}
              className={`nav-link ${isPropertiesActive ? 'active' : ''}`}
            >
              Properties
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate('/properties?listingType=For%20Sale')}
              className={`nav-link ${isBuyActive ? 'active' : ''}`}
            >
              Buy
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate('/properties?listingType=For%20Rent')}
              className={`nav-link ${isRentActive ? 'active' : ''}`}
            >
              Rent
            </button>
          </li>
          <li>
            <Link
              to="/advertise"
              className={`nav-link ${location.pathname === '/advertise' ? 'active' : ''}`}
            >
              Advertise
            </Link>
          </li>
          <li>
            <Link
              to="/help"
              className={`nav-link ${location.pathname === '/help' ? 'active' : ''}`}
            >
              Help
            </Link>
          </li>
        </ul>

        {/* Right Action Buttons */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <button className="nav-btn nav-btn-profile" onClick={handleProfileClick}>
                Profile
              </button>
              <button className="nav-btn nav-btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn nav-btn-signin">
                Sign In
              </Link>
              <Link to="/register" className="nav-btn nav-btn-signup">
                Sign Up for Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;