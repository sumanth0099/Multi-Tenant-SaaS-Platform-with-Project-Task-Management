import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import ProjectDetails from './components/ProjectDetails';
import Users from './components/Users';
import Tenants from './components/Tenants';

// Protected Route: Requires login
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// Super Admin Only Route
const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  // We decode role from /auth/me — but for route protection, we'll let the page handle it
  // (Tenants.jsx already checks role and redirects if not super_admin)
  return children;
};

// Main Layout with Navbar
const MainLayout = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Navbar />
    <main style={{
      flex: 1,
      padding: '2rem 1rem',
      marginTop: '80px',
      maxWidth: '1600px',
      margin: '80px auto 0',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {children}
    </main>
  </div>
);

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#f8fafc',
    }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes (Require Login) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/projects" element={
          <ProtectedRoute>
            <MainLayout>
              <Projects />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/projects/:projectId" element={
          <ProtectedRoute>
            <MainLayout>
              <ProjectDetails />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <MainLayout>
              <Users />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Super Admin Only Route */}
        <Route path="/tenants" element={
          <ProtectedRoute>
            <SuperAdminRoute>
              <MainLayout>
                <Tenants />
              </MainLayout>
            </SuperAdminRoute>
          </ProtectedRoute>
        } />

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;