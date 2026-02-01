import {
  In_DTO_ForgotPassword,
  In_DTO_Login,
  In_DTO_ManualChangePassword,
  In_DTO_Register,
  In_DTO_ResetPassword,
  In_DTO_VerifyEmail,
} from '@/interfaces/dto.interface';
import { Request, Response, NextFunction } from 'express';
import authService from '@services/auth.service';
import apiResponse from '@utils/response.util';
import lang from '@lang/index';
import logger from '@utils/logger.util';

class AuthController {
  private static instance: AuthController;

  private constructor() {}

  public static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  /** Register New User - [POST] /api/v1/auth/register */
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload: In_DTO_Register = req.body;
      const result = await authService.register(payload);

      apiResponse.sendCreated(res, lang.__('success.auth.register'), result);
    } catch (error) {
      logger.error('Registration error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });
      next(error);
    }
  }

  /** Login user - [POST] /api/v1/auth/login */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: In_DTO_Login = req.body;

      const result = await authService.login(data);

      apiResponse.sendSuccess(res, lang.__('success.auth.login'), result);
    } catch (error) {
      logger.error('Login error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body.email,
      });
      next(error);
    }
  }

  /** Refresh access token - [POST] /api/v1/auth/refresh */
  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        apiResponse.sendBadRequest(
          res,
          lang.__('error.auth.required-token', { name: 'Refresh token' })
        );
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      apiResponse.sendSuccess(
        res,
        lang.__('success.auth.refresh-token'),
        result
      );
    } catch (error) {
      logger.error('Token refresh error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Logout user - [POST] /api/v1/auth/logout*/
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = req.token;
      const refreshToken =
        req.body.refreshToken || req.headers['x-refresh-token'];

      if (!accessToken) {
        apiResponse.sendBadRequest(
          res,
          lang.__('error.auth.required-token', { name: 'Access token' })
        );
        return;
      }

      await authService.logout(accessToken, refreshToken);

      apiResponse.sendSuccess(res, 'Logout successful');
    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Verify email - [POST] /api/v1/auth/verify-email*/
  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload: In_DTO_VerifyEmail = req.body;
      const result = await authService.verifyEmail(payload);
      apiResponse.sendSuccess(
        res,
        lang.__('success.auth.verify-email'),
        result
      );
    } catch (error) {
      logger.error('Email verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Request password reset - [POST] /api/v1/auth/forgot-password */
  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload: In_DTO_ForgotPassword = req.body;
      await authService.forgotPassword(payload);
      apiResponse.sendSuccess(res, lang.__('success.auth.forgot-password'));
    } catch (error) {
      logger.error('Forgot password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Reset password - [POST] /api/v1/auth/reset-password */
  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload: In_DTO_ResetPassword = req.body;
      await authService.resetPassword(payload);
      apiResponse.sendSuccess(res, lang.__('success.auth.reset-password'));
    } catch (error) {
      logger.error('Reset password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Change password (authenticated) - [POST] /api/v1/auth/change-password */
  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user.id;
      const data: In_DTO_ManualChangePassword = req.body;
      await authService.changePassword(userId, data);
      apiResponse.sendSuccess(res, lang.__('success.auth.change-password'));
    } catch (error) {
      logger.error('Change password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /** Get current user profile - [GET] /api/v1/auth/profile */
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user.id;
      const user = await authService.getMe(userId);
      apiResponse.sendSuccess(res, lang.__('success.user.fetch-profile'), {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          emailVerified: user.emailVerified,
          roles: user.roles.map((role) => ({
            id: role.id,
            name: role.name,
            slug: role.slug,
            permissions: role.permissions?.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              resource: p.resource,
              action: p.action,
            })),
          })),
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error('Get profile error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      next(error);
    }
  }
}

export default AuthController.getInstance();
