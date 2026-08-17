const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+61', '+65'];

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const maskAccountNo = (accountNo = '') => {
  const digits = String(accountNo);
  const last4 = digits.slice(-4) || '0000';
  return `XXXXXXXX${last4}`;
};

const normalizePayload = (body = {}) => ({
  accountNo: trim(body.accountNo).replace(/\s+/g, ''),
  upiId: trim(body.upiId).toLowerCase(),
  accountHolderName: trim(body.accountHolderName),
  ifscCode: trim(body.ifscCode).toUpperCase(),
  bankName: trim(body.bankName),
  bankBranch: trim(body.bankBranch),
  bankAddress: trim(body.bankAddress),
  countryCode: trim(body.countryCode) || '+91',
  phoneNo: trim(body.phoneNo).replace(/\s+/g, '')
});

const validateBankAccount = (body) => {
  const data = normalizePayload(body);
  const errors = {};

  if (!data.accountNo) {
    errors.accountNo = 'Account No. is required';
  } else if (!ACCOUNT_RE.test(data.accountNo)) {
    errors.accountNo = 'Account No. must be 9–18 digits';
  }

  if (!data.upiId) {
    errors.upiId = 'UPI ID is required';
  } else if (!UPI_RE.test(data.upiId)) {
    errors.upiId = 'Enter a valid UPI ID (example@ybl)';
  }

  if (!data.accountHolderName) {
    errors.accountHolderName = 'Account Holder Name is required';
  } else if (data.accountHolderName.length < 2) {
    errors.accountHolderName = 'Enter a valid account holder name';
  }

  if (!data.ifscCode) {
    errors.ifscCode = 'IFSC Code is required';
  } else if (!IFSC_RE.test(data.ifscCode)) {
    errors.ifscCode = 'Enter a valid IFSC code (e.g. SBIN0001234)';
  }

  if (!data.bankName) errors.bankName = 'Bank Name is required';
  if (!data.bankBranch) errors.bankBranch = 'Bank Branch is required';
  if (!data.bankAddress) errors.bankAddress = 'Bank Address is required';

  if (!COUNTRY_CODES.includes(data.countryCode)) {
    errors.countryCode = 'Select a valid country code';
  }

  if (!data.phoneNo) {
    errors.phoneNo = 'Phone No. is required';
  } else if (!PHONE_RE.test(data.phoneNo)) {
    errors.phoneNo = 'Enter a valid 10-digit Indian mobile number';
  }

  return { data, errors, valid: Object.keys(errors).length === 0 };
};

module.exports = {
  IFSC_RE,
  UPI_RE,
  ACCOUNT_RE,
  PHONE_RE,
  COUNTRY_CODES,
  maskAccountNo,
  normalizePayload,
  validateBankAccount
};
