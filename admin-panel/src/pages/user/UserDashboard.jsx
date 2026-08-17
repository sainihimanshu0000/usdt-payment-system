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
      <div className="portal-stats">
        <div className="portal-stat">
          <small>Available</small>
          <strong>{Number(user?.balance || 0).toFixed(2)}</strong>
        </div>
        <div className="portal-stat">
          <small>Deposited</small>
          <strong>{Number(user?.totalDeposited || 0).toFixed(2)}</strong>
        </div>
      </div>

      <Link to="/portal/deposit" className="portal-btn" style={{ display: 'block', textAlign: 'center', marginBottom: 12, textDecoration: 'none' }}>
        Deposit USDT
      </Link>
      <Link to="/portal/banks" className="portal-btn ghost" style={{ display: 'block', textAlign: 'center', marginBottom: 16, textDecoration: 'none' }}>
        Bank Accounts · {activeBanks} active
      </Link>

      <div className="portal-card">
        <p className="portal-kicker">RECENT PAYMENTS</p>
        {payments.length === 0 && <div className="portal-empty">No payments yet</div>}
        {payments.map((payment) => (
          <div className="portal-row" key={payment._id}>
            <span>{payment.amountUSDT} USDT</span>
            <strong>
              <span className={`portal-badge ${payment.status === 'approved' ? 'active' : payment.status === 'rejected' ? 'inactive' : 'pending'}`}>
                {payment.status}
              </span>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
