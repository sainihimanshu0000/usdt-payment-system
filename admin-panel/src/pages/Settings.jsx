import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    network: 'TRC20',
    walletAddress: '',
    qrImage: '',
    active: true,
    minAmount: 10,
    maxAmount: 10000
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/payments/settings');
      if (response.data) setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Configure the deposit wallet and amount limits</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-body">
            <h5 className="mb-3">Payment configuration</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Network</label>
                <select className="form-select" name="network" value={settings.network} onChange={handleChange}>
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Wallet Address</label>
                <input
                  type="text"
                  className="form-control"
                  name="walletAddress"
                  value={settings.walletAddress}
                  onChange={handleChange}
                  placeholder="Enter USDT wallet address"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">QR Image URL (optional)</label>
                <input
                  type="url"
                  className="form-control"
                  name="qrImage"
                  value={settings.qrImage || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/qr.png"
                />
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Min Amount (USDT)</label>
                  <input type="number" className="form-control" name="minAmount" value={settings.minAmount} onChange={handleChange} step="0.01" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Max Amount (USDT)</label>
                  <input type="number" className="form-control" name="maxAmount" value={settings.maxAmount} onChange={handleChange} step="0.01" />
                </div>
              </div>
              <div className="form-check mb-4">
                <input className="form-check-input" type="checkbox" name="active" checked={settings.active} onChange={handleChange} id="active" />
                <label className="form-check-label" htmlFor="active">Enable deposits</label>
              </div>
              <button type="submit" className="btn btn-primary">Save Settings</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="panel-body">
            <h5 className="mb-3">Current values</h5>
            <div className="summary-row"><span>Network</span><strong>{settings.network}</strong></div>
            <div className="summary-row">
              <span>Wallet</span>
              <strong className="text-truncate" style={{ maxWidth: 160 }}>{settings.walletAddress || 'Not set'}</strong>
            </div>
            <div className="summary-row"><span>Min</span><strong>{settings.minAmount} USDT</strong></div>
            <div className="summary-row"><span>Max</span><strong>{settings.maxAmount} USDT</strong></div>
            <div className="summary-row" style={{ borderBottom: 0 }}>
              <span>Status</span>
              <span className={`badge-pill ${settings.active ? 'success' : 'danger'}`}>
                {settings.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
