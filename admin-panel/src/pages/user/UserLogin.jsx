import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { toast } from 'react-toastify';
import '../../portal.css';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUserAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Login successful!');
      navigate('/portal');
    } else {
      toast.error(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="portal-app">
      <div className="portal-login">
        <form className="portal-card" onSubmit={handleSubmit}>
          <p className="portal-kicker">USDT WALLET</p>
          <h2 style={{ margin: '0 0 8px' }}>Sign in to your account</h2>
          <p style={{ color: 'var(--p-muted)', marginTop: 0 }}>
            Deposit USDT and manage bank accounts from the web portal
          </p>
          <label className="portal-label">Email Address</label>
          <input
            className="portal-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="portal-error" />
          <label className="portal-label">Password</label>
          <input
            className="portal-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="portal-error" />
          <button type="submit" className="portal-btn block" disabled={loading}>
            {loading ? 'Loading…' : 'Sign In'}
          </button>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
            <Link to="/login">Admin login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;
