import { body, param, query, ValidationChain } from 'express-validator';
import {
  En_PermissionCategory,
  En_PermissionAction,
} from '@constants/enum.constant';
import lang from '@lang/index';

class PermissionValidator {
  private static instance: PermissionValidator;

  private constructor() {}

  public static getInstance(): PermissionValidator {
    if (!PermissionValidator.instance) {
      PermissionValidator.instance = new PermissionValidator();
    }
    return PermissionValidator.instance;
  }

  private validationId() {
    return param('id')
      .notEmpty()
      .withMessage(lang.__('error.validation.required', { field: `ID` }));
  }

  create(): ValidationChain[] {
    return [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Permission Name',
            min: '2',
            max: '50',
          })
        ),

      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage(
          lang.__('error.validation.max', {
            field: 'Role Description',
            max: '500',
          })
        ),

      body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(Object.values(En_PermissionCategory))
        .withMessage('Invalid permission category'),

      body('resource')
        .trim()
        .notEmpty()
        .withMessage('Resource is required')
        .isLength({ min: 2, max: 50 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Permission Resource',
            min: '2',
            max: '50',
          })
        )
        .matches(/^[a-z_]+$/)
        .withMessage('Resource must be lowercase with underscores only'),

      body('action')
        .notEmpty()
        .withMessage('Action is required')
        .isIn(Object.values(En_PermissionAction))
        .withMessage('Invalid permission action'),
    ];
  }

  update(): ValidationChain[] {
    return [
      this.validationId(),

      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Permission name',
            min: '2',
            max: '100',
          })
        ),

      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),

      body('category')
        .optional()
        .isIn(Object.values(En_PermissionCategory))
        .withMessage('Invalid permission category'),

      body('resource')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Resource cannot be empty')
        .isLength({ min: 2, max: 50 })
        .withMessage('Resource must be between 2 and 50 characters')
        .matches(/^[a-z_]+$/)
        .withMessage('Resource must be lowercase with underscores only'),

      body('action')
        .optional()
        .isIn(Object.values(En_PermissionAction))
        .withMessage('Invalid permission action'),

      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value'),
    ];
  }

  /**
   * Validation for getting permission by ID
   */
  getById(): ValidationChain[] {
    return [this.validationId()];
  }

  /**
   * Validation for getting permissions by category
   */
  getByCategory(): ValidationChain[] {
    return [
      param('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(Object.values(En_PermissionCategory))
        .withMessage('Invalid permission category'),
    ];
  }

  /**
   * Validation for getting permissions by resource
   */
  getByResource(): ValidationChain[] {
    return [
      param('resource')
        .trim()
        .notEmpty()
        .withMessage('Resource is required')
        .matches(/^[a-z_]+$/)
        .withMessage('Resource must be lowercase with underscores only'),
    ];
  }

  /**
   * Validation for deleting permission
   */
  delete(): ValidationChain[] {
    return [this.validationId()];
  }

  /**
   * Validation for listing permissions with filters
   */
  list(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

      query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),

      query('category')
        .optional()
        .isIn(Object.values(En_PermissionCategory))
        .withMessage('Invalid permission category'),

      query('resource')
        .optional()
        .trim()
        .matches(/^[a-z_]+$/)
        .withMessage('Resource must be lowercase with underscores only'),

      query('isActive')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('isActive must be true or false'),

      query('includeRoles')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('includeRoles must be true or false'),

      query('activeOnly')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('activeOnly must be true or false'),
    ];
  }

  /**
   * Validation for bulk creating permissions
   */
  bulkCreate(): ValidationChain[] {
    return [
      body('resource')
        .trim()
        .notEmpty()
        .withMessage('Resource is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Resource must be between 2 and 50 characters')
        .matches(/^[a-z_]+$/)
        .withMessage('Resource must be lowercase with underscores only'),

      body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(Object.values(En_PermissionCategory))
        .withMessage('Invalid permission category'),

      body('actions')
        .notEmpty()
        .withMessage('Actions are required')
        .isArray({ min: 1 })
        .withMessage('Actions must be a non-empty array'),

      body('actions.*')
        .isIn(Object.values(En_PermissionAction))
        .withMessage('Invalid permission action'),
    ];
  }

  fetchAll(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

      query('search')
        .optional()
        .isString()
        .withMessage('Search must be a string')
        .trim(),

      query('category')
        .optional()
        .isString()
        .withMessage('Category must be a string')
        .trim(),

      query('resource')
        .optional()
        .isString()
        .withMessage('Resource must be a string')
        .trim(),

      query('isActive')
        .optional()
        .isBoolean()
        .withMessage('Is active must be a boolean'),
    ];
  }
}

export default PermissionValidator.getInstance();
