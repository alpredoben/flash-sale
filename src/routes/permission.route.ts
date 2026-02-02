import { Router } from 'express';
import permissionController from '@controllers/permission.controller';

import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import permissionValidator from '@validators/permission.validator.';

const router = Router();

router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize(['superadmin']));

/**
 * @desc    Fetch all permissions
 * @path    [GET] /api/v1/permissions
 * @access  Private (Superadmin)
 */
router.get(
  '/',
  ...validationMiddleware.validateRequest(permissionValidator.fetchAll()),
  permissionController.fetchAll.bind(permissionController)
);

/**
 * @desc    Get permission by id
 * @path    [GET] /api/v1/permissions/:id
 * @access  Private (Superadmin)
 */
router.get(
  '/:id',
  ...validationMiddleware.validateRequest(permissionValidator.getById()),
  permissionController.fetchById.bind(permissionController)
);

/**
 * @desc    Get permission by category
 * @path    [GET] /api/v1/permissions/category/:category
 * @access  Private (Superadmin)
 */
router.get(
  '/category/:category',
  ...validationMiddleware.validateRequest(permissionValidator.getByCategory()),
  permissionController.fetchByCategory.bind(permissionController)
);

/**
 * @desc    Get permission  by resource
 * @path    [GET] /api/v1/permissions/resource/:resource
 * @access  Private (Superadmin)
 */
router.get(
  '/resource/:resource',
  ...validationMiddleware.validateRequest(permissionValidator.getByResource()),
  permissionController.fetchByResource.bind(permissionController)
);

/**
 * @desc    Create permission
 * @path    [POST] /api/v1/permissions
 * @access  Private (Superadmin)
 */
router.post(
  '/',
  ...validationMiddleware.validateRequest(permissionValidator.create()),
  permissionController.create.bind(permissionController)
);

/**
 * @desc    Update permission by id
 * @path    [PUT] /api/v1/permissions/:id
 * @access  Private (Superadmin)
 */
router.put(
  '/:id',
  ...validationMiddleware.validateRequest(permissionValidator.update()),
  permissionController.update.bind(permissionController)
);

/**
 * @desc    Delete permission by id
 * @path    [DELETE] /api/v1/permissions/:id
 * @access  Private (Superadmin)
 */
router.delete(
  '/:id',
  ...validationMiddleware.validateRequest(permissionValidator.delete()),
  permissionController.delete.bind(permissionController)
);

/**
 * @desc    Get permission group by category
 * @path    [GET] /api/v1/permissions/grouped/category
 * @access  Private (Superadmin)
 */
router.get(
  '/grouped/category',
  permissionController.fetchGroupedByCategory.bind(permissionController)
);

/**
 * @desc    Get permission group by resource
 * @path    [GET] /api/v1/permissions/grouped/resource
 * @access  Private (Superadmin)
 */
router.get(
  '/grouped/resource',
  permissionController.fetchGroupedByResource.bind(permissionController)
);

/**
 * @desc    Get permission statistics
 * @path    [GET] /api/v1/permissions/statistics
 * @access  Private (Superadmin)
 */
router.get(
  '/statistics',
  permissionController.fetchStatistic.bind(permissionController)
);

/**
 * @desc    Add permissions (Bulk Process)
 * @path    [POST] /api/v1/permissions/bulk
 * @access  Private (Superadmin)
 */
router.post(
  '/bulk',
  ...validationMiddleware.validateRequest(permissionValidator.bulkCreate()),
  permissionController.bulkCreatePermissions.bind(permissionController)
);

export default router;
