import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const emptyForm = { name: '', email: '', password: '' };

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name || '', email: user.email || '', password: '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editingUser._id}`, payload);
        toast.success('User updated');
      } else {
        if (!form.password) {
          toast.error('Password is required');
          setSaving(false);
          return;
        }
        await api.post('/users', form);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await api.patch(`/users/${userId}/status`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'disabled'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="center-loader"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>{users.length} accounts in the system</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>Add User</button>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="toolbar">
            <input
              type="text"
              className="form-control search"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">{(user.name || 'U').slice(0, 1).toUpperCase()}</div>
                        <div>
                          <strong>{user.name}</strong>
                          <div className="text-muted small">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{Number(user.balance || 0).toFixed(2)} USDT</td>
                    <td>
                      <span className={`badge-pill ${user.status === 'active' ? 'success' : 'danger'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="btn-row">
                        <button className="btn-soft" onClick={() => openEdit(user)}>Edit</button>
                        <button
                          className={`btn-soft ${user.status === 'active' ? 'warn' : 'success'}`}
                          onClick={() => toggleUserStatus(user._id, user.status)}
                        >
                          {user.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn-soft danger" onClick={() => deleteUser(user._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <header>
                <h5 className="mb-0">{editingUser ? 'Edit User' : 'Add User'}</h5>
              </header>
              <div className="body">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="mb-0">
                  <label className="form-label">Password {editingUser ? '(leave blank to keep current)' : ''}</label>
                  <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} />
                </div>
              </div>
              <footer>
                <button type="button" className="btn-soft" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
