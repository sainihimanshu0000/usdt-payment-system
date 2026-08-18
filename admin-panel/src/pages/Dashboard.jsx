import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import LottieExchange from '../components/LottieExchange';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/payments/stats');
      setStats({
        totalUsers: response.data.totalUsers || 0,
        totalPayments: response.data.totalPayments || 0,
        totalAmount: response.data.totalAmount || 0,
        pendingPayments: response.data.pendingPayments || 0
      });
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: 'blue', to: '/users', glyph: 'U' },
    { title: 'Total Payments', value: stats.totalPayments, icon: 'green', to: '/payments', glyph: 'P' },
    { title: 'Approved USDT', value: Number(stats.totalAmount).toFixed(2), icon: 'amber', to: '/payments', glyph: '₮' },
    { title: 'Pending Approvals', value: stats.pendingPayments, icon: 'rose', to: '/payments', glyph: '!' }
  ];

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of users, deposits, and pending reviews</p>
        </div>
        <LottieExchange className="lottie-dash" />
      </div>

      <div className="stat-grid">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.to} className="stat-card">
            <div>
              <div className="label">{stat.title}</div>
              <h3 className="value">{stat.value}</h3>
            </div>
            <div className={`stat-icon ${stat.icon}`}>{stat.glyph}</div>
          </Link>
        ))}
      </div>

      <div className="panel">
        <div className="panel-body">
          <h5 className="mb-1">Quick actions</h5>
          <p className="text-muted mb-3">Jump into the most common admin tasks.</p>
          <div className="quick-grid">
            <Link to="/users" className="quick-card">
              <h6>Manage Users</h6>
              <small className="text-muted">Create accounts and control access</small>
            </Link>
            <Link to="/transactions/add" className="quick-card">
              <h6>Add Transaction</h6>
              <small className="text-muted">Send amount and UTR for user approval</small>
            </Link>
            <Link to="/payments" className="quick-card">
              <h6>Approve Payments</h6>
              <small className="text-muted">Review USDT deposit requests</small>
            </Link>
            <Link to="/usdt-rate" className="quick-card">
              <h6>USDT Rate</h6>
              <small className="text-muted">Set USDT to INR conversion and bonus</small>
            </Link>
            <Link to="/settings" className="quick-card">
              <h6>Payment Settings</h6>
              <small className="text-muted">Set wallet, network, and limits</small>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
