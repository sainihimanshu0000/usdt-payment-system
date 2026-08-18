const PaymentRequest = require('../models/PaymentRequest');
const PaymentSetting = require('../models/PaymentSetting');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const WalletLedger = require('../models/WalletLedger');
const { getActiveRate, calculateDepositCredit } = require('./usdtRate');
const { creditWallet } = require('./walletService');

const submitUsdtDeposit = async ({ user, amountUsdt, txHash, network, bankAccountId }) => {
  const amount = Number(amountUsdt);
  const hash = String(txHash || '').trim();

  if (!amount || amount <= 0 || !hash) {
    const error = new Error('Amount and Transaction Hash are required');
    error.status = 400;
    throw error;
  }

  const [settings, rate] = await Promise.all([
    PaymentSetting.findOne(),
    getActiveRate()
  ]);

  if (!settings || settings.active === false) {
    const error = new Error('Payment system is currently inactive');
    error.status = 400;
    throw error;
  }

  if (!rate) {
    const error = new Error('USDT rate is not configured or inactive');
    error.status = 400;
    throw error;
  }

  const minAmount = rate.minDeposit != null ? Number(rate.minDeposit) : Number(settings.minAmount);
  const maxAmount = rate.maxDeposit != null ? Number(rate.maxDeposit) : Number(settings.maxAmount);

  if (Number.isFinite(minAmount) && amount < minAmount) {
    const error = new Error(`Minimum amount is ${minAmount} USDT`);
    error.status = 400;
    throw error;
  }
  if (Number.isFinite(maxAmount) && amount > maxAmount) {
    const error = new Error(`Maximum amount is ${maxAmount} USDT`);
    error.status = 400;
    throw error;
  }

  const existingPayment = await PaymentRequest.findOne({ txHash: hash });
  if (existingPayment) {
    const error = new Error('Transaction hash already submitted');
    error.status = 400;
    throw error;
  }

  let selectedBank = null;
  if (bankAccountId) {
    selectedBank = await BankAccount.findOne({
      _id: bankAccountId,
      userId: user._id,
      status: 'active',
      isActive: true
    });
    if (!selectedBank) {
      const error = new Error('Select an active bank account for UPI payments');
      error.status = 400;
      throw error;
    }
  }

  const credit = calculateDepositCredit(amount, rate);

  const payment = new PaymentRequest({
    userId: user._id,
    amountUSDT: amount,
    txHash: hash,
    network: network || settings.network,
    status: 'pending',
    bankAccountId: selectedBank?._id,
    walletAddress: settings.walletAddress || '',
    rateInr: credit.rateInr,
    bonusRatio: credit.bonusRatio,
    convertedInrAmount: credit.convertedInrAmount,
    bonusAmount: credit.bonusAmount,
    finalCreditAmount: credit.finalCreditAmount
  });

  try {
    await payment.save();
  } catch (err) {
    if (err && err.code === 11000) {
      const error = new Error('Transaction hash already submitted');
      error.status = 400;
      throw error;
    }
    throw err;
  }
  return payment;
};

const creditApprovedDeposit = async (payment) => {
  if (payment.credited) return payment;

  if (!(Number(payment.rateInr) > 0)) {
    const activeRate = await getActiveRate();
    if (!activeRate) {
      const error = new Error('USDT rate is not configured or inactive');
      error.status = 400;
      throw error;
    }
    const credit = calculateDepositCredit(payment.amountUSDT, activeRate);
    payment.rateInr = credit.rateInr;
    payment.bonusRatio = credit.bonusRatio;
    payment.convertedInrAmount = credit.convertedInrAmount;
    payment.bonusAmount = credit.bonusAmount;
    payment.finalCreditAmount = credit.finalCreditAmount;
  }

  const user = await User.findById(payment.userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const existing = await WalletLedger.find({
    referenceId: payment._id,
    referenceType: 'crypto_deposit'
  });
  const hasInr = existing.some((row) => row.currency === 'INR');
  const hasUsdt = existing.some((row) => row.currency === 'USDT');

  if (!hasInr) {
    await creditWallet({
      userId: user._id,
      currency: 'INR',
      amount: payment.finalCreditAmount,
      type: 'usdt_deposit',
      referenceType: 'crypto_deposit',
      referenceId: payment._id,
      remark: `USDT deposit ${payment.amountUSDT} @ ₹${payment.rateInr}`
    });
  }

  if (!hasUsdt) {
    await creditWallet({
      userId: user._id,
      currency: 'USDT',
      amount: payment.amountUSDT,
      type: 'usdt_deposit',
      referenceType: 'crypto_deposit',
      referenceId: payment._id,
      remark: `USDT deposit ${payment.txHash}`
    });

    user.balance = Number(((user.balance || 0) + Number(payment.amountUSDT)).toFixed(2));
    user.totalDeposited = Number(((user.totalDeposited || 0) + Number(payment.amountUSDT)).toFixed(2));
    await user.save();
  }

  payment.credited = true;
  payment.confirmedAt = payment.confirmedAt || new Date();
  await payment.save();
  return payment;
};

module.exports = {
  submitUsdtDeposit,
  creditApprovedDeposit
};
