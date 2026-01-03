// Adds tenant_id filtering to queries if user is not super_admin
const applyTenantIsolation = (req, table) => {
    if (req.user.role === 'super_admin') return '';
    return `WHERE tenant_id = '${req.user.tenant_id}'`;
  };
  
  module.exports = applyTenantIsolation;
  