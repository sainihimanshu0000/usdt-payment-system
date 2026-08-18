const express = require('express');
const PaymentRequest = require('../models/PaymentRequest');
const PaymentSetting = require('../models/PaymentSetting');
const { verifyUser } = require('../middleware/auth');
const { getActiveRate, serializeRate } = require('../services/usdtRate');
const { getWalletBalances } = require('../services/walletService');
const { submitUsdtDeposit } = require('../services/usdtDeposit');

const router = express.Router();

router.get('/dashboard', verifyUser, async (req, res) => {
  try {
    const [balances, rate, bonusAgg] = await Promise.all([
      getWalletBalances(req.user._id),
      getActiveRate(),
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
      getActiveRate()
    ]);
    const serialized = serializeRate(rate);

    res.json({
      walletAddress: paymentSettings?.walletAddress || '',
      network: paymentSettings?.network || 'TRC20',
      qrImage: paymentSettings?.qrImage || '',
      depositsEnabled: Boolean(paymentSettings?.active) && serialized.status === 'active' && serialized.rateInr > 0,
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

module.exports = router;
