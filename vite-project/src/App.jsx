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
import QuickDialButton from './components/QuickDialButton/QuickDialButton';
import SecurityGuardDashboard from './Dashboard/SecurityGuardDashboard/SecurityGuardDashboard';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ ADD THIS IMPORT
import AdminDashboard from './Dashboard/AdminDashboard/AdminDashboard';
import MaintenanceReports from './Dashboard/OwnerProfile/MaintenanceReports';
import Footer from './components/layout/Footer';
import API from './config/api';
import { AppLoader } from './components/loading';

 

// Session context for login state
export const AuthContext = React.createContext();

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [popupMessage, setPopupMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Validate token on app initialization
  useEffect(() => {
    const validateToken = async () => {
      try {
        const userData = localStorage.getItem('dwellSyncUser');
        if (!userData) {
          setAuthLoading(false);
          return;
        }

        const user = JSON.parse(userData);
        const token = user.token;
        if (!token) {
          localStorage.removeItem('dwellSyncUser');
          setAuthLoading(false);
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
        } else {
          // Token is invalid, clear localStorage
          localStorage.removeItem('dwellSyncUser');
          setIsLoggedIn(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('dwellSyncUser');
        setIsLoggedIn(false);
        setUserRole(null);
      } finally {
        setAuthLoading(false);
      }
    };

    validateToken();
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
  };

  const logout = () => {
    localStorage.removeItem('dwellSyncUser');
    setIsLoggedIn(false);
    setUserRole(null);
  };

  function OwnerLayout({ activeSection, children }) {
    const nav = useNavigate();
    const handleSectionChange = (key) => {
      switch (key) {
        case 'profile':
          nav('/dashboard');
          break;
        case 'create-listing':
          nav('/create-listing');
          break;
        case 'property-details':
          nav('/property-details');
          break;
        case 'tenant-info':
          nav('/tenant-info');
          break;
        case 'security-guard-info':
          nav('/security-guard-info');
          break;
        case 'request-info':
          nav('/request-info');
          break;
        case 'payments':
          nav('/payments');
          break;
        case 'maintenance-reports':
          nav('/maintenance-reports');
          break;
        default:
          nav('/dashboard');
      }
    };

    return (
      <div className="owner-dashboard">
        <SidebarNav activeSection={activeSection} setActiveSection={handleSectionChange} />
        <main className="dashboard-main">
          <div className="dashboard-content">
            {children}
          </div>
        </main>
        <QuickDialButton />
      </div>
    );
  }

  function CreateListingPage() {
    const nav = useNavigate();
    return (
      <OwnerLayout activeSection="create-listing">
        <CreateListingForm onSuccess={() => nav('/dashboard')} onCancel={() => nav('/dashboard')} />
      </OwnerLayout>
    );
  }

  // Show branded loading screen while validating authentication
  if (authLoading) {
    return <AppLoader message="Verifying session..." />;
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, setPopupMessage, userRole, authLoading }}>
      <div className="app-wrapper">
        {!(location.pathname.startsWith('/dashboard') ||
          location.pathname.startsWith('/admin') || // ✅ ADDED: hide navbar on admin routes
          location.pathname === '/create-listing' ||
          location.pathname === '/property-details' ||
          location.pathname === '/tenant-info' ||
          location.pathname === '/security-guard-info' ||
          location.pathname === '/request-info' ||
          location.pathname === '/payments' ||
          location.pathname === '/maintenance-reports' ||
          location.pathname.startsWith('/tenant') ||
          location.pathname.startsWith('/security-guard')
        ) && <Navbar />}

        {popupMessage && <div className="popup-message">{popupMessage}</div>}

        <main className={`main-content ${
          (location.pathname.startsWith('/dashboard') ||
           location.pathname.startsWith('/admin') ||
           location.pathname === '/create-listing' ||
           location.pathname === '/property-details' ||
           location.pathname === '/tenant-info' ||
           location.pathname === '/security-guard-info' ||
           location.pathname === '/request-info' ||
           location.pathname === '/payments' ||
           location.pathname === '/maintenance-reports' ||
           location.pathname.startsWith('/tenant') ||
           location.pathname.startsWith('/security-guard'))
          ? 'dashboard-page' : ''
        }`}>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/properties" element={<PropertyFilter />} />
        <Route path="/properties/:propertyId" element={<ViewDetails />} />
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
          <ProtectedRoute allowedRoles={['Owner', 'Admin', 'admin']}>
            <CreateListingPage />
          </ProtectedRoute>
        } />

        <Route
          path="/property-details"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="property-details">
                <PropertyListing />
              </OwnerLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="tenant-info">
                <TenantInfo />
              </OwnerLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/security-guard-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="security-guard-info">
                <SecurityGuardInfo />
              </OwnerLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-info"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="request-info">
                <OwnerRequestsInbox />
              </OwnerLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="payments">
                <Payment />
              </OwnerLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-reports"
          element={
            <ProtectedRoute allowedRoles={['Owner']}>
              <OwnerLayout activeSection="maintenance-reports">
                <MaintenanceReports />
              </OwnerLayout>
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
        
        {/* Footer - exclude from login, register, and dashboard pages */}
        {!(location.pathname === '/login' || 
          location.pathname === '/register' || 
          location.pathname === '/forgot-password' ||
          location.pathname.startsWith('/dashboard') ||
          location.pathname.startsWith('/admin') ||
          location.pathname === '/create-listing' ||
          location.pathname === '/property-details' ||
          location.pathname === '/tenant-info' ||
          location.pathname === '/security-guard-info' ||
          location.pathname === '/request-info' ||
          location.pathname === '/payments' ||
          location.pathname === '/maintenance-reports' ||
          location.pathname.startsWith('/tenant') ||
          location.pathname.startsWith('/security-guard')
        ) && <Footer />}
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
