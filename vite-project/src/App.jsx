import React, { useEffect, useState } from 'react';
import './App.css';
import Register from './Login_and_Register/Register';
import Login from './Login_and_Register/Login';
import ForgotPassword from './Login_and_Register/ForgotPassword';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
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
import QuickDialButton from './components/QuickDialButton/QuickDialButton';
import SecurityGuardDashboard from './Dashboard/SecurityGuardDashboard/SecurityGuardDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ADD THIS IMPORT
import AdminDashboard from './Dashboard/AdminDashboard/AdminDashboard';
import MaintenanceReports from './Dashboard/OwnerProfile/MaintenanceReports';
import Footer from './components/layout/Footer';
import API from './config/api';
import { AppLoader } from './components/loading';

// Helper to reliably detect any dashboard route (prevents layout and navbar flickering)
const isDashboardPath = (pathname) => {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/create-listing') ||
    pathname.startsWith('/property-details') ||
    pathname.startsWith('/tenant-info') ||
    pathname.startsWith('/security-guard-info') ||
    pathname.startsWith('/request-info') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/maintenance-reports') ||
    pathname.startsWith('/tenant') ||
    pathname.startsWith('/security-guard')
  );
};

// Initialize stored user synchronously to eliminate auth flash on page reload
const getStoredUser = () => {
  try {
    const data = localStorage.getItem('dwellSyncUser');
    if (data) {
      const user = JSON.parse(data);
      if (user && user.token) return user;
    }
  } catch (e) {
    console.error('Error reading stored user from localStorage:', e);
  }
  return null;
};

// Persistent Owner Dashboard Layout - Keeps sidebar mounted and prevents layout shift
function OwnerLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveSection = (pathname) => {
    if (pathname === '/dashboard') return 'profile';
    if (pathname.startsWith('/create-listing')) return 'create-listing';
    if (pathname.startsWith('/property-details')) return 'property-details';
    if (pathname.startsWith('/tenant-info')) return 'tenant-info';
    if (pathname.startsWith('/security-guard-info')) return 'security-guard-info';
    if (pathname.startsWith('/request-info')) return 'request-info';
    if (pathname.startsWith('/payments')) return 'payments';
    if (pathname.startsWith('/maintenance-reports')) return 'maintenance-reports';
    return 'profile';
  };

  const activeSection = getActiveSection(location.pathname);

  const handleSectionChange = (key) => {
    switch (key) {
      case 'profile':
        navigate('/dashboard');
        break;
      case 'create-listing':
        navigate('/create-listing');
        break;
      case 'property-details':
        navigate('/property-details');
        break;
      case 'tenant-info':
        navigate('/tenant-info');
        break;
      case 'security-guard-info':
        navigate('/security-guard-info');
        break;
      case 'request-info':
        navigate('/request-info');
        break;
      case 'payments':
        navigate('/payments');
        break;
      case 'maintenance-reports':
        navigate('/maintenance-reports');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="owner-dashboard">
      <SidebarNav activeSection={activeSection} setActiveSection={handleSectionChange} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
      <QuickDialButton />
    </div>
  );
}

function CreateListingPage() {
  const navigate = useNavigate();
  return <CreateListingForm onSuccess={() => navigate('/dashboard')} onCancel={() => navigate('/dashboard')} />;
}

// Session context for login state
export const AuthContext = React.createContext();

function AppRoutes() {
  const initialUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialUser);
  const [userRole, setUserRole] = useState(initialUser ? initialUser.role : null);
  const [popupMessage, setPopupMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(!!initialUser);
  const location = useLocation();
  const navigate = useNavigate();

  // Validate token on app initialization
  useEffect(() => {
    const validateToken = async () => {
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) {
          setAuthLoading(false);
          setCurrentUser(null);
          return;
        }

        const user = JSON.parse(userData);
        const token = user.token;
        if (!token) {
          localStorage.removeItem('dwellSyncUser');
          setAuthLoading(false);
          setIsLoggedIn(false);
          setUserRole(null);
          setCurrentUser(null);
          return;
        }

        // Validate token with backend
        const response = await fetch(`${API.baseUrl}${API.endpoints.profile}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsLoggedIn(true);
          setUserRole(user.role);
          setCurrentUser(user);
        } else {
          // Token is invalid, clear localStorage
          localStorage.removeItem('dwellSyncUser');
          setIsLoggedIn(false);
          setUserRole(null);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('dwellSyncUser');
        setIsLoggedIn(false);
        setUserRole(null);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    if (initialUser) {
      validateToken();
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === '/login' && isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, location, navigate]);

  const login = (user) => {
    localStorage.setItem('dwellSyncUser', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserRole(user.role);
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('dwellSyncUser');
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  // Show branded loading screen only while validating authentication for a stored session
  if (authLoading) {
    return <AppLoader message="Verifying session..." />;
  }

  const isDashboard = isDashboardPath(location.pathname);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, setPopupMessage, userRole, authLoading, currentUser }}>
      <div className="app-wrapper">
        {!isDashboard && location.pathname !== '/' && <Navbar />}

        {popupMessage && <div className="popup-message">{popupMessage}</div>}

        <main className={`main-content ${isDashboard ? 'dashboard-page' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/properties" element={<PropertyFilter />} />
            <Route path="/properties/:propertyId" element={<ViewDetails />} />

            {/* Tenant Dashboard Routes */}
            <Route path="/tenant/:section" element={
              <ProtectedRoute allowedRoles={['Tenant']}>
                <TenantDashboard />
              </ProtectedRoute>
            } />
            <Route path="/tenant" element={
              <ProtectedRoute allowedRoles={['Tenant']}>
                <Navigate to="/tenant/profile" />
              </ProtectedRoute>
            } />
            <Route path="/my-requests" element={
              <ProtectedRoute allowedRoles={['Tenant']}>
                <Navigate to="/tenant/request-info" replace />
              </ProtectedRoute>
            } />

            {/* Owner Dashboard - Shared Persistent Layout (Sidebar stays mounted across all child routes) */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['Owner']}>
                  <OwnerLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<OwnerDashboard />} />
              <Route path="/create-listing" element={<CreateListingPage />} />
              <Route path="/property-details" element={<PropertyListing />} />
              <Route path="/tenant-info" element={<TenantInfo />} />
              <Route path="/security-guard-info" element={<SecurityGuardInfo />} />
              <Route path="/request-info" element={<OwnerRequestsInbox />} />
              <Route path="/payments" element={<Payment />} />
              <Route path="/maintenance-reports" element={<MaintenanceReports />} />
            </Route>
            
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

            {/* Admin Dashboard Route */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback - redirect based on user role */}
            <Route path="*" element={
              <ProtectedRoute allowedRoles={[]}>
                <Navigate to="/" />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        
        {/* Footer - exclude from login, register, forgot-password and dashboard pages */}
        {!isDashboard && 
         location.pathname !== '/login' && 
         location.pathname !== '/register' && 
         location.pathname !== '/forgot-password' && 
         <Footer />}
      </div>
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
