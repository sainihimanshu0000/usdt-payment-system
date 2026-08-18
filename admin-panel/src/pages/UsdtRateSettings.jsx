import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const emptyForm = {
  rateInr: '',
  bonusRatio: '',
  minDeposit: '',
  maxDeposit: '',
  status: 'active'
};

const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const UsdtRateSettings = () => {
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [rateRes, historyRes] = await Promise.all([
        api.get('/admin/usdt-rate'),
        api.get('/admin/usdt-rate/history')
      ]);
      const rate = rateRes.data || {};
      setCurrent(rate);
      setForm({
        rateInr: rate.rateInr || '',
        bonusRatio: rate.bonusRatio || '',
        minDeposit: rate.minDeposit ?? '',
        maxDeposit: rate.maxDeposit ?? '',
        status: rate.status || 'active'
      });
      setHistory(historyRes.data?.history || []);
    } catch (error) {
      toast.error('Failed to load USDT rate settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rateInr = Number(form.rateInr);
    if (!form.rateInr || Number.isNaN(rateInr)) {
      return toast.error('USDT rate is required');
    }
    if (rateInr <= 0) {
      return toast.error('USDT rate must be greater than 0');
    }
    if (form.bonusRatio !== '' && Number(form.bonusRatio) < 0) {
      return toast.error('Bonus ratio cannot be negative');
    }

    setSaving(true);
    try {
      await api.post('/admin/usdt-rate', {
        rateInr,
        bonusRatio: form.bonusRatio === '' ? 0 : Number(form.bonusRatio),
        minDeposit: form.minDeposit === '' ? null : Number(form.minDeposit),
        maxDeposit: form.maxDeposit === '' ? null : Number(form.maxDeposit),
        status: form.status
      });
      toast.success('USDT rate updated');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update USDT rate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>USDT Rate Settings</h1>
          <p>Set the USDT to INR conversion rate used for new deposits</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <div className="panel-body">
            <h5 className="mb-3">Update rate</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">USDT Rate in INR</label>
                <input
                  type="number"
                  className="form-control"
                  name="rateInr"
                  value={form.rateInr}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 106"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Bonus Ratio (%) — optional</label>
                <input
                  type="number"
                  className="form-control"
                  name="bonusRatio"
                  value={form.bonusRatio}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="e.g. 2"
                />
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Minimum Deposit (USDT) — optional</label>
                  <input
                    type="number"
                    className="form-control"
                    name="minDeposit"
                    value={form.minDeposit}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Maximum Deposit (USDT) — optional</label>
                  <input
                    type="number"
                    className="form-control"
                    name="maxDeposit"
                    value={form.maxDeposit}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating…' : 'Update Rate'}
              </button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="panel-body">
            <h5 className="mb-3">Current Rate</h5>
            <div className="summary-row">
              <span>Rate</span>
              <strong>{current?.rateInr ? `1 USDT = ${formatInr(current.rateInr)}` : 'Not set'}</strong>
            </div>
            <div className="summary-row">
              <span>Bonus Ratio</span>
              <strong>{Number(current?.bonusRatio || 0)}%</strong>
            </div>
            <div className="summary-row">
              <span>Min Deposit</span>
              <strong>{current?.minDeposit != null ? `${current.minDeposit} USDT` : '—'}</strong>
            </div>
            <div className="summary-row">
              <span>Max Deposit</span>
              <strong>{current?.maxDeposit != null ? `${current.maxDeposit} USDT` : '—'}</strong>
            </div>
            <div className="summary-row">
              <span>Updated By</span>
              <strong>{current?.updatedBy || '—'}</strong>
            </div>
            <div className="summary-row" style={{ borderBottom: 0 }}>
              <span>Status</span>
              <span className={`badge-pill ${current?.status === 'active' ? 'success' : 'danger'}`}>
                {current?.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-body">
          <h5 className="mb-3">Rate History</h5>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Old Rate</th>
                  <th>New Rate</th>
                  <th>Bonus Ratio</th>
                  <th>Updated By</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{formatInr(row.oldRate)}</td>
                    <td>{formatInr(row.newRate)}</td>
                    <td>{Number(row.oldBonusRatio || 0)}% → {Number(row.newBonusRatio || 0)}%</td>
                    <td>{row.updatedBy || 'Admin'}</td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty">No rate changes yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsdtRateSettings;
