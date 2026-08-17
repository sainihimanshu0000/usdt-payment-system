import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';

const UserPrivateRoute = () => {
  const { isAuthenticated, loading } = useUserAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/portal/login" />;
};

export default UserPrivateRoute;
