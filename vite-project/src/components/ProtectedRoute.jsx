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
    const isAllowed = allowedRoles.some(role => role.trim().toLowerCase() === normalizedRole);

    if (!isAllowed) {
      switch (normalizedRole) {
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'tenant':
          return <Navigate to="/tenant/profile" replace />;
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
