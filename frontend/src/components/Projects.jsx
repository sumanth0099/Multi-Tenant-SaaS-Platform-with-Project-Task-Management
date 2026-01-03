import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [filters, setFilters] = useState({ status: '', search: '', page: 1, limit: 20 });

  const navigate = useNavigate();

  const isTenantAdmin = user?.role === 'tenant_admin' || user?.role === 'super_admin';

  const loadCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) setUser(data.data);
  }, [navigate]);

  const loadProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      const res = await fetch(`${API_BASE}/projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load projects');

      const data = await res.json();
      if (data.success) {
        setProjects(data.data?.projects || []);
        setTotal(data.data?.total || 0);
      } else {
        setProjects([]);
        setTotal(0);
      }
    } catch (err) {
      setError('Failed to load projects');
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingId ? `${API_BASE}/projects/${editingId}` : `${API_BASE}/projects`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) { 
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', description: '', status: 'active' });
        loadProjects();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Operation failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks? This cannot be undone.')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadProjects();
      } else {
        alert('Delete failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const startEdit = (project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
    });
    setShowModal(true);
  };

  if (loading) {
    return <div style={{ padding: '8rem', textAlign: 'center', fontSize: '1.4rem', color: '#666' }}>Loading projects...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '8rem', textAlign: 'center', color: '#991b1b' }}>
        {error}
        <button onClick={loadProjects} style={{ marginLeft: '1rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.8rem', color: '#1e293b', margin: 0 }}>
            Projects ({total})
          </h1>
          {isTenantAdmin && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', description: '', status: 'active' });
                setShowModal(true);
              }}
              style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
              }}
            >
              + New Project
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
          <input
            type="text"
            placeholder="Search projects by name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              minWidth: '300px',
              fontSize: '1rem',
            }}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              fontSize: '1rem',
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={loadProjects}
            style={{
              padding: '1rem 2rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
            }}
          >
            Apply Filters
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '6rem',
            background: 'white',
            borderRadius: '20px',
            border: '3px dashed #cbd5e1',
            color: '#94a3b8',
          }}>
            <p style={{ fontSize: '1.6rem' }}>
              {filters.search || filters.status
                ? 'No projects match your filters.'
                : 'No projects yet. Create your first project to get started!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  background: 'white',
                  padding: '2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                  border: '1px solid #f1f5f9',
                  transition: 'transform 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#1e293b' }}>{project.name}</h3>
                  <span style={{
                    background: getStatusColor(project.status),
                    color: 'white',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '30px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                  }}>
                    {project.status}
                  </span>
                </div>

                <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
                  {project.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '1rem' }}>
                  <div>
                    <strong>{project.taskCount || 0}</strong> total tasks • 
                    <strong>{project.completedTaskCount || 0}</strong> completed • 
                    Created by <strong>{project.createdBy?.fullName || 'Unknown'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    View Details
                  </button>
                  {isTenantAdmin && (
                    <>
                      <button
                        onClick={() => startEdit(project)}
                        style={{
                          padding: '1rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        style={{
                          padding: '1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && isTenantAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', width: '90%', maxWidth: '600px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>
                {editingId ? 'Edit Project' : 'Create New Project'}
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '600', color: '#374151' }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter project name"
                    style={{
                      width: '100%',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '1.1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '600', color: '#374151' }}>
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="5"
                    placeholder="Describe your project..."
                    style={{
                      width: '100%',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '1.1rem',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: '600', color: '#374151' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '1.1rem',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
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
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {editingId ? 'Update Project' : 'Create Project'}
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

const getStatusColor = (status) => ({
  active: '#10b981',
  archived: '#6b7280',
  completed: '#3b82f6',
}[status] || '#6b7280');

export default Projects;