const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/auth.controller');
const tenantController = require('../controllers/tenant.controller');
const userController = require('../controllers/user.controller');
const projectController = require('../controllers/project.controller');
const taskController = require('../controllers/task.controller');

// Validator
const { registerTenantValidator } = require('../validators/auth.validator');

// Middleware - CORRECT DESTRUCTURING (this was the final bug!)
const { authenticate } = require('../middleware/auth.js');

// ===========================
// AUTH ROUTES
// ===========================

  
  
router.post('/auth/register-tenant', registerTenantValidator, authController.registerTenant);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);
router.post('/auth/logout', authenticate, authController.logout);

// ===========================
// PROJECT ROUTES
// ===========================
router.post('/projects', authenticate, projectController.createProject);
router.get('/projects', authenticate, projectController.listProjects);
router.put('/projects/:projectId', authenticate, projectController.updateProject);
router.delete('/projects/:projectId', authenticate, projectController.deleteProject);

// ===========================
// TASK ROUTES
// ===========================
router.post('/projects/:projectId/tasks', authenticate, taskController.createTask);
router.get('/projects/:projectId/tasks', authenticate, taskController.listProjectTasks);
router.patch('/tasks/:taskId/status', authenticate, taskController.updateTaskStatus);
router.put('/tasks/:taskId', authenticate, taskController.updateTask);

// ===========================
// TENANT ROUTES
// ===========================
router.get('/tenants', authenticate, tenantController.listTenants);
router.get('/tenants/:tenantId', authenticate, tenantController.getTenantDetails);
router.put('/tenants/:tenantId', authenticate, tenantController.updateTenant);
router.post('/tenants/:tenantId/users', authenticate, tenantController.addUserToTenant);
router.get('/tenants/:tenantId/users', authenticate, tenantController.listTenantUsers);

// ===========================
// USER ROUTES
// ===========================
router.put('/users/:userId', authenticate, userController.updateUser);
router.delete('/users/:userId', authenticate, userController.deleteUser);

module.exports = router;