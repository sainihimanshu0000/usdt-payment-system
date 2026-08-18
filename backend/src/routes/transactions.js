const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const WalletLedger = require('../models/WalletLedger');
const AdminAuditLog = require('../models/AdminAuditLog');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const BankAccount = require('../models/BankAccount');
const { verifyAdmin, verifyUser } = require('../middleware/auth');
const { getRequestMeta, makeTxnId } = require('../utils/requestMeta');
const { debitWallet, getOrCreateWallet, roundAmount } = require('../services/walletService');
const { getCurrentRate } = require('../services/usdtRate');

const router = express.Router();

const UTR_RE = /^[A-Z0-9]{8,22}$/;
const STATUS_LABELS = {
  pending_user_approval: 'Pending User Approval',
  approved_by_user: 'Approved by User',
  rejected_by_user: 'Rejected by User',
  success: 'Success',
  failed: 'Failed'
};

const isSuperAdmin = (admin) =>
  admin?.role === 'super_admin' || admin?.canApproveOnBehalf === true;

const notify = async ({ recipientType, recipientId, title, message, referenceId }) => {
  await Notification.create({
    recipientType,
    recipientId,
    title,
    message,
    module: 'transactions',
    referenceId
  });
};

const writeAdminAudit = async ({ adminId, userId, action, referenceId, oldStatus, newStatus, ip, device, metadata }) => {
  await AdminAuditLog.create({
    adminId: adminId || undefined,
    userId,
    action,
    module: 'transactions',
    referenceId,
    oldStatus,
    newStatus,
    metadata: metadata || {},
    ip,
    device
  });
};

const serialize = (doc) => {
  const txn = doc.toObject ? doc.toObject() : doc;
  const user = txn.userId && typeof txn.userId === 'object' && txn.userId._id ? txn.userId : null;
  const admin = txn.createdByAdminId && typeof txn.createdByAdminId === 'object' && txn.createdByAdminId._id
    ? txn.createdByAdminId
    : null;

  return {
    id: txn._id,
    txnId: txn.txnId,
    userId: user ? user._id : txn.userId,
    userName: user?.name || '',
    userEmail: user?.email || '',
    mobileNumber: user?.phone || txn.mobileNumber || '',
    amount: txn.amount,
    inrAmount: txn.inrAmount != null ? txn.inrAmount : txn.amount,
    currency: 'INR',
    utrNumber: txn.utrNumber,
    paymentMode: txn.paymentMode,
    status: txn.status,
    statusLabel: STATUS_LABELS[txn.status] || txn.status,
    adminRemark: txn.adminRemark || '',
    userRejectionReason: txn.userRejectionReason || '',
    balanceBefore: txn.balanceBefore,
    balanceAfter: txn.balanceAfter,
    createdByAdminId: admin ? admin._id : txn.createdByAdminId,
    createdByAdmin: admin?.name || admin?.email || '',
    userActionAt: txn.userActionAt || null,
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt
  };
};

const attachMobile = async (rows) => {
  const missing = rows.filter((row) => !row.mobileNumber && row.userId);
  if (!missing.length) return rows;
  const userIds = [...new Set(missing.map((row) => String(row.userId)))];
  const banks = await BankAccount.find({ userId: { $in: userIds } })
    .sort({ updatedAt: -1 })
    .select('userId phoneNo countryCode');
  const phoneByUser = new Map();
  banks.forEach((bank) => {
    const key = String(bank.userId);
    if (!phoneByUser.has(key)) {
      phoneByUser.set(key, `${bank.countryCode || ''} ${bank.phoneNo || ''}`.trim());
    }
  });
  return rows.map((row) => ({
    ...row,
    mobileNumber: row.mobileNumber || phoneByUser.get(String(row.userId)) || ''
  }));
};

const payoutAmounts = async (inrAmount) => {
  const rate = await getCurrentRate();
  const rateInr = Number(rate?.rateInr || 0);
  const amount = roundAmount(inrAmount);
  return {
    inrAmount: amount,
    usdtAmount: rateInr > 0 ? roundAmount(amount / rateInr) : 0,
    rateInr
  };
};

const withPayoutPreview = async (rows) => {
  return rows.map((row) => ({
    ...row,
    currency: 'INR',
    inrAmount: roundAmount(row.amount)
  }));
};

const debitDepositBalance = async ({ user, txn, remark }) => {
  const already = await WalletLedger.findOne({
    transactionId: txn._id,
    direction: 'debit',
    currency: 'INR'
  });
  if (already) {
    return {
      balanceBefore: already.balanceBefore,
      balanceAfter: already.balanceAfter,
      inrAmount: already.amount
    };
  }

  const { usdtAmount, inrAmount, rateInr } = await payoutAmounts(txn.amount);
  const inrWallet = await getOrCreateWallet(user._id, 'INR');
  const available = roundAmount(inrWallet.availableBalance);
  if (available < inrAmount) {
    const error = new Error(
      `Insufficient deposit balance. Available ₹${available.toLocaleString('en-IN')}, required ₹${inrAmount.toLocaleString('en-IN')}`
    );
    error.status = 400;
    throw error;
  }

  const inrResult = await debitWallet({
    userId: user._id,
    currency: 'INR',
    amount: inrAmount,
    type: 'debit',
    transactionId: txn._id,
    referenceType: 'payout',
    referenceId: txn._id,
    remark: remark || `Payout UTR ${txn.utrNumber}`
  });

  const usdtWallet = await getOrCreateWallet(user._id, 'USDT');
  const usdtDebit = Math.min(usdtAmount, roundAmount(usdtWallet.availableBalance));
  if (usdtDebit > 0) {
    await debitWallet({
      userId: user._id,
      currency: 'USDT',
      amount: usdtDebit,
      type: 'debit',
      transactionId: txn._id,
      referenceType: 'payout',
      referenceId: txn._id,
      remark: remark || `Payout UTR ${txn.utrNumber}`
    });
  }

  user.balance = roundAmount(Math.max(0, Number(user.balance || 0) - usdtDebit));
  await user.save();

  return {
    balanceBefore: inrResult.balanceBefore,
    balanceAfter: inrResult.balanceAfter,
    inrAmount,
    usdtAmount: usdtDebit,
    rateInr
  };
};

const populateTxn = (query) =>
  query
    .populate('userId', 'name email phone')
    .populate('createdByAdminId', 'name email');

// --- Admin ---
router.post('/admin/transactions', verifyAdmin, async (req, res) => {
  try {
    const { userId, amount, utrNumber, paymentMode, remark } = req.body;
    const { ip, device } = getRequestMeta(req);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Select a valid user' });
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    const utr = String(utrNumber || '').trim().toUpperCase();
    if (!UTR_RE.test(utr)) {
      return res.status(400).json({ error: 'UTR number must be 8–22 letters or digits' });
    }
    const mode = String(paymentMode || 'upi').toLowerCase();
    if (!Transaction.PAYMENT_MODES.includes(mode)) {
      return res.status(400).json({ error: 'Invalid payment mode' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'disabled') {
      return res.status(400).json({ error: 'Cannot create a transaction for a disabled user' });
    }

    const existingUtr = await Transaction.findOne({ utrNumber: utr });
    if (existingUtr) {
      return res.status(409).json({ error: 'This UTR number is already used' });
    }

    const txn = await Transaction.create({
      txnId: makeTxnId(),
      userId: user._id,
      amount: numericAmount,
      utrNumber: utr,
      paymentMode: mode,
      status: 'pending_user_approval',
      adminRemark: String(remark || '').trim(),
      createdByAdminId: req.admin._id
    });

    await writeAdminAudit({
      adminId: req.admin._id,
      userId: user._id,
      action: 'create_transaction_request',
      referenceId: txn._id,
      oldStatus: null,
      newStatus: 'pending_user_approval',
      ip,
      device,
      metadata: { amount: numericAmount, utrNumber: utr, paymentMode: mode }
    });

    await notify({
      recipientType: 'user',
      recipientId: user._id,
      title: 'New transaction approval request received.',
      message: `A ₹${numericAmount} payment (UTR ${utr}) is waiting for your approval. Approving will deduct it from your deposit balance.`,
      referenceId: txn._id
    });

    const populated = await populateTxn(Transaction.findById(txn._id));
    res.status(201).json({
      success: true,
      message: 'Transaction sent to user for approval',
      transaction: serialize(populated)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This UTR number is already used' });
    }
    console.error('Admin create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/transactions', verifyAdmin, async (req, res) => {
  try {
    const filter = {};
    const status = String(req.query.status || '').toLowerCase();
    if (Transaction.STATUSES.includes(status)) filter.status = status;
    if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      filter.userId = req.query.userId;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { txnId: new RegExp(q, 'i') },
        { utrNumber: new RegExp(q, 'i') }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      populateTxn(Transaction.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter)
    ]);

    const accounts = await withPayoutPreview(await attachMobile(rows.map(serialize)));
    res.json({
      transactions: accounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin list transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/transactions/:id', verifyAdmin, async (req, res) => {
  try {
    const txn = await populateTxn(Transaction.findById(req.params.id));
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    const [serialized] = await attachMobile([serialize(txn)]);
    const ledger = await WalletLedger.find({ transactionId: txn._id }).sort({ createdAt: -1 });
    res.json({ transaction: serialized, ledger });
  } catch (error) {
    console.error('Admin get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admin/transactions/:id/approve', verifyAdmin, async (req, res) => {
  try {
    if (!isSuperAdmin(req.admin)) {
      return res.status(403).json({ error: 'Only a super admin can approve on behalf of a user' });
    }

    const { ip, device } = getRequestMeta(req);
    const claimed = await Transaction.findOneAndUpdate(
      { _id: req.params.id, status: 'pending_user_approval' },
      {
        $set: {
          status: 'approved_by_user',
          userActionAt: new Date(),
          userActionIp: ip,
          userActionDevice: `admin:${device}`
        }
      },
      { new: true }
    );

    if (!claimed) {
      return res.status(409).json({ error: 'Transaction is already processed' });
    }

    const user = await User.findById(claimed.userId);
    if (!user) {
      claimed.status = 'failed';
      claimed.failureReason = 'User not found while debiting deposit balance';
      await claimed.save();
      return res.status(404).json({ error: 'User not found' });
    }

    let debitResult;
    try {
      debitResult = await debitDepositBalance({
        user,
        txn: claimed,
        remark: claimed.adminRemark || 'Payout after super-admin approval'
      });
    } catch (debitError) {
      claimed.status = 'pending_user_approval';
      claimed.userActionAt = undefined;
      claimed.userActionIp = undefined;
      claimed.userActionDevice = undefined;
      await claimed.save();
      return res.status(debitError.status || 500).json({ error: debitError.message || 'Failed to deduct deposit balance' });
    }

    claimed.balanceBefore = debitResult.balanceBefore;
    claimed.balanceAfter = debitResult.balanceAfter;
    claimed.status = 'success';
    await claimed.save();

    await writeAdminAudit({
      adminId: req.admin._id,
      userId: user._id,
      action: 'approve_on_behalf',
      referenceId: claimed._id,
      oldStatus: 'pending_user_approval',
      newStatus: 'success',
      ip,
      device
    });

    await notify({
      recipientType: 'user',
      recipientId: user._id,
      title: 'Transaction approved',
      message: `Your ₹${claimed.amount} payment was approved and deducted from your deposit balance.`,
      referenceId: claimed._id
    });

    const populated = await populateTxn(Transaction.findById(claimed._id));
    res.json({
      success: true,
      message: 'Transaction approved successfully',
      transaction: serialize(populated)
    });
  } catch (error) {
    console.error('Admin approve-on-behalf error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- User ---
router.get('/user/transactions/pending-approval', verifyUser, async (req, res) => {
  try {
    const rows = await populateTxn(
      Transaction.find({ userId: req.user._id, status: 'pending_user_approval' })
    ).sort({ createdAt: -1 });
    const list = await withPayoutPreview(await attachMobile(rows.map(serialize)));
    res.json(list);
  } catch (error) {
    console.error('User pending transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/transactions', verifyUser, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    const status = String(req.query.status || '').toLowerCase();
    if (Transaction.STATUSES.includes(status)) filter.status = status;
    const rows = await populateTxn(Transaction.find(filter)).sort({ createdAt: -1 });
    res.json(await withPayoutPreview(await attachMobile(rows.map(serialize))));
  } catch (error) {
    console.error('User list transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/user/transactions/:id/approve', verifyUser, async (req, res) => {
  try {
    const { ip, device } = getRequestMeta(req);
    const claimed = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        status: 'pending_user_approval'
      },
      {
        $set: {
          status: 'approved_by_user',
          userActionAt: new Date(),
          userActionIp: ip,
          userActionDevice: device
        }
      },
      { new: true }
    );

    if (!claimed) {
      const existing = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
      if (!existing) return res.status(404).json({ error: 'Transaction not found' });
      return res.status(409).json({ error: 'Duplicate approval is not allowed' });
    }

    const user = await User.findById(req.user._id);
    let debitResult;
    try {
      debitResult = await debitDepositBalance({
        user,
        txn: claimed,
        remark: claimed.adminRemark || `UTR ${claimed.utrNumber}`
      });
    } catch (debitError) {
      claimed.status = 'pending_user_approval';
      claimed.userActionAt = undefined;
      claimed.userActionIp = undefined;
      claimed.userActionDevice = undefined;
      await claimed.save();
      return res.status(debitError.status || 500).json({
        error: debitError.message || 'Failed to deduct deposit balance'
      });
    }

    claimed.balanceBefore = debitResult.balanceBefore;
    claimed.balanceAfter = debitResult.balanceAfter;
    claimed.status = 'success';
    await claimed.save();

    await AuditLog.create({
      userId: user._id,
      entityType: 'transaction',
      entityId: claimed._id,
      action: 'approve',
      fromStatus: 'pending_user_approval',
      toStatus: 'success',
      metadata: { amount: claimed.amount, inrAmount: debitResult.inrAmount, utrNumber: claimed.utrNumber, ip, device },
      ip
    });

    await writeAdminAudit({
      adminId: claimed.createdByAdminId,
      userId: user._id,
      action: 'user_approved_transaction',
      referenceId: claimed._id,
      oldStatus: 'pending_user_approval',
      newStatus: 'success',
      ip,
      device
    });

    await notify({
      recipientType: 'admin',
      recipientId: claimed.createdByAdminId,
      title: 'User approved the transaction.',
      message: `${user.name} approved ₹${claimed.amount} (UTR ${claimed.utrNumber}). Deposit balance deducted.`,
      referenceId: claimed._id
    });

    res.json({
      success: true,
      message: 'Transaction approved successfully',
      balance: debitResult.balanceAfter,
      inrBalance: debitResult.balanceAfter,
      inrAmount: debitResult.inrAmount
    });
  } catch (error) {
    console.error('User approve transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/user/transactions/:id/reject', verifyUser, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const { ip, device } = getRequestMeta(req);
    const claimed = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        status: 'pending_user_approval'
      },
      {
        $set: {
          status: 'rejected_by_user',
          userRejectionReason: reason,
          userActionAt: new Date(),
          userActionIp: ip,
          userActionDevice: device
        }
      },
      { new: true }
    );

    if (!claimed) {
      const existing = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
      if (!existing) return res.status(404).json({ error: 'Transaction not found' });
      return res.status(409).json({ error: 'Duplicate rejection is not allowed' });
    }

    await AuditLog.create({
      userId: req.user._id,
      entityType: 'transaction',
      entityId: claimed._id,
      action: 'reject',
      fromStatus: 'pending_user_approval',
      toStatus: 'rejected_by_user',
      metadata: { reason, ip, device },
      ip
    });

    await writeAdminAudit({
      adminId: claimed.createdByAdminId,
      userId: req.user._id,
      action: 'user_rejected_transaction',
      referenceId: claimed._id,
      oldStatus: 'pending_user_approval',
      newStatus: 'rejected_by_user',
      ip,
      device,
      metadata: { reason }
    });

    await notify({
      recipientType: 'admin',
      recipientId: claimed.createdByAdminId,
      title: 'User rejected the transaction.',
      message: `${req.user.name} rejected ₹${claimed.amount} (UTR ${claimed.utrNumber}). Reason: ${reason}`,
      referenceId: claimed._id
    });

    res.json({
      success: true,
      message: 'Transaction rejected successfully'
    });
  } catch (error) {
    console.error('User reject transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
