import { ValidationChain } from 'express-validator';
import { reqValidation } from '@validators/validation';
import lang from '@lang/index';

class AuthValidator {
  private static instance: AuthValidator;

  private constructor() {}

  public static getInstance(): AuthValidator {
    if (!AuthValidator.instance) {
      AuthValidator.instance = new AuthValidator();
    }
    return AuthValidator.instance;
  }

  /** Validation for registration */
  register(): ValidationChain[] {
    return [
      reqValidation('firstName', 'First Name', 'body', false)
        .isLength({ min: 2, max: 100 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'First Name',
            min: '2',
            max: '100',
          })
        )
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage(
          lang.__('error.validation.letter-spaces', { field: 'First Name' })
        ),

      reqValidation('lastName', 'Last Name', 'body', false)
        .isLength({ min: 2, max: 100 })
        .withMessage(
          lang.__('error.validation.min-max', {
            field: 'Last Name',
            min: '2',
            max: '100',
          })
        )
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage(
          lang.__('error.validation.letter-spaces', { field: 'First Name' })
        ),

      reqValidation('email', 'Email', 'body', false)
        .isEmail()
        .withMessage(lang.__('error.validation.email'))
        .normalizeEmail(),

      reqValidation('password', 'Password', 'body', false)
        .isLength({ min: 8 })
        .withMessage(
          lang.__('error.validation.min', { field: 'Password', min: '8' })
        )
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
        )
        .withMessage(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),

      reqValidation(
        'confirmPassword',
        'Confirm Password',
        'body',
        false
      ).custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),

      reqValidation('phone', 'Phone', 'body', false)
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Invalid phone number format'),
    ];
  }

  /** Validation for login */
  login(): ValidationChain[] {
    return [
      reqValidation('email', 'Email', 'body', false)
        .isEmail()
        .withMessage(lang.__('error.validation.email'))
        .normalizeEmail(),
      reqValidation('password', 'Password', 'body', false),
    ];
  }

  /**  Validation for refresh token */
  refreshToken(): ValidationChain[] {
    return [
      reqValidation('refreshToken', 'Refresh Token', 'body', false)
        .isString()
        .withMessage(
          lang.__('error.validation.string', { field: 'refreshToken' })
        ),
    ];
  }

  /** Validation for email verification */
  verifyEmail(): ValidationChain[] {
    return [
      reqValidation('token', 'Token', 'body', false)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'token' }))
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid token format'),
    ];
  }

  /** Validation for forgot password */
  forgotPassword(): ValidationChain[] {
    return [
      reqValidation('email', 'Email', 'body', false)
        .isEmail()
        .withMessage(lang.__('error.validation.email'))
        .normalizeEmail(),
    ];
  }

  /** Validation for reset password */
  resetPassword(): ValidationChain[] {
    return [
      reqValidation('token', 'Token', 'body', false)
        .isString()
        .withMessage(lang.__('error.validation.string', { field: 'token' }))
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid token format'),

      reqValidation('password', 'Password', 'body', false)
        .isLength({ min: 8 })
        .withMessage(
          lang.__('error.validation.min', { field: 'Password', min: '8' })
        )
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
        )
        .withMessage(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),

      reqValidation(
        'confirmPassword',
        'Confirm Password',
        'body',
        false
      ).custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    ];
  }

  /** Validation for change password */
  changePassword(): ValidationChain[] {
    return [
      reqValidation('currentPassword', 'Current Password', 'body', false),

      reqValidation('newPassword', 'New Password', 'body', false)
        .isLength({ min: 8 })
        .withMessage(
          lang.__('error.validation.min', { field: 'New Password', min: '8' })
        )
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
        )
        .withMessage(
          'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .custom((value, { req }) => {
          if (value === req.body.currentPassword) {
            throw new Error(
              'New password must be different from current password'
            );
          }
          return true;
        }),

      reqValidation(
        'confirmPassword',
        'Confirm Password',
        'body',
        false
      ).custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    ];
  }
}

export default AuthValidator.getInstance();
