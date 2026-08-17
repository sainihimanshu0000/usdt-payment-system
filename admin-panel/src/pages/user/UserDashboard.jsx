import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const UserDashboard = () => {
  const { user, refreshUser } = useUserAuth();
  const [payments, setPayments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshUser();
        const [payRes, bankRes] = await Promise.all([
          api.get('/payments/my'),
          api.get('/bank-accounts')
        ]);
        setPayments(payRes.data || []);
        setBanks(bankRes.data || []);
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="portal-empty">Loading dashboard…</div>;
  }

  const activeBanks = banks.filter((bank) => bank.status === 'active').length;

  return (
    <div>
      <div className="portal-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back{user?.name ? `, ${user.name}` : ''}</p>
        </div>
        <div className="portal-actions" style={{ marginBottom: 0 }}>
          <Link to="/portal/deposit" className="portal-btn">Deposit USDT</Link>
          <Link to="/portal/approvals" className="portal-btn ghost">Approvals</Link>
          <Link to="/portal/banks" className="portal-btn ghost">Manage Banks</Link>
        </div>
      </div>

      <div className="portal-stats">
        <div className="portal-stat">
          <small>Available Balance</small>
          <strong>{Number(user?.balance || 0).toFixed(2)} USDT</strong>
        </div>
        <div className="portal-stat">
          <small>Total Deposited</small>
          <strong>{Number(user?.totalDeposited || 0).toFixed(2)} USDT</strong>
        </div>
        <div className="portal-stat">
          <small>Active Bank Accounts</small>
          <strong>{activeBanks}</strong>
        </div>
      </div>

      <div className="portal-card">
        <p className="portal-kicker">RECENT PAYMENTS</p>
        {payments.length === 0 ? (
          <div className="portal-empty">No payments yet</div>
        ) : (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Network</th>
                  <th>Tx Hash</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{payment.amountUSDT} USDT</td>
                    <td>{payment.network}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{payment.txHash}</td>
                    <td>
                      <span className={`portal-badge ${payment.status === 'approved' ? 'active' : payment.status === 'rejected' ? 'inactive' : 'pending'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
