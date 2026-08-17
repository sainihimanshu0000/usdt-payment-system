import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const Deposit = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [amountUSDT, setAmountUSDT] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/payments/settings');
        setSettings(response.data);
      } catch (error) {
        toast.error('Failed to load payment settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(settings.walletAddress);
      toast.success('Wallet address copied');
    } catch (error) {
      toast.error('Could not copy address');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/payments', {
        amountUSDT: Number(amountUSDT),
        txHash: txHash.trim(),
        network: settings.network
      });
      toast.success('Payment submitted. Waiting for admin approval.');
      navigate('/portal');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!settings?.active) {
    return <div className="alert alert-warning">Deposits are currently disabled.</div>;
  }

  return (
    <div className="row">
      <div className="col-lg-7">
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">Send USDT</h5>
            <p className="text-muted">
              Transfer USDT on <strong>{settings.network}</strong> to the wallet below, then submit your transaction hash.
            </p>
            <label className="form-label">Receiving Wallet</label>
            <div className="input-group mb-3">
              <input className="form-control" value={settings.walletAddress || ''} readOnly />
              <button type="button" className="btn btn-outline-secondary" onClick={copyWallet}>Copy</button>
            </div>
            <div className="small text-muted">
              Min {settings.minAmount} USDT · Max {settings.maxAmount} USDT
            </div>
            {settings.qrImage && (
              <img src={settings.qrImage} alt="Wallet QR" className="img-fluid mt-3" style={{ maxWidth: 220 }} />
            )}
          </div>
        </div>
      </div>
      <div className="col-lg-5">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Submit Transaction</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Amount (USDT)</label>
                <input
                  type="number"
                  className="form-control"
                  min={settings.minAmount}
                  max={settings.maxAmount}
                  step="0.01"
                  value={amountUSDT}
                  onChange={(e) => setAmountUSDT(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Transaction Hash</label>
                <input
                  type="text"
                  className="form-control"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
