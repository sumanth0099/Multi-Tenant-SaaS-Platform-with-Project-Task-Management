const pool = require('../config/db');
const bcrypt = require('bcryptjs');  
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { logAction } = require('../services/audit'); // ← Used globally, no re-require inside functions

// ------------------------------------------------------------------
// 1. Register Tenant + First Admin
// ------------------------------------------------------------------
exports.registerTenant = async (req, res, next) => {
  const {
    tenantName,
    subdomain,
    adminEmail,
    adminPassword,
    adminFullName
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check subdomain uniqueness
    const tenantCheck = await client.query(
      'SELECT id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );

    if (tenantCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    // Check admin email uniqueness (global)
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (emailCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Admin email already exists'
      });
    }

    // Create tenant (free plan by default)
    const tenantId = uuidv4();

    await client.query(
      `
      INSERT INTO tenants (
        id, name, subdomain, status,
        subscription_plan, max_users, max_projects
      )
      VALUES ($1, $2, $3, 'active', 'free', 5, 3)
      `,
      [tenantId, tenantName, subdomain]
    );

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create tenant admin user
    const adminUserId = uuidv4();

    await client.query(
      `
      INSERT INTO users (
        id, tenant_id, email, password_hash,
        full_name, role, is_active
      )
      VALUES ($1, $2, $3, $4, $5, 'tenant_admin', true)
      `,
      [
        adminUserId,
        tenantId,
        adminEmail,
        hashedPassword,
        adminFullName
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Tenant registered successfully',
      data: {
        tenantId,
        subdomain,
        adminUser: {
          id: adminUserId,
          email: adminEmail,
          fullName: adminFullName,
          role: 'tenant_admin'
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// 2. Login (supports regular users + super_admin)
// ------------------------------------------------------------------
exports.login = async (req, res, next) => {
  const { email, password, tenantSubdomain, tenantId } = req.body;

  // Super admin bypasses tenant requirement
  if (!email || !password || (!tenantSubdomain && !tenantId && email !== 'superadmin@system.com')) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    // Special path for super_admin
    if (email === 'superadmin@system.com') {
      const userResult = await pool.query(
        `SELECT id, email, full_name, role, password_hash, is_active
         FROM users WHERE email = $1 AND role = 'super_admin'`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role
          },
          token,
          expiresIn: 86400
        }
      });
    }

    // Regular tenant user login
    let tenantQuery;
    let tenantValue;

    if (tenantSubdomain) {
      tenantQuery = `SELECT id, status FROM tenants WHERE subdomain = $1`;
      tenantValue = tenantSubdomain;
    } else {
      tenantQuery = `SELECT id, status FROM tenants WHERE id = $1`;
      tenantValue = tenantId;
    }

    const tenantResult = await pool.query(tenantQuery, [tenantValue]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenant = tenantResult.rows[0];

    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tenant is inactive'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, email, full_name, role, password_hash, is_active
      FROM users
      WHERE email = $1 AND tenant_id = $2
      `,
      [email, tenant.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: tenant.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: tenant.id
        },
        token,
        expiresIn: 86400
      }
    });

  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// 3. Get Current User (with tenant details)
// ------------------------------------------------------------------
exports.getCurrentUser = async (req, res, next) => {
  const { id } = req.user;

  try {
    const userResult = await pool.query(
      `SELECT 
         u.id, u.email, u.full_name, u.role, u.is_active,
         t.id AS tenant_id, t.name AS tenant_name, t.subdomain AS tenant_subdomain,
         t.subscription_plan, t.max_users, t.max_projects
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const row = userResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        isActive: row.is_active,
        tenant: row.tenant_id
          ? {
              id: row.tenant_id,
              name: row.tenant_name,
              subdomain: row.tenant_subdomain,
              subscriptionPlan: row.subscription_plan,
              maxUsers: row.max_users,
              maxProjects: row.max_projects
            }
          : null
      }
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// 4. Logout (with audit log)
// ------------------------------------------------------------------
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // req.user.tenant_id may be undefined for super_admin
    const tenantId = req.user.tenant_id || null;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Only log logout if user belongs to a tenant
    if (tenantId) {
      await logAction({
        tenant_id: tenantId,
        user_id: userId,
        action: 'LOGOUT',
        entity_type: 'auth',
        entity_id: null,
        ip_address: ipAddress
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};