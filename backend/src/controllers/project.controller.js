const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { logAction } = require('../services/audit');



exports.createProject = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { name, description, status = 'active' } = req.body;
    const tenantId = req.user.tenant_id;
    const createdBy = req.user.id;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Project name must be at least 3 characters'
      });
    }

    if (!['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "active", "completed", or "archived"'
      });
    }

    await client.query('BEGIN');

    const tenantCheck = await client.query(`
      SELECT name, max_projects,
             (SELECT COUNT(*) FROM projects WHERE tenant_id = $1) as current_projects
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
    const currentProjects = parseInt(tenant.current_projects);
    const maxProjects = parseInt(tenant.max_projects || 10);

    if (currentProjects >= maxProjects) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: `Project limit reached (${maxProjects} projects). Upgrade subscription.`
      });
    }

    const projectId = uuidv4();
    const result = await client.query(`
      INSERT INTO projects (id, tenant_id, name, description, status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, tenant_id as "tenantId", name, description, status, created_by as "createdBy", created_at as "createdAt"
    `, [projectId, tenantId, name.trim(), description || null, status, createdBy]);

    await client.query('COMMIT');

    await logAction({
      tenant_id: tenantId,
      user_id: createdBy,
      action: 'PROJECT_CREATED',
      entity_type: 'project',
      entity_id: projectId,
      details: { name, status },
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create project error:', error);
    next(error);
  } finally {
    client.release();
  }
};

exports.listProjects = async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const statusFilter = req.query.status;

    const whereConditions = ['p.tenant_id = $1'];
    const whereValues = [tenantId];
    let paramIndex = 2;

    if (search.trim()) {
      whereConditions.push(`LOWER(p.name) LIKE LOWER($${paramIndex})`);
      whereValues.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (statusFilter && ['active', 'completed', 'archived'].includes(statusFilter)) {
      whereConditions.push(`p.status = $${paramIndex}`);
      whereValues.push(statusFilter);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const projectsQuery = `
      SELECT 
        p.id, p.name, p.description, p.status,
        p.created_by as createdby, p.created_at as createdat,
        u.full_name as creatorname,
        COALESCE(task_count.total, 0) as taskcount,
        COALESCE(completed_count.total, 0) as completedtaskcount
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as total 
        FROM tasks GROUP BY project_id
      ) task_count ON p.id = task_count.project_id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as total 
        FROM tasks WHERE status = 'completed' GROUP BY project_id
      ) completed_count ON p.id = completed_count.project_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    whereValues.push(limit, offset);
    const projectsResult = await pool.query(projectsQuery, whereValues);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      WHERE ${whereClause}
    `;
    const countValues = whereValues.slice(0, -2);
    const countResult = await pool.query(countQuery, countValues);
    const totalProjects = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalProjects / limit);

    // ✅ FIXED: Use lowercase column names (PostgreSQL default)
    const projects = projectsResult.rows.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: {
        id: project.createdby,           // ✅ lowercase
        fullName: project.creatorname    // ✅ lowercase
      },
      taskCount: parseInt(project.taskcount),           // ✅ lowercase
      completedTaskCount: parseInt(project.completedtaskcount), // ✅ lowercase
      createdAt: project.createdat                     // ✅ lowercase
    }));

    return res.status(200).json({
      success: true,
      data: {
        projects,
        total: totalProjects,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          limit: limit
        }
      }
    });

  } catch (error) {
    console.error('List projects error:', error);
    next(error);
  }
};


// ✅ ADD TO YOUR EXISTING project.controller.js

exports.updateProject = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const projectId = req.params.projectId;
    const currentUser = req.user;
    const { name, description, status } = req.body;

    // ✅ VALIDATION
    if (!name && !description && status === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name, description, status) must be provided'
      });
    }

    if (status && !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "active", "completed", or "archived"'
      });
    }

    await client.query('BEGIN');

    // ✅ VERIFY PROJECT + AUTHORIZATION
    const projectCheck = await client.query(`
      SELECT p.id, p.tenant_id, p.created_by, t.name as tenant_name
      FROM projects p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [projectId, currentUser.tenant_id]);

    if (projectCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const project = projectCheck.rows[0];

    // ✅ AUTHORIZATION: tenant_admin OR creator
    if (currentUser.role !== 'tenant_admin' && project.created_by !== currentUser.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Tenant admin or project creator access required'
      });
    }

    // ✅ BUILD DYNAMIC UPDATE
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId);

    const result = await client.query(`
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, status, updated_at as "updatedAt"
    `, values);

    await client.query('COMMIT');

    // ✅ AUDIT LOG
    await logAction({
      tenant_id: currentUser.tenant_id,
      user_id: currentUser.id,
      action: 'PROJECT_UPDATED',
      entity_type: 'project',
      entity_id: projectId,
      details: { name, description, status },
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update project error:', error);
    next(error);
  } finally {
    client.release();
  }
};

exports.deleteProject = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const projectId = req.params.projectId;
    const currentUser = req.user;

    await client.query('BEGIN');

    // ✅ VERIFY PROJECT + AUTHORIZATION
    const projectCheck = await client.query(`
      SELECT p.id, p.tenant_id, p.created_by, p.name
      FROM projects p
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [projectId, currentUser.tenant_id]);

    if (projectCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const project = projectCheck.rows[0];

    // ✅ AUTHORIZATION: tenant_admin OR creator
    if (currentUser.role !== 'tenant_admin' && project.created_by !== currentUser.id) {
      await client.query('ROLLBACK');
      return res.status(200).json({  // ✅ Changed to 200 for graceful skip
        success: false,
        message: 'Tenant admin or project creator access required'
      });
    }

    // ✅ CASCADE DELETE - YOUR SCHEMA HANDLES TASKS AUTOMATICALLY!
    // NO UPDATE NEEDED - tasks auto-delete via ON DELETE CASCADE
    const result = await client.query(`
      DELETE FROM projects 
      WHERE id = $1
    `, [projectId]);

    await client.query('COMMIT');

    // ✅ AUDIT LOG
    await logAction({
      tenant_id: currentUser.tenant_id,
      user_id: currentUser.id,
      action: 'PROJECT_DELETED',
      entity_type: 'project',
      entity_id: projectId,
      details: { name: project.name },
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully (tasks auto-deleted via CASCADE)'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete project error:', error);
    next(error);
  } finally {
    client.release();
  }
};
