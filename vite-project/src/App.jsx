import React, { useEffect, useState } from 'react';
import './App.css';
import Register from './components/Register';
import Login from './components/Login';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import HomePage from './HomePage/HomePage';
import PropertyFilter from './components/PropertyFilter';

// Session context for login state
export const AuthContext = React.createContext();

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('dwellSyncUser'));
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for login/logout changes
  useEffect(() => {
    if (location.pathname === '/login' && isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, location, navigate]);

  const login = (user) => {
    localStorage.setItem('dwellSyncUser', JSON.stringify(user));
    setIsLoggedIn(true);
  };
  const logout = () => {
    localStorage.removeItem('dwellSyncUser');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/properties" element={<PropertyFilter />} />
        {/* Add more routes as needed */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
