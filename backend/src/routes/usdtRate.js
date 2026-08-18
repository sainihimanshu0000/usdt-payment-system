const express = require('express');
const UsdtRateSetting = require('../models/UsdtRateSetting');
const UsdtRateHistory = require('../models/UsdtRateHistory');
const AdminAuditLog = require('../models/AdminAuditLog');
const { verifyAdmin } = require('../middleware/auth');
const { serializeRate, getCurrentRate } = require('../services/usdtRate');
const { getRequestMeta } = require('../utils/requestMeta');

const router = express.Router();

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

router.get('/usdt-rate', verifyAdmin, async (req, res) => {
  try {
    const settings = await getCurrentRate();
    res.json(serializeRate(settings));
  } catch (error) {
    console.error('Get USDT rate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/usdt-rate/history', verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      UsdtRateHistory.find()
        .populate('updatedByAdminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UsdtRateHistory.countDocuments()
    ]);

    res.json({
      history: rows.map((row) => {
        const admin = row.updatedByAdminId && typeof row.updatedByAdminId === 'object'
          ? row.updatedByAdminId
          : null;
        return {
          id: row._id,
          oldRate: Number(row.oldRate || 0),
          newRate: Number(row.newRate || 0),
          oldBonusRatio: Number(row.oldBonusRatio || 0),
          newBonusRatio: Number(row.newBonusRatio || 0),
          updatedByAdminId: admin ? admin._id : row.updatedByAdminId,
          updatedBy: admin ? (admin.name || admin.email || 'Admin') : 'Admin',
          createdAt: row.createdAt
        };
      }),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Get USDT rate history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/usdt-rate', verifyAdmin, async (req, res) => {
  try {
    const rateInr = Number(req.body.rateInr);
    const bonusRatioRaw = req.body.bonusRatio;
    const bonusRatio = bonusRatioRaw === undefined || bonusRatioRaw === null || bonusRatioRaw === ''
      ? 0
      : Number(bonusRatioRaw);
    const minDeposit = toOptionalNumber(req.body.minDeposit);
    const maxDeposit = toOptionalNumber(req.body.maxDeposit);
    const status = String(req.body.status || 'active').toLowerCase();

    if (!Number.isFinite(rateInr)) {
      return res.status(400).json({ error: 'USDT rate is required' });
    }
    if (rateInr <= 0) {
      return res.status(400).json({ error: 'USDT rate must be greater than 0' });
    }
    if (!Number.isFinite(bonusRatio) || bonusRatio < 0) {
      return res.status(400).json({ error: 'Bonus ratio cannot be negative' });
    }
    if (minDeposit !== null && (!Number.isFinite(minDeposit) || minDeposit < 0)) {
      return res.status(400).json({ error: 'Minimum deposit cannot be negative' });
    }
    if (maxDeposit !== null && (!Number.isFinite(maxDeposit) || maxDeposit < 0)) {
      return res.status(400).json({ error: 'Maximum deposit cannot be negative' });
    }
    if (minDeposit != null && maxDeposit != null && maxDeposit < minDeposit) {
      return res.status(400).json({ error: 'Maximum deposit must be greater than or equal to minimum deposit' });
    }
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    let settings = await UsdtRateSetting.findOne().sort({ updatedAt: -1 });
    const oldRate = Number(settings?.rateInr || 0);
    const oldBonusRatio = Number(settings?.bonusRatio || 0);

    if (settings) {
      settings.rateInr = rateInr;
      settings.bonusRatio = bonusRatio;
      settings.minDeposit = minDeposit;
      settings.maxDeposit = maxDeposit;
      settings.status = status;
      settings.updatedByAdminId = req.admin._id;
    } else {
      settings = new UsdtRateSetting({
        rateInr,
        bonusRatio,
        minDeposit,
        maxDeposit,
        status,
        updatedByAdminId: req.admin._id
      });
    }

    await settings.save();

    const history = await UsdtRateHistory.create({
      oldRate,
      newRate: rateInr,
      oldBonusRatio,
      newBonusRatio: bonusRatio,
      updatedByAdminId: req.admin._id
    });

    const { ip, device } = getRequestMeta(req);
    try {
      await AdminAuditLog.create({
        adminId: req.admin._id,
        action: 'update_usdt_rate',
        module: 'usdt_rate',
        referenceId: history._id,
        oldStatus: String(oldRate),
        newStatus: String(rateInr),
        metadata: {
          oldRate,
          newRate: rateInr,
          oldBonusRatio,
          newBonusRatio: bonusRatio,
          minDeposit,
          maxDeposit,
          status
        },
        ip,
        device
      });
    } catch (auditError) {
      console.error('USDT rate audit log error:', auditError);
    }

    const populated = await settings.populate('updatedByAdminId', 'name email');
    res.json({
      message: 'USDT rate updated successfully',
      settings: serializeRate(populated)
    });
  } catch (error) {
    console.error('Update USDT rate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
