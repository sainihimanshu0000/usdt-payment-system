import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const Deposit = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [banks, setBanks] = useState([]);
  const [amountUSDT, setAmountUSDT] = useState('');
  const [txHash, setTxHash] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, banksRes] = await Promise.all([
          api.get('/payments/settings'),
          api.get('/bank-accounts')
        ]);
        setSettings(settingsRes.data);
        setBanks(banksRes.data || []);
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

  const copyUpi = async (upiId) => {
    try {
      await navigator.clipboard.writeText(upiId);
      toast.success('UPI ID copied');
    } catch (error) {
      toast.error('Could not copy UPI ID');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/payments', {
        amountUSDT: Number(amountUSDT),
        txHash: txHash.trim(),
        network: settings.network,
        ...(bankAccountId ? { bankAccountId } : {})
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
    return <div className="portal-empty">Loading deposit details…</div>;
  }

  if (!settings?.active) {
    return <div className="portal-card">Deposits are currently disabled.</div>;
  }

  const activeBanks = banks.filter((bank) => bank.status === 'active' && bank.isActive);

  return (
    <div>
      <div className="portal-card">
        <p className="portal-kicker">UPI</p>
        {activeBanks.length === 0 ? (
          <div>
            <p style={{ color: 'var(--p-muted)', marginTop: 0 }}>
              Activate a bank account to use it for UPI payments.
            </p>
            <Link className="portal-btn" to="/portal/banks">Add / Activate Bank</Link>
          </div>
        ) : (
          activeBanks.map((bank) => (
            <div
              key={bank.id}
              className={`upi-option ${bankAccountId === bank.id ? 'is-selected' : ''}`}
              onClick={() => setBankAccountId(bank.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setBankAccountId(bank.id);
              }}
              role="button"
              tabIndex={0}
            >
              <div style={{ flex: 1 }}>
                <strong>{bank.upiId}</strong>
                <div style={{ color: 'var(--p-muted)', fontSize: 13 }}>
                  {bank.bankName} · {bank.accountNoMasked}
                </div>
              </div>
              <button
                type="button"
                className="portal-btn ghost"
                style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  copyUpi(bank.upiId);
                }}
              >
                Copy
              </button>
            </div>
          ))
        )}
      </div>

      <div className="portal-card">
        <p className="portal-kicker">SEND USDT</p>
        <p style={{ color: 'var(--p-muted)', marginTop: 0 }}>
          Transfer USDT on {settings.network} to the wallet below, then submit your transaction hash.
        </p>
        <label className="portal-label">Receiving Wallet</label>
        <input className="portal-input" value={settings.walletAddress || ''} readOnly />
        <button type="button" className="portal-btn ghost" style={{ margin: '10px 0 12px' }} onClick={copyWallet}>
          Copy address
        </button>
        <div style={{ color: 'var(--p-muted)', fontSize: 13 }}>
          Min {settings.minAmount} USDT · Max {settings.maxAmount} USDT
        </div>
        {settings.qrImage && (
          <img src={settings.qrImage} alt="Wallet QR" style={{ maxWidth: 180, marginTop: 14, borderRadius: 12 }} />
        )}
      </div>

      <form className="portal-card" onSubmit={handleSubmit}>
        <p className="portal-kicker">SUBMIT TRANSACTION</p>
        <label className="portal-label">Amount (USDT)</label>
        <input
          className="portal-input"
          type="number"
          min={settings.minAmount}
          max={settings.maxAmount}
          step="0.01"
          value={amountUSDT}
          onChange={(e) => setAmountUSDT(e.target.value)}
          required
        />
        <div className="portal-error" />
        <label className="portal-label">Transaction Hash</label>
        <input
          className="portal-input"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          required
        />
        <div className="portal-error" />
        <button type="submit" className="portal-btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
};

export default Deposit;
