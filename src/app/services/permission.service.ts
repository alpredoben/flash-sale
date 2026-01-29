import permissionRepository from '@repositories/permission.repository';
import logger from '@utils/logger.util';
import { Permission } from '@models/permission.model';
import {
  En_PermissionCategory,
  En_PermissionAction,
} from '@constants/enum.constant';
import {
  In_DTO_CreatePermission,
  In_DTO_UpdatePermission,
} from '@/interfaces/dto.interface';

class PermissionService {
  private static instance: PermissionService;

  private constructor() {}

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Get all permissions
   */
  async fetchAll(options?: {
    includeRoles?: boolean;
    activeOnly?: boolean;
    category?: En_PermissionCategory;
  }): Promise<Permission[]> {
    try {
      return await permissionRepository.fetch(options);
    } catch (error) {
      logger.error('Error getting all permissions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions with pagination
   */
  async fetchWithPaginate(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: En_PermissionCategory;
    resource?: string;
    isActive?: boolean;
  }): Promise<{
    permissions: Permission[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;

      const { permissions, total } =
        await permissionRepository.fetchWithPaginate(options);

      return {
        permissions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error getting permissions paginated', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permission by ID
   */
  async fetchById(id: string): Promise<Permission> {
    try {
      const permission = await permissionRepository.findById(id);

      if (!permission) {
        throw new Error('Permission not found');
      }

      return permission;
    } catch (error) {
      logger.error('Error getting permission by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permission by name
   */
  async fetchByName(name: string): Promise<Permission> {
    try {
      const permission = await permissionRepository.findByName(name);

      if (!permission) {
        throw new Error('Permission not found');
      }

      return permission;
    } catch (error) {
      logger.error('Error getting permission by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions by category
   */
  async fetchByCategory(
    category: En_PermissionCategory
  ): Promise<Permission[]> {
    try {
      return await permissionRepository.findByCategory(category);
    } catch (error) {
      logger.error('Error getting permissions by category', {
        category,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions by resource
   */
  async fetchByResource(resource: string): Promise<Permission[]> {
    try {
      return await permissionRepository.findByResource(resource);
    } catch (error) {
      logger.error('Error getting permissions by resource', {
        resource,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create new permission
   */
  async store(
    data: In_DTO_CreatePermission,
    createdBy?: string
  ): Promise<Permission> {
    try {
      // Build permission name if not provided
      const name =
        data.name || Permission.buildPermissionName(data.resource, data.action);

      // Check if permission name already exists
      const existingPermission = await permissionRepository.findByName(name);
      if (existingPermission) {
        throw new Error('Permission name already exists');
      }

      // Generate slug
      const slug = Permission.buildPermissionSlug(data.resource, data.action);

      // Check if slug already exists
      const existingSlug = await permissionRepository.findBySlug(slug);
      if (existingSlug) {
        throw new Error('Permission slug already exists');
      }

      // Create permission
      const permission = await permissionRepository.create({
        name,
        slug,
        description: data.description,
        category: data.category,
        resource: data.resource,
        action: data.action,
        isActive: true,
        isSystem: false,
        createdBy,
      });

      logger.info('Permission created', {
        permissionId: permission.id,
        permissionName: permission.name,
        createdBy,
      });

      return permission;
    } catch (error) {
      logger.error('Error creating permission', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update permission
   */
  async update(
    id: string,
    data: In_DTO_UpdatePermission,
    updatedBy?: string
  ): Promise<Permission> {
    try {
      // Check if permission exists
      const permission = await permissionRepository.findById(id);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Check if permission can be deleted/modified
      if (permission.isSystem) {
        throw new Error('System permissions cannot be modified');
      }

      // Prepare update data
      const updateData: Partial<Permission> = {
        updatedBy,
      };

      // If resource or action is being updated, regenerate name and slug
      if (data.resource || data.action) {
        const resource = data.resource || permission.resource;
        const action = data.action || permission.action;

        updateData.name = Permission.buildPermissionName(resource, action);
        updateData.slug = Permission.buildPermissionSlug(resource, action);

        // Check if new name already exists
        const nameExists = await permissionRepository.nameExists(
          updateData.name,
          id
        );
        if (nameExists) {
          throw new Error('Permission name already exists');
        }

        if (data.resource) updateData.resource = data.resource;
        if (data.action) updateData.action = data.action;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.category) {
        updateData.category = data.category;
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // Update permission
      const updatedPermission = await permissionRepository.update(
        id,
        updateData
      );

      if (!updatedPermission) {
        throw new Error('Failed to update permission');
      }

      logger.info('Permission updated', {
        permissionId: id,
        updatedBy,
      });

      return updatedPermission;
    } catch (error) {
      logger.error('Error updating permission', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete permission
   */
  async softDelete(id: string, deletedBy?: string): Promise<void> {
    try {
      // Check if permission exists
      const permission = await permissionRepository.findById(id);
      if (!permission) {
        throw new Error('Permission not found');
      }

      // Check if permission can be deleted
      if (!permission.canBeDeleted()) {
        throw new Error('System permissions cannot be deleted');
      }

      // Soft delete permission
      await permissionRepository.softDelete(id);

      logger.info('Permission deleted', {
        permissionId: id,
        permissionName: permission.name,
        deletedBy,
      });

      // Note: Consider what to do with roles that have this permission
      // The relationship should handle this via cascade or set null
    } catch (error) {
      logger.error('Error deleting permission', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions grouped by category
   */
  async fetchGroupByCategory(): Promise<
    Record<En_PermissionCategory, Permission[]>
  > {
    try {
      return await permissionRepository.getGroupedByCategory();
    } catch (error) {
      logger.error('Error getting permissions grouped by category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions grouped by resource
   */
  async fetchGroupByResource(): Promise<Record<string, Permission[]>> {
    try {
      return await permissionRepository.getGroupedByResource();
    } catch (error) {
      logger.error('Error getting permissions grouped by resource', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permission statistics
   */
  async fetchStats(): Promise<{
    totalPermissions: number;
    activePermissions: number;
    inactivePermissions: number;
    systemPermissions: number;
    customPermissions: number;
    byCategory: Record<En_PermissionCategory, number>;
  }> {
    try {
      const allPermissions = await permissionRepository.fetch();
      const byCategory = await permissionRepository.countByCategory();

      const stats = {
        totalPermissions: allPermissions.length,
        activePermissions: allPermissions.filter((p) => p.isActive).length,
        inactivePermissions: allPermissions.filter((p) => !p.isActive).length,
        systemPermissions: allPermissions.filter((p) => p.isSystem).length,
        customPermissions: allPermissions.filter((p) => !p.isSystem).length,
        byCategory,
      };

      return stats;
    } catch (error) {
      logger.error('Error getting permission stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Bulk create permissions for a resource
   */
  async bulkCreateForResource(
    resource: string,
    category: En_PermissionCategory,
    actions: En_PermissionAction[],
    createdBy?: string
  ): Promise<Permission[]> {
    try {
      const permissions: Permission[] = [];

      for (const action of actions) {
        const name = Permission.buildPermissionName(resource, action);
        const slug = Permission.buildPermissionSlug(resource, action);

        // Check if permission already exists
        const existing = await permissionRepository.findByName(name);
        if (existing) {
          logger.warn('Permission already exists, skipping', { name });
          permissions.push(existing);
          continue;
        }

        // Create permission
        const permission = await permissionRepository.create({
          name,
          slug,
          description: `${action} ${resource}`,
          category,
          resource,
          action,
          isActive: true,
          isSystem: false,
          createdBy,
        });

        permissions.push(permission);
      }

      logger.info('Bulk permissions created for resource', {
        resource,
        count: permissions.length,
        createdBy,
      });

      return permissions;
    } catch (error) {
      logger.error('Error bulk creating permissions', {
        resource,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default PermissionService.getInstance();
