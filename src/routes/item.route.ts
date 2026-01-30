// src/routes/item.route.ts
import { Router } from 'express';
import itemController from '@controllers/item.controller';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import itemValidator from '@validators/item.validator';

const router = Router();

/**
 * @desc   Get active sale items
 * @path   [GET] /api/v1/items/sale/active
 */
router.get(
  '/sale/active',
  itemController.getActiveSaleItems.bind(itemController)
);

/**
 * @desc   Get all items
 * @path   [GET] /api/v1/items
 */
router.get(
  '/',
  ...validationMiddleware.validateRequest(itemValidator.getList()),
  itemController.getAll.bind(itemController)
);

/**
 * @desc   Get item by ID
 * @path   [GET] /api/v1/items/:id
 */
router.get(
  '/:id',
  ...validationMiddleware.validateRequest(itemValidator.getById()),
  itemController.getById.bind(itemController)
);

/**
 * @desc    Create new item
 * @path   [POST] /api/v1/items
 * @access  Private (Admin)
 */
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  ...validationMiddleware.validateRequest(itemValidator.create()),
  itemController.create.bind(itemController)
);

/**
 * @desc   Update item
 * @path   [PUT] /api/v1/items/:id
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  ...validationMiddleware.validateRequest(itemValidator.update()),
  itemController.update.bind(itemController)
);

/**
 * @desc    Delete item
 * @path   [DELETE] /api/v1/items/:id
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  ...validationMiddleware.validateRequest(itemValidator.delete()),
  itemController.delete.bind(itemController)
);

/**
 * @desc    Update item status
 * @path    [PATCH] /api/v1/items/:id/status
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/status',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  ...validationMiddleware.validateRequest(itemValidator.updateStatus()),
  itemController.updateStatus.bind(itemController)
);

/**
 * @desc    Get low stock items
 * @path    [GET] /api/v1/items/low-stock
 * @access  Private (Admin only)
 */
router.get(
  '/low-stock',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  itemController.getLowStockItems.bind(itemController)
);

/**
 * @desc    Get item statistics
 * @path   [GET] /api/v1/items/stats
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  authMiddleware.authenticate,
  authMiddleware.authorize(['admin']),
  itemController.getStats.bind(itemController)
);

export default router;
