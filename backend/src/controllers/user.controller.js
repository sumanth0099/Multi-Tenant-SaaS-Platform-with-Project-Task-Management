const pool = require('../config/db'); 
const { logAction } = require('../services/audit');
const bcrypt = require('bcryptjs');  
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth')

exports.updateUser = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.params.userId;
    const currentUser = req.user;
    const { fullName, role, isActive } = req.body;

    // ✅ BUG 5: VALIDATE fullName (not empty)
    if (fullName !== undefined && (!fullName || fullName.trim() === '')) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'fullName cannot be empty'
      });
    }

    // ✅ BUG 1: FETCH ALL USERS (active + inactive)
    const userCheck = await client.query(
      'SELECT id, tenant_id, role, full_name FROM users WHERE id = $1', // ✅ Removed is_active filter
      [userId]
    );

    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const targetUser = userCheck.rows[0];
    
    // ✅ BUG 2: FULL RBAC AUTHORIZATION
    const isSelfUpdate = userId === currentUser.id;
    const isTenantAdmin = currentUser.role === 'tenant_admin';
    const isSuperAdmin = currentUser.role === 'super_admin';

    // ✅ TENANT ISOLATION
    if (!isSuperAdmin && targetUser.tenant_id !== currentUser.tenant_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Tenant access denied' });
    }

    // ✅ BUG 2: AUTHORIZATION CHECKS
    if (!isSelfUpdate && !isTenantAdmin && !isSuperAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Tenant admin required' });
    }

    // ✅ BUG 3: SUPER ADMIN PROTECTION
    if (isSuperAdmin && isSelfUpdate && (role !== undefined || isActive === false)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Super admin cannot change own role/status'
      });
    }

    // 🔥 BUG 1+3: 2-ADMIN CHECK (DB-based, ALL users)
    const isAdminTarget = targetUser.role === 'tenant_admin';
    const isDangerousChange = (role === 'user' || isActive === false) && isAdminTarget;
    
    if (isDangerousChange && !isSuperAdmin) {
      const adminCount = await client.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE tenant_id = $1 
          AND role = 'tenant_admin' 
          AND id != $2 
          AND is_active = true
      `, [currentUser.tenant_id, userId]);
      
      const otherAdmins = parseInt(adminCount.rows[0].count);
      if (otherAdmins === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot leave tenant without tenant_admin'
        });
      }
    }

    // ✅ ROLE VALIDATION
    const allowedRoles = isSuperAdmin ? 
      ['super_admin', 'tenant_admin', 'user'] : 
      ['tenant_admin', 'user'];
    
    if (role !== undefined && !allowedRoles.includes(role)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Role must be: ${allowedRoles.join(', ')}`
      });
    }

    // ✅ SELF-UPDATE: Users can ONLY change fullName
    if (isSelfUpdate && !isTenantAdmin && !isSuperAdmin && (role !== undefined || isActive !== undefined)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Users can only update own fullName'
      });
    }

    // ✅ DYNAMIC UPDATE
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(fullName.trim());
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId); // WHERE

    const query = `
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, full_name as "fullName", role, is_active as "isActive", tenant_id
    `;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    const updatedUser = result.rows[0];

    // ✅ BUG 4: NEW TOKEN ONLY FOR SELF-UPDATE
    let newToken = null;
    if (isSelfUpdate) {
      newToken = generateToken({
        id: updatedUser.id,
        tenantId: updatedUser.tenant_id,
        role: updatedUser.role,  // ✅ Fresh from DB!
        email: currentUser.email
      });
    }

    await logAction({
      tenant_id: currentUser.tenant_id || targetUser.tenant_id,
      user_id: currentUser.id,
      action: 'USER_UPDATED',
      entity_type: 'user',
      entity_id: userId,
      details: { fullName, role, isActive }
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser,
        token: newToken  // ✅ Only for self-update!
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user error:', error);
    next(error);
  } finally {
    client.release();
  }
};



exports.deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.params.userId;
    const currentUser = req.user;

    // Allow only tenant_admin or super_admin
    if (!['tenant_admin', 'super_admin'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Tenant admin or super admin access required'
      });
    }

    await client.query('BEGIN');

    // Fetch user with row lock
    const userCheck = await client.query(`
      SELECT tenant_id, role, is_active, full_name 
      FROM users 
      WHERE id = $1 FOR UPDATE
    `, [userId]);

    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = userCheck.rows[0];

    // Already deleted?
    if (!targetUser.is_active) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User already deleted'
      });
    }

    // Tenant isolation (super_admin bypass)
    if (currentUser.role !== 'super_admin' && targetUser.tenant_id !== currentUser.tenant_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Access restricted to tenant members only'
      });
    }

    // Cannot delete self
    if (userId === currentUser.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }

    // Only super_admin can delete another tenant_admin
    if (targetUser.role === 'tenant_admin' && currentUser.role === 'tenant_admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only super_admin can delete tenant_admin'
      });
    }

    // Prevent deleting the last active tenant_admin
    if (targetUser.role === 'tenant_admin') {
      const adminCount = await client.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE tenant_id = $1 
          AND role = 'tenant_admin' 
          AND id != $2 
          AND is_active = true
      `, [targetUser.tenant_id, userId]);
      
      const remainingAdmins = parseInt(adminCount.rows[0].count);
      if (remainingAdmins === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last tenant_admin. Promote another user first.'
        });
      }
    }

    // Reassign tasks to unassigned
    await client.query(`
      UPDATE tasks 
      SET assigned_to = NULL 
      WHERE assigned_to = $1 AND tenant_id = $2
    `, [userId, targetUser.tenant_id]);

    // SOFT DELETE — No deleted_at column needed
    await client.query(`
      UPDATE users 
      SET is_active = false
      WHERE id = $1
    `, [userId]);

    await client.query('COMMIT');

    // AUDIT LOG — Rich but safe (details ignored if not supported)
    const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;

    await logAction({
      tenant_id: targetUser.tenant_id,
      user_id: currentUser.id,
      action: 'USER_DELETED',
      entity_type: 'user',
      entity_id: userId,
      ip_address: ipAddress
      // details: { deletedUserRole: targetUser.role }  // Optional — safe to include
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    next(error);
  } finally {
    client.release();
  }
};