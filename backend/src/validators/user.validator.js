const { body, validationResult } = require('express-validator');
exports.createUserValidator = [
  body('email').isEmail(),
  body('full_name').notEmpty(),
  body('role').isIn(['tenant_admin', 'user']),
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
