import { Request, Response, NextFunction } from 'express';
import tokenizer from '@utils/tokenizer.util';
import caching from '@config/caching.config';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

class AuthMiddleware {
  private static instance: AuthMiddleware;

  private constructor() {}

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  /**
   * Authenticate user via JWT token
   */
  public authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = tokenizer.extractTokenFromHeader(authHeader);

      if (!token) {
        apiResponse.sendUnauthorized(res, 'Access token is required', {
          auth: 'No token provided',
        });
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        apiResponse.sendUnauthorized(res, 'Token has been revoked', {
          auth: 'Token is blacklisted',
        });
        return;
      }

      // Verify token
      let decoded;
      try {
        decoded = tokenizer.verifyAccessToken(token);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid token';
        apiResponse.sendUnauthorized(res, message, {
          auth: 'Token verification failed',
        });
        return;
      }

      // Check if user is cached
      let user = await caching.getCachedUser(decoded.userId);

      // If not cached, fetch from database (this will be implemented in UserRepository)
      if (!user) {
        user = {
          id: decoded.userId,
          email: decoded.email,
          roles: decoded.roles || [],
        };

        // Cache user data
        await caching.cacheUser(decoded.userId, user, 1800); // 30 minutes
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;

      logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
      });

      next();
    } catch (error) {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      apiResponse.sendInternalError(res, 'Authentication failed');
    }
  };

  /**
   * Optional authentication (doesn't fail if no token)
   */
  public optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = tokenizer.extractTokenFromHeader(authHeader);

      if (!token) {
        next();
        return;
      }

      // Try to authenticate, but don't fail if invalid
      try {
        const decoded = tokenizer.verifyAccessToken(token);
        const user = await caching.getCachedUser(decoded.userId);

        if (user) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // Silent fail for optional auth
        logger.debug('Optional auth failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      next();
    } catch (error) {
      logger.error('Optional authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next();
    }
  };

  /**
   * Verify refresh token
   */
  public verifyRefreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken =
        req.body.refreshToken || req.headers['x-refresh-token'];

      if (!refreshToken) {
        apiResponse.sendUnauthorized(res, 'Refresh token is required');
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        apiResponse.sendUnauthorized(res, 'Refresh token has been revoked');
        return;
      }

      // Verify refresh token
      try {
        const decoded = tokenizer.verifyRefreshToken(refreshToken);
        req.user = { id: decoded.userId, email: decoded.email };
        req.token = refreshToken;
        next();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid refresh token';
        apiResponse.sendUnauthorized(res, message);
      }
    } catch (error) {
      logger.error('Refresh token verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      apiResponse.sendInternalError(res, 'Token verification failed');
    }
  };

  /**
   * Check if user is authenticated
   */
  public requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      apiResponse.sendUnauthorized(res, 'Authentication required');
      return;
    }
    next();
  };

  /**
   * Check if user email is verified
   */
  public requireEmailVerified = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      apiResponse.sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!req.user.isEmailVerified) {
      apiResponse.sendForbidden(res, 'Email verification required', {
        verification: 'Please verify your email address',
      });
      return;
    }

    next();
  };

  /**
   * Check if user account is active
   */
  public requireActiveAccount = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      apiResponse.sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!req.user.isActive) {
      apiResponse.sendForbidden(res, 'Account is inactive', {
        account: 'Your account has been deactivated',
      });
      return;
    }

    next();
  };

  /**
   * Blacklist token (for logout)
   */
  public async blacklistToken(token: string): Promise<void> {
    try {
      const lifetime = tokenizer.getTokenLifetime(token);
      if (lifetime > 0) {
        await caching.set(`blacklist:${token}`, true, {
          ttl: lifetime,
          prefix: '',
        });
        logger.debug('Token blacklisted', { token: token.substring(0, 20) });
      }
    } catch (error) {
      logger.error('Failed to blacklist token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const exists = await caching.exists(`blacklist:${token}`, { prefix: '' });
      return exists;
    } catch (error) {
      logger.error('Failed to check token blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Invalidate user cache (call when user data changes)
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    await caching.invalidateUser(userId);
    logger.debug('User cache invalidated', { userId });
  }

  /**
   * Verify API key (for external integrations)
   */
  public verifyApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        apiResponse.sendUnauthorized(res, 'API key is required');
        return;
      }

      // Verify API key token
      try {
        const decoded = tokenizer.verifyAccessToken(apiKey);
        req.user = decoded;
        next();
      } catch (error) {
        apiResponse.sendUnauthorized(res, 'Invalid API key');
      }
    } catch (error) {
      logger.error('API key verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      apiResponse.sendInternalError(res, 'API key verification failed');
    }
  };

  /**
   * Check token expiration and warn if close to expiry
   */
  public checkTokenExpiration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.token) {
      const lifetime = tokenizer.getTokenLifetime(req.token);

      // Warn if token expires in less than 5 minutes
      if (lifetime > 0 && lifetime < 300) {
        res.setHeader('X-Token-Expiring', 'true');
        res.setHeader('X-Token-Lifetime', lifetime.toString());
      }
    }
    next();
  };

  /**
   * Attach current user ID to request for audit logging
   */
  public attachUserId = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (req.user && req.user.id) {
      // This can be used in BaseEntity for createdBy, updatedBy fields
      (req as any).userId = req.user.id;
    }
    next();
  };
}

// Export singleton instance
const authMiddleware = AuthMiddleware.getInstance();

export default authMiddleware;

// Export individual middleware functions for convenience
export const authenticate = authMiddleware.authenticate;
export const optionalAuth = authMiddleware.optionalAuth;
export const verifyRefreshToken = authMiddleware.verifyRefreshToken;
export const requireAuth = authMiddleware.requireAuth;
export const requireEmailVerified = authMiddleware.requireEmailVerified;
export const requireActiveAccount = authMiddleware.requireActiveAccount;
export const verifyApiKey = authMiddleware.verifyApiKey;
export const checkTokenExpiration = authMiddleware.checkTokenExpiration;
export const attachUserId = authMiddleware.attachUserId;
