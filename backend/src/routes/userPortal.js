const express = require('express');
const PaymentRequest = require('../models/PaymentRequest');
const PaymentSetting = require('../models/PaymentSetting');
const { verifyUser } = require('../middleware/auth');
const { getCurrentRate, serializeRate, isUsableRate } = require('../services/usdtRate');
const { getWalletBalances } = require('../services/walletService');
const { submitUsdtDeposit } = require('../services/usdtDeposit');

const router = express.Router();

router.get('/dashboard', verifyUser, async (req, res) => {
  try {
    let balances = { inrBalance: 0, usdtBalance: 0 };
    try {
      balances = await getWalletBalances(req.user._id);
    } catch (walletError) {
      console.error('Get wallet balances error:', walletError);
    }

    const [rate, bonusAgg] = await Promise.all([
      getCurrentRate(),
      PaymentRequest.aggregate([
        { $match: { userId: req.user._id, status: 'approved' } },
        {
          $group: {
            _id: null,
            bonusAmount: { $sum: '$bonusAmount' }
          }
        }
      ])
    ]);

    const serialized = serializeRate(rate);

    res.json({
      inrBalance: balances.inrBalance,
      usdtBalance: balances.usdtBalance,
      currentUsdtRate: serialized.rateInr || 0,
      bonusRatio: serialized.bonusRatio || 0,
      availableQuota: balances.inrBalance,
      bonusAmount: Number(bonusAgg[0]?.bonusAmount || 0)
    });
  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/deposit/usdt-info', verifyUser, async (req, res) => {
  try {
    const [paymentSettings, rate] = await Promise.all([
      PaymentSetting.findOne(),
      getCurrentRate()
    ]);
    const serialized = serializeRate(rate);
    const paymentsEnabled = !paymentSettings || paymentSettings.active !== false;
    const rateEnabled = isUsableRate(rate);

    res.json({
      walletAddress: paymentSettings?.walletAddress || '',
      network: paymentSettings?.network || 'TRC20',
      qrImage: paymentSettings?.qrImage || '',
      depositsEnabled: paymentsEnabled && rateEnabled,
      currentUsdtRate: serialized.rateInr || 0,
      bonusRatio: serialized.bonusRatio || 0,
      minDeposit: serialized.minDeposit != null ? serialized.minDeposit : (paymentSettings?.minAmount ?? 10),
      maxDeposit: serialized.maxDeposit != null ? serialized.maxDeposit : (paymentSettings?.maxAmount ?? 10000)
    });
  } catch (error) {
    console.error('Get USDT deposit info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/deposit/usdt', verifyUser, async (req, res) => {
  try {
    const amountUsdt = req.body.amountUsdt ?? req.body.amountUSDT;
    const payment = await submitUsdtDeposit({
      user: req.user,
      amountUsdt,
      txHash: req.body.txHash,
      network: req.body.network,
      bankAccountId: req.body.bankAccountId
    });

    res.status(201).json({
      message: 'Payment submitted successfully',
      payment: {
        id: payment._id,
        amountUsdt: payment.amountUSDT,
        amountUSDT: payment.amountUSDT,
        txHash: payment.txHash,
        network: payment.network,
        status: payment.status,
        rateInr: payment.rateInr,
        bonusRatio: payment.bonusRatio,
        convertedInrAmount: payment.convertedInrAmount,
        bonusAmount: payment.bonusAmount,
        finalCreditAmount: payment.finalCreditAmount,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error('Submit USDT deposit error:', error);
    }
    res.status(status).json({ error: error.message || 'Internal server error' });
  }
});

const transactionRoutes = require('./transactions');
router.use((req, res, next) => {
  const path = req.path || '';
  if (!path.startsWith('/transactions')) {
    if (typeof next === 'function') return next();
    return res.status(404).json({ error: 'Not found' });
  }

  const previousUrl = req.url;
  req.url = '/user' + (previousUrl.startsWith('/') ? previousUrl : `/${previousUrl}`);
  transactionRoutes(req, res, (err) => {
    req.url = previousUrl;
    if (err) {
      if (typeof next === 'function') return next(err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
    if (!res.headersSent && typeof next === 'function') return next();
    if (!res.headersSent) return res.status(404).json({ error: 'Not found' });
  });
});

module.exports = router;
