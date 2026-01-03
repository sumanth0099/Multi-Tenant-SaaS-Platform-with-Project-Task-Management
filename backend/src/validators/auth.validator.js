const { body, validationResult } = require('express-validator');

exports.registerTenantValidator = [
  body('tenantName').notEmpty().withMessage('Tenant name is required'),
  body('subdomain').notEmpty().withMessage('Subdomain is required'),
  body('adminEmail').isEmail().withMessage('Valid admin email required'),
  body('adminPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('adminFullName').notEmpty().withMessage('Admin full name is required'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors.array()
      });
    }
    next();
  }
];
