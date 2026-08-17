const express = require('express');
const PaymentRequest = require('../models/PaymentRequest');
const PaymentSetting = require('../models/PaymentSetting');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const { verifyAdmin, verifyUser } = require('../middleware/auth');
const blockchainService = require('../services/blockchain');

const router = express.Router();

// Get Payment Settings (Public)
router.get('/settings', async (req, res) => {
  try {
    let settings = await PaymentSetting.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = new PaymentSetting({
        network: 'TRC20',
        walletAddress: 'TYourWalletAddressHere',
        active: true,
        minAmount: 10,
        maxAmount: 10000
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Payment Settings (Admin only)
router.post('/settings', verifyAdmin, async (req, res) => {
  try {
    const { network, walletAddress, qrImage, active, minAmount, maxAmount } = req.body;

    let settings = await PaymentSetting.findOne();
    if (settings) {
      if (network) settings.network = network;
      if (walletAddress) settings.walletAddress = walletAddress;
      if (qrImage !== undefined) settings.qrImage = qrImage;
      if (active !== undefined) settings.active = !!active;
      if (minAmount !== undefined && minAmount !== '') settings.minAmount = Number(minAmount);
      if (maxAmount !== undefined && maxAmount !== '') settings.maxAmount = Number(maxAmount);
    } else {
      settings = new PaymentSetting({
        network,
        walletAddress,
        qrImage,
        active,
        minAmount,
        maxAmount
      });
    }

    await settings.save();
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit Payment (User only)
router.post('/', verifyUser, async (req, res) => {
  try {
    const { amountUSDT, txHash, network, bankAccountId } = req.body;

    if (!amountUSDT || !txHash) {
      return res.status(400).json({ error: 'Amount and Transaction Hash are required' });
    }

    // Get payment settings
    const settings = await PaymentSetting.findOne();
    if (!settings || !settings.active) {
      return res.status(400).json({ error: 'Payment system is currently inactive' });
    }

    // Validate amount
    if (amountUSDT < settings.minAmount) {
      return res.status(400).json({ 
        error: `Minimum amount is ${settings.minAmount} USDT` 
      });
    }
    if (amountUSDT > settings.maxAmount) {
      return res.status(400).json({ 
        error: `Maximum amount is ${settings.maxAmount} USDT` 
      });
    }

    // Check if transaction hash already used
    const existingPayment = await PaymentRequest.findOne({ txHash });
    if (existingPayment) {
      return res.status(400).json({ error: 'Transaction hash already submitted' });
    }

    let selectedBank = null;
    if (bankAccountId) {
      selectedBank = await BankAccount.findOne({
        _id: bankAccountId,
        userId: req.user._id,
        status: 'active',
        isActive: true
      });
      if (!selectedBank) {
        return res.status(400).json({ error: 'Select an active bank account for UPI payments' });
      }
    }

    // Create payment request
    const payment = new PaymentRequest({
      userId: req.user._id,
      amountUSDT,
      txHash,
      network: network || settings.network,
      status: 'pending',
      bankAccountId: selectedBank?._id
    });

    await payment.save();

    res.status(201).json({
      message: 'Payment submitted successfully',
      payment: {
        id: payment._id,
        amountUSDT: payment.amountUSDT,
        txHash: payment.txHash,
        network: payment.network,
        status: payment.status,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User's Payments (User only)
router.get('/my', verifyUser, async (req, res) => {
  try {
    const payments = await PaymentRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats (Admin only)
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const [totalUsers, totalPayments, pendingPayments, amountAgg] = await Promise.all([
      User.countDocuments(),
      PaymentRequest.countDocuments(),
      PaymentRequest.countDocuments({ status: 'pending' }),
      PaymentRequest.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amountUSDT' } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalPayments,
      pendingPayments,
      totalAmount: amountAgg[0]?.total || 0
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Payments (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await PaymentRequest.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PaymentRequest.countDocuments(query);

    res.json({
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single Payment (Admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const payment = await PaymentRequest.findById(req.params.id)
      .populate('userId', 'name email balance');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve Payment (Admin only)
router.patch('/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const payment = await PaymentRequest.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already reviewed' });
    }

    // Get payment settings for wallet address
    const settings = await PaymentSetting.findOne();
    if (!settings) {
      return res.status(400).json({ error: 'Payment settings not configured' });
    }

    const skipVerification =
      process.env.SKIP_BLOCKCHAIN_VERIFY === 'true' || req.body.skipVerification === true;

    if (!skipVerification) {
      const verification = await blockchainService.verifyTransaction(
        payment.txHash,
        payment.network || settings.network,
        payment.amountUSDT,
        settings.walletAddress
      );

      if (!verification.verified) {
        return res.status(400).json({
          error: `Blockchain verification failed: ${verification.error || 'Unknown error'}`
        });
      }

      payment.blockchainVerified = true;
      payment.verificationData = {
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        confirmedAmount: verification.amount,
        confirmations: verification.confirmations,
        verifiedAt: new Date()
      };
    }

    payment.status = 'approved';
    payment.reviewedAt = new Date();
    payment.adminNote = req.body.note || (skipVerification ? 'Manually approved by admin' : 'Approved by admin');

    await payment.save();

    // Update user balance
    const user = await User.findById(payment.userId);
    if (user) {
      user.balance = (user.balance || 0) + payment.amountUSDT;
      user.totalDeposited = (user.totalDeposited || 0) + payment.amountUSDT;
      await user.save();
    }

    res.json({
      message: 'Payment approved successfully',
      payment
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject Payment (Admin only)
router.patch('/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    
    const payment = await PaymentRequest.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already reviewed' });
    }

    payment.status = 'rejected';
    payment.adminNote = note || 'Rejected by admin';
    payment.reviewedAt = new Date();
    await payment.save();

    res.json({
      message: 'Payment rejected',
      payment
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;