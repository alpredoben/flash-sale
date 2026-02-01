import userRepository from '@repositories/user.repository';
import logger from '@utils/logger.util';
import { User } from '@/database/models/user.model';
import {
  In_PaginationParams,
  In_PaginationResult,
} from '@/interfaces/pagination.interface';

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // user.service.ts

  /** Fetch all users with pagination and filters */
  async fetch(params: In_PaginationParams): Promise<In_PaginationResult<User>> {
    try {
      const { results, total } = await userRepository.fetch(params);

      return {
        data: results,
        meta: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
          hasNextPage: params.page * params.limit < total,
          hasPreviousPage: params.page > 1,
        },
      };
    } catch (error) {
      logger.error('Error in fetch user data', {
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Get current user profile */
  async findById(id: string): Promise<User> {
    try {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default UserService.getInstance();
