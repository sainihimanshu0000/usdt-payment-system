import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  COUNTRY_CODES,
  emptyBankForm,
  isBankFormComplete,
  payloadFromForm,
  validateBankForm
} from '../../utils/bankValidation';

const Field = ({ label, error, className = '', children }) => (
  <div className={className}>
    <label className="portal-label">{label}</label>
    {children}
    <div className="portal-error">{error || ''}</div>
  </div>
);

const AddBank = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyBankForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/bank-accounts/${id}`);
        if (!active) return;
        setForm({
          accountNo: data.accountNo || '',
          upiId: data.upiId || '',
          accountHolderName: data.accountHolderName || '',
          ifscCode: data.ifscCode || '',
          bankName: data.bankName || '',
          bankBranch: data.bankBranch || '',
          bankAddress: data.bankAddress || '',
          countryCode: data.countryCode || '+91',
          phoneNo: data.phoneNo || ''
        });
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load bank account');
        navigate('/portal/banks');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, isEdit, navigate]);

  const complete = useMemo(() => isBankFormComplete(form), [form]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (name, value) => {
    const nextErrors = validateBankForm({ ...form, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: nextErrors[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateBankForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !complete) return;

    setSubmitting(true);
    try {
      const payload = payloadFromForm(form);
      if (isEdit) {
        await api.put(`/bank-accounts/${id}`, payload);
        toast.success('Bank account updated successfully');
      } else {
        await api.post('/bank-accounts', payload);
        toast.success('Bank account added successfully');
      }
      navigate('/portal/banks');
    } catch (error) {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors) setErrors(fieldErrors);
      toast.error(error.response?.data?.error || 'Could not save bank account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="portal-empty">Loading account…</div>;
  }

  return (
    <div>
      <div className="portal-page-head">
        <div>
          <h1>{isEdit ? 'Edit Bank' : 'Add Bank'}</h1>
          <p>Enter bank details for UPI payments</p>
        </div>
        <Link to="/portal/banks" className="portal-btn ghost">Back to list</Link>
      </div>

      <form className="portal-card" onSubmit={handleSubmit} noValidate style={{ maxWidth: 760 }}>
        <p className="portal-kicker">ADD BANK ACCOUNT</p>

        <div className="portal-form-grid">
          <Field label="Account No." error={errors.accountNo}>
            <input
              className={`portal-input ${errors.accountNo ? 'is-invalid' : ''}`}
              inputMode="numeric"
              autoComplete="off"
              value={form.accountNo}
              onChange={(e) => setField('accountNo', e.target.value.replace(/[^\d]/g, ''))}
              onBlur={(e) => handleBlur('accountNo', e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>

          <Field label="UPI ID" error={errors.upiId}>
            <input
              className={`portal-input ${errors.upiId ? 'is-invalid' : ''}`}
              placeholder="example@ybl"
              value={form.upiId}
              onChange={(e) => setField('upiId', e.target.value)}
              onBlur={(e) => handleBlur('upiId', e.target.value)}
            />
          </Field>

          <Field label="Account Holder Name" error={errors.accountHolderName}>
            <input
              className={`portal-input ${errors.accountHolderName ? 'is-invalid' : ''}`}
              value={form.accountHolderName}
              onChange={(e) => setField('accountHolderName', e.target.value)}
              onBlur={(e) => handleBlur('accountHolderName', e.target.value)}
            />
          </Field>

          <Field label="IFSC Code" error={errors.ifscCode}>
            <input
              className={`portal-input ${errors.ifscCode ? 'is-invalid' : ''}`}
              value={form.ifscCode}
              onChange={(e) => setField('ifscCode', e.target.value.toUpperCase())}
              onBlur={(e) => handleBlur('ifscCode', e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Bank Name" error={errors.bankName}>
            <input
              className={`portal-input ${errors.bankName ? 'is-invalid' : ''}`}
              value={form.bankName}
              onChange={(e) => setField('bankName', e.target.value)}
              onBlur={(e) => handleBlur('bankName', e.target.value)}
            />
          </Field>

          <Field label="Bank Branch" error={errors.bankBranch}>
            <input
              className={`portal-input ${errors.bankBranch ? 'is-invalid' : ''}`}
              value={form.bankBranch}
              onChange={(e) => setField('bankBranch', e.target.value)}
              onBlur={(e) => handleBlur('bankBranch', e.target.value)}
            />
          </Field>

          <Field label="Bank Address" error={errors.bankAddress} className="span-2">
            <textarea
              className={`portal-textarea ${errors.bankAddress ? 'is-invalid' : ''}`}
              value={form.bankAddress}
              onChange={(e) => setField('bankAddress', e.target.value)}
              onBlur={(e) => handleBlur('bankAddress', e.target.value)}
            />
          </Field>

          <Field label="Phone No." error={errors.phoneNo} className="span-2">
            <div className="portal-phone-row">
              <select
                className="portal-select"
                value={form.countryCode}
                onChange={(e) => setField('countryCode', e.target.value)}
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code.value} value={code.value}>
                    {code.label}
                  </option>
                ))}
              </select>
              <input
                className={`portal-input ${errors.phoneNo ? 'is-invalid' : ''}`}
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={form.phoneNo}
                onChange={(e) => setField('phoneNo', e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                onBlur={(e) => handleBlur('phoneNo', e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
              />
            </div>
          </Field>
        </div>

        <p className="portal-notice">
          IMPORTANT: To ensure successful activation, use the SIM associated with the provided phone number in the same device.
        </p>

        <button type="submit" className="portal-btn" disabled={submitting || !complete}>
          {submitting ? 'Saving…' : isEdit ? 'Save Bank Account' : 'Add Bank Account'}
        </button>
      </form>
    </div>
  );
};

export default AddBank;
