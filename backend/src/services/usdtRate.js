const UsdtRateSetting = require('../models/UsdtRateSetting');
const { roundAmount } = require('./walletService');

const normalizeStatus = (status) => String(status || 'active').trim().toLowerCase();

const isUsableRate = (doc) => {
  if (!doc || !(Number(doc.rateInr) > 0)) return false;
  return normalizeStatus(doc.status) !== 'inactive';
};

const serializeRate = (doc) => {
  if (!doc) {
    return {
      rateInr: 0,
      bonusRatio: 0,
      minDeposit: null,
      maxDeposit: null,
      status: 'inactive',
      updatedByAdminId: null,
      updatedAt: null
    };
  }

  const admin = doc.updatedByAdminId && typeof doc.updatedByAdminId === 'object' && doc.updatedByAdminId._id
    ? doc.updatedByAdminId
    : null;

  return {
    id: doc._id,
    rateInr: Number(doc.rateInr || 0),
    bonusRatio: Number(doc.bonusRatio || 0),
    minDeposit: doc.minDeposit == null ? null : Number(doc.minDeposit),
    maxDeposit: doc.maxDeposit == null ? null : Number(doc.maxDeposit),
    status: isUsableRate(doc) ? 'active' : 'inactive',
    updatedByAdminId: admin ? admin._id : doc.updatedByAdminId || null,
    updatedBy: admin ? (admin.name || admin.email || '') : '',
    updatedByEmail: admin?.email || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const getCurrentRate = async () => {
  const doc = await UsdtRateSetting.findOne().sort({ updatedAt: -1 }).populate('updatedByAdminId', 'name email');
  return doc;
};

const getActiveRate = async () => {
  const latest = await getCurrentRate();
  if (isUsableRate(latest)) return latest;

  const fallback = await UsdtRateSetting.findOne({ rateInr: { $gt: 0 } })
    .sort({ updatedAt: -1 })
    .populate('updatedByAdminId', 'name email');

  if (isUsableRate(fallback)) return fallback;
  return null;
};

const calculateDepositCredit = (amountUsdt, rate) => {
  const amount = Number(amountUsdt);
  const rateInr = Number(rate?.rateInr || 0);
  const bonusRatio = Number(rate?.bonusRatio || 0);
  const convertedInrAmount = roundAmount(amount * rateInr);
  const bonusAmount = roundAmount(convertedInrAmount * bonusRatio / 100);
  const finalCreditAmount = roundAmount(convertedInrAmount + bonusAmount);

  return {
    rateInr,
    bonusRatio,
    convertedInrAmount,
    bonusAmount,
    finalCreditAmount
  };
};

module.exports = {
  serializeRate,
  getCurrentRate,
  getActiveRate,
  isUsableRate,
  calculateDepositCredit
};
