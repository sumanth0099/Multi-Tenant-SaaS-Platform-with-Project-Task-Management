import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalTenants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantFilters, setTenantFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    plan: '',
  });

  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      // API 3: Get current user
      const userRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) throw new Error('Session expired');
      const userData = await userRes.json();
      if (!userData.success) throw new Error('Invalid user');
      setUser(userData.data);

      // API 13: Load projects (includes taskCount, completedTaskCount)
      const projectsRes = await fetch(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let projectList = [];
      let totalProjects = 0;
      let totalTasks = 0;
      let completedTasks = 0;

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        if (projectsData.success) {
          projectList = projectsData.data?.projects || [];
          totalProjects = projectsData.data?.total || projectList.length;

          totalTasks = projectList.reduce((sum, p) => sum + (p.taskCount || 0), 0);
          completedTasks = projectList.reduce((sum, p) => sum + (p.completedTaskCount || 0), 0);
        }
      }

      setProjects(projectList.slice(0, 5)); // Show recent 5 projects

      setStats({
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalTenants: stats.totalTenants,
      });

      if (userData.data.role === 'super_admin') {
        loadTenants();
      }

    } catch (err) {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [navigate, stats.totalTenants]);

  const loadTenants = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      setTenantsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: tenantFilters.page.toString(),
        limit: tenantFilters.limit.toString(),
        ...(tenantFilters.status && { status: tenantFilters.status }),
        ...(tenantFilters.plan && { subscriptionPlan: tenantFilters.plan }),
      });

      const res = await fetch(`${API_BASE}/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTenants(data.data?.tenants || []);
          setStats(prev => ({
            ...prev,
            totalTenants: data.data?.pagination?.totalTenants || data.data?.tenants?.length || 0,
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTenantsLoading(false);
    }
  }, [tenantFilters, isSuperAdmin]);

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
      }
    } catch (err) {
      alert('Update failed');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (isSuperAdmin) loadTenants();
  }, [tenantFilters, loadTenants, isSuperAdmin]);

  if (loading) return <div style={{ padding: '6rem', textAlign: 'center', fontSize: '1.6rem', color: '#666' }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: '2rem', background: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {error && (
          <div style={{ padding: '1.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
            {error}
            <button onClick={loadDashboardData} style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>
              Retry
            </button>
          </div>
        )}

        <h1 style={{ fontSize: '2.8rem', color: '#1e293b', marginBottom: '2rem' }}>
          Welcome, {user?.fullName || 'User'}!
          <span style={{ fontSize: '1.6rem', color: '#64748b', marginLeft: '1rem' }}>
            ({user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'tenant_admin' ? 'Tenant Admin' : 'User'})
          </span>
        </h1>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <StatCard title="Total Projects" value={stats.totalProjects} color="#6366f1" />
          <StatCard title="Total Tasks" value={stats.totalTasks} color="#ef4444" />
          <StatCard title="Completed" value={stats.completedTasks} color="#10b981" />
          <StatCard title="Pending" value={stats.pendingTasks} color="#f59e0b" />
          {isSuperAdmin && <StatCard title="Total Tenants" value={stats.totalTenants} color="#8b5cf6" gradient />}
        </div>

        {/* Recent Projects */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '1.5rem' }}>Recent Projects</h2>
          {projects.length === 0 ? (
            <EmptyState message="No projects yet. Create your first project to get started!" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {projects.map(project => (
                <div key={project.id} style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem' }}>{project.name}</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{project.description || 'No description'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Status: <strong style={{ color: getStatusColor(project.status) }}>{project.status}</strong></span>
                    <span>{project.taskCount || 0} tasks ({project.completedTaskCount || 0} completed)</span>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px' }}
                  >
                    View Project →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Super Admin: All Organizations */}
        {isSuperAdmin && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', color: '#1e293b' }}>All Organizations ({stats.totalTenants})</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select value={tenantFilters.status} onChange={(e) => setTenantFilters({ ...tenantFilters, page: 1, status: e.target.value })} style={selectStyle}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="trial">Trial</option>
                </select>
                <select value={tenantFilters.plan} onChange={(e) => setTenantFilters({ ...tenantFilters, page: 1, plan: e.target.value })} style={selectStyle}>
                  <option value="">All Plans</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button onClick={loadTenants} style={{ padding: '0.75rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px' }}>
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {tenants.map(tenant => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  isEditing={editingTenant?.id === tenant.id}
                  editingData={editingTenant}
                  onEditStart={() => setEditingTenant(tenant)}
                  onEditChange={setEditingTenant}
                  onSave={() => updateTenant(tenant.id)}
                  onCancel={() => setEditingTenant(null)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, color, gradient }) => (
  <div style={{
    background: gradient ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' : 'white',
    color: gradient ? 'white' : '#1e293b',
    padding: '2rem',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
  }}>
    <div style={{ fontSize: '3.8rem', fontWeight: 'bold' }}>{value}</div>
    <div style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>{title}</div>
  </div>
);

const TenantCard = ({ tenant, isEditing, editingData, onEditStart, onEditChange, onSave, onCancel }) => (
  <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: isEditing ? '3px solid #6366f1' : 'none' }}>
    {isEditing ? (
      <>
        <input value={editingData?.name || ''} onChange={(e) => onEditChange({ ...editingData, name: e.target.value })} style={inputStyle} placeholder="Name" />
        <select value={editingData?.status || 'active'} onChange={(e) => onEditChange({ ...editingData, status: e.target.value })} style={inputStyle}>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
        <select value={editingData?.subscriptionPlan || 'free'} onChange={(e) => onEditChange({ ...editingData, subscriptionPlan: e.target.value })} style={inputStyle}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={onSave} style={{ flex: 1, padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px' }}>Save</button>
          <button onClick={onCancel} style={{ flex: 1, padding: '1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '12px' }}>Cancel</button>
        </div>
      </>
    ) : (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{tenant.name}</h3>
          <span style={{ background: getStatusColor(tenant.status), color: 'white', padding: '0.5rem 1rem', borderRadius: '20px' }}>
            {tenant.status}
          </span>
        </div>
        <p style={{ color: '#64748b', margin: '1rem 0' }}>
          Subdomain: <strong>{tenant.subdomain}.saasapp.com</strong>
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
          <span>Users: {tenant.totalUsers || 0}</span>
          <span>Projects: {tenant.totalProjects || 0}</span>
          <span>Plan: {tenant.subscriptionPlan}</span>
        </div>
        <button onClick={onEditStart} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px' }}>
          Edit Tenant
        </button>
      </>
    )}
  </div>
);

const EmptyState = ({ message }) => (
  <div style={{ textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '16px', border: '3px dashed #cbd5e1', color: '#94a3b8' }}>
    <p style={{ fontSize: '1.4rem' }}>{message}</p>
  </div>
);

const selectStyle = { padding: '0.8rem 1.2rem', borderRadius: '12px', border: '2px solid #e2e8f0' };
const inputStyle = { width: '100%', padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0' };

const getStatusColor = (status) => ({
  active: '#10b981',
  suspended: '#ef4444',
  trial: '#f59e0b',
  completed: '#10b981',
  in_progress: '#3b82f6',
  todo: '#f59e0b',
}[status] || '#6b7280');

export default Dashboard;