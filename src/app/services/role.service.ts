import roleRepository from '@repositories/role.repository';
import permissionRepository from '@repositories/permission.repository';
import logger from '@utils/logger.util';
import helpers from '@utils/helper.util';
import { Role } from '@models/role.model';
import { En_RoleType } from '@constants/enum.constant';
import {
  In_DTO_CreateRole,
  In_DTO_UpdateRole,
} from '@/interfaces/dto.interface';

class RoleService {
  private static instance: RoleService;

  private constructor() {}

  public static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  /** Fetch All */
  async fetchAll(options?: {
    includePermissions?: boolean;
    activeOnly?: boolean;
  }): Promise<Role[]> {
    try {
      return await roleRepository.fetch(options);
    } catch (error) {
      logger.error('Error getting all roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Fetch By ID */
  async fetchById(id: string): Promise<Role> {
    try {
      const role = await roleRepository.findById(id);

      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    } catch (error) {
      logger.error('Error getting role by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Fetch By Slug */
  async fetchBySlug(slug: string): Promise<Role> {
    try {
      const role = await roleRepository.findBySlug(slug);

      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    } catch (error) {
      logger.error('Error getting role by slug', {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Store */
  async store(data: In_DTO_CreateRole, createdBy?: string): Promise<Role> {
    try {
      // Check if role name already exists
      const existingRole = await roleRepository.findByName(data.name);
      if (existingRole) {
        throw new Error('Role name already exists');
      }

      // Generate slug from name
      const slug = helpers.generateSlug(data.name);

      // Check if slug already exists
      const existingSlug = await roleRepository.findBySlug(slug);
      if (existingSlug) {
        throw new Error('Role slug already exists');
      }

      // Get permissions if provided
      let permissions: any[] = [];
      if (data.permissionIds && data.permissionIds.length > 0) {
        permissions = await permissionRepository.findByIds(data.permissionIds);

        if (permissions.length !== data.permissionIds.length) {
          throw new Error('Some permissions not found');
        }
      }

      // Create role
      const createData: Partial<Role> = {
        name: data.name,
        slug,
        type: En_RoleType.CUSTOM,
        isActive: true,
        permissions,
        createdBy,
      };

      if (data.description !== undefined) {
        createData.description = data.description;
      }

      const role = await roleRepository.create(createData);

      logger.info('Role created', {
        roleId: role.id,
        roleName: role.name,
        createdBy,
      });

      return role;
    } catch (error) {
      logger.error('Error creating role', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Update */
  async update(
    id: string,
    data: In_DTO_UpdateRole,
    updatedBy?: string
  ): Promise<Role> {
    try {
      // Check if role exists
      const role = await roleRepository.findById(id);
      if (!role) {
        throw new Error('Role not found');
      }

      // Check if role can be modified
      if (!role.canBeModified()) {
        throw new Error('System roles cannot be modified');
      }

      // If name is being updated, check for duplicates
      if (data.name && data.name !== role.name) {
        const existingRole = await roleRepository.nameExists(data.name, id);
        if (existingRole) {
          throw new Error('Role name already exists');
        }
      }

      // Prepare update data
      const updateData: Partial<Role> = {
        updatedBy,
      };

      if (data.name) {
        updateData.name = data.name;
        updateData.slug = helpers.generateSlug(data.name);
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // Update permissions if provided
      if (data.permissionIds) {
        const permissions = await permissionRepository.findByIds(
          data.permissionIds
        );

        if (permissions.length !== data.permissionIds.length) {
          throw new Error('Some permissions not found');
        }

        updateData.permissions = permissions;
      }

      // Update role
      const updatedRole = await roleRepository.update(id, updateData);

      if (!updatedRole) {
        throw new Error('Failed to update role');
      }

      logger.info('Role updated', {
        roleId: id,
        updatedBy,
      });

      // Invalidate cache for users with this role
      // This would require getting all users with this role and invalidating their cache
      // For now, we'll log it
      logger.debug('Consider invalidating user caches for role', {
        roleId: id,
      });

      return updatedRole;
    } catch (error) {
      logger.error('Error updating role', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Delete */
  async delete(id: string, deletedBy?: string): Promise<void> {
    try {
      // Check if role exists
      const role = await roleRepository.findById(id);
      if (!role) {
        throw new Error('Role not found');
      }

      // Check if role can be deleted
      if (!role.canBeDeleted()) {
        throw new Error('System roles cannot be deleted');
      }

      // Soft delete role
      await roleRepository.softDelete(id);

      logger.info('Role deleted', {
        roleId: id,
        roleName: role.name,
        deletedBy,
      });

      // Note: Consider what to do with users who have this role
      // Options:
      // 1. Prevent deletion if users have this role
      // 2. Remove role from users
      // 3. Assign default role to users
    } catch (error) {
      logger.error('Error deleting role', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ): Promise<Role> {
    try {
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Get permissions
      const permissions = await permissionRepository.findByIds(permissionIds);

      if (permissions.length !== permissionIds.length) {
        throw new Error('Some permissions not found');
      }

      // Update role with new permissions
      const updatedRole = await roleRepository.update(roleId, {
        permissions,
        updatedBy,
      });

      if (!updatedRole) {
        throw new Error('Failed to assign permissions');
      }

      logger.info('Permissions assigned to role', {
        roleId,
        permissionCount: permissions.length,
        updatedBy,
      });

      return updatedRole;
    } catch (error) {
      logger.error('Error assigning permissions', {
        roleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove permissions from role
   */
  async removePermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ): Promise<Role> {
    try {
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Filter out permissions to be removed
      const remainingPermissions = role.permissions.filter(
        (p) => !permissionIds.includes(p.id)
      );

      // Update role
      const updatedRole = await roleRepository.update(roleId, {
        permissions: remainingPermissions,
        updatedBy,
      });

      if (!updatedRole) {
        throw new Error('Failed to remove permissions');
      }

      logger.info('Permissions removed from role', {
        roleId,
        removedCount: permissionIds.length,
        updatedBy,
      });

      return updatedRole;
    } catch (error) {
      logger.error('Error removing permissions', {
        roleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Fetch Role Stats */
  async getRoleStats(): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    activeRoles: number;
    inactiveRoles: number;
  }> {
    try {
      const allRoles = await roleRepository.fetch();

      const stats = {
        totalRoles: allRoles.length,
        systemRoles: allRoles.filter((r) => r.type === En_RoleType.SYSTEM)
          .length,
        customRoles: allRoles.filter((r) => r.type === En_RoleType.CUSTOM)
          .length,
        activeRoles: allRoles.filter((r) => r.isActive).length,
        inactiveRoles: allRoles.filter((r) => !r.isActive).length,
      };

      return stats;
    } catch (error) {
      logger.error('Error getting role stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default RoleService.getInstance();
