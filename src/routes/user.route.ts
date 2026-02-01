import { Router } from 'express';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';
import userController from '@/app/controllers/user.controller';
import userValidator from '@/shared/validators/user.validator';

const router = Router();

router.use(authMiddleware.authenticate);

/**
 * @desc    Fetch user paginated
 * @path   [GET] /api/v1/users
 */
router.get('/', userController.fetch.bind(userController));

/**
 * @desc    Get User By ID
 * @path   [GET] /api/v1/users/:id
 */
router.get(
  '/:id',
  ...validationMiddleware.validateRequest(userValidator.getUser()),
  userController.findById.bind(userController)
);

export default router;
