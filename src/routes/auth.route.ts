import authMiddleware from '@/shared/middlewares/auth.middleware';
import validationMiddleware from '@/shared/middlewares/validation.middleware';
import authValidator from '@/shared/validators/auth.validator';
import authController from '@controllers/auth.controller';
import { Router } from 'express';

const router = Router();

/**
 * @desc REGISTER
 * @path [POST] /api/v1/auth/register
 */
router.post(
  '/register',
  ...validationMiddleware.validateRequest(authValidator.register()),
  authController.register.bind(authController)
);

/**
 * @desc LOGIN
 * @path [POST] /api/v1/auth/login
 */
router.post(
  '/login',
  ...validationMiddleware.validateRequest(authValidator.login()),
  authController.login.bind(authController)
);

/**
 * @desc  REFRESH TOKEN
 * @path  POST /api/v1/auth/refresh
 */
router.post(
  '/refresh',
  ...validationMiddleware.validateRequest(authValidator.refreshToken()),
  authController.refreshToken.bind(authController)
);

/**
 * @desc LOGOUT
 * @path [POST] /api/v1/auth/logout
 */
router.post(
  '/logout',
  authMiddleware.authenticate,
  authController.logout.bind(authController)
);

/**
 * @desc VERIFY EMAIL
 * @path [POST] /api/v1/auth/verify-email
 */
router.post(
  '/verify-email',
  ...validationMiddleware.validateRequest(authValidator.verifyEmail()),
  authController.verifyEmail.bind(authController)
);

/**
 * @desc  FORGOT PASSWORD
 * @path  [POST] /api/v1/auth/forgot-password
 */
router.post(
  '/forgot-password',
  ...validationMiddleware.validateRequest(authValidator.forgotPassword()),
  authController.forgotPassword.bind(authController)
);

/**
 * @desc  RESET PASSWORD
 * @path  [POST] /api/v1/auth/reset-password
 */
router.post(
  '/reset-password',
  ...validationMiddleware.validateRequest(authValidator.resetPassword()),
  authController.resetPassword.bind(authController)
);

/**
 * @desc    MANUAL CHANGE PASSWORD
 * @path  [POST] /api/v1/auth/change-password
 */
router.post(
  '/change-password',
  authMiddleware.authenticate,
  ...validationMiddleware.validateRequest(authValidator.changePassword()),
  authController.changePassword.bind(authController)
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile',
  authMiddleware.authenticate,
  authController.getProfile.bind(authController)
);

/**
 * @desc    Resend verification email
 * @path  [POST] /api/v1/auth/resend-verification
 */
router.post(
  '/resend-verification',
  authMiddleware.authenticate,
  authController.resendVerificationEmail.bind(authController)
);

export default router;
