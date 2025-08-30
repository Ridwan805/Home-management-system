import React, { useEffect, useState } from 'react';
import './App.css';
import Register from './Login_and_Register/Register';
import Login from './Login_and_Register/Login';
import ForgotPassword from './Login_and_Register/ForgotPassword';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import HomePage from './HomePage/HomePage';
import OwnerDashboard from './Dashboard/OwnerProfile/OwnerDashboard';
import CreateListingForm from './Dashboard/OwnerProfile/CreateListingForm';
import PropertyDetails from './Dashboard/OwnerProfile/PropertyDetails';
import TenantInfo from './Dashboard/OwnerProfile/TenantInfo';
import SecurityGuardInfo from './Dashboard/OwnerProfile/SecurityGuardInfo';
import TenantDashboard from './Dashboard/TenantDashboard/TenantDashboard';
import PropertyListing from './components/PropertyListing';
import PropertyFilter from './components/PropertyFilter';
import ViewDetails from './components/ViewDetails';
import OwnerRequestsInbox from './Dashboard/OwnerProfile/OwnerRequestsInbox';
import SidebarNav from './Dashboard/OwnerProfile/SidebarNav';
import Payment from './Dashboard/OwnerProfile/Payment';
import SecurityGuardDashboard from './Dashboard/SecurityGuardDashboard/SecurityGuardDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ADD THIS IMPORT
import AdminDashboard from './Dashboard/AdminDashboard/AdminDashboard';
import TestPropertyListing from './components/TestPropertyListing';
 

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
            else if (key === 'tenant-info') navigate('/tenant-info');
            else if (key === 'security-guard-info') navigate('/security-guard-info');
            else if (key === 'request-info') navigate('/request-info');
            else if (key === 'payments') navigate('/payments');
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
            else if (key === 'tenant-info') navigate('/tenant-info');
            else if (key === 'request-info') navigate('/request-info');
            else if (key === 'payments') navigate('/payments');
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
      {!(location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/admin') || // ✅ ADDED: hide navbar on admin routes
        location.pathname === '/create-listing' ||
        location.pathname === '/property-details' ||
        location.pathname === '/tenant-info' ||
        location.pathname === '/security-guard-info' ||
        location.pathname === '/request-info' ||
        location.pathname === '/payments' ||
        location.pathname.startsWith('/tenant') ||
        location.pathname.startsWith('/security-guard')
      ) && <Navbar />}

      {popupMessage && <div className="popup-message">{popupMessage}</div>}

      <Routes>
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/properties" element={
          <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
            <PropertyFilter />
          </ProtectedRoute>
        } />
        <Route path="/properties/:propertyId" element={
          <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
            <ViewDetails />
          </ProtectedRoute>
        } />
        <Route path="/tenant/:section" element={
          <ProtectedRoute allowedRoles={['Tenant']}>
            <TenantDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['Owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/create-listing" element={
          <ProtectedRoute allowedRoles={['Owner']}>
            <CreateListingPage />
          </ProtectedRoute>
        } />

        <Route
          path="/property-details"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <div className="owner-dashboard">
                <SidebarNav
                  activeSection="property-details"
                  setActiveSection={(key) => {
                    if (key === 'profile') navigate('/dashboard');
                    else if (key === 'create-listing') navigate('/create-listing');
                    else if (key === 'property-details') navigate('/property-details');
                    else if (key === 'tenant-info') navigate('/tenant-info');
                    else if (key === 'security-guard-info') navigate('/security-guard-info');
                    else if (key === 'request-info') navigate('/request-info');
                    else if (key === 'payments') navigate('/payments');
                  }}
                />
                <main className="dashboard-main">
                  <div className="dashboard-content">
                    <PropertyListing />
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <div className="owner-dashboard">
                <SidebarNav
                  activeSection="tenant-info"
                  setActiveSection={(key) => {
                    if (key === 'profile') navigate('/dashboard');
                    else if (key === 'create-listing') navigate('/create-listing');
                    else if (key === 'property-details') navigate('/property-details');
                    else if (key === 'tenant-info') navigate('/tenant-info');
                    else if (key === 'security-guard-info') navigate('/security-guard-info');
                    else if (key === 'request-info') navigate('/request-info');
                    else if (key === 'payments') navigate('/payments');
                  }}
                />
                <main className="dashboard-main">
                  <div className="dashboard-content">
                    <TenantInfo />
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/security-guard-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <div className="owner-dashboard">
                <SidebarNav
                  activeSection="security-guard-info"
                  setActiveSection={(key) => {
                    if (key === 'profile') navigate('/dashboard');
                    else if (key === 'create-listing') navigate('/create-listing');
                    else if (key === 'property-details') navigate('/property-details');
                    else if (key === 'tenant-info') navigate('/tenant-info');
                    else if (key === 'security-guard-info') navigate('/security-guard-info');
                    else if (key === 'request-info') navigate('/request-info');
                    else if (key === 'payments') navigate('/payments');
                  }}
                />
                <main className="dashboard-main">
                  <div className="dashboard-content">
                    <SecurityGuardInfo />
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <div className="owner-dashboard">
                <SidebarNav
                  activeSection="request-info"
                  setActiveSection={(key) => {
                    if (key === 'profile') navigate('/dashboard');
                    else if (key === 'create-listing') navigate('/create-listing');
                    else if (key === 'property-details') navigate('/property-details');
                    else if (key === 'tenant-info') navigate('/tenant-info');
                    else if (key === 'security-guard-info') navigate('/security-guard-info');
                    else if (key === 'request-info') navigate('/request-info');
                    else if (key === 'payments') navigate('/payments');
                  }}
                />
                <main className="dashboard-main">
                  <div className="dashboard-content">
                    <OwnerRequestsInbox />
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <div className="owner-dashboard">
                <SidebarNav
                  activeSection="payments"
                  setActiveSection={(key) => {
                    if (key === 'profile') navigate('/dashboard');
                    else if (key === 'create-listing') navigate('/create-listing');
                    else if (key === 'property-details') navigate('/property-details');
                    else if (key === 'tenant-info') navigate('/tenant-info');
                    else if (key === 'security-guard-info') navigate('/security-guard-info');
                    else if (key === 'request-info') navigate('/request-info');
                    else if (key === 'payments') navigate('/payments');
                  }}
                />
                <main className="dashboard-main">
                  <div className="dashboard-content">
                    <Payment />
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Tenant Dashboard Routes - Duplicate removed */}
        <Route path="/tenant" element={
          <ProtectedRoute allowedRoles={['Tenant']}>
            <Navigate to="/tenant/profile" />
          </ProtectedRoute>
        } />
        
        {/* Security Guard Dashboard Routes */}
        <Route path="/security-guard/:section" element={
          <ProtectedRoute allowedRoles={['Security Guard']}>
            <SecurityGuardDashboard />
          </ProtectedRoute>
        } />
        <Route path="/security-guard" element={
          <ProtectedRoute allowedRoles={['Security Guard']}>
            <Navigate to="/security-guard/profile" />
          </ProtectedRoute>
        } />

        {/* ✅ Admin Dashboard Route */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* Test Route for PropertyListing Debug */}
        <Route path="/test-property-listing" element={
          <ProtectedRoute allowedRoles={['Owner', 'Tenant', 'Admin']}>
            <TestPropertyListing />
          </ProtectedRoute>
        } />

        {/* Fallback - redirect based on user role */}
        <Route path="*" element={
          <ProtectedRoute allowedRoles={[]}>
            <Navigate to="/" />
          </ProtectedRoute>
        } />
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
