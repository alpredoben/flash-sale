import { Item } from '@models/item.model';
import { AppDataSource } from '@config/database.config';
import logger from '@utils/logger.util';
import { TableNames } from '@/shared/constants/tableName.constant';
import { En_ItemStatus } from '@/shared/constants/enum.constant';
import lang from '@lang/index';

class StockManagementService {
  private static instance: StockManagementService;
  private constructor() {}

  public static getInstance(): StockManagementService {
    if (!StockManagementService.instance) {
      StockManagementService.instance = new StockManagementService();
    }
    return StockManagementService.instance;
  }

  async reserveStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      const item = await queryRunner.manager
        .createQueryBuilder(Item, TableNames.Item)
        .setLock('pessimistic_write')
        .where(`${TableNames.Item}.id = :itemId`, { itemId })
        .getOne();

      if (!item) {
        throw new Error(lang.__('error.item.not-found'));
      }

      // check status dan ketersediaan item
      if (item.status !== En_ItemStatus.ACTIVE) {
        throw new Error(lang.__('error.item.unavailable-reservation'));
      }

      // check item mencukupi
      if (item.availableStock < quantity) {
        logger.warn('Insufficient stock for reservation', {
          itemId,
          requestedQuantity: quantity,
          availableStock: item.availableStock,
          totalStock: item.stock,
          reservedStock: item.reservedStock,
        });
        throw new Error(
          lang.__('error.item.insufficient', {
            stock: `${item.availableStock}`,
            quantity: `${quantity}`,
          })
        );
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          reservedStock: () => `reserved_stock + ${quantity}`,
          availableStock: () => `stock - (reserved_stock + ${quantity})`,
          version: () => 'version + 1',
        })
        .where('id = :itemId', { itemId })
        .execute();

      await queryRunner.commitTransaction();

      logger.info('Stock reserved successfully', {
        itemId,
        quantity,
        previousAvailable: item.availableStock,
        newAvailable: item.availableStock - quantity,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to reserve stock', {
        itemId,
        quantity,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // Lock the item row
      const item = await queryRunner.manager
        .createQueryBuilder(Item, TableNames.Item)
        .setLock('pessimistic_write')
        .where(`${TableNames.Item}.id = :itemId`, { itemId })
        .getOne();

      if (!item) {
        throw new Error(lang.__('error.item.not-found'));
      }

      // Validate that we're not releasing more than reserved
      if (item.reservedStock < quantity) {
        logger.warn('Attempting to release more than reserved stock', {
          itemId,
          requestedRelease: quantity,
          currentReserved: item.reservedStock,
        });
        // Adjust quantity to not go negative
        quantity = item.reservedStock;
      }

      // ATOMIC OPERATION: Release stock
      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          reservedStock: () => `reserved_stock - ${quantity}`,
          availableStock: () => `stock - (reserved_stock - ${quantity})`,
          version: () => 'version + 1',
        })
        .where('id = :itemId', { itemId })
        .execute();

      await queryRunner.commitTransaction();

      logger.info('Stock released successfully', {
        itemId,
        quantity,
        previousReserved: item.reservedStock,
        newReserved: item.reservedStock - quantity,
        newAvailable: item.availableStock + quantity,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to release stock', {
        itemId,
        quantity,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmStock(itemId: string, quantity: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // Lock the item row
      const item = await queryRunner.manager
        .createQueryBuilder(Item, TableNames.Item)
        .setLock('pessimistic_write')
        .where(`${TableNames.Item}.id = :itemId`, { itemId })
        .getOne();

      if (!item) {
        throw new Error(lang.__('error.item.not-found'));
      }

      // Validate reserved stock
      if (item.reservedStock < quantity) {
        throw new Error(lang.__('error.reservation.not-enough-reserved'));
      }

      // Validate total stock
      if (item.stock < quantity) {
        throw new Error(lang.__('error.item.not-enough-stock'));
      }

      // ATOMIC OPERATION: Confirm stock (reduce both total and reserved)
      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          stock: () => `stock - ${quantity}`,
          reservedStock: () => `reserved_stock - ${quantity}`,
          availableStock: () =>
            `(stock - ${quantity}) - (reserved_stock - ${quantity})`,
          version: () => 'version + 1',
        })
        .where('id = :itemId', { itemId })
        .execute();

      await queryRunner.commitTransaction();

      logger.info('Stock confirmed successfully', {
        itemId,
        quantity,
        previousStock: item.stock,
        newStock: item.stock - quantity,
        previousReserved: item.reservedStock,
        newReserved: item.reservedStock - quantity,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to confirm stock', {
        itemId,
        quantity,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async checkStockConsistency(): Promise<{
    consistent: boolean;
    inconsistencies: any[];
  }> {
    try {
      const items = await AppDataSource.getRepository(Item)
        .createQueryBuilder(TableNames.Item)
        .where(
          `${TableNames.Item}.availableStock != (${TableNames.Item}.stock - ${TableNames.Item}.reservedStock)`
        )
        .getMany();

      const inconsistencies = items.map((item) => ({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        stock: item.stock,
        reservedStock: item.reservedStock,
        availableStock: item.availableStock,
        expectedAvailable: item.stock - item.reservedStock,
        difference: item.availableStock - (item.stock - item.reservedStock),
      }));

      if (inconsistencies.length > 0) {
        logger.error('Stock inconsistencies detected', { inconsistencies });
      }

      return {
        consistent: inconsistencies.length === 0,
        inconsistencies,
      };
    } catch (error) {
      logger.error('Failed to check stock consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async fixStockConsistency(): Promise<number> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update all items to recalculate availableStock
      const result = await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          availableStock: () => 'stock - reserved_stock',
        })
        .execute();

      await queryRunner.commitTransaction();

      logger.info('Stock consistency fixed', {
        itemsFixed: result.affected,
      });

      return result.affected || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to fix stock consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async bulkReserveStock(
    reservations: Array<{ itemId: string; quantity: number }>
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // Lock all items first
      const itemIds = reservations.map((r) => r.itemId);
      const items = await queryRunner.manager
        .createQueryBuilder(Item, TableNames.Item)
        .setLock('pessimistic_write')
        .where(`${TableNames.Item}.id IN (:...itemIds)`, { itemIds })
        .getMany();

      if (items.length !== itemIds.length) {
        throw new Error('Some items not found');
      }

      // Check all items have sufficient stock
      for (const reservation of reservations) {
        const item = items.find((i) => i.id === reservation.itemId);
        if (!item) {
          throw new Error(`Item ${reservation.itemId} not found`);
        }

        if (item.availableStock < reservation.quantity) {
          throw new Error(
            `Insufficient stock for item ${item.name}. Available: ${item.availableStock}, Requested: ${reservation.quantity}`
          );
        }
      }

      // Reserve stock for all items
      for (const reservation of reservations) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Item)
          .set({
            reservedStock: () => `reserved_stock + ${reservation.quantity}`,
            availableStock: () =>
              `stock - (reserved_stock + ${reservation.quantity})`,
            version: () => 'version + 1',
          })
          .where('id = :itemId', { itemId: reservation.itemId })
          .execute();
      }

      await queryRunner.commitTransaction();

      logger.info('Bulk stock reserved successfully', {
        itemCount: reservations.length,
        reservations,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to bulk reserve stock', {
        reservations,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStockStatistics(): Promise<any> {
    try {
      const stats = await AppDataSource.getRepository(Item)
        .createQueryBuilder(TableNames.Item)
        .select(`SUM(${TableNames.Item}.stock)`, 'totalStock')
        .addSelect(`SUM(${TableNames.Item}.reservedStock)`, 'totalReserved')
        .addSelect(`SUM(${TableNames.Item}.availableStock)`, 'totalAvailable')
        .addSelect('COUNT(*)', 'totalItems')
        .addSelect(
          `COUNT(CASE WHEN ${TableNames.Item}.availableStock = 0 THEN 1 END)`,
          'outOfStock'
        )
        .addSelect(
          `COUNT(CASE WHEN ${TableNames.Item}.availableStock > 0 AND item.availableStock < 10 THEN 1 END)`,
          'lowStock'
        )
        .where('item.status = :status', { status: 'active' })
        .getRawOne();

      return {
        totalStock: parseInt(stats.totalStock || '0', 10),
        totalReserved: parseInt(stats.totalReserved || '0', 10),
        totalAvailable: parseInt(stats.totalAvailable || '0', 10),
        totalItems: parseInt(stats.totalItems || '0', 10),
        outOfStockItems: parseInt(stats.outOfStock || '0', 10),
        lowStockItems: parseInt(stats.lowStock || '0', 10),
      };
    } catch (error) {
      logger.error('Failed to get stock statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default StockManagementService.getInstance();
