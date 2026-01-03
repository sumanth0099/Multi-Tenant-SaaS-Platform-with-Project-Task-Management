// src/services/audit.js

const pool = require('../config/db');

/**
 * Log an action to audit_logs table
 * @param {Object} params
 * @param {string|null} params.tenant_id - Required for tenant actions, null for super_admin/system
 * @param {string|null} params.user_id - Who performed the action (can be null for system)
 * @param {string} params.action - e.g. 'USER_DELETED', 'LOGIN', 'PROJECT_CREATED'
 * @param {string|null} [params.entity_type] - 'user', 'project', 'task', etc.
 * @param {string|null} [params.entity_id] - ID of affected entity
 * @param {string|null} [params.ip_address] - Optional client IP
 */
const logAction = async ({
  tenant_id,
  user_id = null,
  action,
  entity_type = null,
  entity_id = null,
  ip_address = null
}) => {
  if (!action) {
    console.warn('Audit log skipped: missing action');
    return;
  }

  // tenant_id can be null for super_admin actions — that's allowed by your schema
  // But action is mandatory

  const query = `
    INSERT INTO audit_logs (
      id,
      tenant_id,
      user_id,
      action,
      entity_type,
      entity_id,
      ip_address,
      created_at
    ) VALUES (
      gen_random_uuid(),
      $1,
      $2::uuid,
      $3,
      $4,
      $5::uuid,
      $6,
      CURRENT_TIMESTAMP
    )
  `;

  const values = [
    tenant_id,     // $1 - can be null
    user_id,       // $2 - can be null
    action,        // $3
    entity_type,   // $4 - can be null
    entity_id,     // $5 - cast to uuid if present
    ip_address     // $6 - can be null
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    // NEVER let audit logging crash your app
    console.error('Failed to write audit log:', {
      action,
      tenant_id,
      user_id,
      entity_id,
      error: error.message
    });
  }
};

module.exports = { logAction };