import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    isActive: true,
  });

  const navigate = useNavigate();

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      const userData = data.data;
      setCurrentUser(userData);
      setTenantId(userData.tenant?.id);

      // Restrict access
      if (userData.role !== 'tenant_admin' && userData.role !== 'super_admin') {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadUsers = useCallback(async () => {
    if (!tenantId) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/tenants/${tenantId}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data?.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (tenantId) loadUsers();
  }, [tenantId, loadUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const url = editingUser
      ? `${API_BASE}/users/${editingUser.id}`
      : `${API_BASE}/tenants/${tenantId}/users`;

    const method = editingUser ? 'PUT' : 'POST';

    const payload = editingUser
      ? {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
        }
      : {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ email: '', password: '', fullName: '', role: 'user', isActive: true });
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.message || 'Operation failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDelete = async (userId) => {
    if (currentUser?.id === userId) {
      alert('You cannot delete yourself!');
      return;
    }
    window.confirm('Delete this user permanently?')

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadUsers();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName,
      role: user.role === 'tenant_admin' ? 'tenant_admin' : 'user',
      isActive: user.isActive,
      password: '',
    });
    setShowModal(true);
  };

  if (loading) return <div style={{ padding: '8rem', textAlign: 'center', fontSize: '1.4rem' }}>May be no team for you or still fetching...</div>;

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.8rem', color: '#1e293b' }}>
            Team Members ({users.length})
          </h1>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ email: '', password: '', fullName: '', role: 'user', isActive: true });
              setShowModal(true);
            }}
            style={{
              padding: '1rem 2.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: '600',
            }}
          >
            + Add User
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '1.8rem', textAlign: 'left', fontWeight: '600' }}>Full Name</th>
                <th style={{ padding: '1.8rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '1.8rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                <th style={{ padding: '1.8rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1.8rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1.8rem', fontWeight: '500' }}>{user.fullName}</td>
                  <td style={{ padding: '1.8rem', color: '#64748b' }}>{user.email}</td>
                  <td style={{ padding: '1.8rem' }}>
                    <span style={{
                      background: user.role === 'tenant_admin' ? '#3b82f6' : '#6b7280',
                      color: 'white',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '30px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                    }}>
                      {user.role === 'tenant_admin' ? 'Tenant Admin' : 'User'}
                    </span>
                  </td>
                  <td style={{ padding: '1.8rem' }}>
                    <span style={{
                      background: user.isActive ? '#10b981' : '#ef4444',
                      color: 'white',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '30px',
                      fontSize: '0.95rem',
                    }}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1.8rem', textAlign: 'right' }}>
                    <button
                      onClick={() => startEdit(user)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '0.8rem 1.5rem',
                        borderRadius: '12px',
                        marginRight: '0.8rem',
                        fontWeight: '600',
                      }}
                    >
                      Edit
                    </button>
                    {currentUser?.id !== user.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', width: '90%', maxWidth: '600px' }}>
              <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                {!editingUser && (
                  <>
                    <input
                      type="email"
                      placeholder="Email *"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={inputStyle}
                    />
                    <input
                      type="password"
                      placeholder="Password * (min 8 chars)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength="8"
                      style={inputStyle}
                    />
                  </>
                )}
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  style={inputStyle}
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={inputStyle}
                >
                  <option value="user">User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '24px', height: '24px' }}
                  />
                  <span>User is active</span>
                </label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUser(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '1.2rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '1.2rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {editingUser ? 'Update User' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '1.2rem 1.5rem',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
  fontSize: '1.1rem',
};

export default Users;