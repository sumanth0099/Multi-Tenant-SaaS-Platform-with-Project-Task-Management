import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      });
  }, [location.pathname]); // Refresh user on route change

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isTenantAdmin = user?.role === 'tenant_admin' || isSuperAdmin;
  const isAuthenticated = !!user;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projects', path: '/projects' },
    ...(isTenantAdmin ? [{ label: 'Users', path: '/users' }] : []),
    ...(isSuperAdmin ? [{ label: 'Tenants', path: '/tenants' }] : []),
  ];

  const currentPath = location.pathname;

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/dashboard')}
            style={{
              fontSize: '1.6rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            SaaS Platform
          </div>

          {/* Desktop Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {navItems.map(item => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: currentPath === item.path ? '600' : '500',
                    background: currentPath === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {isAuthenticated && (
              <>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                }}>
                  {user.fullName}
                  <span style={{ opacity: 0.8, marginLeft: '0.5rem' }}>
                    ({user.role.replace('_', ' ')})
                  </span>
                </div>

                <button
                  onClick={logout}
                  style={{
                    background: 'rgba(239,68,68,0.8)',
                    border: 'none',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.8rem',
              cursor: 'pointer',
            }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{
            background: 'rgba(102, 126, 234, 0.98)',
            padding: '1.5rem 2rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            {navItems.map(item => (
              <div
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                style={{
                  padding: '1rem 0',
                  fontSize: '1.1rem',
                  fontWeight: currentPath === item.path ? '600' : '500',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {item.label}
              </div>
            ))}

            {isAuthenticated && (
              <>
                <div style={{
                  padding: '1rem 0',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                }}>
                  Logged in as: <strong>{user.fullName}</strong>
                </div>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    background: '#ef4444',
                    border: 'none',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginTop: '1rem',
                    fontWeight: '600',
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div style={{ height: '80px' }} />
    </>
  );
};

export default Navbar;