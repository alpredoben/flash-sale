import { Request, Response, NextFunction } from 'express';
import permissionService from '@services/permission.service';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';

class PermissionController {
  private static instance: PermissionController;

  private constructor() {}

  public static getInstance(): PermissionController {
    if (!PermissionController.instance) {
      PermissionController.instance = new PermissionController();
    }
    return PermissionController.instance;
  }

  /** Get all permissions - [GET] /api/v1/permissions */
  async fetchAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;

      // If pagination params provided, use paginated endpoint
      if (page || limit) {
        const result = await permissionService.fetchWithPaginate({
          page,
          limit,
          search: req.query.search as string,
          category: req.query.category as any,
          resource: req.query.resource as string,
          isActive:
            req.query.isActive === 'true'
              ? true
              : req.query.isActive === 'false'
                ? false
                : undefined,
        });

        apiResponse.sendSuccess(
          res,
          lang.__('success.permission.fetch', { name: 'Permissions' }),
          result
        );
        return;
      }

      // Otherwise, get all permissions
      const includeRoles = req.query.includeRoles === 'true';
      const activeOnly = req.query.activeOnly === 'true';
      const category = req.query.category as any;

      const permissions = await permissionService.fetchAll({
        includeRoles,
        activeOnly,
        category,
      });

      apiResponse.sendSuccess(res, 'Permissions retrieved successfully', {
        permissions: permissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          category: permission.category,
          resource: permission.resource,
          action: permission.action,
          isActive: permission.isActive,
          isSystem: permission.isSystem,
          roles: includeRoles
            ? permission.roles?.map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
              }))
            : undefined,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        })),
      });
    } catch (error) {
      logger.error('Get all permissions error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permission by ID - [GET] /api/v1/permissions/:id */
  async fetchById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const permission = await permissionService.fetchById(id as any);

      apiResponse.sendSuccess(
        res,
        lang.__('success.permission.fetch', { name: 'Permission' }),
        {
          permission: {
            id: permission.id,
            name: permission.name,
            slug: permission.slug,
            description: permission.description,
            category: permission.category,
            resource: permission.resource,
            action: permission.action,
            isActive: permission.isActive,
            isSystem: permission.isSystem,
            roles: permission.roles?.map((r) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
            })),
            createdAt: permission.createdAt,
            updatedAt: permission.updatedAt,
          },
        }
      );
    } catch (error) {
      logger.error('Get permission by ID error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permissions by category - [GET] /api/v1/permissions/category/:category */
  async fetchByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category } = req.params;

      const permissions = await permissionService.fetchByCategory(
        category as any
      );

      apiResponse.sendSuccess(
        res,
        lang.__('success.permission.fetch', { name: 'Permissions' }),
        {
          category,
          permissions: permissions.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            resource: p.resource,
            action: p.action,
            isActive: p.isActive,
          })),
        }
      );
    } catch (error) {
      logger.error('Get permissions by category error', {
        category: req.params.category,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permissions by resource - [GET] /api/v1/permissions/resource/:resource */
  async fetchByResource(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resource } = req.params;

      const permissions = await permissionService.fetchByResource(
        resource as any
      );
      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'Permissions' }),
        {
          resource,
          permissions: permissions.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            category: p.category,
            action: p.action,
            isActive: p.isActive,
          })),
        }
      );
    } catch (error) {
      logger.error('Get permissions by resource error', {
        resource: req.params.resource,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Create new permission - [POST] /api/v1/permissions */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, category, resource, action } = req.body;
      const createdBy = req.user?.id;

      const permission = await permissionService.store(
        {
          name,
          description,
          category,
          resource,
          action,
        },
        createdBy
      );

      apiResponse.sendCreated(res, lang.__('success.permission.create'), {
        permission: {
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          category: permission.category,
          resource: permission.resource,
          action: permission.action,
          isActive: permission.isActive,
          isSystem: permission.isSystem,
          createdAt: permission.createdAt,
        },
      });
    } catch (error) {
      logger.error('Create permission error', {
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Update permission - [PUT] /api/v1/permissions/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, category, resource, action, isActive } =
        req.body;
      const updatedBy = req.user?.id;

      const permission = await permissionService.update(
        id as any,
        {
          name,
          description,
          category,
          resource,
          action,
          isActive,
        },
        updatedBy
      );

      apiResponse.sendSuccess(res, lang.__('success.permission.update'), {
        permission: {
          id: permission.id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          category: permission.category,
          resource: permission.resource,
          action: permission.action,
          isActive: permission.isActive,
          isSystem: permission.isSystem,
          updatedAt: permission.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Update permission error', {
        id: req.params.id,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Delete permission - [DELETE] /api/v1/permissions/:id */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.id;

      await permissionService.softDelete(id as any, deletedBy);

      apiResponse.sendSuccess(res, lang.__('success.permission.delete'));
    } catch (error) {
      logger.error('Delete permission error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permissions grouped by category - [GET] /api/v1/permissions/grouped/category */
  async fetchGroupedByCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const grouped = await permissionService.fetchGroupByCategory();
      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', {
          name: 'Permissions grouped by category',
        }),
        { grouped }
      );
    } catch (error) {
      logger.error('Get permissions grouped by category error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permissions grouped by resource - [GET] /api/v1/permissions/grouped/resource */
  async fetchGroupedByResource(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const grouped = await permissionService.fetchGroupByResource();
      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', {
          name: 'Permissions grouped by resource',
        }),
        { grouped }
      );
    } catch (error) {
      logger.error('Get permissions grouped by resource error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get permission statistics - [GET] /api/v1/permissions/stats */
  async fetchStatistic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await permissionService.fetchStats();

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'Permission statistics' }),
        { stats }
      );
    } catch (error) {
      logger.error('Get permission stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Bulk create permissions for resource - [POST] /api/v1/permissions/bulk */
  async bulkCreatePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resource, category, actions } = req.body;
      const createdBy = req.user?.id;

      const permissions = await permissionService.bulkCreateForResource(
        resource,
        category,
        actions,
        createdBy
      );

      apiResponse.sendCreated(res, lang.__('success.permission.create'), {
        permissions: permissions.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          action: p.action,
        })),
        count: permissions.length,
      });
    } catch (error) {
      logger.error('Bulk create permissions error', {
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

export default PermissionController.getInstance();
