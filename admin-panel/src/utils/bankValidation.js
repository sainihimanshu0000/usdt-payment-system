const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export const COUNTRY_CODES = [
  { value: '+91', label: '+91' },
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
  { value: '+971', label: '+971' },
  { value: '+61', label: '+61' },
  { value: '+65', label: '+65' }
];

export const emptyBankForm = {
  accountNo: '',
  upiId: '',
  accountHolderName: '',
  ifscCode: '',
  bankName: '',
  bankBranch: '',
  bankAddress: '',
  countryCode: '+91',
  phoneNo: ''
};

export const validateBankForm = (form) => {
  const errors = {};
  const accountNo = form.accountNo.replace(/\s+/g, '');
  const upiId = form.upiId.trim().toLowerCase();
  const ifscCode = form.ifscCode.trim().toUpperCase();
  const phoneNo = form.phoneNo.replace(/\s+/g, '');

  if (!accountNo) errors.accountNo = 'Account No. is required';
  else if (!/^\d+$/.test(accountNo)) errors.accountNo = 'Account No. should accept only numbers';
  else if (!ACCOUNT_RE.test(accountNo)) errors.accountNo = 'Account No. must be 9–18 digits';

  if (!upiId) errors.upiId = 'UPI ID is required';
  else if (!UPI_RE.test(upiId)) errors.upiId = 'Enter a valid UPI ID (example@ybl)';

  if (!form.accountHolderName.trim()) errors.accountHolderName = 'Account Holder Name is required';
  if (!ifscCode) errors.ifscCode = 'IFSC Code is required';
  else if (!IFSC_RE.test(ifscCode)) errors.ifscCode = 'Enter a valid IFSC code (e.g. SBIN0001234)';
  if (!form.bankName.trim()) errors.bankName = 'Bank Name is required';
  if (!form.bankBranch.trim()) errors.bankBranch = 'Bank Branch is required';
  if (!form.bankAddress.trim()) errors.bankAddress = 'Bank Address is required';
  if (!phoneNo) errors.phoneNo = 'Phone No. is required';
  else if (!PHONE_RE.test(phoneNo)) errors.phoneNo = 'Enter a valid 10-digit Indian mobile number';

  return errors;
};

export const isBankFormComplete = (form) =>
  Object.values(form).every((value) => String(value || '').trim().length > 0);

export const payloadFromForm = (form) => ({
  accountNo: form.accountNo.replace(/\s+/g, ''),
  upiId: form.upiId.trim().toLowerCase(),
  accountHolderName: form.accountHolderName.trim(),
  ifscCode: form.ifscCode.trim().toUpperCase(),
  bankName: form.bankName.trim(),
  bankBranch: form.bankBranch.trim(),
  bankAddress: form.bankAddress.trim(),
  countryCode: form.countryCode || '+91',
  phoneNo: form.phoneNo.replace(/\s+/g, '')
});
