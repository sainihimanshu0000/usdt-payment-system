import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import '../../portal.css';

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const getMeta = (pathname) => {
  if (pathname === '/portal/banks/add') return { title: 'Add Bank', back: '/portal/banks' };
  if (/^\/portal\/banks\/[^/]+\/edit$/.test(pathname)) return { title: 'Edit Bank', back: '/portal/banks' };
  if (pathname.startsWith('/portal/banks')) return { title: 'Bank Accounts' };
  if (pathname.startsWith('/portal/deposit')) return { title: 'Deposit' };
  return { title: 'Dashboard' };
};

const UserLayout = () => {
  const { logout } = useUserAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = getMeta(pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="portal-app">
      <div className="portal-shell">
        <header className="portal-top">
          {meta.back ? (
            <button type="button" className="portal-icon-btn" onClick={() => navigate(meta.back)} aria-label="Back">
              <Icon>
                <polyline points="15 18 9 12 15 6" />
              </Icon>
            </button>
          ) : (
            <div className="portal-icon-btn" aria-hidden="true">₮</div>
          )}
          <h1>{meta.title}</h1>
          <button type="button" className="portal-icon-btn" onClick={handleLogout} aria-label="Logout">
            <Icon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </Icon>
          </button>
        </header>

        <main className="portal-body">
          <Outlet />
        </main>

        <nav className="portal-nav">
          <NavLink to="/portal" end>
            <Icon>
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </Icon>
            Home
          </NavLink>
          <NavLink to="/portal/deposit">
            <Icon>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </Icon>
            Deposit
          </NavLink>
          <NavLink to="/portal/banks">
            <Icon>
              <path d="M3 21h18" />
              <path d="M3 10h18" />
              <path d="M5 6l7-3 7 3" />
              <path d="M6 10v11" />
              <path d="M12 10v11" />
              <path d="M18 10v11" />
            </Icon>
            Banks
          </NavLink>
        </nav>
      </div>
    </div>
  );
};

export default UserLayout;
