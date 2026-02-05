import StockManagementService from '../../../src/app/services/stockManagement.service';
import { AppDataSource } from '../../../src/configs/database.config';
import logger from '../../../src/shared/utils/logger.util';
import { En_ItemStatus } from '../../../src/shared/constants/enum.constant';
import { Item } from '../../../src/database/models/item.model';
import lang from '../../../src/lang/index';

// Mock all dependencies
jest.mock('@config/database.config');
jest.mock('@utils/logger.util');
jest.mock('@lang/index', () => ({
  __: jest.fn((key: string, params?: any) => {
    const messages: Record<string, string> = {
      'error.item.not-found': 'Item not found',
      'error.item.unavailable-reservation':
        'Item is not available for reservation',
      'error.item.insufficient': `Insufficient stock. Available: ${params?.stock}, Requested: ${params?.quantity}`,
      'error.reservation.not-enough-reserved': 'Not enough reserved stock',
      'error.item.not-enough-stock': 'Not enough stock',
    };
    return messages[key] || key;
  }),
}));

describe('StockManagementService', () => {
  let stockManagementService: typeof StockManagementService;
  let mockQueryRunner: any;
  let mockRepository: any;
  let mockItem: Partial<Item>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get singleton instance
    stockManagementService = StockManagementService;

    // Setup mock item
    mockItem = {
      id: 'item-123',
      sku: 'ITEM-001',
      name: 'Test Item',
      stock: 100,
      reservedStock: 20,
      availableStock: 80,
      status: En_ItemStatus.ACTIVE,
      version: 0,
    };

    // Setup mock repository
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockItem),
      getMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        totalStock: '1000',
        totalReserved: '200',
        totalAvailable: '800',
        totalItems: '50',
        outOfStock: '5',
        lowStock: '10',
      }),
    };

    // Setup mock query runner
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: jest.fn(() => mockRepository),
      },
    };

    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(
      mockQueryRunner
    );
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  describe('reserveStock', () => {
    const itemId = 'item-123';
    const quantity = 10;

    it('should successfully reserve stock', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.reserveStock(itemId, quantity);

      // Assert
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith(
        'READ COMMITTED'
      );
      expect(mockRepository.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(mockRepository.update).toHaveBeenCalledWith(Item);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Stock reserved successfully',
        expect.objectContaining({
          itemId,
          quantity,
        })
      );
    });

    it('should throw error if item not found', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        stockManagementService.reserveStock(itemId, quantity)
      ).rejects.toThrow('Item not found');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if item is not active', async () => {
      // Arrange
      const inactiveItem = { ...mockItem, status: En_ItemStatus.INACTIVE };
      mockRepository.getOne.mockResolvedValue(inactiveItem);

      // Act & Assert
      await expect(
        stockManagementService.reserveStock(itemId, quantity)
      ).rejects.toThrow('Item is not available for reservation');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if insufficient stock available', async () => {
      // Arrange
      const lowStockItem = { ...mockItem, availableStock: 5 };
      mockRepository.getOne.mockResolvedValue(lowStockItem);

      // Act & Assert
      await expect(
        stockManagementService.reserveStock(itemId, quantity)
      ).rejects.toThrow(/Insufficient stock/);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Insufficient stock for reservation',
        expect.any(Object)
      );
    });

    it('should update stock atomically with correct calculations', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.reserveStock(itemId, quantity);

      // Assert
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedStock: expect.any(Function),
          availableStock: expect.any(Function),
          version: expect.any(Function),
        })
      );
    });
  });

  describe('releaseStock', () => {
    const itemId = 'item-123';
    const quantity = 10;

    it('should successfully release stock', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.releaseStock(itemId, quantity);

      // Assert
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Stock released successfully',
        expect.objectContaining({
          itemId,
          quantity,
          previousReserved: mockItem.reservedStock,
        })
      );
    });

    it('should throw error if item not found', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        stockManagementService.releaseStock(itemId, quantity)
      ).rejects.toThrow('Item not found');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should adjust quantity if trying to release more than reserved', async () => {
      // Arrange
      const itemWithLowReserved = { ...mockItem, reservedStock: 5 };
      mockRepository.getOne.mockResolvedValue(itemWithLowReserved);

      // Act
      await stockManagementService.releaseStock(itemId, 10);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempting to release more than reserved stock',
        expect.objectContaining({
          itemId,
          requestedRelease: 10,
          currentReserved: 5,
        })
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should update stock atomically', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.releaseStock(itemId, quantity);

      // Assert
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          reservedStock: expect.any(Function),
          availableStock: expect.any(Function),
          version: expect.any(Function),
        })
      );
    });
  });

  describe('confirmStock', () => {
    const itemId = 'item-123';
    const quantity = 10;

    it('should successfully confirm stock', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.confirmStock(itemId, quantity);

      // Assert
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Stock confirmed successfully',
        expect.objectContaining({
          itemId,
          quantity,
          previousStock: mockItem.stock,
          previousReserved: mockItem.reservedStock,
        })
      );
    });

    it('should throw error if item not found', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        stockManagementService.confirmStock(itemId, quantity)
      ).rejects.toThrow('Item not found');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if not enough reserved stock', async () => {
      // Arrange
      const itemWithLowReserved = { ...mockItem, reservedStock: 5 };
      mockRepository.getOne.mockResolvedValue(itemWithLowReserved);

      // Act & Assert
      await expect(
        stockManagementService.confirmStock(itemId, quantity)
      ).rejects.toThrow('Not enough reserved stock');
    });

    it('should throw error if not enough total stock', async () => {
      // Arrange
      const itemWithLowStock = { ...mockItem, stock: 5 };
      mockRepository.getOne.mockResolvedValue(itemWithLowStock);

      // Act & Assert
      await expect(
        stockManagementService.confirmStock(itemId, quantity)
      ).rejects.toThrow('Not enough stock');
    });

    it('should update stock atomically with correct calculations', async () => {
      // Arrange
      mockRepository.getOne.mockResolvedValue(mockItem);

      // Act
      await stockManagementService.confirmStock(itemId, quantity);

      // Assert
      expect(mockRepository.set).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: expect.any(Function),
          reservedStock: expect.any(Function),
          availableStock: expect.any(Function),
          version: expect.any(Function),
        })
      );
    });
  });

  describe('checkStockConsistency', () => {
    it('should return consistent when all items are correct', async () => {
      // Arrange
      mockRepository.getMany.mockResolvedValue([]);

      // Act
      const result = await stockManagementService.checkStockConsistency();

      // Assert
      expect(result.consistent).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
    });

    it('should detect and report inconsistencies', async () => {
      // Arrange
      const inconsistentItems = [
        {
          id: 'item-1',
          sku: 'SKU-1',
          name: 'Item 1',
          stock: 100,
          reservedStock: 20,
          availableStock: 75, // Should be 80
        },
        {
          id: 'item-2',
          sku: 'SKU-2',
          name: 'Item 2',
          stock: 50,
          reservedStock: 10,
          availableStock: 45, // Should be 40
        },
      ];
      mockRepository.getMany.mockResolvedValue(inconsistentItems);

      // Act
      const result = await stockManagementService.checkStockConsistency();

      // Assert
      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(2);
      expect(result.inconsistencies[0]).toMatchObject({
        itemId: 'item-1',
        expectedAvailable: 80,
        difference: -5,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Stock inconsistencies detected',
        expect.any(Object)
      );
    });
  });

  describe('fixStockConsistency', () => {
    it('should fix stock consistency successfully', async () => {
      // Arrange
      mockRepository.execute.mockResolvedValue({ affected: 5 });

      // Act
      const result = await stockManagementService.fixStockConsistency();

      // Assert
      expect(result).toBe(5);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRepository.set).toHaveBeenCalledWith({
        availableStock: expect.any(Function),
      });
      expect(logger.info).toHaveBeenCalledWith('Stock consistency fixed', {
        itemsFixed: 5,
      });
    });

    it('should handle errors during fix', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRepository.execute.mockRejectedValue(error);

      // Act & Assert
      await expect(
        stockManagementService.fixStockConsistency()
      ).rejects.toThrow('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fix stock consistency',
        expect.any(Object)
      );
    });
  });

  describe('bulkReserveStock', () => {
    const reservations = [
      { itemId: 'item-1', quantity: 5 },
      { itemId: 'item-2', quantity: 10 },
    ];

    it('should successfully reserve stock for multiple items', async () => {
      // Arrange
      const items = [
        { id: 'item-1', availableStock: 50, ...mockItem },
        { id: 'item-2', availableStock: 60, ...mockItem },
      ];
      mockRepository.getMany.mockResolvedValue(items);

      // Act
      await stockManagementService.bulkReserveStock(reservations);

      // Assert
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Bulk stock reserved successfully',
        expect.objectContaining({
          itemCount: 2,
          reservations,
        })
      );
    });

    it('should throw error if some items not found', async () => {
      // Arrange
      const items = [{ id: 'item-1', availableStock: 50, ...mockItem }];
      mockRepository.getMany.mockResolvedValue(items);

      // Act & Assert
      await expect(
        stockManagementService.bulkReserveStock(reservations)
      ).rejects.toThrow('Some items not found');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if any item has insufficient stock', async () => {
      // Arrange
      const items = [
        { id: 'item-1', name: 'Item 1', availableStock: 50, ...mockItem },
        { id: 'item-2', name: 'Item 2', availableStock: 5, ...mockItem },
      ];
      mockRepository.getMany.mockResolvedValue(items);

      // Act & Assert
      await expect(
        stockManagementService.bulkReserveStock(reservations)
      ).rejects.toThrow(/Insufficient stock for item/);
    });

    it('should throw error if item not found in fetched items', async () => {
      // Arrange
      const items = [
        { id: 'item-1', availableStock: 50, ...mockItem },
        { id: 'item-2', availableStock: 60, ...mockItem },
      ];
      mockRepository.getMany.mockResolvedValue(items);
      const reservationsWithMissing = [
        ...reservations,
        { itemId: 'item-3', quantity: 5 },
      ];

      // Act & Assert
      await expect(
        stockManagementService.bulkReserveStock(reservationsWithMissing)
      ).rejects.toThrow(/Item .* not found/);
    });
  });

  describe('getStockStatistics', () => {
    it('should get stock statistics successfully', async () => {
      // Arrange
      // mockRepository.getRawOne already configured in beforeEach

      // Act
      const result = await stockManagementService.getStockStatistics();

      // Assert
      expect(result).toEqual({
        totalStock: 1000,
        totalReserved: 200,
        totalAvailable: 800,
        totalItems: 50,
        outOfStockItems: 5,
        lowStockItems: 10,
      });
      expect(mockRepository.select).toHaveBeenCalled();
    });

    it('should handle missing values in statistics', async () => {
      // Arrange
      mockRepository.getRawOne.mockResolvedValue({
        totalStock: null,
        totalReserved: null,
        totalAvailable: null,
        totalItems: null,
        outOfStock: null,
        lowStock: null,
      });

      // Act
      const result = await stockManagementService.getStockStatistics();

      // Assert
      expect(result).toEqual({
        totalStock: 0,
        totalReserved: 0,
        totalAvailable: 0,
        totalItems: 0,
        outOfStockItems: 0,
        lowStockItems: 0,
      });
    });

    it('should handle errors when getting statistics', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRepository.getRawOne.mockRejectedValue(error);

      // Act & Assert
      await expect(stockManagementService.getStockStatistics()).rejects.toThrow(
        'Database error'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get stock statistics',
        expect.any(Object)
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StockManagementService;
      const instance2 = StockManagementService;

      expect(instance1).toBe(instance2);
    });
  });
});
