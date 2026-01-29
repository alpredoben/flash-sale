import { body, param, ValidationChain } from 'express-validator';
import { reqValidation } from '@validators/validation';
import lang from '@lang/index';

class RoleValidator {
  private static instance: RoleValidator;

  private constructor() {}

  public static getInstance(): RoleValidator {
    if (!RoleValidator.instance) {
      RoleValidator.instance = new RoleValidator();
    }
    return RoleValidator.instance;
  }

  create(): ValidationChain[] {
    return [
      reqValidation('name', 'Role Name', 'body', false)
        .isLength({ min: 2, max: 50 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Role Name',
            min: '2',
            max: '50',
          })
        )
        .matches(/^[a-zA-Z0-9\s-]+$/)
        .withMessage(
          'Role name can only contain letters, numbers, spaces, and hyphens'
        ),

      reqValidation('description', 'Role Description', 'body', true)
        .isLength({ max: 500 })
        .withMessage(
          lang.__('error.validation.max', {
            field: 'Role Description',
            max: '500',
          })
        ),

      body('permissionIds')
        .optional()
        .isArray()
        .withMessage(
          lang.__('error.validation.array', { field: 'Permission IDs' })
        ),

      body('permissionIds.*')
        .optional()
        .isUUID()
        .withMessage(
          lang.__('error.validation.uuid', { field: 'Each permission ID' })
        ),
    ];
  }

  update(): ValidationChain[] {
    return [
      param('id').isUUID().withMessage('Role ID must be a valid UUID'),

      reqValidation('name', 'Role Name', 'body', true)
        .isLength({ min: 2, max: 50 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Role Name',
            min: '2',
            max: '50',
          })
        )
        .matches(/^[a-zA-Z0-9\s-]+$/)
        .withMessage(
          'Role name can only contain letters, numbers, spaces, and hyphens'
        ),

      reqValidation('description', 'Role Description', 'body', true)
        .isLength({ max: 500 })
        .withMessage(
          lang.__('error.validation.max', {
            field: 'Role Description',
            max: '500',
          })
        ),

      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value'),

      body('permissionIds')
        .optional()
        .isArray()
        .withMessage('Permission IDs must be an array'),

      body('permissionIds.*')
        .optional()
        .isUUID()
        .withMessage('Each permission ID must be a valid UUID'),
    ];
  }

  getById(): ValidationChain[] {
    return [param('id').isUUID().withMessage('Role ID must be a valid UUID')];
  }

  delete(): ValidationChain[] {
    return [param('id').isUUID().withMessage('Role ID must be a valid UUID')];
  }

  assignPermissions(): ValidationChain[] {
    return [
      param('id').isUUID().withMessage('Role ID must be a valid UUID'),

      reqValidation('permissionIds', 'Permission IDs', 'body', false)
        .isArray({ min: 1 })
        .withMessage('Permission IDs must be a non-empty array'),

      body('permissionIds.*')
        .isUUID()
        .withMessage('Each permission ID must be a valid UUID'),
    ];
  }

  /**
   * Validation for removing permissions
   */
  removePermissions(): ValidationChain[] {
    return [
      param('id').isUUID().withMessage('Role ID must be a valid UUID'),

      reqValidation('permissionIds', 'Permission IDs', 'body', false)
        .isArray({ min: 1 })
        .withMessage('Permission IDs must be a non-empty array'),

      body('permissionIds.*')
        .isUUID()
        .withMessage('Each permission ID must be a valid UUID'),
    ];
  }
}

export default RoleValidator.getInstance();
