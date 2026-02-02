import { Request, Response, NextFunction } from 'express';
import roleService from '@services/role.service';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';
import {
  In_DTO_CreateRole,
  In_DTO_UpdateRole,
} from '@/interfaces/dto.interface';

class RoleController {
  private static instance: RoleController;

  private constructor() {}

  public static getInstance(): RoleController {
    if (!RoleController.instance) {
      RoleController.instance = new RoleController();
    }
    return RoleController.instance;
  }

  /** Get all roles - [GET] /api/v1/roles */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includePermissions = req.query.includePermissions === 'true';
      const activeOnly = req.query.activeOnly === 'true';

      const roles = await roleService.fetchAll({
        includePermissions,
        activeOnly,
      });

      apiResponse.sendSuccess(
        res,
        lang.__('success.role.fetch', { name: 'Roles' }),
        {
          roles: roles.map((role) => ({
            id: role.id,
            name: role.name,
            slug: role.slug,
            description: role.description,
            type: role.type,
            isActive: role.isActive,
            permissions: includePermissions
              ? role.permissions?.map((p) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  category: p.category,
                  resource: p.resource,
                  action: p.action,
                }))
              : undefined,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          })),
        }
      );
    } catch (error) {
      logger.error('Get all roles error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get role by ID - [GET] /api/v1/roles/:id */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const role = await roleService.fetchById(req?.params?.id as any);
      apiResponse.sendSuccess(
        res,
        lang.__('success.role.fetch', { name: 'Role' }),
        {
          role: {
            id: role.id,
            name: role.name,
            slug: role.slug,
            description: role.description,
            type: role.type,
            isActive: role.isActive,
            permissions: role.permissions?.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              category: p.category,
              resource: p.resource,
              action: p.action,
              isActive: p.isActive,
            })),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          },
        }
      );
    } catch (error) {
      logger.error('Get role by ID error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Create new role - [POST] /api/v1/roles */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, permissionIds }: In_DTO_CreateRole = req.body;
      const createdBy = req.user?.id;

      const role = await roleService.store(
        {
          name,
          description,
          permissionIds,
        },
        createdBy
      );
      apiResponse.sendCreated(res, lang.__('success.role.create'), {
        role: {
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          type: role.type,
          isActive: role.isActive,
          permissions: role.permissions?.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          })),
          createdAt: role.createdAt,
        },
      });
    } catch (error) {
      logger.error('Create role error', {
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Update role - [PUT] /api/v1/roles/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, isActive, permissionIds }: In_DTO_UpdateRole =
        req.body;
      const updatedBy = req.user?.id;

      const role = await roleService.update(
        id as any,
        {
          name,
          description,
          isActive,
          permissionIds,
        },
        updatedBy
      );

      apiResponse.sendSuccess(res, lang.__('success.role.update'), {
        role: {
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          type: role.type,
          isActive: role.isActive,
          permissions: role.permissions?.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          })),
          updatedAt: role.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Update role error', {
        id: req.params.id,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Delete role - [DELETE] /api/v1/roles/:id */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.id;
      await roleService.delete(id as any, deletedBy);

      apiResponse.sendSuccess(res, lang.__('success.role.delete'));
    } catch (error) {
      logger.error('Delete role error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Assign permissions to role - [POST] /api/v1/roles/:id/permissions */
  async assignPermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      const updatedBy = req.user?.id;

      const role = await roleService.assignPermissions(
        id as any,
        permissionIds,
        updatedBy
      );

      apiResponse.sendSuccess(
        res,
        lang.__('success.role.assigned-permission'),
        {
          role: {
            id: role.id,
            name: role.name,
            permissions: role.permissions?.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
            })),
          },
        }
      );
    } catch (error) {
      logger.error('Assign permissions error', {
        id: req.params.id,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Remove permissions from role - [DELETE] /api/v1/roles/:id/permissions */
  async removePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;
      const updatedBy = req.user?.id;

      const role = await roleService.removePermissions(
        id as any,
        permissionIds,
        updatedBy
      );

      apiResponse.sendSuccess(res, lang.__('success.role.remove-permission'), {
        role: {
          id: role.id,
          name: role.name,
          permissions: role.permissions?.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          })),
        },
      });
    } catch (error) {
      logger.error('Remove permissions error', {
        id: req.params.id,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get role statistics - [GET] /api/v1/roles/stats */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await roleService.getRoleStats();
      apiResponse.sendSuccess(res, lang.__('success.role.statistic'), {
        stats,
      });
    } catch (error) {
      logger.error('Get role stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

export default RoleController.getInstance();
