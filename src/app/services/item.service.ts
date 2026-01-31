import itemRepository from '@repositories/item.repository';
import { Item } from '@models/item.model';
import {
  In_DTO_CreateItem,
  In_DTO_UpdateItem,
  In_ItemListParams,
} from '@interfaces/dto.interface';
import { In_PaginationResult } from '@interfaces/pagination.interface';
import { En_ItemStatus } from '@constants/enum.constant';
import logger from '@utils/logger.util';
import { AppDataSource } from '@config/database.config';

class ItemService {
  private static instance: ItemService;

  private constructor() {}

  public static getInstance(): ItemService {
    if (!ItemService.instance) {
      ItemService.instance = new ItemService();
    }
    return ItemService.instance;
  }

  /** Create new item (Admin only) */
  async create(data: In_DTO_CreateItem, createdBy?: string): Promise<Item> {
    try {
      // Check if SKU already exists
      const existingItem = await itemRepository.findBySku(data.sku);
      if (existingItem) {
        throw new Error('Item with this SKU already exists');
      }

      // Validate price
      if (data.price <= 0) {
        throw new Error('Price must be greater than 0');
      }

      if (data.originalPrice && data.originalPrice < data.price) {
        throw new Error('Original price cannot be less than current price');
      }

      // Validate stock
      if (data.stock < 0) {
        throw new Error('Stock cannot be negative');
      }

      // Validate sale dates
      if (data.saleStartDate && data.saleEndDate) {
        if (new Date(data.saleStartDate) >= new Date(data.saleEndDate)) {
          throw new Error('Sale start date must be before end date');
        }
      }

      // Create item
      const item = await itemRepository.create({
        sku: data.sku,
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        stock: data.stock,
        reservedStock: 0,
        availableStock: data.stock,
        status: En_ItemStatus.ACTIVE,
        imageUrl: data.imageUrl,
        saleStartDate: data.saleStartDate,
        saleEndDate: data.saleEndDate,
        maxPerUser: data.maxPerUser || 1,
        version: 0,
        createdBy,
      });

      logger.info('Item created successfully', {
        itemId: item.id,
        sku: item.sku,
      });
      return item;
    } catch (error) {
      logger.error('Error creating item', { error, data });
      throw error;
    }
  }

  /** Update item (Admin only) */
  async update(
    id: string,
    data: In_DTO_UpdateItem,
    updatedBy?: string
  ): Promise<Item> {
    try {
      const item = await itemRepository.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      // Validate price if provided
      if (data.price !== undefined && data.price <= 0) {
        throw new Error('Price must be greater than 0');
      }

      if (data.originalPrice && data.price && data.originalPrice < data.price) {
        throw new Error('Original price cannot be less than current price');
      }

      // Validate stock if provided
      if (data.stock !== undefined) {
        if (data.stock < 0) {
          throw new Error('Stock cannot be negative');
        }

        // Calculate new available stock
        const availableStock = data.stock - item.reservedStock;
        if (availableStock < 0) {
          throw new Error('Cannot reduce stock below reserved quantity');
        }
      }

      // Validate sale dates
      if (data.saleStartDate && data.saleEndDate) {
        if (new Date(data.saleStartDate) >= new Date(data.saleEndDate)) {
          throw new Error('Sale start date must be before end date');
        }
      }

      const updateData: Partial<Item> = {
        ...data,
        updatedBy,
      };

      // Recalculate available stock if stock is updated
      if (data.stock !== undefined) {
        updateData.availableStock = data.stock - item.reservedStock;
      }

      const updatedItem = await itemRepository.update(id, updateData);

      logger.info('Item updated successfully', { itemId: id });
      return updatedItem;
    } catch (error) {
      logger.error('Error updating item', { error, id, data });
      throw error;
    }
  }

  /** Get item by ID */
  async getById(id: string): Promise<Item> {
    try {
      const item = await itemRepository.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }
      return item;
    } catch (error) {
      logger.error('Error getting item by ID', { error, id });
      throw error;
    }
  }

  /** Get all items with filters and pagination */
  async getAll(params: In_ItemListParams): Promise<In_PaginationResult<Item>> {
    try {
      return await itemRepository.findAll(params);
    } catch (error) {
      logger.error('Error getting items', { error, params });
      throw error;
    }
  }

  /** Delete item (Admin only) */
  async delete(id: string, deletedBy?: string): Promise<void> {
    try {
      const item = await itemRepository.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check if item has active reservations
      if (item.reservedStock > 0) {
        throw new Error('Cannot delete item with active reservations');
      }

      await itemRepository.softDelete(id, deletedBy);
      logger.info('Item deleted successfully', { itemId: id });
    } catch (error) {
      logger.error('Error deleting item', { error, id });
      throw error;
    }
  }

  /** Update item status (Admin only) */
  async updateStatus(
    id: string,
    status: En_ItemStatus,
    updatedBy?: string
  ): Promise<Item> {
    try {
      const item = await itemRepository.findById(id);
      if (!item) {
        throw new Error('Item not found');
      }

      const updatedItem = await itemRepository.update(id, {
        status,
        updatedBy,
      });
      logger.info('Item status updated', { itemId: id, status });
      return updatedItem;
    } catch (error) {
      logger.error('Error updating item status', { error, id, status });
      throw error;
    }
  }

  /** Reserve stock (called during reservation creation) */
  async reserveStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the item row
      const item = await itemRepository.findByIdWithLock(itemId);

      if (!item) {
        throw new Error('Item not found');
      }

      if (item.status !== En_ItemStatus.ACTIVE) {
        throw new Error('Item is not available for reservation');
      }

      if (item.availableStock < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Update stock atomically
      await itemRepository.updateStock(itemId, 0, quantity);

      await queryRunner.commitTransaction();
      logger.info('Stock reserved successfully', { itemId, quantity });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error reserving stock', { error, itemId, quantity });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Release reserved stock (called when reservation expires or is cancelled) */
  async releaseStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the item row
      const item = await itemRepository.findByIdWithLock(itemId);

      if (!item) {
        throw new Error('Item not found');
      }

      // Update stock atomically (reduce reserved stock)
      await itemRepository.updateStock(itemId, 0, -quantity);

      await queryRunner.commitTransaction();
      logger.info('Stock released successfully', { itemId, quantity });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error releasing stock', { error, itemId, quantity });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Confirm stock (called when reservation is confirmed/checked out) */
  async confirmStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the item row
      const item = await itemRepository.findByIdWithLock(itemId);

      if (!item) {
        throw new Error('Item not found');
      }

      // Update stock atomically (reduce both total and reserved stock)
      await itemRepository.updateStock(itemId, -quantity, -quantity);

      await queryRunner.commitTransaction();
      logger.info('Stock confirmed successfully', { itemId, quantity });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error confirming stock', { error, itemId, quantity });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Get active sale items */
  async getActiveSaleItems(): Promise<Item[]> {
    try {
      return await itemRepository.findActiveSaleItems();
    } catch (error) {
      logger.error('Error getting active sale items', { error });
      throw error;
    }
  }

  /** Get low stock items (Admin only) */
  async getLowStockItems(threshold: number = 10): Promise<Item[]> {
    try {
      return await itemRepository.findLowStockItems(threshold);
    } catch (error) {
      logger.error('Error getting low stock items', { error, threshold });
      throw error;
    }
  }

  /** Get item statistics (Admin only) */
  async getStats(): Promise<any> {
    try {
      const [total, active, inactive, outOfStock] = await Promise.all([
        itemRepository.countByStatus(En_ItemStatus.ACTIVE),
        itemRepository.countByStatus(En_ItemStatus.INACTIVE),
        itemRepository.countByStatus(En_ItemStatus.OUT_OF_STOCK),
        itemRepository.countByStatus(En_ItemStatus.ACTIVE),
        itemRepository.countByStatus(En_ItemStatus.INACTIVE),
        itemRepository.countByStatus(En_ItemStatus.OUT_OF_STOCK),
      ]);

      return {
        total,
        active,
        inactive,
        outOfStock,
      };
    } catch (error) {
      logger.error('Error getting item stats', { error });
      throw error;
    }
  }
}

export default ItemService.getInstance();
