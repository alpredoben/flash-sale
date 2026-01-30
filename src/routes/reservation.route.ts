import { Router } from 'express';
import reservationController from '@controllers/reservation.controller';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import reservationValidator from '@validators/reservation.validator';

const router = Router();

/**
 * @desc    Create new reservation
 * @path   POST /api/v1/reservations
 */
router.post(
  '/',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(reservationValidator.create()),
  reservationController.create.bind(reservationController)
);

/**
 * @desc    Get my reservations
 * @path   [GET] /api/v1/reservations/me
 */
router.get(
  '/me',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(
    reservationValidator.getMyReservations()
  ),
  reservationController.getMyReservations.bind(reservationController)
);

/**
 * @desc    Get my reservation statistics
 * @path   [GET] /api/v1/reservations/stats
 */
router.get(
  '/stats',
  authMiddleware.authenticate,
  reservationController.getStats.bind(reservationController)
);

/**
 * @desc    Get reservation by ID
 * @path   [GET] /api/v1/reservations/:id
 */
router.get(
  '/:id',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(reservationValidator.getById()),
  reservationController.getById.bind(reservationController)
);

/**
 * @desc    Checkout reservation
 * @path   [POST] /api/v1/reservations/:id/checkout
 */
router.post(
  '/:id/checkout',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(reservationValidator.checkout()),
  reservationController.checkout.bind(reservationController)
);

/**
 * @desc    Cancel reservation
 * @path   [POST] /api/v1/reservations/:id/cancel
 */
router.post(
  '/:id/cancel',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(reservationValidator.cancel()),
  reservationController.cancel.bind(reservationController)
);

export default router;
