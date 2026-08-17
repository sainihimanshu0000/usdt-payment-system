import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const statusClass = {
  pending: 'warning',
  active: 'success',
  inactive: 'muted',
  rejected: 'danger'
};

const AdminBankAccounts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState(null);

  const userIdFilter = searchParams.get('userId') || '';

  const fetchAccounts = async () => {
    try {
      const params = new URLSearchParams();
      if (userIdFilter) params.set('userId', userIdFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const query = params.toString() ? `?${params}` : '';
      const { data } = await api.get(`/bank-accounts/admin${query}`);
      setGroups(data.groups || []);
    } catch (error) {
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAccounts();
  }, [userIdFilter, statusFilter]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => {
      const userMatch =
        group.user?.name?.toLowerCase().includes(term) ||
        group.user?.email?.toLowerCase().includes(term);
      const accountMatch = group.accounts.some((account) =>
        [
          account.accountHolderName,
          account.bankName,
          account.upiId,
          account.ifscCode,
          account.accountNo,
          account.phoneNo
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
      return userMatch || accountMatch;
    });
  }, [groups, searchTerm]);

  const totalAccounts = filteredGroups.reduce((sum, group) => sum + group.accounts.length, 0);

  const updateStatus = async (accountId, status) => {
    setBusyId(accountId);
    try {
      await api.patch(`/bank-accounts/admin/${accountId}/status`, { status });
      toast.success(`Bank account marked as ${status}`);
      await fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const clearUserFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('userId');
    setSearchParams(next);
  };

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Bank Accounts</h1>
          <p>
            {totalAccounts} account{totalAccounts === 1 ? '' : 's'} across {filteredGroups.length} user
            {filteredGroups.length === 1 ? '' : 's'}
            {userIdFilter ? ' · filtered by user' : ''}
          </p>
        </div>
        {userIdFilter && (
          <button type="button" className="btn-soft" onClick={clearUserFilter}>
            Clear user filter
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="toolbar">
            <input
              type="text"
              className="form-control search"
              placeholder="Search by user, bank, UPI, IFSC…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filters">
              {['all', 'pending', 'active', 'inactive', 'rejected'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredGroups.length === 0 && (
            <div className="empty">No bank accounts found</div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.user?.id || group.user?.email} className="mb-4">
              <div className="user-cell mb-2">
                <div className="avatar">{(group.user?.name || 'U').slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{group.user?.name || 'Unknown user'}</strong>
                  <div className="text-muted small">{group.user?.email}</div>
                </div>
                <span className="badge-pill muted ms-auto">{group.accounts.length} bank(s)</span>
              </div>

              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Holder / Bank</th>
                      <th>Account</th>
                      <th>UPI / IFSC</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.accounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <strong>{account.accountHolderName}</strong>
                          <div className="text-muted small">{account.bankName}</div>
                          <div className="text-muted small">{account.bankBranch}</div>
                        </td>
                        <td>
                          <div className="small">{account.accountNo}</div>
                          <div className="text-muted small">{account.accountNoMasked}</div>
                        </td>
                        <td>
                          <div>{account.upiId}</div>
                          <div className="text-muted small">{account.ifscCode}</div>
                        </td>
                        <td>{account.countryCode} {account.phoneNo}</td>
                        <td>
                          <span className={`badge-pill ${statusClass[account.status] || 'muted'}`}>
                            {account.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-row">
                            {account.status !== 'active' && (
                              <button
                                type="button"
                                className="btn-soft success"
                                disabled={busyId === account.id}
                                onClick={() => updateStatus(account.id, 'active')}
                              >
                                Activate
                              </button>
                            )}
                            {account.status === 'active' && (
                              <button
                                type="button"
                                className="btn-soft warn"
                                disabled={busyId === account.id}
                                onClick={() => updateStatus(account.id, 'inactive')}
                              >
                                Deactivate
                              </button>
                            )}
                            {account.status === 'pending' && (
                              <button
                                type="button"
                                className="btn-soft danger"
                                disabled={busyId === account.id}
                                onClick={() => updateStatus(account.id, 'rejected')}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminBankAccounts;
