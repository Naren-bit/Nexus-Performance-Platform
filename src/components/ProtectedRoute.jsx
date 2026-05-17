import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="empty-state"><div className="spinner"></div></div>;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they try to access wrong route
    const routes = {
      employee: '/dashboard-employee',
      manager: '/dashboard-manager',
      admin: '/dashboard-admin'
    };
    return <Navigate to={routes[user.role] || '/'} replace />;
  }

  return children;
}
