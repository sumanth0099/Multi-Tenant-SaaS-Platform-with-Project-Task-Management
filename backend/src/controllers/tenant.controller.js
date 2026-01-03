
const bcrypt = require('bcryptjs');  // CHANGE from bcrypt
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { logAction } = require('../services/audit');
const pool = require('../config/db'); 
exports.getTenantDetails = async (req, res, next) => {
    try {
      const tenantId = req.params.tenantId;
      const userRole = req.user.role;
      const userTenantId = req.user.tenant_id;
  
      // ✅ AUTH CHECK (super_admin OR same tenant)
      if (userRole !== 'super_admin' && userTenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to tenant'
        });
      }
  
      // ✅ SIMPLIFIED QUERY (no projects/tasks dependency)
      const tenantResult = await pool.query(`
        SELECT 
          t.id, t.name, t.subdomain, t.status, t.subscription_plan,
          t.max_users, t.max_projects, t.created_at,
          COALESCE(u_count.total_users, 0) as total_users,
          0 as total_projects,  -- Add projects table later
          0 as total_tasks      -- Add tasks table later
        FROM tenants t
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) as total_users 
          FROM users WHERE is_active = true 
          GROUP BY tenant_id
        ) u_count ON t.id = u_count.tenant_id
        WHERE t.id = $1
      `, [tenantId]);
  
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }
  
      const tenant = tenantResult.rows[0];
  
      return res.status(200).json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          status: tenant.status,
          subscriptionPlan: tenant.subscription_plan,
          maxUsers: parseInt(tenant.max_users),
          maxProjects: parseInt(tenant.max_projects),
          createdAt: tenant.created_at,
          stats: {
            totalUsers: parseInt(tenant.total_users),
            totalProjects: parseInt(tenant.total_projects),
            totalTasks: parseInt(tenant.total_tasks)
          }
        }
      });
  
    } catch (error) {
      console.error('Tenant details error:', error);
      next(error);
    }
  };
  

exports.updateTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;
    const { name, status, subscriptionPlan, maxUsers, maxProjects } = req.body;

    // ✅ AUTHORIZATION: tenant_admin OR super_admin
    if (userRole !== 'super_admin' && userTenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to tenant'
      });
    }

    // ✅ RESTRICTED FIELDS: tenant_admin can ONLY update name
    const restrictedFields = ['status', 'subscriptionPlan', 'maxUsers', 'maxProjects'];
    const hasRestrictedFields = restrictedFields.some(field => req.body[field] !== undefined);
    
    if (userRole !== 'super_admin' && hasRestrictedFields) {
      return res.status(403).json({
        success: false,
        message: 'Tenant admins can only update name'
      });
    }

    // ✅ Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (status !== undefined && userRole === 'super_admin') {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (subscriptionPlan !== undefined && userRole === 'super_admin') {
      updates.push(`subscription_plan = $${paramIndex}`);
      values.push(subscriptionPlan);
      paramIndex++;
    }
    if (maxUsers !== undefined && userRole === 'super_admin') {
      updates.push(`max_users = $${paramIndex}`);
      values.push(parseInt(maxUsers));
      paramIndex++;
    }
    if (maxProjects !== undefined && userRole === 'super_admin') {
      updates.push(`max_projects = $${paramIndex}`);
      values.push(parseInt(maxProjects));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(tenantId); // Last param for WHERE clause

    // ✅ UPDATE + RETURN updated data
    const result = await pool.query(`
      UPDATE tenants 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, name, updated_at
    `, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const updatedTenant = result.rows[0];

    // ✅ AUDIT LOGGING
    await logAction({
      tenant_id: tenantId,
      user_id: req.user.id,
      action: 'TENANT_UPDATED',
      entity_type: 'tenant',
      entity_id: tenantId,
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        updatedAt: updatedTenant.updated_at
      }
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    next(error);
  }
};

exports.listTenants = async (req, res, next) => {
    try {
      const userRole = req.user.role;
  
      // ✅ SUPER_ADMIN ONLY
      if (userRole !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Super admin access required'
        });
      }
  
      // ✅ PAGINATION + FILTERS
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const offset = (page - 1) * limit;
      const status = req.query.status;
      const subscriptionPlan = req.query.subscriptionPlan;
  
      // ✅ DYNAMIC WHERE CLAUSE
      const whereConditions = [];
      const whereValues = [];
      let paramIndex = 1;
  
      if (status) {
        whereConditions.push(`t.status = $${paramIndex}`);
        whereValues.push(status);
        paramIndex++;
      }
      if (subscriptionPlan) {
        whereConditions.push(`t.subscription_plan = $${paramIndex}`);
        whereValues.push(subscriptionPlan);
        paramIndex++;
      }
  
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
      // ✅ TENANTS QUERY (DEFINES tenantsResult)
      const tenantsQuery = `
        SELECT 
          t.id, t.name, t.subdomain, t.status, t.subscription_plan,
          COALESCE(u_count.total_users, 0) as total_users,
          0 as total_projects,
          t.created_at
        FROM tenants t
        LEFT JOIN (
          SELECT tenant_id, COUNT(*) as total_users 
          FROM users WHERE is_active = true 
          GROUP BY tenant_id
        ) u_count ON t.id = u_count.tenant_id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      whereValues.push(limit, offset);
      const tenantsResult = await pool.query(tenantsQuery, whereValues);  // ✅ DEFINED HERE
  
      // ✅ COUNT QUERY
      const countQuery = `
        SELECT COUNT(*) as total_tenants
        FROM tenants t
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, whereValues.slice(0, -2));
      const totalTenants = parseInt(countResult.rows[0].total_tenants);
      const totalPages = Math.ceil(totalTenants / limit);
  
      return res.status(200).json({
        success: true,
        data: {
          tenants: tenantsResult.rows,  // ✅ NOW DEFINED
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalTenants: totalTenants,
            limit: limit
          }
        }
      });
  
    } catch (error) {
      console.error('List tenants error:', error);
      next(error);
    }
  };
  
  
exports.addUserToTenant = async (req, res, next) => {
    const client = await pool.connect();
    
    try {
      const tenantId = req.params.tenantId;
      const userRole = req.user.role;
      const userTenantId = req.user.tenant_id;
      const { email, password, fullName, role = 'user' } = req.body;
  
      // ✅ VALIDATION
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is  required'
        });
      }
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'password is required'
        });
      }
      if (!fullName) {
        return res.status(400).json({
          success: false,
          message: 'fullName is required'
        });
      }
  
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters'
        });
      }
  
      if (!['user', 'tenant_admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be "user" or "tenant_admin"'
        });
      }
  
      // ✅ AUTHORIZATION: tenant_admin only
      if (userRole !== 'tenant_admin' || userTenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Tenant admin access required for this tenant'
        });
      }
  
      await client.query('BEGIN');
  
      // 1️⃣ CHECK SUBSCRIPTION LIMIT
      const tenantCheck = await client.query(`
        SELECT name, max_users, 
               (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) as current_users
        FROM tenants WHERE id = $1
      `, [tenantId]);
  
      if (tenantCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }
  
      const tenant = tenantCheck.rows[0];
      const currentUsers = parseInt(tenant.current_users);
      const maxUsers = parseInt(tenant.max_users);
  
      if (currentUsers >= maxUsers) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: `User limit reached (${maxUsers} users). Upgrade subscription to add more.`
        });
      }
  
      // 2️⃣ CHECK EMAIL UNIQUENESS IN TENANT
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
        [tenantId, email]
      );
  
      if (emailCheck.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Email already exists in this tenant'
        });
      }
  
      // 3️⃣ HASH PASSWORD
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 4️⃣ CREATE USER
      const userId = uuidv4();
      const result = await client.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
        RETURNING id, email, full_name as "fullName", role, tenant_id as "tenantId", 
                  is_active as "isActive", created_at as "createdAt"
      `, [userId, tenantId, email, hashedPassword, fullName, role]);
  
      await client.query('COMMIT');
  
      const newUser = result.rows[0];
  
      // ✅ AUDIT LOGGING
      await logAction({
        tenant_id: tenantId,
        user_id: req.user.id,
        action: 'USER_CREATED',
        entity_type: 'user',
        entity_id: userId,
        ip_address: req.ip || req.connection.remoteAddress
      });
  
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add user error:', error);
      next(error);
    } finally {
      client.release();
    }
  };
  exports.listTenantUsers = async (req, res, next) => {
    try {
      const tenantId = req.params.tenantId;
      const userTenantId = req.user.tenant_id;
      const userRole = req.user.role;
  
      // ✅ AUTHORIZATION: Must belong to this tenant
      if (userTenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Access restricted to tenant members only'
        });
      }
  
      // ✅ PAGINATION + FILTERS
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const roleFilter = req.query.role;
  
      // ✅ DYNAMIC WHERE CLAUSE
      const whereConditions = ['u.tenant_id = $1', 'u.is_active = true'];
      const whereValues = [tenantId];
      let paramIndex = 2;
  
      // ✅ SEARCH: name OR email (case-insensitive)
      if (search.trim()) {
        whereConditions.push(`
          LOWER(u.full_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(u.email) LIKE LOWER($${paramIndex})
        `);
        whereValues.push(`%${search.trim()}%`);
        paramIndex++;
      }
  
      // ✅ ROLE FILTER
      if (roleFilter && ['user', 'tenant_admin'].includes(roleFilter)) {
        whereConditions.push(`u.role = $${paramIndex}`);
        whereValues.push(roleFilter);
        paramIndex++;
      }
  
      const whereClause = whereConditions.join(' AND ');
  
      // ✅ USERS QUERY (no password_hash)
      const usersQuery = `
        SELECT 
          u.id, u.email, u.full_name as "fullName", u.role, 
          u.is_active as "isActive", u.created_at as "createdAt"
        FROM users u
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      whereValues.push(limit, offset);
      const usersResult = await pool.query(usersQuery, whereValues);
  
      // ✅ TOTAL COUNT
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${whereClause}
      `;
      const countValues = whereValues.slice(0, -2); // Remove limit/offset
      const countResult = await pool.query(countQuery, countValues);
      const totalUsers = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalUsers / limit);
  
      return res.status(200).json({
        success: true,
        data: {
          users: usersResult.rows,
          total: totalUsers,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            limit: limit
          }
        }
      });
  
    } catch (error) {
      console.error('List tenant users error:', error);
      next(error);
    }
  };
  