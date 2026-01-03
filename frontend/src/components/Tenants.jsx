import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTenants: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    plan: '',
  });
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState(null);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      if (data.data.role !== 'super_admin') {
        navigate('/dashboard'); // Only super_admin can access
      } else {
        setUser(data.data);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadTenants = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.plan && { subscriptionPlan: filters.plan }),
      });

      const res = await fetch(`${API_BASE}/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTenants(data.data?.tenants || []);
          setPagination({
            currentPage: data.data?.pagination?.currentPage || 1,
            totalPages: data.data?.pagination?.totalPages || 1,
            totalTenants: data.data?.pagination?.totalTenants || 0,
            limit: filters.limit,
          });
        }
      } else {
        setTenants([]);
      }
    } catch (err) {
      console.error(err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateTenant = async (tenantId) => {
    const token = localStorage.getItem('token');
    const payload = {
      ...(editingTenant.name && { name: editingTenant.name }),
      ...(editingTenant.status && { status: editingTenant.status }),
      ...(editingTenant.subscriptionPlan && { subscriptionPlan: editingTenant.subscriptionPlan }),
    };

    try {
      const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingTenant(null);
        loadTenants();
      } else {
        alert('Failed to update tenant');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadTenants();
    }
  }, [filters, loadTenants, user]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters({ ...filters, page: newPage });
    }
  };

  if (loading) return <div style={{ padding: '6rem', textAlign: 'center', fontSize: '1.6rem' }}>Loading tenants...</div>;

  return (
    <div style={{ padding: '2rem', background: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.8rem', color: '#1e293b', marginBottom: '2rem' }}>
          All Organizations ({pagination.totalTenants})
        </h1>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, page: 1, status: e.target.value })}
            style={selectStyle}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>

          <select
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, page: 1, plan: e.target.value })}
            style={selectStyle}
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <button onClick={loadTenants} style={{ padding: '1rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px' }}>
            Apply Filters
          </button>
        </div>

        {/* Tenants Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '20px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                border: editingTenant?.id === tenant.id ? '3px solid #6366f1' : 'none',
              }}
            >
              {editingTenant?.id === tenant.id ? (
                <>
                  <input
                    value={editingTenant.name || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                    placeholder="Organization Name"
                    style={inputStyle}
                  />
                  <select
                    value={editingTenant.status || 'active'}
                    onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="trial">Trial</option>
                  </select>
                  <select
                    value={editingTenant.subscriptionPlan || 'free'}
                    onChange={(e) => setEditingTenant({ ...editingTenant, subscriptionPlan: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      onClick={() => updateTenant(tenant.id)}
                      style={{ flex: 1, padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTenant(null)}
                      style={{ flex: 1, padding: '1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{tenant.name}</h3>
                    <span style={{ background: getStatusColor(tenant.status), color: 'white', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                      {tenant.status}
                    </span>
                  </div>
                  <p style={{ color: '#64748b', margin: '1rem 0' }}>
                    Subdomain: <strong>{tenant.subdomain}.saasapp.com</strong>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    <span>👥 Users: {tenant.totalUsers || 0}</span>
                    <span>📁 Projects: {tenant.totalProjects || 0}</span>
                    <span>💎 Plan: {tenant.subscriptionPlan}</span>
                    <span>📅 Created: {new Date(tenant.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => setEditingTenant(tenant)}
                    style={{ width: '100%', padding: '1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600' }}
                  >
                    Edit Tenant
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {tenants.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '6rem', background: 'white', borderRadius: '20px', border: '3px dashed #cbd5e1', marginTop: '3rem' }}>
            <p style={{ fontSize: '1.6rem', color: '#94a3b8' }}>No tenants found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page === 1}
              style={{ padding: '1rem 1.5rem', background: filters.page === 1 ? '#e2e8f0' : '#3b82f6', color: 'white', border: 'none', borderRadius: '12px' }}
            >
              Previous
            </button>
            <span style={{ padding: '1rem 2rem', background: '#f1f5f9', borderRadius: '12px', color: '#1e293b', fontWeight: '600' }}>
              Page {filters.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page === pagination.totalPages}
              style={{ padding: '1rem 1.5rem', background: filters.page === pagination.totalPages ? '#e2e8f0' : '#3b82f6', color: 'white', border: 'none', borderRadius: '12px' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const selectStyle = {
  padding: '1rem 1.5rem',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
  fontSize: '1rem',
};

const inputStyle = {
  width: '100%',
  padding: '1.2rem',
  marginBottom: '1.5rem',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
  fontSize: '1.1rem',
};

const getStatusColor = (status) => ({
  active: '#10b981',
  suspended: '#ef4444',
  trial: '#f59e0b',
}[status] || '#6b7280');

export default Tenants;