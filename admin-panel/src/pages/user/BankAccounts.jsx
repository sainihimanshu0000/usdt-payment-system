import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const BankAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    const { data } = await api.get('/bank-accounts');
    setAccounts(data || []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch (error) {
        toast.error('Failed to load bank accounts');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const toggleStatus = async (account) => {
    if (account.status === 'rejected') return;
    const nextStatus = account.status === 'active' ? 'inactive' : 'active';
    setBusyId(account.id);
    try {
      const { data } = await api.patch(`/bank-accounts/${account.id}/status`, { status: nextStatus });
      setAccounts((prev) => prev.map((item) => (item.id === account.id ? data.bankAccount : item)));
      toast.success(
        nextStatus === 'active'
          ? 'Bank account activated successfully'
          : 'Bank account deactivated successfully'
      );
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const removeAccount = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await api.delete(`/bank-accounts/${pendingDelete.id}`);
      setAccounts((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      toast.success('Bank account deleted');
      setPendingDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete account');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="portal-empty">Loading accounts…</div>;
  }

  return (
    <div>
      <div className="portal-page-head">
        <div>
          <h1>Bank Accounts</h1>
          <p>Manage accounts used for UPI and payments</p>
        </div>
        <button type="button" className="portal-btn" onClick={() => navigate('/portal/banks/add')}>
          Add Bank Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="portal-card portal-empty">
          <h3>No bank accounts yet</h3>
          <p>Add an account to use it for UPI payments.</p>
          <button type="button" className="portal-btn" style={{ marginTop: 12 }} onClick={() => navigate('/portal/banks/add')}>
            Add Bank Account
          </button>
        </div>
      ) : (
        <div className="bank-list">
          {accounts.map((account) => (
            <article className="portal-card flat" key={account.id}>
              <div className="bank-card-head">
                <div>
                  <h3>{account.accountHolderName}</h3>
                  <p>{account.bankName}</p>
                </div>
                <span className={`portal-badge ${account.status}`}>{account.status}</span>
              </div>
              <div className="portal-row"><span>Account No.</span><strong>{account.accountNoMasked}</strong></div>
              <div className="portal-row"><span>UPI ID</span><strong>{account.upiId}</strong></div>
              <div className="portal-row"><span>IFSC</span><strong>{account.ifscCode}</strong></div>
              <div className="portal-row"><span>Branch</span><strong>{account.bankBranch}</strong></div>
              <div className="portal-row"><span>Phone</span><strong>{account.countryCode} {account.phoneNo}</strong></div>
              <div className="bank-actions">
                <label className="switch" title="Toggle active status">
                  <input
                    type="checkbox"
                    checked={account.status === 'active'}
                    disabled={busyId === account.id || account.status === 'rejected'}
                    onChange={() => toggleStatus(account)}
                  />
                  <span />
                </label>
                <Link className="portal-btn ghost sm" to={`/portal/banks/${account.id}/edit`}>Edit</Link>
                <button type="button" className="portal-btn danger sm" onClick={() => setPendingDelete(account)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="portal-confirm">
          <div className="portal-card">
            <h3 style={{ marginTop: 0 }}>Delete bank account?</h3>
            <p style={{ color: 'var(--p-muted)' }}>
              {pendingDelete.bankName} · {pendingDelete.accountNoMasked}
            </p>
            <div className="bank-actions">
              <button type="button" className="portal-btn ghost" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="portal-btn danger" onClick={removeAccount} disabled={busyId === pendingDelete.id}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
