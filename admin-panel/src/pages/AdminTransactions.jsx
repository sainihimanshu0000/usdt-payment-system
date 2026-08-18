import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_user_approval', label: 'Pending User Approval' },
  { id: 'approved_by_user', label: 'Approved by User' },
  { id: 'rejected_by_user', label: 'Rejected by User' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' }
];

const statusClass = {
  pending_user_approval: 'warning',
  approved_by_user: 'info',
  rejected_by_user: 'danger',
  success: 'success',
  failed: 'muted'
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

const AdminTransactions = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const canApproveOnBehalf = user?.role === 'super_admin' || user?.canApproveOnBehalf;

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const userId = searchParams.get('userId');
      if (userId) params.set('userId', userId);
      const query = params.toString() ? `?${params}` : '';
      const { data } = await api.get(`/admin/transactions${query}`);
      setRows(data.transactions || []);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [status, searchParams]);

  const approveOnBehalf = async (id) => {
    if (!window.confirm('Approve this transaction on behalf of the user? The INR value will be deducted from their deposit balance.')) return;
    setBusyId(id);
    try {
      await api.patch(`/admin/transactions/${id}/approve`);
      toast.success('Transaction approved successfully');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/admin/transactions/${id}`);
      setDetail(data.transaction);
    } catch (error) {
      toast.error('Failed to load details');
    }
  };

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p>Admin-created requests waiting for user approval</p>
        </div>
        <Link to="/transactions/add" className="btn btn-primary">Add Transaction</Link>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="toolbar">
            <input
              className="form-control search"
              placeholder="Search UTR or Transaction ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <div className="filters">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`filter-btn ${status === item.id ? 'active' : ''}`}
                  onClick={() => setStatus(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>User Name</th>
                  <th>Mobile Number</th>
                  <th>Amount</th>
                  <th>UTR Number</th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Created By Admin</th>
                  <th>Created Date</th>
                  <th>User Action Date</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="hash-btn" onClick={() => openDetail(row.id)}>
                        {row.txnId}
                      </button>
                    </td>
                    <td>
                      <strong>{row.userName}</strong>
                      <div className="text-muted small">{row.userEmail}</div>
                    </td>
                    <td>{row.mobileNumber || '—'}</td>
                    <td>{Number(row.amount).toFixed(2)}</td>
                    <td>{row.utrNumber}</td>
                    <td className="text-uppercase">{row.paymentMode?.replace('_', ' ')}</td>
                    <td>
                      <span className={`badge-pill ${statusClass[row.status] || 'muted'}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                    <td>{row.createdByAdmin || '—'}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{formatDate(row.userActionAt)}</td>
                    <td>
                      <div>{row.adminRemark || '—'}</div>
                      {row.userRejectionReason && (
                        <div className="text-danger small">Reject: {row.userRejectionReason}</div>
                      )}
                      {row.status === 'pending_user_approval' && canApproveOnBehalf && (
                        <button
                          type="button"
                          className="btn-soft success mt-2"
                          disabled={busyId === row.id}
                          onClick={() => approveOnBehalf(row.id)}
                        >
                          Approve on behalf
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="11" className="empty">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail && (
        <div className="modal-backdrop-custom" onClick={() => setDetail(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)' }}>
            <header>
              <h5 className="mb-0">{detail.txnId}</h5>
            </header>
            <div className="body">
              <div className="summary-row"><span>User</span><strong>{detail.userName}</strong></div>
              <div className="summary-row"><span>Mobile</span><strong>{detail.mobileNumber || '—'}</strong></div>
              <div className="summary-row"><span>Amount</span><strong>{Number(detail.amount).toFixed(2)}</strong></div>
              <div className="summary-row"><span>UTR</span><strong>{detail.utrNumber}</strong></div>
              <div className="summary-row"><span>Mode</span><strong>{detail.paymentMode}</strong></div>
              <div className="summary-row"><span>Status</span><strong>{detail.statusLabel}</strong></div>
              <div className="summary-row"><span>Admin remark</span><strong>{detail.adminRemark || '—'}</strong></div>
              <div className="summary-row"><span>Rejection reason</span><strong>{detail.userRejectionReason || '—'}</strong></div>
              <div className="summary-row"><span>Balance before</span><strong>{detail.balanceBefore ?? '—'}</strong></div>
              <div className="summary-row"><span>Balance after</span><strong>{detail.balanceAfter ?? '—'}</strong></div>
            </div>
            <footer>
              <button type="button" className="btn-soft" onClick={() => setDetail(null)}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
