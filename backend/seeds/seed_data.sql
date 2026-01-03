-- =====================================================
-- SEED DATA FOR MULTI-TENANT SAAS APPLICATION
-- =====================================================

-- -------------------------
-- TENANTS
-- -------------------------
INSERT INTO tenants (
    id, name, subdomain, status, subscription_plan, max_users, max_projects
) VALUES (
    gen_random_uuid(),
    'Demo Company',
    'demo',
    'active',
    'pro',
    25,
    15
)
ON CONFLICT (subdomain) DO NOTHING;

-- -------------------------
-- USERS
-- -------------------------
-- Super Admin
INSERT INTO users (
    id, tenant_id, full_name, email, password_hash, role, is_active
) VALUES (
    gen_random_uuid(),
    NULL,
    'Super Admin',
    'superadmin@system.com',
    '$2b$10$uJdVMSHVgvfSvRKGwC0.rOKlGLGOssd2uxIDDubi3nqUneHNoc182',
    'super_admin',
    true
)
ON CONFLICT DO NOTHING;

-- Tenant Admin
INSERT INTO users (
    id, tenant_id, full_name, email, password_hash, role, is_active
) 
SELECT
    gen_random_uuid(),
    tenants.id,
    'Tenant Admin',
    'admin@demo.com',
    '$2b$10$XtbUOflcTyJbucUtiQ/cuuOXUZ.iY9BilXYmqi3t4mfxq8jLAfRtm',
    'tenant_admin',
    true
FROM tenants
WHERE tenants.subdomain = 'demo'
ON CONFLICT DO NOTHING;

-- User 1
INSERT INTO users (
    id, tenant_id, full_name, email, password_hash, role, is_active
) 
SELECT
    gen_random_uuid(),
    tenants.id,
    'Demo User 1',
    'user1@demo.com',
    '$2b$10$Hx5vnAVuRNYXZ1I2pJj1gO4DluMmhXdd/66rYMUCccmx2bsyBcxRC',
    'user',
    true
FROM tenants
WHERE tenants.subdomain = 'demo'
ON CONFLICT DO NOTHING;

-- User 2
INSERT INTO users (
    id, tenant_id, full_name, email, password_hash, role, is_active
) 
SELECT
    gen_random_uuid(),
    tenants.id,
    'Demo User 2',
    'user2@demo.com',
    '$2b$10$Hx5vnAVuRNYXZ1I2pJj1gO4DluMmhXdd/66rYMUCccmx2bsyBcxRC',
    'user',
    true
FROM tenants
WHERE tenants.subdomain = 'demo'
ON CONFLICT DO NOTHING;

-- -------------------------
-- PROJECTS
-- -------------------------
INSERT INTO projects (
    id, tenant_id, name, description, status, created_by
) 
SELECT
    gen_random_uuid(),
    tenants.id,
    'Project Alpha',
    'First demo project',
    'active',
    users.id
FROM tenants, users
WHERE tenants.subdomain = 'demo' 
  AND users.email = 'admin@demo.com'
  AND users.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

INSERT INTO projects (
    id, tenant_id, name, description, status, created_by
) 
SELECT
    gen_random_uuid(),
    tenants.id,
    'Project Beta',
    'Second demo project',
    'active',
    users.id
FROM tenants, users
WHERE tenants.subdomain = 'demo' 
  AND users.email = 'admin@demo.com'
  AND users.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

-- -------------------------
-- TASKS
-- -------------------------
INSERT INTO tasks (
    id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date
) 
SELECT
    gen_random_uuid(),
    projects.id,
    projects.tenant_id,
    'Design UI',
    'Create initial UI designs',
    'todo',
    'high',
    users.id,
    '2026-01-10'
FROM projects, users, tenants
WHERE projects.name = 'Project Alpha'
  AND users.email = 'user1@demo.com'
  AND tenants.subdomain = 'demo'
  AND users.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

INSERT INTO tasks (
    id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date
) 
SELECT
    gen_random_uuid(),
    projects.id,
    projects.tenant_id,
    'Setup Backend',
    'Initialize backend project',
    'in_progress',
    'medium',
    users.id,
    '2026-01-12'
FROM projects, users, tenants
WHERE projects.name = 'Project Alpha'
  AND users.email = 'user2@demo.com'
  AND tenants.subdomain = 'demo'
  AND users.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

INSERT INTO tasks (
    id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date
) 
SELECT
    gen_random_uuid(),
    projects.id,
    projects.tenant_id,
    'Create APIs',
    'Develop REST APIs',
    'todo',
    'high',
    users.id,
    '2026-01-15'
FROM projects, users, tenants
WHERE projects.name = 'Project Beta'
  AND users.email = 'user1@demo.com'
  AND tenants.subdomain = 'demo'
  AND users.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

INSERT INTO tasks (
    id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date
) 
SELECT
    gen_random_uuid(),
    projects.id,
    projects.tenant_id,
    'Write Tests',
    'Add unit tests',
    'todo',
    'low',
    NULL,
    '2026-01-18'
FROM projects, tenants
WHERE projects.name = 'Project Beta'
  AND tenants.subdomain = 'demo'
  AND projects.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

INSERT INTO tasks (
    id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date
) 
SELECT
    gen_random_uuid(),
    projects.id,
    projects.tenant_id,
    'Deploy App',
    'Prepare deployment',
    'todo',
    'medium',
    NULL,
    '2026-01-20'
FROM projects, tenants
WHERE projects.name = 'Project Beta'
  AND tenants.subdomain = 'demo'
  AND projects.tenant_id = tenants.id
ON CONFLICT DO NOTHING;

-- -------------------------
-- AUDIT LOGS
-- -------------------------
INSERT INTO audit_logs (
    id, tenant_id, user_id, action, entity_type, entity_id
) 
SELECT
    gen_random_uuid(),
    projects.tenant_id,
    users.id,
    'CREATE_PROJECT',
    'project',
    projects.id
FROM projects, users, tenants
WHERE projects.name = 'Project Alpha'
  AND users.email = 'admin@demo.com'
  AND tenants.subdomain = 'demo'
  AND projects.tenant_id = tenants.id
ON CONFLICT DO NOTHING;
