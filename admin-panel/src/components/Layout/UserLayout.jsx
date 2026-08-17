import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';

const UserLayout = () => {
  const { logout, user } = useUserAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand">USDT Wallet</span>
          <div className="navbar-nav me-auto">
            <NavLink className="nav-link" to="/portal" end>
              Dashboard
            </NavLink>
            <NavLink className="nav-link" to="/portal/deposit">
              Deposit
            </NavLink>
          </div>
          <div className="d-flex align-items-center gap-3 text-white">
            <span className="small">{user?.email}</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>
      <div className="container py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default UserLayout;
