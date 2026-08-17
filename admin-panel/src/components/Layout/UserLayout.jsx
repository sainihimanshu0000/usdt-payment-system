import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import '../../portal.css';

const UserLayout = () => {
  const { logout, user } = useUserAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="portal-app">
      <div className="portal-shell">
        <header className="portal-navbar">
          <div className="portal-navbar-inner">
            <NavLink to="/portal" className="portal-brand" end>
              <span className="portal-brand-mark">₮</span>
              USDT Wallet
            </NavLink>

            <nav className="portal-nav-links">
              <NavLink to="/portal" end>
                Dashboard
              </NavLink>
              <NavLink to="/portal/deposit">Deposit</NavLink>
              <NavLink to="/portal/banks">Bank Accounts</NavLink>
            </nav>

            <div className="portal-nav-user">
              <span>{user?.email}</span>
              <button type="button" className="portal-btn ghost sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="portal-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
