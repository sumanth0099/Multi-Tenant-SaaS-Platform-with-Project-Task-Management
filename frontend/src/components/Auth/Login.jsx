import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Prevent access if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    if (!isSuperAdminMode && !tenantSubdomain.trim()) {
      setError('Organization subdomain is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        email: email.trim(),
        password,
      };

      if (!isSuperAdminMode) {
        payload.tenantSubdomain = tenantSubdomain.trim().toLowerCase();
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.data?.token) {
        localStorage.setItem('token', data.data.token);
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.message || 'Invalid credentials. Please check your email, password, and subdomain.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSuperAdminMode(!isSuperAdminMode);
    if (!isSuperAdminMode) {
      setTenantSubdomain('');
    }
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.97)',
        padding: '3.5rem',
        borderRadius: '28px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '100%',
        backdropFilter: 'blur(16px)',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '2.6rem',
          color: '#1e293b',
          marginBottom: '0.8rem',
          fontWeight: '800',
        }}>
          Welcome Back
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '3rem', fontSize: '1.1rem' }}>
          Sign in to continue to your organization
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@company.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="8"
              placeholder="Enter your password"
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>
              {isSuperAdminMode ? 'Super Admin Login' : 'Organization Subdomain'}
            </label>

            {!isSuperAdminMode && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={tenantSubdomain}
                  onChange={(e) => setTenantSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  placeholder="yourcompany"
                  style={{ ...inputStyle, borderRadius: '12px 0 0 12px', borderRight: 'none' }}
                />
                <span style={{
                  background: '#f1f5f9',
                  padding: '1rem 1.8rem',
                  border: '2px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRadius: '0 12px 12px 0',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '1rem',
                }}>
                  .saasapp.com
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleMode}
              style={{
                position: 'absolute',
                right: '12px',
                top: '42px',
                background: isSuperAdminMode ? '#dc2626' : '#6366f1',
                color: 'white',
                border: 'none',
                padding: '0.7rem 1.4rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {isSuperAdminMode ? '← Tenant Mode' : 'Super Admin →'}
            </button>
          </div>

          {error && (
            <div style={{
              padding: '1.2rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '16px',
              border: '1px solid #fecaca',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '1.4rem',
              border: 'none',
              borderRadius: '18px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', color: '#64748b', fontSize: '1rem' }}>
          Don't have an organization yet?{' '}
          <a href="/register" style={{ color: '#6366f1', fontWeight: '700', textDecoration: 'none' }}>
            Create one now →
          </a>
        </p>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.8rem',
  fontWeight: '600',
  color: '#374151',
  fontSize: '1.1rem',
};

const inputStyle = {
  width: '100%',
  padding: '1.2rem 1.5rem',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '1.1rem',
  transition: 'all 0.3s',
  boxSizing: 'border-box',
};

export default Login;