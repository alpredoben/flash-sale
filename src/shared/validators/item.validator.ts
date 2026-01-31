import { query } from 'express-validator';
import { En_ItemStatus } from '@constants/enum.constant';
import { reqValidation } from '@validators/validation';
import lang from '@lang/index';

class ItemValidator {
  private static instance: ItemValidator;

  private constructor() {}

  public static getInstance(): ItemValidator {
    if (!ItemValidator.instance) {
      ItemValidator.instance = new ItemValidator();
    }
    return ItemValidator.instance;
  }

  /** Validation rules for creating item */
  create() {
    return [
      reqValidation('sku', 'SKU', 'body', false)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'SKU' }))
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'SKU',
            min: '3',
            max: '100',
          })
        ),

      reqValidation('name', 'Name', 'body', false)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'Name' }))
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Name',
            min: '3',
            max: '255',
          })
        ),

      reqValidation('description', 'Description', 'body', true)
        .isString()
        .withMessage(
          lang.__('error.validation.string', { field: 'Description' })
        ),

      reqValidation('price', 'Price', 'body', false)
        .isFloat({ min: 0.01 })
        .withMessage('Price must be a positive number'),

      reqValidation('originalPrice', 'Original Price', 'body', true)
        .isFloat({ min: 0.01 })
        .withMessage('Original price must be a positive number'),

      reqValidation('stock', 'Stock', 'body', false)
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),

      reqValidation('status', 'Status', 'body', true)
        .isIn(Object.values(En_ItemStatus))
        .withMessage('Invalid status value'),

      reqValidation('imageUrl', 'Image URL', 'body', true)
        .isURL()
        .withMessage('Image URL must be a valid URL'),

      reqValidation('saleStartDate', 'Start Date Sales', 'body', true)
        .isISO8601()
        .withMessage('Sale start date must be a valid date'),

      reqValidation('saleEndDate', 'End Date Sales', 'body', true)
        .isISO8601()
        .withMessage('Sale end date must be a valid date'),

      reqValidation('maxPerUser', 'Max Per User', 'body', true)
        .isInt({ min: 1 })
        .withMessage('Max per user must be at least 1'),
    ];
  }

  private validationItemId() {
    return reqValidation('id', 'Item ID', 'param', false)
      .isUUID()
      .withMessage(lang.__('error.validation.uuid', { field: 'Item ID' }));
  }

  /** Validation rules for updating item */
  update() {
    return [
      this.validationItemId(),

      reqValidation('name', 'Name', 'body', true)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'Name' }))
        .isLength({ min: 3, max: 255 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Name',
            min: '3',
            max: '255',
          })
        ),

      reqValidation('description', 'Description', 'body', true)
        .isString()
        .withMessage(
          lang.__('error.validation.string', { field: 'Description' })
        ),

      reqValidation('price', 'Price', 'body', true)
        .isFloat({ min: 0.01 })
        .withMessage('Price must be a positive number'),

      reqValidation('originalPrice', 'Original Price', 'body', true)
        .isFloat({ min: 0.01 })
        .withMessage('Original price must be a positive number'),

      reqValidation('stock', 'Stock', 'body', true)
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),

      reqValidation('status', 'Status', 'body', true)
        .isIn(Object.values(En_ItemStatus))
        .withMessage('Invalid status value'),

      reqValidation('imageUrl', 'Image URL', 'body', true)
        .isURL()
        .withMessage('Image URL must be a valid URL'),

      reqValidation('saleStartDate', 'Start Date Sales', 'body', true)
        .isISO8601()
        .withMessage('Sale start date must be a valid date'),

      reqValidation('saleEndDate', 'End Date Sales', 'body', true)
        .isISO8601()
        .withMessage('Sale end date must be a valid date'),

      reqValidation('maxPerUser', 'Max Per User', 'body', true)
        .isInt({ min: 1 })
        .withMessage('Max per user must be at least 1'),
    ];
  }

  /** Validation rules for getting item by ID */
  getById() {
    return [this.validationItemId()];
  }

  /** Validation rules for deleting item */
  delete() {
    return [this.validationItemId()];
  }

  /** Validation rules for updating item status */
  updateStatus() {
    return [
      this.validationItemId(),

      reqValidation('status', 'Status', 'body', false)
        .isIn(Object.values(En_ItemStatus))
        .withMessage('Invalid status value'),
    ];
  }

  /** Validation rules for getting items list */
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

      query('search')
        .optional()
        .isString()
        .withMessage('Search must be a string')
        .trim(),

      query('status')
        .optional()
        .isIn(Object.values(En_ItemStatus))
        .withMessage('Invalid status value'),

      query('sortBy')
        .optional()
        .isIn(['name', 'price', 'stock', 'createdAt'])
        .withMessage('Invalid sort field'),

      query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC'),

      query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Min price must be a non-negative number'),

      query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max price must be a non-negative number'),

      query('inStock')
        .optional()
        .isBoolean()
        .withMessage('In stock must be a boolean'),
    ];
  }
}

export default ItemValidator.getInstance();
