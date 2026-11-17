import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { PageLoader } from './loading';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/login' }) => {
  const { isLoggedIn, userRole, authLoading } = useContext(AuthContext);

  // If still checking authentication/token, show smooth page loader instead of flashing login
  if (authLoading) {
    return <PageLoader message="Verifying authentication..." minHeight="60vh" />;
  }

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  // If user role is not in allowed roles, redirect based on their role (case-insensitive safe)
  if (allowedRoles.length > 0) {
    const normalizedRole = (userRole || '').trim().toLowerCase();
    const isAllowed = allowedRoles.some(role => {
      const r = role.trim().toLowerCase();
      if (r === normalizedRole) return true;
      if ((r === 'owner' || r === 'tenant' || r === 'resident / property owner') && (normalizedRole === 'resident / property owner' || normalizedRole === 'owner' || normalizedRole === 'tenant' || normalizedRole.includes('resident'))) return true;
      return false;
    });

    if (!isAllowed) {
      switch (normalizedRole) {
        case 'owner':
        case 'tenant':
        case 'resident / property owner':
        case 'resident/property owner':
          return <Navigate to="/dashboard" replace />;
        case 'security guard':
          return <Navigate to="/security-guard/profile" replace />;
        case 'admin':
          return <Navigate to="/admin" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
