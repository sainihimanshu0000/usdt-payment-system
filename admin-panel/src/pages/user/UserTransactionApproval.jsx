import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const UserTransactionApproval = () => {
  const { refreshUser } = useUserAuth();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmTxn, setConfirmTxn] = useState(null);
  const [rejectTxn, setRejectTxn] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    const [pendingRes, allRes] = await Promise.all([
      api.get('/user/transactions/pending-approval'),
      api.get('/user/transactions')
    ]);
    setPending(pendingRes.data || []);
    setHistory((allRes.data || []).filter((item) => item.status !== 'pending_user_approval'));
  };

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch (error) {
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const approve = async () => {
    if (!confirmTxn) return;
    setBusyId(confirmTxn.id);
    try {
      await api.patch(`/user/transactions/${confirmTxn.id}/approve`);
      toast.success('Transaction approved successfully.');
      setConfirmTxn(null);
      await refreshUser();
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not approve');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTxn) return;
    if (!reason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setBusyId(rejectTxn.id);
    try {
      await api.patch(`/user/transactions/${rejectTxn.id}/reject`, { reason: reason.trim() });
      toast.success('Transaction rejected successfully.');
      setRejectTxn(null);
      setReason('');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not reject');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="portal-empty">Loading transactions…</div>;
  }

  return (
    <div>
      <div className="portal-page-head">
        <div>
          <h1>Transaction Approval</h1>
          <p>Review amounts and UTR numbers sent by admin before your wallet is credited</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="portal-card portal-empty">
          <h3>No pending approvals</h3>
          <p>New admin requests will appear here.</p>
        </div>
      ) : (
        <div className="bank-list">
          {pending.map((txn) => (
            <article className="portal-card flat" key={txn.id}>
              <div className="bank-card-head">
                <div>
                  <h3>{Number(txn.amount).toFixed(2)} USDT</h3>
                  <p>UTR {txn.utrNumber}</p>
                </div>
                <span className="portal-badge pending">{txn.statusLabel}</span>
              </div>
              <div className="portal-row"><span>Payment Mode</span><strong className="text-uppercase">{txn.paymentMode?.replace('_', ' ')}</strong></div>
              <div className="portal-row"><span>Date & Time</span><strong>{new Date(txn.createdAt).toLocaleString()}</strong></div>
              <div className="portal-row"><span>Admin Remark</span><strong>{txn.adminRemark || '—'}</strong></div>
              <div className="bank-actions">
                <button type="button" className="portal-btn sm" onClick={() => setConfirmTxn(txn)}>Approve</button>
                <button type="button" className="portal-btn danger sm" onClick={() => { setRejectTxn(txn); setReason(''); }}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="portal-card" style={{ marginTop: 20 }}>
          <p className="portal-kicker">HISTORY</p>
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Status</th>
                  <th>Action date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((txn) => (
                  <tr key={txn.id}>
                    <td>{Number(txn.amount).toFixed(2)}</td>
                    <td>{txn.utrNumber}</td>
                    <td>
                      <span className={`portal-badge ${txn.status === 'success' || txn.status === 'approved_by_user' ? 'active' : txn.status === 'rejected_by_user' || txn.status === 'failed' ? 'inactive' : 'pending'}`}>
                        {txn.statusLabel}
                      </span>
                    </td>
                    <td>{txn.userActionAt ? new Date(txn.userActionAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmTxn && (
        <div className="portal-confirm">
          <div className="portal-card">
            <h3 style={{ marginTop: 0 }}>Approve this transaction?</h3>
            <p style={{ color: 'var(--p-muted)' }}>
              Are you sure you want to approve this transaction? {Number(confirmTxn.amount).toFixed(2)} USDT will be credited to your wallet.
            </p>
            <div className="bank-actions">
              <button type="button" className="portal-btn ghost" onClick={() => setConfirmTxn(null)}>Cancel</button>
              <button type="button" className="portal-btn" onClick={approve} disabled={busyId === confirmTxn.id}>
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTxn && (
        <div className="portal-confirm">
          <div className="portal-card">
            <h3 style={{ marginTop: 0 }}>Reject transaction</h3>
            <p style={{ color: 'var(--p-muted)' }}>Enter a reason. Your wallet will not be credited.</p>
            <textarea
              className="portal-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Amount not received"
            />
            <div className="bank-actions">
              <button type="button" className="portal-btn ghost" onClick={() => setRejectTxn(null)}>Cancel</button>
              <button type="button" className="portal-btn danger" onClick={reject} disabled={busyId === rejectTxn.id || !reason.trim()}>
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTransactionApproval;
