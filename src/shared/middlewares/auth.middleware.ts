import { Request, Response, NextFunction } from 'express';
import tokenizer from '@utils/tokenizer.util';
import caching from '@config/caching.config';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';

// Extend Express Request type to include user and token
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
   * Verifies the token and attaches user data to request
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
        apiResponse.sendUnauthorized(res, lang.__('error.auth.no-token'), {
          auth: 'No token provided',
        });
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        apiResponse.sendUnauthorized(res, lang.__('error.auth.token-revoked'), {
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

      // If not cached, fetch from database and cache
      if (!user) {
        user = {
          id: decoded.userId,
          email: decoded.email,
          roles: decoded.roles || [],
        };

        // Cache user data for 30 minutes
        await caching.cacheUser(decoded.userId, user, 1800);
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;

      logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
        roles: user.roles,
      });

      next();
    } catch (error) {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      apiResponse.sendInternalError(res, 'Authentication failed');
    }
  };

  /**
   * Authorize user based on roles
   * Checks if authenticated user has required role(s)
   *
   * @param roles - Array of role names that are allowed
   * @param requireAll - If true, user must have ALL roles. If false, user needs ANY role (default: false)
   *
   * Usage:
   *   router.post('/items', authMiddleware.authenticate, authMiddleware.authorize(['admin']), ...)
   *   router.get('/items', authMiddleware.authenticate, authMiddleware.authorize(['admin', 'manager']), ...)
   */
  public authorize = (roles: string[], requireAll: boolean = false) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(
            res,
            lang.__('error.auth.authentication-required')
          );
          return;
        }

        // Get user roles
        const userRoles: string[] = req.user.roles || [];

        // Check if user has required role(s)
        let hasPermission = false;

        if (requireAll) {
          // User must have ALL specified roles
          hasPermission = roles.every((role) =>
            userRoles.some(
              (userRole) => userRole.toLowerCase() === role.toLowerCase()
            )
          );
        } else {
          // User must have ANY of the specified roles
          hasPermission = roles.some((role) =>
            userRoles.some(
              (userRole) => userRole.toLowerCase() === role.toLowerCase()
            )
          );
        }

        if (!hasPermission) {
          logger.warn('Authorization failed - insufficient permissions', {
            userId: req.user.id,
            userRoles,
            requiredRoles: roles,
            path: req.path,
          });

          apiResponse.sendForbidden(
            res,
            lang.__('error.auth.insufficient-permissions'),
            {
              required: roles,
              current: userRoles,
            }
          );
          return;
        }

        logger.debug('User authorized', {
          userId: req.user.id,
          roles: userRoles,
          requiredRoles: roles,
        });

        next();
      } catch (error) {
        logger.error('Authorization error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Check if user has specific permission(s)
   * More granular than role-based authorization
   *
   * @param permissions - Array of permission names
   * @param requireAll - If true, user must have ALL permissions (default: false)
   */
  public checkPermissions = (
    permissions: string[],
    requireAll: boolean = false
  ) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          apiResponse.sendUnauthorized(
            res,
            lang.__('error.auth.authentication-required')
          );
          return;
        }

        const userPermissions: string[] = req.user.permissions || [];

        let hasPermission = false;

        if (requireAll) {
          hasPermission = permissions.every((permission) =>
            userPermissions.includes(permission)
          );
        } else {
          hasPermission = permissions.some((permission) =>
            userPermissions.includes(permission)
          );
        }

        if (!hasPermission) {
          logger.warn('Permission check failed', {
            userId: req.user.id,
            userPermissions,
            requiredPermissions: permissions,
            path: req.path,
          });

          apiResponse.sendForbidden(res, 'Insufficient permissions', {
            required: permissions,
            current: userPermissions,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Permission check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Permission check failed');
      }
    };
  };

  /**
   * Optional authentication (doesn't fail if no token)
   * Useful for endpoints that work with or without authentication
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
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          roles: decoded.roles || [],
        };
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
   * Check if user is authenticated (simple check)
   */
  public requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      apiResponse.sendUnauthorized(
        res,
        lang.__('error.auth.authentication-required')
      );
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
      apiResponse.sendUnauthorized(
        res,
        lang.__('error.auth.authentication-required')
      );
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
      apiResponse.sendUnauthorized(
        res,
        lang.__('error.auth.authentication-required')
      );
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
   * Check if user owns the resource
   * Compares user ID with resource owner ID
   *
   * @param getResourceOwnerId - Function to extract owner ID from request
   */
  public checkOwnership = (
    getResourceOwnerId: (req: Request) => string | Promise<string>
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          apiResponse.sendUnauthorized(
            res,
            lang.__('error.auth.authentication-required')
          );
          return;
        }

        const resourceOwnerId = await getResourceOwnerId(req);

        if (req.user.id !== resourceOwnerId) {
          // Check if user is admin (admins can access any resource)
          const isAdmin = req.user.roles?.some(
            (role: string) => role.toLowerCase() === 'admin'
          );

          if (!isAdmin) {
            logger.warn('Ownership check failed', {
              userId: req.user.id,
              resourceOwnerId,
              path: req.path,
            });

            apiResponse.sendForbidden(
              res,
              'You do not have permission to access this resource'
            );
            return;
          }
        }

        next();
      } catch (error) {
        logger.error('Ownership check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Ownership check failed');
      }
    };
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

  /**
   * Rate limit per user (in addition to IP-based rate limiting)
   */
  public userRateLimit = (options: {
    windowMs: number;
    maxRequests: number;
    message?: string;
  }) => {
    const attempts: Map<string, { count: number; resetTime: number }> =
      new Map();

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        next();
        return;
      }

      const userId = req.user.id;
      const now = Date.now();
      const userAttempts = attempts.get(userId);

      if (!userAttempts || now > userAttempts.resetTime) {
        // Reset counter
        attempts.set(userId, {
          count: 1,
          resetTime: now + options.windowMs,
        });
        next();
        return;
      }

      if (userAttempts.count >= options.maxRequests) {
        const retryAfter = Math.ceil((userAttempts.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        apiResponse.sendRateLimit(
          res,
          options.message || 'Too many requests. Please try again later.'
        );
        return;
      }

      userAttempts.count++;
      next();
    };
  };
}

// Export singleton instance
const authMiddleware = AuthMiddleware.getInstance();

export default authMiddleware;

// Export individual middleware functions for convenience
export const authenticate = authMiddleware.authenticate;
export const authorize = authMiddleware.authorize;
export const checkPermissions = authMiddleware.checkPermissions;
export const optionalAuth = authMiddleware.optionalAuth;
export const verifyRefreshToken = authMiddleware.verifyRefreshToken;
export const requireAuth = authMiddleware.requireAuth;
export const requireEmailVerified = authMiddleware.requireEmailVerified;
export const requireActiveAccount = authMiddleware.requireActiveAccount;
export const checkOwnership = authMiddleware.checkOwnership;
export const verifyApiKey = authMiddleware.verifyApiKey;
export const checkTokenExpiration = authMiddleware.checkTokenExpiration;
export const attachUserId = authMiddleware.attachUserId;
export const userRateLimit = authMiddleware.userRateLimit;
