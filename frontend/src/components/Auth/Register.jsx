import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";;

const Register = () => {
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    adminEmail: '',
    adminFullName: '',
    adminPassword: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'subdomain') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.termsAccepted) {
      setError('You must accept the Terms & Conditions');
      return;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (formData.subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: formData.tenantName.trim(),
          subdomain: formData.subdomain,
          adminEmail: formData.adminEmail.trim(),
          adminFullName: formData.adminFullName.trim(),
          adminPassword: formData.adminPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Organization created successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'Registration failed. The subdomain may already be taken.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        padding: '4rem',
        borderRadius: '32px',
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.15)',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '2.8rem',
          color: '#1e293b',
          marginBottom: '0.8rem',
          fontWeight: '800',
        }}>
          Create Your Organization
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '3rem', fontSize: '1.2rem' }}>
          Set up your team workspace in minutes
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <label style={labelStyle}>Organization Name *</label>
            <input
              type="text"
              value={formData.tenantName}
              onChange={handleChange('tenantName')}
              required
              placeholder="My Awesome Company"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Subdomain *</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={formData.subdomain}
                onChange={handleChange('subdomain')}
                required
                placeholder="mycompany"
                style={{ ...inputStyle, borderRadius: '16px 0 0 16px', borderRight: 'none' }}
              />
              <span style={{
                background: '#f1f5f9',
                padding: '1.3rem 2rem',
                border: '2px solid #e2e8f0',
                borderLeft: 'none',
                borderRadius: '0 16px 16px 0',
                color: '#475569',
                fontWeight: '700',
                fontSize: '1.1rem',
              }}>
                .saasapp.com
              </span>
            </div>
            {formData.subdomain && (
              <p style={{ marginTop: '0.8rem', color: '#6366f1', fontWeight: '600', fontSize: '1.05rem' }}>
                Your URL: https://{formData.subdomain}.saasapp.com
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Admin Full Name *</label>
            <input
              type="text"
              value={formData.adminFullName}
              onChange={handleChange('adminFullName')}
              required
              placeholder="John Doe"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Admin Email *</label>
            <input
              type="email"
              value={formData.adminEmail}
              onChange={handleChange('adminEmail')}
              required
              placeholder="admin@mycompany.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password *</label>
            <input
              type="password"
              value={formData.adminPassword}
              onChange={handleChange('adminPassword')}
              required
              minLength="8"
              placeholder="Create a strong password"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              placeholder="Re-enter your password"
              style={inputStyle}
            />
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            fontSize: '1rem',
            cursor: 'pointer',
            color: '#475569',
          }}>
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
              required
              style={{ width: '24px', height: '24px', marginTop: '4px', flexShrink: 0 }}
            />
            <span>
              I agree to the <a href="#" style={{ color: '#6366f1', fontWeight: '600' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: '#6366f1', fontWeight: '600' }}>Privacy Policy</a>
            </span>
          </label>

          {error && (
            <div style={{
              padding: '1.4rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '16px',
              border: '1px solid #fecaca',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '1.05rem',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '1.4rem',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: '16px',
              border: '1px solid #a7f3d0',
              textAlign: 'center',
              fontWeight: '700',
              fontSize: '1.1rem',
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '1.6rem',
              border: 'none',
              borderRadius: '20px',
              fontSize: '1.3rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s',
              boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)',
            }}
          >
            {loading ? 'Creating Organization...' : 'Create Organization'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b', fontSize: '1.05rem' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#6366f1', fontWeight: '700', textDecoration: 'none' }}>
            Sign in here →
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
  padding: '1.4rem 1.6rem',
  border: '2px solid #e2e8f0',
  borderRadius: '16px',
  fontSize: '1.1rem',
  transition: 'all 0.3s',
  boxSizing: 'border-box',
};

export default Register;