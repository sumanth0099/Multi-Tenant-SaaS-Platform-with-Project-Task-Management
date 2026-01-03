const  pool  = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { logAction } = require('../services/audit');

exports.createTask = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const projectId = req.params.projectId;
    const { title, description, assignedTo, priority = 'medium', dueDate } = req.body;
    const tenantId = req.user.tenant_id;
    const createdBy = req.user.id;

    // ✅ VALIDATION (unchanged)
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Task title must be at least 3 characters'
      });
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be "low", "medium", or "high"'
      });
    }

    await client.query('BEGIN');

    // ✅ VERIFY PROJECT (unchanged)
    const projectCheck = await client.query(`
      SELECT id, tenant_id FROM projects 
      WHERE id = $1 AND tenant_id = $2
    `, [projectId, tenantId]);

    if (projectCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    // ✅ VALIDATE assignedTo (unchanged)
    let assignedToId = null;
    if (assignedTo) {
      const userCheck = await client.query(`
        SELECT id FROM users 
        WHERE id = $1 AND tenant_id = $2 AND is_active = true
      `, [assignedTo, tenantId]);
      
      if (userCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Assigned user not found in this tenant'
        });
      }
      assignedToId = assignedTo;
    }

    // ✅ FIXED INSERT - Matches YOUR SCHEMA EXACTLY (10 columns)
    const taskId = uuidv4();
    const result = await client.query(`
      INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at)
      VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id, project_id as "projectId", tenant_id as "tenantId", title, description, status, priority, assigned_to as "assignedTo", due_date as "dueDate", created_at as "createdAt"
    `, [taskId, projectId, tenantId, title.trim(), description || null, priority, assignedToId, dueDate || null]);

    await client.query('COMMIT');

    // ✅ AUDIT LOG (unchanged)
    await logAction({
      tenant_id: tenantId,
      user_id: createdBy,
      action: 'TASK_CREATED',
      entity_type: 'task',
      entity_id: taskId,
      details: { title, priority, assignedTo: assignedToId },
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    next(error);
  } finally {
    client.release();
  }
};

exports.listProjectTasks = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const statusFilter = req.query.status;
    const assignedToFilter = req.query.assignedTo;
    const priorityFilter = req.query.priority;

    // ✅ VERIFY PROJECT ACCESS
    const projectCheck = await pool.query(`
      SELECT id FROM projects WHERE id = $1 AND tenant_id = $2
    `, [projectId, tenantId]);

    if (projectCheck.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    // ✅ DYNAMIC FILTERS
    const whereConditions = ['t.project_id = $1', 't.tenant_id = $2'];
    const whereValues = [projectId, tenantId];
    let paramIndex = 3;

    if (search.trim()) {
      whereConditions.push(`LOWER(t.title) LIKE LOWER($${paramIndex})`);
      whereValues.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (statusFilter && ['todo', 'in_progress', 'completed'].includes(statusFilter)) {
      whereConditions.push(`t.status = $${paramIndex}`);
      whereValues.push(statusFilter);
      paramIndex++;
    }

    if (assignedToFilter) {
      whereConditions.push(`t.assigned_to = $${paramIndex} OR t.assigned_to IS NULL`);
      whereValues.push(assignedToFilter);
      paramIndex++;
    }

    if (priorityFilter && ['low', 'medium', 'high'].includes(priorityFilter)) {
      whereConditions.push(`t.priority = $${paramIndex}`);
      whereValues.push(priorityFilter);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const tasksQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, 
        t.assigned_to as "assignedToId", t.due_date as "dueDate", t.created_at as "createdAt",
        u.full_name as "assignedToName", u.email as "assignedToEmail"
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE ${whereClause}
      ORDER BY 
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        t.due_date ASC,
        t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    whereValues.push(limit, offset);
    const tasksResult = await pool.query(tasksQuery, whereValues);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM tasks t
      WHERE ${whereClause}
    `;
    const countValues = whereValues.slice(0, -2);
    const countResult = await pool.query(countQuery, countValues);
    const totalTasks = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalTasks / limit);

    const tasks = tasksResult.rows.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedtoid ? {
        id: task.assignedtoid,
        fullName: task.assignedtoname,
        email: task.assignedtoemail
      } : null,
      dueDate: task.duedate,
      createdAt: task.createdat
    }));

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        total: totalTasks,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          limit: limit
        }
      }
    });

  } catch (error) {
    console.error('List tasks error:', error);
    next(error);
  }
};
// API 18: PATCH /api/tasks/:taskId/status
exports.updateTaskStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const taskId = req.params.taskId;
    const { status } = req.body;
    const tenantId = req.user.tenant_id;

    if (!['todo', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be todo, in_progress, or completed'
      });
    }

    const taskCheck = await client.query(`
      SELECT id FROM tasks 
      WHERE id = $1 AND tenant_id = $2
    `, [taskId, tenantId]);

    if (taskCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
    }

    await client.query(`
      UPDATE tasks 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [status, taskId]);

    res.json({
      success: true,
      message: 'Task status updated successfully'
    });

  } catch (error) {
    console.error('Update task status error:', error);
    next(error);
  } finally {
    client.release();
  }
};

// API 19: PUT /api/tasks/:taskId
exports.updateTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const taskId = req.params.taskId;
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    const tenantId = req.user.tenant_id;

    const taskCheck = await client.query(`
      SELECT id FROM tasks 
      WHERE id = $1 AND tenant_id = $2
    `, [taskId, tenantId]);

    if (taskCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title.trim());
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
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(assigned_to || null);
      paramIndex++;
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(due_date || null);
      paramIndex++;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(taskId);

    await client.query(`
      UPDATE tasks SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    res.json({
      success: true,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Update task error:', error);
    next(error);
  } finally {
    client.release();
  }
};
