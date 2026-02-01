import { Repository } from 'typeorm';
import { User } from '@models/user.model';
import databaseConfig from '@config/database.config';
import logger from '@utils/logger.util';
import { TableNames } from '@/shared/constants/tableName.constant';
import { In_PaginationParams } from '@/interfaces/pagination.interface';
import { En_UserStatus } from '@/shared/constants/enum.constant';

class UserRepository {
  private static instance: UserRepository;
  private classLabel: string = 'USER REPOSITORY';

  private constructor() {}

  public static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }

    return UserRepository.instance;
  }

  public get repository(): Repository<User> {
    return databaseConfig.getDataSource().getRepository(User);
  }

  private writeErrorLog(message: string, property: Record<string, any>): void {
    logger.error(message, {
      ...property,
      label: this.classLabel,
    });
  }

  /** Fetch user (pagination) */
  async fetch(options: In_PaginationParams): Promise<Record<string, any>> {
    try {
      const skip = (options.page - 1) * options.limit;
      const queryBuilder = this.repository
        .createQueryBuilder(TableNames.User)
        .leftJoinAndSelect(`${TableNames.User}.roles`, TableNames.Role);

      if (options?.search) {
        queryBuilder.where(
          `(${TableNames.User}.firstName ILIKE :search OR ${TableNames.User}.lastName ILIKE :search OR ${TableNames.User}.email ILIKE :search)`,
          { search: `%${options.search}%` }
        );
      }

      if (options?.filters?.status) {
        queryBuilder.andWhere(`${TableNames.User}.status = :status`, {
          status: options.filters.status,
        });
      }

      queryBuilder
        .skip(skip)
        .take(options.limit)
        .orderBy(`${TableNames.User}.${options.sort}`, options.order);

      const [users, total] = await queryBuilder.getManyAndCount();
      return {
        results: users,
        total,
      };
    } catch (error) {
      this.writeErrorLog('Error finding all users', {
        options,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find User By ID */
  async findById(id: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: { id } as any,
        relations: ['roles', 'roles.permissions'],
      });
    } catch (error: any) {
      this.writeErrorLog('Error finding user by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find User By Email */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: { email },
        relations: ['roles', 'roles.permissions'],
      });
    } catch (error: any) {
      this.writeErrorLog('Error finding user by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find user by email with password (for authentication) */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    try {
      return await this.repository
        .createQueryBuilder(TableNames.User)
        .addSelect(`${TableNames.User}.password`)
        .leftJoinAndSelect(`${TableNames.User}.roles`, TableNames.Role)
        .leftJoinAndSelect(
          `${TableNames.Role}.permissions`,
          TableNames.Permission
        )
        .where(`${TableNames.User}.email = :email`, { email })
        .getOne();
    } catch (error) {
      this.writeErrorLog('Error finding user by email with password', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find user by password reset token */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      return await this.repository
        .createQueryBuilder(TableNames.User)
        .addSelect(`${TableNames.User}.passwordResetToken`)
        .addSelect(`${TableNames.User}.password`)
        .where(`${TableNames.User}.passwordResetToken = :token`, { token })
        .andWhere(`${TableNames.User}.passwordResetExpires > :now`, {
          now: new Date(),
        })
        .getOne();
    } catch (error) {
      this.writeErrorLog('Error finding user by password reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Create new user */
  async store(payload: Partial<User>): Promise<User> {
    try {
      const user = this.repository.create(payload);
      return await this.repository.save(user);
    } catch (error) {
      this.writeErrorLog('Error creating user', {
        payload,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Update user by id */
  async update(id: string, payload: Partial<User>): Promise<User | null> {
    try {
      await this.repository.update(id, payload);
      return await this.findById(id);
    } catch (error) {
      this.writeErrorLog('Error updating user', {
        id,
        payload,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Update last login */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.repository.update(id, {
        lastLogin: new Date(),
      });
    } catch (error) {
      this.writeErrorLog('Error updating last login', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Verify user email */
  async verifyEmail(id: string): Promise<User | null> {
    try {
      await this.repository.update(id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: En_UserStatus.ACTIVE,
        emailVerificationAt: new Date().toISOString(),
      });
      return await this.findById(id);
    } catch (error) {
      this.writeErrorLog('Error verifying email', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Check if email exists */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.repository.count({
        where: { email },
      });
      return count > 0;
    } catch (error) {
      this.writeErrorLog('Error checking email existence', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Delete user by id */
  async softDelete(id: string): Promise<void> {
    try {
      await this.repository.softDelete(id);
    } catch (error) {
      this.writeErrorLog('Error deleting user', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Find user by email verification token */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    try {
      return await this.repository
        .createQueryBuilder(TableNames.User)
        .addSelect(`${TableNames.User}.emailVerificationToken`)
        .where(`${TableNames.User}.emailVerificationToken = :token`, { token })
        .andWhere(`${TableNames.User}.emailVerificationExpires > :now`, {
          now: new Date(),
        })
        .getOne();
    } catch (error) {
      this.writeErrorLog('Error finding user by email verification token', {
        token,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

const userRepository = UserRepository.getInstance();

export { UserRepository };

export default userRepository;
