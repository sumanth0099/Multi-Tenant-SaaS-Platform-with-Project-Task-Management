import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    status: 'todo',
  });

  const token = localStorage.getItem('token');

  const loadUser = useCallback(async () => {
    if (!token) return navigate('/login');
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) setUser(data.data);
  }, [token, navigate]);

  const loadProjectData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setTasks(data.data?.tasks || []);
      } else {
        setError('Failed to load tasks');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  const loadTenantUsers = async () => {
    if (!user?.tenant?.id) return;
    const res = await fetch(`${API_BASE}/tenants/${user.tenant.id}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) setUsers(data.data?.users || []);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const url = editingTask ? `${API_BASE}/tasks/${editingTask.id}` : `${API_BASE}/projects/${projectId}/tasks`;
    const method = editingTask ? 'PUT' : 'POST';

    const payload = {
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      assignedTo: taskForm.assignedTo || null,
      dueDate: taskForm.dueDate || null,
      ...(editingTask && { status: taskForm.status }),
    };

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      loadProjectData();
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      dueDate: '',
      status: 'todo',
    });
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo?.id || '',
      dueDate: task.dueDate || '',
      status: task.status || 'todo',
    });
    setShowTaskModal(true);
    loadTenantUsers();
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    await fetch(`${API_BASE}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });
    loadProjectData();
  };

  useEffect(() => {
    loadUser();
    loadProjectData();
  }, [loadUser, loadProjectData]);

  if (loading) return <div style={{ padding: '6rem', textAlign: 'center' }}>Loading project tasks...</div>;
  if (error) return <div style={{ padding: '6rem', textAlign: 'center', color: '#991b1b' }}>{error}</div>;

  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.4rem', color: '#1e293b' }}>Project Tasks ({tasks.length})</h1>
          <button
            onClick={() => {
              resetTaskForm();
              setEditingTask(null);
              loadTenantUsers();
              setShowTaskModal(true);
            }}
            style={{
              background: '#10b981',
              color: 'white',
              padding: '1rem 2rem',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
            }}
          >
            + Add Task
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
          {Object.entries(groupedTasks).map(([status, taskList]) => (
            <div key={status} style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{
                textTransform: 'capitalize',
                fontSize: '1.4rem',
                color: '#334155',
                marginBottom: '1rem',
                paddingBottom: '0.8rem',
                borderBottom: '2px solid #e2e8f0',
              }}>
                {status.replace('_', ' ')} ({taskList.length})
              </h3>
              {taskList.map(task => (
                <div key={task.id} style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                }}>
                  <h4 style={{ margin: '0 0 0.8rem', fontSize: '1.3rem' }}>{task.title}</h4>
                  <p style={{ color: '#64748b', marginBottom: '1rem' }}>{task.description || 'No description'}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
                    <span style={{ background: getPriorityColor(task.priority), color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                      {task.priority}
                    </span>
                    {task.assignedTo && (
                      <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                        👤 {task.assignedTo.fullName} ({task.assignedTo.email})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button onClick={() => startEditTask(task)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Task Modal */}
        {showTaskModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '20px', width: '90%', maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <input placeholder="Title *" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required style={inputStyle} />
                <textarea placeholder="Description" rows="4" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} style={inputStyle} />
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} style={inputStyle} />
                {editingTask && (
                  <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} style={inputStyle}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px' }}>
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                  <button type="button" onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ flex: 1, padding: '1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '12px' }}>
                    Cancel
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
  padding: '1rem 1.2rem',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
  fontSize: '1rem',
};

const getPriorityColor = (p) => ({
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
}[p] || '#6b7280');

const getStatusColor = (status) => ({
  todo: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#10b981',
}[status] || '#6b7280');

export default ProjectDetails;