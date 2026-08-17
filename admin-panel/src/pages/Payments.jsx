import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    try {
      const response = await api.get(`/payments?status=${filter}`);
      setPayments(response.data.payments || []);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId) => {
    try {
      await api.patch(`/payments/${paymentId}/approve`, { skipVerification: true });
      toast.success('Payment approved');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (paymentId) => {
    const note = prompt('Reason for rejection:');
    if (note === null) return;
    try {
      await api.patch(`/payments/${paymentId}/reject`, { note });
      toast.success('Payment rejected');
      fetchPayments();
    } catch (error) {
      toast.error('Failed to reject payment');
    }
  };

  const copyHash = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Tx hash copied');
    } catch (error) {
      toast.error('Could not copy');
    }
  };

  const statusClass = {
    pending: 'warning',
    verified: 'info',
    approved: 'success',
    rejected: 'danger'
  };

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>Review and approve USDT deposit requests</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="filters mb-3">
            {['all', 'pending', 'verified', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                className={`filter-btn ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
                type="button"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Network</th>
                  <th>Tx Hash</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      <strong>{payment.userId?.name || 'Unknown'}</strong>
                      <div className="text-muted small">{payment.userId?.email || ''}</div>
                    </td>
                    <td>{payment.amountUSDT} USDT</td>
                    <td>{payment.network}</td>
                    <td>
                      <button type="button" className="hash-btn" title={payment.txHash} onClick={() => copyHash(payment.txHash)}>
                        {payment.txHash}
                      </button>
                    </td>
                    <td>
                      <span className={`badge-pill ${statusClass[payment.status] || 'muted'}`}>{payment.status}</span>
                    </td>
                    <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td>
                      {payment.status === 'pending' ? (
                        <div className="btn-row">
                          <button className="btn-soft success" onClick={() => handleApprove(payment._id)}>Approve</button>
                          <button className="btn-soft danger" onClick={() => handleReject(payment._id)}>Reject</button>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty">No payments found</td>
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

export default Payments;
