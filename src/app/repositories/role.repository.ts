import { Repository } from 'typeorm';
import databaseConfig from '@config/database.config';
import { Role } from '@models/role.model';
import logger from '@utils/logger.util';
import { TableNames } from '@/shared/constants/tableName.constant';

class RoleRepository {
  private static instance: RoleRepository;

  private classLabel: string = 'ROLE REPOSITORY';

  private constructor() {}

  public static getInstance(): RoleRepository {
    if (!RoleRepository.instance) {
      RoleRepository.instance = new RoleRepository();
    }
    return RoleRepository.instance;
  }

  public get repository(): Repository<Role> {
    return databaseConfig.getDataSource().getRepository(Role);
  }

  private writeErrorLog(message: string, property: Record<string, any>): void {
    logger.error(message, {
      ...property,
      label: this.classLabel,
    });
  }

  /** Find role by ID */
  async findById(id: string): Promise<Role | null> {
    try {
      return await this.repository.findOne({
        where: { id },
        relations: ['permissions'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding role by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find role by name */
  async findByName(name: string): Promise<Role | null> {
    try {
      return await this.repository.findOne({
        where: { name },
        relations: ['permissions'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding role by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find role by slug */
  async findBySlug(slug: string): Promise<Role | null> {
    try {
      return await this.repository.findOne({
        where: { slug },
        relations: ['permissions'],
      });
    } catch (error) {
      this.writeErrorLog('Error finding role by slug', {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find multiple roles by names */
  async findByNames(names: string[]): Promise<Role[]> {
    try {
      return await this.repository
        .createQueryBuilder()
        .leftJoinAndSelect(
          `${TableNames.Role}.permissions`,
          TableNames.Permission
        )
        .where(`${TableNames.Role}..name IN (:...names)`, { names })
        .getMany();
    } catch (error) {
      this.writeErrorLog('Error finding roles by names', {
        names,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find multiple roles by IDs */
  async findByIds(ids: string[]): Promise<Role[]> {
    try {
      return await this.repository
        .createQueryBuilder(TableNames.Role)
        .leftJoinAndSelect(
          `${TableNames.Role}.permissions`,
          TableNames.Permission
        )
        .where(`${TableNames.Role}.id IN (:...ids)`, { ids })
        .getMany();
    } catch (error) {
      this.writeErrorLog('Error finding roles by IDs', {
        ids,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Create new role */
  async create(payload: Partial<Role>): Promise<Role> {
    try {
      const role = this.repository.create(payload);
      return await this.repository.save(role);
    } catch (error) {
      this.writeErrorLog('Error creating role', {
        payload,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Update role */
  async update(id: string, payload: Partial<Role>): Promise<Role | null> {
    try {
      await this.repository.update(id, payload);
      return await this.findById(id);
    } catch (error) {
      this.writeErrorLog('Error updating role', {
        id,
        payload,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Soft Delete role (soft delete) */
  async softDelete(id: string): Promise<void> {
    try {
      await this.repository.softDelete(id);
    } catch (error) {
      this.writeErrorLog('Error deleting role', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Fetch all roles */
  async fetch(options?: {
    includePermissions?: boolean;
    activeOnly?: boolean;
  }): Promise<Role[]> {
    try {
      const queryBuilder = this.repository.createQueryBuilder(TableNames.Role);

      if (options?.includePermissions) {
        queryBuilder.leftJoinAndSelect(
          `${TableNames.Role}.permissions`,
          TableNames.Permission
        );
      }

      if (options?.activeOnly) {
        queryBuilder.where(`${TableNames.Role}.isActive = :isActive`, {
          isActive: true,
        });
      }

      return await queryBuilder
        .orderBy(`${TableNames.Role}.name`, 'ASC')
        .getMany();
    } catch (error) {
      this.writeErrorLog('Error finding all roles', {
        options,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Check if role name exists */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder(TableNames.Role)
        .where(`${TableNames.Role}.name = :name`, { name });

      if (excludeId) {
        queryBuilder.andWhere(`${TableNames.Role}.id != :id`, {
          id: excludeId,
        });
      }

      const count = await queryBuilder.getCount();
      return count > 0;
    } catch (error) {
      logger.error('Error checking role name existence', {
        name,
        excludeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default RoleRepository.getInstance();
