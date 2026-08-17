import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext';

const UserDashboard = () => {
  const { user, refreshUser } = useUserAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshUser();
        const response = await api.get('/payments/my');
        setPayments(response.data || []);
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Dashboard</h1>
        <Link to="/portal/deposit" className="btn btn-primary">Deposit USDT</Link>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="text-white-50">Available Balance</div>
              <h3 className="mb-0">{Number(user?.balance || 0).toFixed(2)} USDT</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="text-white-50">Total Deposited</div>
              <h3 className="mb-0">{Number(user?.totalDeposited || 0).toFixed(2)} USDT</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <div className="text-muted">Payment Requests</div>
              <h3 className="mb-0">{payments.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Recent Payments</h5>
          <div className="table-responsive">
            <table className="table table-hover">
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
                    <td className="text-truncate" style={{ maxWidth: 180 }}>{payment.txHash}</td>
                    <td>
                      <span className={`badge bg-${payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-3">No payments yet</td>
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

export default UserDashboard;
