import { body, query, param } from 'express-validator';
import { En_ReservationStatus } from '@constants/enum.constant';
import { reqValidation } from '@validators/validation';
import lang from '@lang/index';

class ReservationValidator {
  private static instance: ReservationValidator;

  private constructor() {}

  public static getInstance(): ReservationValidator {
    if (!ReservationValidator.instance) {
      ReservationValidator.instance = new ReservationValidator();
    }
    return ReservationValidator.instance;
  }

  private validateReservationId() {
    return reqValidation('id', 'Reservation ID', 'param', false)
      .isUUID()
      .withMessage(
        lang.__('error.validation.uuid', { field: 'Reservation ID' })
      );
  }

  /** Validation rules for creating reservation */
  create() {
    return [
      reqValidation('itemId', 'Item ID', 'body', false)
        .isUUID()
        .withMessage('Item ID must be a valid UUID'),

      reqValidation('quantity', 'Quantity', 'body', false)
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    ];
  }

  /** Validation rules for checkout */
  checkout() {
    return [this.validateReservationId()];
  }

  /** Validation rules for cancel */
  cancel() {
    return [
      this.validateReservationId(),

      reqValidation('reason', 'Reason', 'body', true)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'Reason' })),
    ];
  }

  /** Validation rules for admin cancel */
  adminCancel() {
    return [
      this.validateReservationId(),

      reqValidation('reason', 'Cancellation reason', 'body', false)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'Reason' }))
        .trim()
        .isLength({ min: 10 })
        .withMessage(
          lang.__('error.validation.min', { field: 'Reason', min: '10' })
        ),
    ];
  }

  /** Validation rules for getting reservation by ID */
  getById() {
    return [this.validateReservationId()];
  }

  /** Validation rules for getting reservations list */
  getList() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

      query('status')
        .optional()
        .isIn(Object.values(En_ReservationStatus))
        .withMessage('Invalid status value'),

      query('userId')
        .optional()
        .isUUID()
        .withMessage('User ID must be a valid UUID'),

      query('itemId')
        .optional()
        .isUUID()
        .withMessage('Item ID must be a valid UUID'),

      query('sortBy')
        .optional()
        .isIn(['createdAt', 'expiresAt', 'totalPrice'])
        .withMessage('Invalid sort field'),

      query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    ];
  }

  /** Validation rules for getting my reservations */
  getMyReservations() {
    return [
      query('status')
        .optional()
        .isIn(Object.values(En_ReservationStatus))
        .withMessage('Invalid status value'),
    ];
  }
}

export default ReservationValidator.getInstance();
