import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || 'A').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </Icon>
      )
    },
    {
      path: '/users',
      label: 'Users',
      icon: (
        <Icon>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
      )
    },
    {
      path: '/bank-accounts',
      label: 'Banks',
      icon: (
        <Icon>
          <path d="M3 21h18" />
          <path d="M3 10h18" />
          <path d="M5 6l7-3 7 3" />
          <path d="M6 10v11" />
          <path d="M12 10v11" />
          <path d="M18 10v11" />
        </Icon>
      )
    },
    {
      path: '/transactions',
      label: 'Transactions',
      icon: (
        <Icon>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </Icon>
      )
    },
    {
      path: '/payments',
      label: 'Payments',
      icon: (
        <Icon>
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </Icon>
      )
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Icon>
      )
    }
  ];

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? '' : 'is-collapsed'}`}>
        <div className="brand">
          <div className="brand-mark">₮</div>
          <div className="brand-text">
            <strong>USDT Admin</strong>
            <span>Payment console</span>
          </div>
          <button className="collapse-btn" onClick={() => setSidebarOpen(!sidebarOpen)} type="button" aria-label="Toggle sidebar">
            <Icon>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </Icon>
          </button>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div className="user-meta">
              <strong>{user?.name || 'Admin'}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} type="button">
            <Icon>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </Icon>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
