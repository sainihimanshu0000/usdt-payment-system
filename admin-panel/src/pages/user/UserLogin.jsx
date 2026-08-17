import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { toast } from 'react-toastify';

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
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f4f6f9' }}>
      <div className="card shadow" style={{ width: '400px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-4">USDT Wallet</h2>
          <p className="text-center text-muted mb-4">Sign in to deposit USDT</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Loading...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-3 text-center small">
            <Link to="/login">Admin login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
