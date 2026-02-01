import { Request, Response, NextFunction } from 'express';
import userService from '@services/user.service';
import apiResponse from '@utils/response.util';
import lang from '@lang/index';
import logger from '@utils/logger.util';
import { In_PaginationParams } from '@/interfaces/pagination.interface';

class UserController {
  private static instance: UserController;

  private constructor() {}

  public static getInstance(): UserController {
    if (!UserController.instance) {
      UserController.instance = new UserController();
    }
    return UserController.instance;
  }

  // user.controller.ts

  async fetch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: In_PaginationParams = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sort: (req.query.sort as string) || 'createdAt',
        order: (req.query.order as 'ASC' | 'DESC') || 'DESC',
        search: (req.query.search as string) || undefined,
        filters: {
          status: req.query.status?.toString()
            ? req.query.status?.toString().toLowerCase()
            : undefined,
        },
      };

      const result = await userService.fetch(params);

      apiResponse.sendPaginated(
        res,
        lang.__('success.default.fetch', { name: 'Users' }),
        result.data,
        result.meta.page,
        result.meta.limit,
        result.meta.total
      );
    } catch (error) {
      next(error);
    }
  }

  async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = req?.params?.id;
    try {
      const result = await userService.findById(id as any);
      apiResponse.sendCreated(
        res,
        lang.__('success.default.fetch', { name: 'User' }),
        result
      );
    } catch (error) {
      logger.error('Find user by id error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });
      next(error);
    }
  }
}

export default UserController.getInstance();
