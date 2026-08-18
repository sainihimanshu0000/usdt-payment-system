import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const PAYMENT_MODES = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'neft', label: 'NEFT' },
  { value: 'imps', label: 'IMPS' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' }
];

const emptyForm = {
  userId: '',
  amount: '',
  utrNumber: '',
  paymentMode: 'upi',
  remark: ''
};

const AddTransaction = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/users');
        setUsers((Array.isArray(data) ? data : []).filter((user) => user.status !== 'disabled'));
      } catch (error) {
        toast.error('Failed to load users');
      }
    };
    load();
  }, []);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId) return toast.error('Select a user');
    if (!Number(form.amount) || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (!form.utrNumber.trim()) return toast.error('UTR number is required');

    setSaving(true);
    try {
      await api.post('/admin/transactions', {
        userId: form.userId,
        amount: Number(form.amount),
        utrNumber: form.utrNumber.trim(),
        paymentMode: form.paymentMode,
        remark: form.remark.trim()
      });
      toast.success('Transaction sent to user for approval.');
      navigate('/transactions');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Add Transaction</h1>
          <p>Send an amount and UTR to a user for approval. On approval, the INR value is deducted from their deposit balance.</p>
        </div>
        <Link to="/transactions" className="btn-soft">Back to list</Link>
      </div>

      <div className="panel" style={{ maxWidth: 640 }}>
        <form className="panel-body" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Select User</label>
            <select
              className="form-select"
              value={form.userId}
              onChange={(e) => setField('userId', e.target.value)}
              required
            >
              <option value="">Choose a user</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} · {user.email}{user.phone ? ` · ${user.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Amount (USDT)</label>
            <input
              className="form-control"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">UTR Number</label>
            <input
              className="form-control"
              value={form.utrNumber}
              onChange={(e) => setField('utrNumber', e.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-select"
              value={form.paymentMode}
              onChange={(e) => setField('paymentMode', e.target.value)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="form-label">Remark / Note</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.remark}
              onChange={(e) => setField('remark', e.target.value)}
              placeholder="Payment received, please confirm"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Sending…' : 'Send for User Approval'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
