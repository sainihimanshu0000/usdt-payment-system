import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import api from '../../services/api';
import '../../portal.css';

const UserLayout = () => {
  const { logout, user } = useUserAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/user/transactions/pending-approval');
        setPendingCount(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        setPendingCount(0);
      }
    };
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

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
              <NavLink to="/portal/approvals">
                Approvals{pendingCount > 0 ? ` (${pendingCount})` : ''}
              </NavLink>
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
