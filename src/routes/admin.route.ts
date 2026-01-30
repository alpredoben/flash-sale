import { Router } from 'express';
import reservationController from '@controllers/reservation.controller';
import itemController from '@controllers/item.controller';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import reservationValidator from '@validators/reservation.validator';

const router = Router();

// Apply admin authorization to all routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize(['admin']));

/**
 * @desc    Get all reservations
 * @path   [GET] /api/v1/admin/reservations
 * @access  Private (Admin)
 */
router.get(
  '/reservations',
  ...validationMiddleware.validateRequest(reservationValidator.getList()),
  reservationController.getAll.bind(reservationController)
);

/**
 * @desc    Get all reservation statistics
 * @path    [GET] /api/v1/admin/reservations/stats
 * @access  Private (Admin)
 */
router.get(
  '/reservations/stats',
  reservationController.getAllStats.bind(reservationController)
);

/**
 * @desc    Cancel reservation by admin
 * @path    [POST] /api/v1/admin/reservations/:id/cancel
 * @access  Private (Admin)
 */
router.post(
  '/reservations/:id/cancel',
  ...validationMiddleware.validateRequest(reservationValidator.adminCancel()),
  reservationController.adminCancel.bind(reservationController)
);

/**
 * @desc    Get low stock items
 * @path    [GET] /api/v1/admin/items/low-stock
 * @access  Private (Admin only)
 */
router.get(
  '/items/low-stock',
  itemController.getLowStockItems.bind(itemController)
);

/**
 * @desc    Get item statistics
 * @path    [GET] /api/v1/admin/items/stats
 * @access  Private (Admin)
 */
router.get('/items/stats', itemController.getStats.bind(itemController));

export default router;
