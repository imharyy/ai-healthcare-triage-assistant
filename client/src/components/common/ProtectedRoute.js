import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-page"><div className="spinner"></div></div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const home = {
      patient: '/patient/dashboard',
      doctor: '/doctor/dashboard',
      receptionist: '/receptionist/dashboard',
      admin: '/admin/dashboard',
      superadmin: '/admin/dashboard',
    };
    return <Navigate to={home[user.role] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
