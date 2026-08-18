import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const UserDashboard = () => {
  const { user, refreshUser } = useUserAuth();
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState({
    inrBalance: 0,
    usdtBalance: 0,
    currentUsdtRate: 0,
    bonusRatio: 0,
    availableQuota: 0,
    bonusAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshUser();
        const [dashRes, payRes] = await Promise.all([
          api.get('/user/dashboard'),
          api.get('/payments/my')
        ]);
        setDashboard(dashRes.data || {
          inrBalance: 0,
          usdtBalance: 0,
          currentUsdtRate: 0,
          bonusRatio: 0,
          availableQuota: 0,
          bonusAmount: 0
        });
        setPayments(payRes.data || []);
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

  const stats = [
    { label: 'INR Balance', value: formatInr(dashboard.inrBalance) },
    { label: 'USDT Balance', value: `${Number(dashboard.usdtBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} USDT` },
    { label: 'USDT Rate', value: dashboard.currentUsdtRate ? `1 USDT = ${formatInr(dashboard.currentUsdtRate)}` : 'Not set' },
    { label: 'Bonus Ratio', value: `${Number(dashboard.bonusRatio || 0)}%` },
    { label: 'Available Quota', value: formatInr(dashboard.availableQuota) }
  ];

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

      <div className="portal-stats portal-stats-5">
        {stats.map((stat) => (
          <div className="portal-stat" key={stat.label}>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {Number(dashboard.bonusAmount || 0) > 0 && (
        <div className="portal-rate-banner">
          Confirmed bonus credited: {formatInr(dashboard.bonusAmount)}
        </div>
      )}

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
                  <th>Rate</th>
                  <th>INR Credit</th>
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
                    <td>{payment.rateInr ? `₹${payment.rateInr}` : '—'}</td>
                    <td>{payment.finalCreditAmount ? formatInr(payment.finalCreditAmount) : '—'}</td>
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
