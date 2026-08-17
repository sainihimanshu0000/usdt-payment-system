const express = require('express');
const BankAccount = require('../models/BankAccount');
const AuditLog = require('../models/AuditLog');
const { verifyUser, verifyAdmin } = require('../middleware/auth');
const { validateBankAccount, maskAccountNo } = require('../utils/bankValidation');

const router = express.Router();

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown';

const serialize = (doc, { revealAccountNo = false } = {}) => {
  const account = doc.toObject ? doc.toObject() : doc;
  const user =
    account.userId && typeof account.userId === 'object' && account.userId._id
      ? {
          id: account.userId._id,
          name: account.userId.name,
          email: account.userId.email
        }
      : null;

  const payload = {
    id: account._id,
    userId: user ? user.id : account.userId,
    user,
    accountNoMasked: maskAccountNo(account.accountNo),
    upiId: account.upiId,
    accountHolderName: account.accountHolderName,
    ifscCode: account.ifscCode,
    bankName: account.bankName,
    bankBranch: account.bankBranch,
    bankAddress: account.bankAddress,
    countryCode: account.countryCode,
    phoneNo: account.phoneNo,
    status: account.status,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
  if (revealAccountNo) payload.accountNo = account.accountNo;
  return payload;
};

const findOwned = async (id, userId) =>
  BankAccount.findOne({ _id: id, userId });

const duplicateError = async (userId, data, excludeId) => {
  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const [accountDup, upiDup] = await Promise.all([
    BankAccount.findOne({ userId, accountNo: data.accountNo, ...query }),
    BankAccount.findOne({ userId, upiId: data.upiId, ...query })
  ]);
  const errors = {};
  if (accountDup) errors.accountNo = 'This account number is already added';
  if (upiDup) errors.upiId = 'This UPI ID is already added';
  return errors;
};

const logStatusChange = async (req, account, fromStatus, toStatus) => {
  await AuditLog.create({
    userId: req.user?._id || account.userId,
    entityType: 'bank_account',
    entityId: account._id,
    action: 'status_change',
    fromStatus,
    toStatus,
    metadata: {
      isActive: account.isActive,
      bankName: account.bankName,
      upiId: account.upiId,
      changedBy: req.admin ? 'admin' : 'user',
      adminId: req.admin?._id
    },
    ip: clientIp(req)
  });
};

const groupByUser = (accounts) => {
  const map = new Map();
  accounts.forEach((account) => {
    const key = String(account.userId);
    if (!map.has(key)) {
      map.set(key, {
        user: account.user || { id: account.userId, name: 'Unknown', email: '' },
        accounts: []
      });
    }
    map.get(key).accounts.push(account);
  });
  return Array.from(map.values());
};

// Admin: list all bank accounts, optionally filtered by user
router.get('/admin', verifyAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const status = String(req.query.status || '').toLowerCase();
    if (['pending', 'active', 'inactive', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const accounts = await BankAccount.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const serialized = accounts.map((item) => serialize(item, { revealAccountNo: true }));
    res.json({
      total: serialized.length,
      groups: groupByUser(serialized),
      accounts: serialized
    });
  } catch (error) {
    console.error('Admin list bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: update bank account status (approve / reject / activate / deactivate)
router.patch('/admin/:id/status', verifyAdmin, async (req, res) => {
  try {
    const nextStatus = String(req.body.status || '').toLowerCase();
    if (!['pending', 'active', 'inactive', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const account = await BankAccount.findById(req.params.id).populate('userId', 'name email');
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const fromStatus = account.status;
    account.status = nextStatus;
    account.isActive = nextStatus === 'active';
    await account.save();
    await logStatusChange(req, account, fromStatus, nextStatus);

    res.json({
      message: `Bank account marked as ${nextStatus}`,
      bankAccount: serialize(account, { revealAccountNo: true })
    });
  } catch (error) {
    console.error('Admin update bank status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', verifyUser, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    const status = String(req.query.status || '').toLowerCase();
    if (['pending', 'active', 'inactive', 'rejected'].includes(status)) {
      filter.status = status;
    }
    if (req.query.active === 'true' || status === 'active') {
      filter.status = 'active';
      filter.isActive = true;
    }

    const accounts = await BankAccount.find(filter).sort({ createdAt: -1 });
    res.json(accounts.map((item) => serialize(item)));
  } catch (error) {
    console.error('List bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/active', verifyUser, async (req, res) => {
  try {
    const accounts = await BankAccount.find({
      userId: req.user._id,
      status: 'active',
      isActive: true
    }).sort({ updatedAt: -1 });
    res.json(accounts.map((item) => serialize(item)));
  } catch (error) {
    console.error('List active bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', verifyUser, async (req, res) => {
  try {
    const account = await findOwned(req.params.id, req.user._id);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    res.json(serialize(account, { revealAccountNo: true }));
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', verifyUser, async (req, res) => {
  try {
    const { data, errors, valid } = validateBankAccount(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const duplicates = await duplicateError(req.user._id, data);
    if (Object.keys(duplicates).length) {
      return res.status(409).json({ error: 'Duplicate bank account', errors: duplicates });
    }

    const account = await BankAccount.create({
      ...data,
      userId: req.user._id,
      status: 'pending',
      isActive: false
    });

    res.status(201).json({
      message: 'Bank account added successfully',
      bankAccount: serialize(account)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'This account number or UPI ID is already added',
        errors: { accountNo: 'Duplicate account details' }
      });
    }
    console.error('Add bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', verifyUser, async (req, res) => {
  try {
    const account = await findOwned(req.params.id, req.user._id);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const { data, errors, valid } = validateBankAccount(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const duplicates = await duplicateError(req.user._id, data, account._id);
    if (Object.keys(duplicates).length) {
      return res.status(409).json({ error: 'Duplicate bank account', errors: duplicates });
    }

    const sensitiveChanged =
      account.accountNo !== data.accountNo ||
      account.upiId !== data.upiId ||
      account.ifscCode !== data.ifscCode;

    Object.assign(account, data);
    if (sensitiveChanged && account.status === 'active') {
      account.status = 'pending';
      account.isActive = false;
    }
    await account.save();

    res.json({
      message: 'Bank account updated successfully',
      bankAccount: serialize(account, { revealAccountNo: true })
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This account number or UPI ID is already added' });
    }
    console.error('Update bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', verifyUser, async (req, res) => {
  try {
    const nextStatus = String(req.body.status || '').toLowerCase();
    if (!['active', 'inactive'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    const account = await findOwned(req.params.id, req.user._id);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    if (account.status === 'rejected') {
      return res.status(400).json({ error: 'Rejected bank accounts cannot be activated' });
    }

    const fromStatus = account.status;
    account.status = nextStatus;
    account.isActive = nextStatus === 'active';
    await account.save();
    await logStatusChange(req, account, fromStatus, nextStatus);

    const message =
      nextStatus === 'active'
        ? 'Bank account activated successfully'
        : 'Bank account deactivated successfully';

    res.json({
      message,
      bankAccount: serialize(account)
    });
  } catch (error) {
    console.error('Update bank account status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', verifyUser, async (req, res) => {
  try {
    const account = await findOwned(req.params.id, req.user._id);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    await account.deleteOne();
    await AuditLog.create({
      userId: req.user._id,
      entityType: 'bank_account',
      entityId: account._id,
      action: 'delete',
      fromStatus: account.status,
      metadata: { bankName: account.bankName, upiId: account.upiId },
      ip: clientIp(req)
    });

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
