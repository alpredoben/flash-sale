import { Request, Response, NextFunction } from 'express';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import userRepository from '@repositories/user.repository';

class RBACMiddleware {
  private static instance: RBACMiddleware;

  private constructor() {}

  public static getInstance(): RBACMiddleware {
    if (!RBACMiddleware.instance) {
      RBACMiddleware.instance = new RBACMiddleware();
    }
    return RBACMiddleware.instance;
  }

  /**
   * Check if user has specific role(s)
   * @param roles - Array of role names or single role name
   * @param requireAll - If true, user must have all roles. If false, user needs at least one role
   */
  requireRole = (roles: string | string[], requireAll: boolean = false) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(res, 'Authentication required');
          return;
        }

        // Convert single role to array
        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        // Get user roles
        const userRoles = req.user.roles || [];

        // Check if user has required role(s)
        let hasAccess = false;

        if (requireAll) {
          // User must have all required roles
          hasAccess = requiredRoles.every((role) => userRoles.includes(role));
        } else {
          // User needs at least one required role
          hasAccess = requiredRoles.some((role) => userRoles.includes(role));
        }

        if (!hasAccess) {
          logger.warn('Access denied - insufficient role', {
            userId: req.user.id,
            userRoles,
            requiredRoles,
            requireAll,
          });

          apiResponse.sendForbidden(
            res,
            'You do not have permission to access this resource'
          );
          return;
        }

        logger.debug('Role check passed', {
          userId: req.user.id,
          userRoles,
          requiredRoles,
        });

        next();
      } catch (error) {
        logger.error('Role check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Check if user has specific permission(s)
   * @param permissions - Array of permission names or single permission name
   * @param requireAll - If true, user must have all permissions. If false, user needs at least one permission
   */
  requirePermission = (
    permissions: string | string[],
    requireAll: boolean = false
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(res, 'Authentication required');
          return;
        }

        // Convert single permission to array
        const requiredPermissions = Array.isArray(permissions)
          ? permissions
          : [permissions];

        // Get user permissions
        let userPermissions = req.user.permissions || [];

        // If permissions not in cached user, fetch from database
        if (!userPermissions || userPermissions.length === 0) {
          const user = await userRepository.findById(req.user.id);
          if (user) {
            userPermissions = this.extractPermissions(user.roles);
          }
        }

        // Check if user has required permission(s)
        let hasAccess = false;

        if (requireAll) {
          // User must have all required permissions
          hasAccess = requiredPermissions.every((permission) =>
            userPermissions.includes(permission)
          );
        } else {
          // User needs at least one required permission
          hasAccess = requiredPermissions.some((permission) =>
            userPermissions.includes(permission)
          );
        }

        if (!hasAccess) {
          logger.warn('Access denied - insufficient permission', {
            userId: req.user.id,
            userPermissions,
            requiredPermissions,
            requireAll,
          });

          apiResponse.sendForbidden(
            res,
            'You do not have permission to perform this action'
          );
          return;
        }

        logger.debug('Permission check passed', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions,
        });

        next();
      } catch (error) {
        logger.error('Permission check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Check if user has any of the specified roles OR permissions
   * Useful for flexible access control
   */
  requireRoleOrPermission = (
    roles: string | string[],
    permissions: string | string[]
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(res, 'Authentication required');
          return;
        }

        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        const requiredPermissions = Array.isArray(permissions)
          ? permissions
          : [permissions];

        const userRoles = req.user.roles || [];
        let userPermissions = req.user.permissions || [];

        // If permissions not in cached user, fetch from database
        if (!userPermissions || userPermissions.length === 0) {
          const user = await userRepository.findById(req.user.id);
          if (user) {
            userPermissions = this.extractPermissions(user.roles);
          }
        }

        // Check if user has any required role
        const hasRole = requiredRoles.some((role) => userRoles.includes(role));

        // Check if user has any required permission
        const hasPermission = requiredPermissions.some((permission) =>
          userPermissions.includes(permission)
        );

        if (!hasRole && !hasPermission) {
          logger.warn('Access denied - insufficient role or permission', {
            userId: req.user.id,
            userRoles,
            userPermissions,
            requiredRoles,
            requiredPermissions,
          });

          apiResponse.sendForbidden(
            res,
            'You do not have permission to access this resource'
          );
          return;
        }

        logger.debug('Role or permission check passed', {
          userId: req.user.id,
          hasRole,
          hasPermission,
        });

        next();
      } catch (error) {
        logger.error('Role or permission check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Check if user is owner of resource
   * @param getUserIdFromResource - Function to extract user ID from request
   */
  requireOwnership = (
    getUserIdFromResource: (req: Request) => string | Promise<string>
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(res, 'Authentication required');
          return;
        }

        // Get resource owner ID
        const resourceOwnerId = await getUserIdFromResource(req);

        // Check if user is owner
        if (req.user.id !== resourceOwnerId) {
          logger.warn('Access denied - not resource owner', {
            userId: req.user.id,
            resourceOwnerId,
          });

          apiResponse.sendForbidden(
            res,
            'You do not have permission to access this resource'
          );
          return;
        }

        logger.debug('Ownership check passed', {
          userId: req.user.id,
          resourceOwnerId,
        });

        next();
      } catch (error) {
        logger.error('Ownership check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Check if user is owner OR has specific role/permission
   * Useful for allowing admins to access user resources
   */
  requireOwnershipOrRole = (
    getUserIdFromResource: (req: Request) => string | Promise<string>,
    roles: string | string[]
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          apiResponse.sendUnauthorized(res, 'Authentication required');
          return;
        }

        // Get resource owner ID
        const resourceOwnerId = await getUserIdFromResource(req);

        // Check if user is owner
        const isOwner = req.user.id === resourceOwnerId;

        // Check if user has required role
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        const userRoles = req.user.roles || [];
        const hasRole = requiredRoles.some((role) => userRoles.includes(role));

        if (!isOwner && !hasRole) {
          logger.warn('Access denied - not owner and insufficient role', {
            userId: req.user.id,
            resourceOwnerId,
            userRoles,
            requiredRoles,
          });

          apiResponse.sendForbidden(
            res,
            'You do not have permission to access this resource'
          );
          return;
        }

        logger.debug('Ownership or role check passed', {
          userId: req.user.id,
          isOwner,
          hasRole,
        });

        next();
      } catch (error) {
        logger.error('Ownership or role check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        apiResponse.sendInternalError(res, 'Authorization failed');
      }
    };
  };

  /**
   * Extract permissions from roles
   */
  private extractPermissions(roles: any[]): string[] {
    const permissions = new Set<string>();

    roles.forEach((role) => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((permission: any) => {
          permissions.add(permission.name);
        });
      }
    });

    return Array.from(permissions);
  }
}

// Export singleton instance
const rbacMiddleware = RBACMiddleware.getInstance();

export default rbacMiddleware;
