import React, { useEffect, useState } from 'react';
import './App.css';
import Register from './Login_and_Register/Register';
import Login from './Login_and_Register/Login';
import ForgotPassword from './Login_and_Register/ForgotPassword';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import HomePage from './HomePage/HomePage';
import PropertyFilter from './components/PropertyFilter';
import OwnerDashboard from './Dashboard/OwnerDashboard';
import CreateListingForm from './Dashboard/CreateListingForm';
import SidebarNav from './Dashboard/OwnerProfile/SidebarNav';
import PropertyDetails from './Dashboard/PropertyDetails';
import TenantInfo from './Dashboard/TenantInfo';
import SecurityGuardInfo from './Dashboard/SecurityGuardInfo';
import TenantDashboard from './Dashboard/TenantDashboard/TenantDashboard';
import PropertyListing from './components/PropertyListing';

// ✅ ADD THIS IMPORT
import AdminDashboard from './Dashboard/AdminDashboard/AdminDashboard'; 

// Session context for login state
export const AuthContext = React.createContext();

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('dwellSyncUser'));
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem('dwellSyncUser') ? JSON.parse(localStorage.getItem('dwellSyncUser')).role : null
  );
  const [popupMessage, setPopupMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/login' && isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, location, navigate]);

  const login = (user) => {
    localStorage.setItem('dwellSyncUser', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserRole(user.role);
  };

  const logout = () => {
    localStorage.removeItem('dwellSyncUser');
    setIsLoggedIn(false);
    setUserRole(null);
  };

  function CreateListingPage() {
    const navigate = useNavigate();
    return (
      <div className="owner-dashboard">
        <SidebarNav
          activeSection="create-listing"
          setActiveSection={(key) => {
            if (key === 'profile') navigate('/dashboard');
            else if (key === 'create-listing') navigate('/create-listing');
            else if (key === 'property-details') navigate('/property-details');
            else if (key === 'property-listing') navigate('/property-listing');
            else if (key === 'tenant-info') navigate('/tenant-info');
            else if (key === 'security-guard-info') navigate('/security-guard-info');
            else if (key === 'request-info') navigate('/request-info');
          }}
        />
        <main className="dashboard-main">
          <div className="dashboard-content">
            <CreateListingForm onSuccess={() => navigate('/dashboard')} onCancel={() => navigate('/dashboard')} />
          </div>
        </main>
      </div>
    );
  }

  function UnderConstructionPage({ activeSection }) {
    const navigate = useNavigate();
    return (
      <div className="owner-dashboard">
        <SidebarNav
          activeSection={activeSection}
          setActiveSection={(key) => {
            if (key === 'profile') navigate('/dashboard');
            else if (key === 'create-listing') navigate('/create-listing');
            else if (key === 'property-details') navigate('/property-details');
            else if (key === 'property-listing') navigate('/property-listing');
            else if (key === 'tenant-info') navigate('/tenant-info');
            else if (key === 'request-info') navigate('/request-info');
          }}
        />
        <main className="dashboard-main">
          <div
            className="dashboard-content"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
          >
            <h2 style={{ color: '#2563eb', fontSize: '2rem' }}>Page under construction</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, setPopupMessage, userRole }}>
      {!(
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/admin') || // ✅ ADDED: hide navbar on admin routes
        location.pathname === '/create-listing' ||
        location.pathname === '/property-details' ||
        location.pathname === '/tenant-info' ||
        location.pathname === '/security-guard-info' ||
        location.pathname === '/request-info' ||
        location.pathname.startsWith('/tenant')
      ) && <Navbar />}

      {popupMessage && <div className="popup-message">{popupMessage}</div>}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/properties" element={<PropertyFilter />} />
        <Route path="/dashboard" element={<OwnerDashboard />} />
        <Route path="/create-listing" element={<CreateListingPage />} />
        <Route
          path="/property-listing"
          element={
            <div className="owner-dashboard">
              <SidebarNav
                activeSection="property-listing"
                setActiveSection={(key) => {
                  if (key === 'profile') navigate('/dashboard');
                  else if (key === 'create-listing') navigate('/create-listing');
                  else if (key === 'property-details') navigate('/property-details');
                  else if (key === 'property-listing') navigate('/property-listing');
                  else if (key === 'tenant-info') navigate('/tenant-info');
                  else if (key === 'security-guard-info') navigate('/security-guard-info');
                  else if (key === 'request-info') navigate('/request-info');
                }}
              />
              <main className="dashboard-main">
                <div className="dashboard-content">
                  <PropertyListing />
                </div>
              </main>
            </div>
          }
        />
        <Route
          path="/property-details"
          element={
            <div className="owner-dashboard">
              <SidebarNav
                activeSection="property-details"
                setActiveSection={(key) => {
                  if (key === 'profile') navigate('/dashboard');
                  else if (key === 'create-listing') navigate('/create-listing');
                  else if (key === 'property-details') navigate('/property-details');
                  else if (key === 'property-listing') navigate('/property-listing');
                  else if (key === 'tenant-info') navigate('/tenant-info');
                  else if (key === 'security-guard-info') navigate('/security-guard-info');
                  else if (key === 'request-info') navigate('/request-info');
                }}
              />
              <main className="dashboard-main">
                <div className="dashboard-content">
                  <PropertyDetails />
                </div>
              </main>
            </div>
          }
        />
        <Route
          path="/tenant-info"
          element={
            <div className="owner-dashboard">
              <SidebarNav
                activeSection="tenant-info"
                setActiveSection={(key) => {
                  if (key === 'profile') navigate('/dashboard');
                  else if (key === 'create-listing') navigate('/create-listing');
                  else if (key === 'property-details') navigate('/property-details');
                  else if (key === 'property-listing') navigate('/property-listing');
                  else if (key === 'tenant-info') navigate('/tenant-info');
                  else if (key === 'security-guard-info') navigate('/security-guard-info');
                  else if (key === 'request-info') navigate('/request-info');
                }}
              />
              <main className="dashboard-main">
                <div className="dashboard-content">
                  <TenantInfo />
                </div>
              </main>
            </div>
          }
        />
        <Route
          path="/security-guard-info"
          element={
            <div className="owner-dashboard">
              <SidebarNav
                activeSection="security-guard-info"
                setActiveSection={(key) => {
                  if (key === 'profile') navigate('/dashboard');
                  else if (key === 'create-listing') navigate('/create-listing');
                  else if (key === 'property-details') navigate('/property-details');
                  else if (key === 'property-listing') navigate('/property-listing');
                  else if (key === 'tenant-info') navigate('/tenant-info');
                  else if (key === 'security-guard-info') navigate('/security-guard-info');
                  else if (key === 'request-info') navigate('/request-info');
                }}
              />
              <main className="dashboard-main">
                <div className="dashboard-content">
                  <SecurityGuardInfo />
                </div>
              </main>
            </div>
          }
        />
        <Route path="/request-info" element={<UnderConstructionPage activeSection="request-info" />} />

        {/* Tenant Dashboard Routes */}
        <Route path="/tenant/:section" element={<TenantDashboard />} />
        <Route path="/tenant" element={<Navigate to="/tenant/profile" />} />

        {/* ✅ Admin Dashboard Route */}
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Fallback */}
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
