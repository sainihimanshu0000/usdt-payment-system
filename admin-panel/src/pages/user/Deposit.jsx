import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Deposit = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [banks, setBanks] = useState([]);
  const [amountUSDT, setAmountUSDT] = useState('');
  const [txHash, setTxHash] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [infoRes, banksRes] = await Promise.all([
          api.get('/user/deposit/usdt-info'),
          api.get('/bank-accounts')
        ]);
        setInfo(infoRes.data);
        setBanks(banksRes.data || []);
      } catch (error) {
        toast.error('Failed to load payment settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const preview = useMemo(() => {
    const amount = Number(amountUSDT);
    const rate = Number(info?.currentUsdtRate || 0);
    const bonusRatio = Number(info?.bonusRatio || 0);
    if (!amount || amount <= 0 || !rate) return null;
    const convertedInrAmount = Number((amount * rate).toFixed(2));
    const bonusAmount = Number((convertedInrAmount * bonusRatio / 100).toFixed(2));
    const finalCreditAmount = Number((convertedInrAmount + bonusAmount).toFixed(2));
    return { convertedInrAmount, bonusAmount, finalCreditAmount };
  }, [amountUSDT, info]);

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(info.walletAddress);
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
      await api.post('/user/deposit/usdt', {
        amountUsdt: Number(amountUSDT),
        txHash: txHash.trim(),
        network: info.network,
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

  if (!info?.walletAddress) {
    return <div className="portal-card">Deposits are currently disabled.</div>;
  }

  const activeBanks = banks.filter((bank) => bank.status === 'active' && bank.isActive);

  return (
    <div>
      <div className="portal-page-head">
        <div>
          <h1>Deposit</h1>
          <p>Send USDT and submit your transaction for approval</p>
        </div>
      </div>

      <div className="portal-rate-banner">
        Current rate: <strong>1 USDT = {info.currentUsdtRate ? formatInr(info.currentUsdtRate) : 'Not set'}</strong>
        {Number(info.bonusRatio || 0) > 0 ? ` · Bonus ${info.bonusRatio}%` : ''}
      </div>

      {!info.depositsEnabled && (
        <div className="portal-card" style={{ marginBottom: 16 }}>
          USDT deposits are currently inactive. An admin must set an active USDT rate first.
        </div>
      )}

      <div className="portal-grid-2">
        <div>
          <div className="portal-card">
            <p className="portal-kicker">SEND USDT</p>
            <p style={{ color: 'var(--p-muted)', marginTop: 0 }}>
              Transfer USDT on {info.network} to the wallet below, then submit your transaction hash.
            </p>
            <label className="portal-label">Receiving Wallet</label>
            <input className="portal-input" value={info.walletAddress || ''} readOnly />
            <button type="button" className="portal-btn ghost sm" style={{ margin: '10px 0 12px' }} onClick={copyWallet}>
              Copy address
            </button>
            <div style={{ color: 'var(--p-muted)', fontSize: 13 }}>
              Min {info.minDeposit} USDT · Max {info.maxDeposit} USDT
            </div>
            {info.qrImage && (
              <img src={info.qrImage} alt="Wallet QR" style={{ maxWidth: 180, marginTop: 14, borderRadius: 12 }} />
            )}
          </div>

          <div className="portal-card">
            <p className="portal-kicker">UPI ACCOUNTS</p>
            {activeBanks.length === 0 ? (
              <div>
                <p style={{ color: 'var(--p-muted)', marginTop: 0 }}>
                  Activate a bank account to use it for UPI payments.
                </p>
                <Link className="portal-btn sm" to="/portal/banks">Manage Banks</Link>
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
                    className="portal-btn ghost sm"
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
        </div>

        <form className="portal-card flat" onSubmit={handleSubmit}>
          <p className="portal-kicker">SUBMIT TRANSACTION</p>
          <label className="portal-label">Amount (USDT)</label>
          <input
            className="portal-input"
            type="number"
            min={info.minDeposit}
            max={info.maxDeposit}
            step="0.01"
            value={amountUSDT}
            onChange={(e) => setAmountUSDT(e.target.value)}
            required
            disabled={!info.depositsEnabled}
          />
          {preview && (
            <div className="deposit-preview">
              <div>Converted: {formatInr(preview.convertedInrAmount)}</div>
              {preview.bonusAmount > 0 && <div>Bonus: {formatInr(preview.bonusAmount)}</div>}
              <div><strong>You will receive: {formatInr(preview.finalCreditAmount)}</strong></div>
              <div style={{ color: 'var(--p-muted)' }}>at 1 USDT = {formatInr(info.currentUsdtRate)}</div>
            </div>
          )}
          <div className="portal-error" />
          <label className="portal-label">Transaction Hash</label>
          <input
            className="portal-input"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            required
            disabled={!info.depositsEnabled}
          />
          <div className="portal-error" />
          <button type="submit" className="portal-btn block" disabled={submitting || !info.depositsEnabled}>
            {submitting ? 'Submitting…' : 'Submit Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Deposit;
