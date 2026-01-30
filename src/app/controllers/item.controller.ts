// src/app/controllers/item.controller.ts
import { Request, Response, NextFunction } from 'express';
import itemService from '@services/item.service';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';
import {
  In_DTO_CreateItem,
  In_DTO_UpdateItem,
  In_ItemListParams,
} from '@interfaces/dto.interface';
import { En_ItemStatus } from '@constants/enum.constant';

class ItemController {
  private static instance: ItemController;

  private constructor() {}

  public static getInstance(): ItemController {
    if (!ItemController.instance) {
      ItemController.instance = new ItemController();
    }
    return ItemController.instance;
  }

  /** Create new item - [POST] /api/v1/items (Admin only) */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: In_DTO_CreateItem = req.body;
      const createdBy = req.user?.id;

      const item = await itemService.create(data, createdBy);

      apiResponse.sendCreated(res, lang.__('success.item.create'), {
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice,
          stock: item.stock,
          reservedStock: item.reservedStock,
          availableStock: item.availableStock,
          status: item.status,
          imageUrl: item.imageUrl,
          saleStartDate: item.saleStartDate,
          saleEndDate: item.saleEndDate,
          maxPerUser: item.maxPerUser,
          createdAt: item.createdAt,
        },
      });
    } catch (error) {
      logger.error('Create item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });
      next(error);
    }
  }

  /** Get all items - [GET] /api/v1/items */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: In_ItemListParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string,
        status: req.query.status as En_ItemStatus,
        sortBy: req.query.sortBy as any,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        inStock:
          req.query.inStock === 'true'
            ? true
            : req.query.inStock === 'false'
              ? false
              : undefined,
      };

      const result = await itemService.getAll(params);

      apiResponse.sendSuccess(
        res,
        lang.__('success.item.fetch', { name: 'Items' }),
        {
          items: result.data.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.price,
            originalPrice: item.originalPrice,
            stock: item.stock,
            reservedStock: item.reservedStock,
            availableStock: item.availableStock,
            status: item.status,
            imageUrl: item.imageUrl,
            saleStartDate: item.saleStartDate,
            saleEndDate: item.saleEndDate,
            maxPerUser: item.maxPerUser,
            createdAt: item.createdAt,
          })),
        },
        result.meta
      );
    } catch (error) {
      logger.error('Get all items error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /** Get item by ID - [GET] /api/v1/items/:id */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const item = await itemService.getById(id as any);

      apiResponse.sendSuccess(
        res,
        lang.__('success.item.fetch', { name: 'Item' }),
        {
          item: {
            id: item.id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.price,
            originalPrice: item.originalPrice,
            stock: item.stock,
            reservedStock: item.reservedStock,
            availableStock: item.availableStock,
            status: item.status,
            imageUrl: item.imageUrl,
            saleStartDate: item.saleStartDate,
            saleEndDate: item.saleEndDate,
            maxPerUser: item.maxPerUser,
            version: item.version,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          },
        }
      );
    } catch (error) {
      logger.error('Get item by ID error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
      });
      next(error);
    }
  }

  /** Update item - [PUT] /api/v1/items/:id (Admin only) */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: In_DTO_UpdateItem = req.body;
      const updatedBy = req.user?.id;

      const item = await itemService.update(id as any, data, updatedBy);

      apiResponse.sendSuccess(res, lang.__('success.item.update'), {
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          price: item.price,
          originalPrice: item.originalPrice,
          stock: item.stock,
          reservedStock: item.reservedStock,
          availableStock: item.availableStock,
          status: item.status,
          imageUrl: item.imageUrl,
          saleStartDate: item.saleStartDate,
          saleEndDate: item.saleEndDate,
          maxPerUser: item.maxPerUser,
          updatedAt: item.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Update item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        body: req.body,
      });
      next(error);
    }
  }

  /** Delete item - [DELETE] /api/v1/items/:id (Admin only) */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.id;

      await itemService.delete(id as any, deletedBy);

      apiResponse.sendSuccess(res, lang.__('success.item.delete'));
    } catch (error) {
      logger.error('Delete item error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
      });
      next(error);
    }
  }

  /** Update item status - [PATCH] /api/v1/items/:id/status (Admin only) */
  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedBy = req.user?.id;

      if (!Object.values(En_ItemStatus).includes(status)) {
        apiResponse.sendBadRequest(res, 'Invalid status value');
        return;
      }

      const item = await itemService.updateStatus(id as any, status, updatedBy);

      apiResponse.sendSuccess(res, lang.__('success.item.update-status'), {
        item: {
          id: item.id,
          name: item.name,
          status: item.status,
          updatedAt: item.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Update item status error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: req.params.id,
        body: req.body,
      });
      next(error);
    }
  }

  /** Get active sale items - [GET] /api/v1/items/sale/active */
  async getActiveSaleItems(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const items = await itemService.getActiveSaleItems();

      apiResponse.sendSuccess(
        res,
        lang.__('success.item.fetch', { name: 'Active sale items' }),
        {
          items: items.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.price,
            originalPrice: item.originalPrice,
            availableStock: item.availableStock,
            imageUrl: item.imageUrl,
            saleStartDate: item.saleStartDate,
            saleEndDate: item.saleEndDate,
            maxPerUser: item.maxPerUser,
          })),
        }
      );
    } catch (error) {
      logger.error('Get active sale items error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get low stock items - [GET] /api/v1/items/low-stock (Admin only) */
  async getLowStockItems(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const items = await itemService.getLowStockItems(threshold);

      apiResponse.sendSuccess(
        res,
        lang.__('success.item.fetch', { name: 'Low stock items' }),
        {
          items: items.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            stock: item.stock,
            reservedStock: item.reservedStock,
            availableStock: item.availableStock,
            status: item.status,
          })),
        }
      );
    } catch (error) {
      logger.error('Get low stock items error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get item statistics - [GET] /api/v1/items/stats (Admin only) */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await itemService.getStats();

      apiResponse.sendSuccess(res, lang.__('success.item.statistic'), {
        stats,
      });
    } catch (error) {
      logger.error('Get item stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

export default ItemController.getInstance();
