import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LottieExchange from '../components/LottieExchange';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-visual">
          <LottieExchange className="lottie-login" />
          <h3>Bitcoin & Dollar Exchange</h3>
          <p>Track USDT deposits, approve payments, and manage users in one place.</p>
        </div>
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark" style={{ width: 52, height: 52, fontSize: 22 }}>₮</div>
            <h2 className="mt-3 mb-1">USDT Admin</h2>
            <p className="text-muted mb-0">Sign in to manage deposits and users</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="admin@apex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-muted small">
            Default: admin@apex.com / Apex@123
          </div>
          <div className="mt-2 text-center small">
            <Link to="/portal/login">Go to user portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
