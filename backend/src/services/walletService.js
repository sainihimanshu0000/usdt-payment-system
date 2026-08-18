const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');

const roundAmount = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
};

const getOrCreateWallet = async (userId, currency) => {
  const code = String(currency || '').toUpperCase();
  let wallet = await Wallet.findOne({ userId, currency: code });
  if (wallet) return wallet;

  try {
    wallet = await Wallet.create({
      userId,
      currency: code,
      availableBalance: 0,
      lockedBalance: 0,
      totalBalance: 0
    });
    return wallet;
  } catch (err) {
    if (err && err.code === 11000) {
      return Wallet.findOne({ userId, currency: code });
    }
    throw err;
  }
};

const creditWallet = async ({
  userId,
  currency,
  amount,
  type,
  transactionId,
  referenceType,
  referenceId,
  remark
}) => {
  const amt = roundAmount(amount);
  if (amt <= 0) {
    throw new Error('Credit amount must be greater than 0');
  }

  const wallet = await getOrCreateWallet(userId, currency);
  const balanceBefore = roundAmount(wallet.availableBalance);
  const balanceAfter = roundAmount(balanceBefore + amt);

  wallet.availableBalance = balanceAfter;
  wallet.totalBalance = roundAmount(Number(wallet.lockedBalance || 0) + balanceAfter);
  await wallet.save();

  await WalletLedger.create({
    userId,
    transactionId: transactionId || undefined,
    type: type || 'deposit',
    transactionType: type || 'deposit',
    currency: String(currency).toUpperCase(),
    direction: 'credit',
    amount: amt,
    balanceBefore,
    balanceAfter,
    referenceType: referenceType || '',
    referenceId: referenceId || undefined,
    remark: remark || ''
  });

  return { wallet, balanceBefore, balanceAfter };
};

const getWalletBalances = async (userId) => {
  const [inrWallet, usdtWallet] = await Promise.all([
    getOrCreateWallet(userId, 'INR'),
    getOrCreateWallet(userId, 'USDT')
  ]);

  return {
    inrBalance: roundAmount(inrWallet.availableBalance),
    usdtBalance: roundAmount(usdtWallet.availableBalance),
    inrLocked: roundAmount(inrWallet.lockedBalance),
    usdtLocked: roundAmount(usdtWallet.lockedBalance)
  };
};

module.exports = {
  roundAmount,
  getOrCreateWallet,
  creditWallet,
  getWalletBalances
};
