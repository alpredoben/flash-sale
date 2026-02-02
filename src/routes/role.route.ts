import { Router } from 'express';
import roleController from '@controllers/role.controller';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import roleValidator from '@validators/role.validator';

const router = Router();

router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize(['superadmin']));

/**
 * @desc    Fetch all roles
 * @path    [GET] /api/v1/roles
 * @access  Private (Superadmin)
 */
router.get(
  '/',
  ...validationMiddleware.validateRequest(roleValidator.fetchAll()),
  roleController.getAll.bind(roleController)
);

/**
 * @desc    Get role by id
 * @path    [GET] /api/v1/roles/:id
 * @access  Private (Superadmin)
 */
router.get(
  '/:id',
  ...validationMiddleware.validateRequest(roleValidator.getById()),
  roleController.getById.bind(roleController)
);

/**
 * @desc    Create a new role
 * @path    [POST] /api/v1/roles
 * @access  Private (Superadmin)
 */
router.post(
  '/',
  ...validationMiddleware.validateRequest(roleValidator.create()),
  roleController.create.bind(roleController)
);

/**
 * @desc    Update role by id
 * @path    [PUT] /api/v1/roles/:id
 * @access  Private (Superadmin)
 */
router.put(
  '/:id',
  ...validationMiddleware.validateRequest(roleValidator.update()),
  roleController.update.bind(roleController)
);

/**
 * @desc    Delete role by id
 * @path    [DELETE] /api/v1/roles/:id
 * @access  Private (Superadmin)
 */
router.delete(
  '/:id',
  ...validationMiddleware.validateRequest(roleValidator.delete()),
  roleController.delete.bind(roleController)
);

/**
 * @desc    Assigned permission to role
 * @path    [POST] /api/v1/roles/:id/permissions
 * @access  Private (Superadmin)
 */
router.post(
  '/:id/permissions',
  ...validationMiddleware.validateRequest(roleValidator.assignPermissions()),
  roleController.assignPermissions.bind(roleController)
);

/**
 * @desc    Delete permission by id
 * @path    [DELETE] /api/v1/roles/:id/permissions
 * @access  Private (Superadmin)
 */
router.delete(
  '/:id/permissions',
  ...validationMiddleware.validateRequest(roleValidator.removePermissions()),
  roleController.removePermissions.bind(roleController)
);

/**
 * @desc    Get role statistic
 * @path    [GET] /api/v1/roles/statistics,
 * @access  Private (Superadmin)
 */
router.get('/statistics', roleController.getStats.bind(roleController));

export default router;
