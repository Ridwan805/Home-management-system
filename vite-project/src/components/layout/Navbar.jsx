import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { AuthContext } from '../../App';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout, setPopupMessage, userRole } = useContext(AuthContext);
  // Hide navbar on login and register pages
  if (location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/dashboard') || location.pathname === '/create-listing' || location.pathname.startsWith('/tenant')) return null;

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
    } else {
      // Default or handle other roles
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="navbar-title">DwellSync</Link>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/properties" className="nav-link">Properties</Link>
        </li>
        <li>
          <Link to="/properties?listingType=For%20Sale" className="nav-link">Buy</Link>
        </li>
        <li>
          <Link to="/properties?listingType=For%20Rent" className="nav-link">Rent</Link>
        </li>

        <li><Link to="/advertise">Advertise</Link></li>
        <li><Link to="/help">Help</Link></li>
        {isLoggedIn ? (
          <>
            <li><button className="navbar-signin" onClick={handleLogout}>Logout</button></li>
            <li><button className="navbar-signin" onClick={handleProfileClick}>Profile</button></li>
          </>
        ) : (
          <li><Link to="/login" className="navbar-signin">Sign In</Link></li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;