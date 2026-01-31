import { Repository } from 'typeorm';
import databaseConfig from '@config/database.config';
import { Permission } from '@models/permission.model';
import logger from '@utils/logger.util';
import { En_PermissionCategory } from '@constants/enum.constant';

class PermissionRepository {
  private static instance: PermissionRepository;

  private classLabel: string = 'PERMISSION REPOSITORY';

  private constructor() {}

  public static getInstance(): PermissionRepository {
    if (!PermissionRepository.instance) {
      PermissionRepository.instance = new PermissionRepository();
    }
    return PermissionRepository.instance;
  }

  public get repository(): Repository<Permission> {
    return databaseConfig.getDataSource().getRepository(Permission);
  }

  private writeErrorLog(message: string, property: Record<string, any>): void {
    logger.error(message, {
      ...property,
      label: this.classLabel,
    });
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<Permission | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['roles'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding permission by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find permission by name
   */
  async findByName(name: string): Promise<Permission | null> {
    try {
      return await this.repository.findOne({
        where: { name },
        relations: ['roles'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding permission by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find permission by slug
   */
  async findBySlug(slug: string): Promise<Permission | null> {
    try {
      return await this.repository.findOne({
        where: { slug },
        relations: ['roles'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding permission by slug', {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find multiple permissions by IDs
   */
  async findByIds(ids: string[]): Promise<Permission[]> {
    try {
      return await this.repository
        .createQueryBuilder('permission')
        .where('permission.id IN (:...ids)', { ids })
        .getMany();
    } catch (error) {
      this.writeErrorLog('Error finding permissions by IDs', {
        ids,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find permissions by category
   */
  async findByCategory(category: En_PermissionCategory): Promise<Permission[]> {
    try {
      return await this.repository.find({
        where: { category, isActive: true },
        order: { resource: 'ASC', action: 'ASC' },
      });
    } catch (error) {
      this.writeErrorLog('Error finding permissions by category', {
        category,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<Permission[]> {
    try {
      return await this.repository.find({
        where: { resource, isActive: true },
        order: { action: 'ASC' },
      });
    } catch (error) {
      this.writeErrorLog('Error finding permissions by resource', {
        resource,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all permissions
   */
  async fetch(options?: {
    includeRoles?: boolean;
    activeOnly?: boolean;
    category?: En_PermissionCategory;
  }): Promise<Permission[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('permission');

      if (options?.includeRoles) {
        queryBuilder.leftJoinAndSelect('permission.roles', 'roles');
      }

      if (options?.activeOnly) {
        queryBuilder.where('permission.isActive = :isActive', {
          isActive: true,
        });
      }

      if (options?.category) {
        queryBuilder.andWhere('permission.category = :category', {
          category: options.category,
        });
      }

      return await queryBuilder
        .orderBy('permission.category', 'ASC')
        .addOrderBy('permission.resource', 'ASC')
        .addOrderBy('permission.action', 'ASC')
        .getMany();
    } catch (error) {
      this.writeErrorLog('Error finding all permissions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all permissions with pagination
   */
  async fetchWithPaginate(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: En_PermissionCategory;
    resource?: string;
    isActive?: boolean;
  }): Promise<{ permissions: Permission[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        resource,
        isActive,
      } = options;
      const skip = (page - 1) * limit;

      const queryBuilder = this.repository.createQueryBuilder('permission');

      if (search) {
        queryBuilder.where(
          '(permission.name ILIKE :search OR permission.description ILIKE :search OR permission.resource ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (category) {
        queryBuilder.andWhere('permission.category = :category', { category });
      }

      if (resource) {
        queryBuilder.andWhere('permission.resource = :resource', { resource });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('permission.isActive = :isActive', { isActive });
      }

      queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('permission.category', 'ASC')
        .addOrderBy('permission.resource', 'ASC')
        .addOrderBy('permission.action', 'ASC');

      const [permissions, total] = await queryBuilder.getManyAndCount();

      return { permissions, total };
    } catch (error) {
      this.writeErrorLog('Error finding permissions with pagination', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create new permission
   */
  async create(permissionData: Partial<Permission>): Promise<Permission> {
    try {
      const permission = this.repository.create(permissionData);
      return await this.repository.save(permission);
    } catch (error) {
      this.writeErrorLog('Error creating permission', {
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
    permissionData: Partial<Permission>
  ): Promise<Permission | null> {
    try {
      await this.repository.update(id, permissionData);
      return await this.findById(id);
    } catch (error) {
      this.writeErrorLog('Error updating permission', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete permission (soft delete)
   */
  async softDelete(id: string): Promise<void> {
    try {
      await this.repository.softDelete(id);
    } catch (error) {
      this.writeErrorLog('Error deleting permission', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if permission name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('permission')
        .where('permission.name = :name', { name });

      if (excludeId) {
        queryBuilder.andWhere('permission.id != :id', { id: excludeId });
      }

      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      this.writeErrorLog('Error checking permission name existence', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if permission slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('permission')
        .where('permission.slug = :slug', { slug });

      if (excludeId) {
        queryBuilder.andWhere('permission.id != :id', { id: excludeId });
      }

      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      this.writeErrorLog('Error checking permission slug existence', {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions grouped by category
   */
  async getGroupedByCategory(): Promise<
    Record<En_PermissionCategory, Permission[]>
  > {
    try {
      const permissions = await this.repository.find({
        where: { isActive: true },
        order: {
          category: 'ASC',
          resource: 'ASC',
          action: 'ASC',
        },
      });

      const grouped: Record<En_PermissionCategory, Permission[]> = {} as any;

      permissions.forEach((permission) => {
        if (!grouped[permission.category]) {
          grouped[permission.category] = [];
        }
        grouped[permission.category].push(permission);
      });

      return grouped;
    } catch (error) {
      this.writeErrorLog('Error getting permissions grouped by category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get permissions grouped by resource
   */
  async getGroupedByResource(): Promise<Record<string, Permission[]>> {
    try {
      const permissions = await this.repository.find({
        where: { isActive: true },
        order: {
          resource: 'ASC',
          action: 'ASC',
        },
      });

      const grouped: Record<string, Permission[]> = {};

      permissions.forEach((permission) => {
        if (!grouped[permission.resource]) {
          grouped[permission.resource] = [];
        }
        grouped[permission.resource]!.push(permission);
      });

      return grouped;
    } catch (error) {
      this.writeErrorLog('Error getting permissions grouped by resource', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Count permissions by category
   */
  async countByCategory(): Promise<Record<En_PermissionCategory, number>> {
    try {
      const result = await this.repository
        .createQueryBuilder('permission')
        .select('permission.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('permission.isActive = :isActive', { isActive: true })
        .groupBy('permission.category')
        .getRawMany();

      const counts: Record<En_PermissionCategory, number> = {} as any;

      result.forEach((row) => {
        counts[row.category as En_PermissionCategory] = parseInt(row.count, 10);
      });

      return counts;
    } catch (error) {
      this.writeErrorLog('Error counting permissions by category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default PermissionRepository.getInstance();
