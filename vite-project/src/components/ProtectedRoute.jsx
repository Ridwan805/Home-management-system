import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/login' }) => {
  const { isLoggedIn, userRole } = useContext(AuthContext);

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  // If user role is not in allowed roles, redirect based on their role
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect users to their appropriate dashboard based on role
    switch (userRole) {
      case 'Owner':
        return <Navigate to="/dashboard" replace />;
      case 'Tenant':
        return <Navigate to="/tenant/profile" replace />;
      case 'Security Guard':
        return <Navigate to="/security-guard/profile" replace />;
      case 'Admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;