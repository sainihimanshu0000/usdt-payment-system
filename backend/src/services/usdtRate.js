const UsdtRateSetting = require('../models/UsdtRateSetting');
const { roundAmount } = require('./walletService');

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
    status: doc.status || 'inactive',
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
  const doc = await getCurrentRate();
  if (!doc || doc.status !== 'active' || !(Number(doc.rateInr) > 0)) {
    return null;
  }
  return doc;
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
  calculateDepositCredit
};
