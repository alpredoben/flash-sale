import ItemService from '../../../src/app/services/item.service';
import itemRepository from '../../../src/app/repositories/item.repository';
import { AppDataSource } from '../../../src/configs/database.config';
import logger from '../../../src/shared/utils/logger.util';
import { En_ItemStatus } from '../../../src/shared/constants/enum.constant';
import { Item } from '../../../src/database/models/item.model';
import {
  In_DTO_CreateItem,
  In_DTO_UpdateItem,
  In_ItemListParams,
} from '../../../src/interfaces/dto.interface';

// Mock all dependencies
jest.mock('@repositories/item.repository');
jest.mock('@config/database.config');
jest.mock('@utils/logger.util');

describe('ItemService', () => {
  let itemService: typeof ItemService;
  let mockQueryRunner: any;
  let mockItem: Partial<Item>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get singleton instance
    itemService = ItemService;

    // Setup mock query runner
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {},
    };

    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(
      mockQueryRunner
    );

    // Setup mock item
    mockItem = {
      id: 'item-123',
      sku: 'ITEM-001',
      name: 'Test Item',
      description: 'Test Description',
      price: 100,
      originalPrice: 150,
      stock: 50,
      reservedStock: 10,
      availableStock: 40,
      status: En_ItemStatus.ACTIVE,
      imageUrl: 'https://example.com/image.jpg',
      saleStartDate: new Date(),
      saleEndDate: new Date(Date.now() + 86400000),
      maxPerUser: 5,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('create', () => {
    const createData: In_DTO_CreateItem = {
      sku: 'ITEM-001',
      name: 'Test Item',
      description: 'Test Description',
      price: 100,
      originalPrice: 150,
      stock: 50,
      imageUrl: 'https://example.com/image.jpg',
      saleStartDate: new Date(),
      saleEndDate: new Date(Date.now() + 86400000),
      maxPerUser: 5,
    };
    const createdBy = 'admin-123';

    it('should successfully create an item', async () => {
      // Arrange
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);
      (itemRepository.create as jest.Mock).mockResolvedValue(mockItem);

      // Act
      const result = await itemService.create(createData, createdBy);

      // Assert
      expect(itemRepository.findBySku).toHaveBeenCalledWith(createData.sku);
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: createData.sku,
          name: createData.name,
          price: createData.price,
          stock: createData.stock,
          reservedStock: 0,
          availableStock: createData.stock,
          status: En_ItemStatus.ACTIVE,
          createdBy,
        })
      );
      expect(result).toEqual(mockItem);
      expect(logger.info).toHaveBeenCalledWith(
        'Item created successfully',
        expect.any(Object)
      );
    });

    it('should throw error if SKU already exists', async () => {
      // Arrange
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(mockItem);

      // Act & Assert
      await expect(itemService.create(createData, createdBy)).rejects.toThrow(
        'Item with this SKU already exists'
      );
      expect(itemRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if price is 0 or negative', async () => {
      // Arrange
      const invalidData = { ...createData, price: 0 };
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.create(invalidData, createdBy)).rejects.toThrow(
        'Price must be greater than 0'
      );
    });

    it('should throw error if originalPrice is less than price', async () => {
      // Arrange
      const invalidData = { ...createData, price: 200, originalPrice: 100 };
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.create(invalidData, createdBy)).rejects.toThrow(
        'Original price cannot be less than current price'
      );
    });

    it('should throw error if stock is negative', async () => {
      // Arrange
      const invalidData = { ...createData, stock: -10 };
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.create(invalidData, createdBy)).rejects.toThrow(
        'Stock cannot be negative'
      );
    });

    it('should throw error if sale start date is after end date', async () => {
      // Arrange
      const invalidData = {
        ...createData,
        saleStartDate: new Date(Date.now() + 86400000),
        saleEndDate: new Date(),
      };
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.create(invalidData, createdBy)).rejects.toThrow(
        'Sale start date must be before end date'
      );
    });

    it('should use default maxPerUser if not provided', async () => {
      // Arrange
      const dataWithoutMaxPerUser = { ...createData };
      delete dataWithoutMaxPerUser.maxPerUser;
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(null);
      (itemRepository.create as jest.Mock).mockResolvedValue(mockItem);

      // Act
      await itemService.create(dataWithoutMaxPerUser, createdBy);

      // Assert
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxPerUser: 1,
        })
      );
    });
  });

  describe('update', () => {
    const itemId = 'item-123';
    const updateData: In_DTO_UpdateItem = {
      name: 'Updated Item',
      price: 120,
      stock: 60,
    };
    const updatedBy = 'admin-123';

    it('should successfully update an item', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);
      (itemRepository.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        ...updateData,
      });

      // Act
      const result = await itemService.update(itemId, updateData, updatedBy);

      // Assert
      expect(itemRepository.findById).toHaveBeenCalledWith(itemId);
      expect(itemRepository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          ...updateData,
          updatedBy,
        })
      );
      expect(result.name).toBe(updateData.name);
      expect(logger.info).toHaveBeenCalledWith('Item updated successfully', {
        itemId,
      });
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        itemService.update(itemId, updateData, updatedBy)
      ).rejects.toThrow('Item not found');
    });

    it('should throw error if price is 0 or negative', async () => {
      // Arrange
      const invalidData = { price: 0 };
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);

      // Act & Assert
      await expect(
        itemService.update(itemId, invalidData, updatedBy)
      ).rejects.toThrow('Price must be greater than 0');
    });

    it('should throw error if originalPrice is less than price', async () => {
      // Arrange
      const invalidData = { price: 200, originalPrice: 100 };
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);

      // Act & Assert
      await expect(
        itemService.update(itemId, invalidData, updatedBy)
      ).rejects.toThrow('Original price cannot be less than current price');
    });

    it('should throw error if stock is negative', async () => {
      // Arrange
      const invalidData = { stock: -10 };
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);

      // Act & Assert
      await expect(
        itemService.update(itemId, invalidData, updatedBy)
      ).rejects.toThrow('Stock cannot be negative');
    });

    it('should throw error if stock is below reserved quantity', async () => {
      // Arrange
      const invalidData = { stock: 5 };
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);

      // Act & Assert
      await expect(
        itemService.update(itemId, invalidData, updatedBy)
      ).rejects.toThrow('Cannot reduce stock below reserved quantity');
    });

    it('should recalculate availableStock when stock is updated', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);
      (itemRepository.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        stock: 60,
        availableStock: 50,
      });

      // Act
      await itemService.update(itemId, { stock: 60 }, updatedBy);

      // Assert
      expect(itemRepository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          stock: 60,
          availableStock: 50, // 60 - 10 (reservedStock)
        })
      );
    });
  });

  describe('getById', () => {
    const itemId = 'item-123';

    it('should get item by id successfully', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);

      // Act
      const result = await itemService.getById(itemId);

      // Assert
      expect(itemRepository.findById).toHaveBeenCalledWith(itemId);
      expect(result).toEqual(mockItem);
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.getById(itemId)).rejects.toThrow(
        'Item not found'
      );
    });
  });

  describe('getAll', () => {
    it('should get all items with filters and pagination', async () => {
      // Arrange
      const params: In_ItemListParams = {
        page: 1,
        limit: 10,
        status: En_ItemStatus.ACTIVE,
      };
      const mockResult = {
        data: [mockItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
      (itemRepository.findAll as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await itemService.getAll(params);

      // Assert
      expect(itemRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });
  });

  describe('delete', () => {
    const itemId = 'item-123';
    const deletedBy = 'admin-123';

    it('should successfully delete an item', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);
      (itemRepository.softDelete as jest.Mock).mockResolvedValue(undefined);

      // Act
      await itemService.delete(itemId, deletedBy);

      // Assert
      expect(itemRepository.findById).toHaveBeenCalledWith(itemId);
      expect(itemRepository.softDelete).toHaveBeenCalledWith(itemId, deletedBy);
      expect(logger.info).toHaveBeenCalledWith('Item deleted successfully', {
        itemId,
      });
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.delete(itemId, deletedBy)).rejects.toThrow(
        'Item not found'
      );
    });

    it('should throw error if item has active reservations', async () => {
      // Arrange
      const itemWithReservations = { ...mockItem, reservedStock: 5 };
      (itemRepository.findById as jest.Mock).mockResolvedValue(
        itemWithReservations
      );

      // Act & Assert
      await expect(itemService.delete(itemId, deletedBy)).rejects.toThrow(
        'Cannot delete item with active reservations'
      );
    });
  });

  describe('updateStatus', () => {
    const itemId = 'item-123';
    const updatedBy = 'admin-123';

    it('should successfully update item status', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(mockItem);
      (itemRepository.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        status: En_ItemStatus.INACTIVE,
      });

      // Act
      const result = await itemService.updateStatus(
        itemId,
        En_ItemStatus.INACTIVE,
        updatedBy
      );

      // Assert
      expect(itemRepository.update).toHaveBeenCalledWith(itemId, {
        status: En_ItemStatus.INACTIVE,
        updatedBy,
      });
      expect(result.status).toBe(En_ItemStatus.INACTIVE);
      expect(logger.info).toHaveBeenCalledWith(
        'Item status updated',
        expect.any(Object)
      );
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        itemService.updateStatus(itemId, En_ItemStatus.INACTIVE, updatedBy)
      ).rejects.toThrow('Item not found');
    });
  });

  describe('reserveStock', () => {
    const itemId = 'item-123';
    const quantity = 5;

    it('should successfully reserve stock', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (itemRepository.updateStock as jest.Mock).mockResolvedValue(undefined);

      // Act
      await itemService.reserveStock(itemId, quantity);

      // Assert
      expect(itemRepository.findByIdWithLock).toHaveBeenCalledWith(itemId);
      expect(itemRepository.updateStock).toHaveBeenCalledWith(
        itemId,
        0,
        quantity
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Stock reserved successfully', {
        itemId,
        quantity,
      });
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.reserveStock(itemId, quantity)).rejects.toThrow(
        'Item not found'
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if item is not active', async () => {
      // Arrange
      const inactiveItem = { ...mockItem, status: En_ItemStatus.INACTIVE };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        inactiveItem
      );

      // Act & Assert
      await expect(itemService.reserveStock(itemId, quantity)).rejects.toThrow(
        'Item is not available for reservation'
      );
    });

    it('should throw error if insufficient stock', async () => {
      // Arrange
      const lowStockItem = { ...mockItem, availableStock: 2 };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        lowStockItem
      );

      // Act & Assert
      await expect(itemService.reserveStock(itemId, quantity)).rejects.toThrow(
        'Insufficient stock available'
      );
    });
  });

  describe('releaseStock', () => {
    const itemId = 'item-123';
    const quantity = 5;

    it('should successfully release stock', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (itemRepository.updateStock as jest.Mock).mockResolvedValue(undefined);

      // Act
      await itemService.releaseStock(itemId, quantity);

      // Assert
      expect(itemRepository.findByIdWithLock).toHaveBeenCalledWith(itemId);
      expect(itemRepository.updateStock).toHaveBeenCalledWith(
        itemId,
        0,
        -quantity
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Stock released successfully', {
        itemId,
        quantity,
      });
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.releaseStock(itemId, quantity)).rejects.toThrow(
        'Item not found'
      );
    });
  });

  describe('confirmStock', () => {
    const itemId = 'item-123';
    const quantity = 5;

    it('should successfully confirm stock', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (itemRepository.updateStock as jest.Mock).mockResolvedValue(undefined);

      // Act
      await itemService.confirmStock(itemId, quantity);

      // Assert
      expect(itemRepository.findByIdWithLock).toHaveBeenCalledWith(itemId);
      expect(itemRepository.updateStock).toHaveBeenCalledWith(
        itemId,
        -quantity,
        -quantity
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Stock confirmed successfully', {
        itemId,
        quantity,
      });
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(itemService.confirmStock(itemId, quantity)).rejects.toThrow(
        'Item not found'
      );
    });
  });

  describe('getActiveSaleItems', () => {
    it('should get active sale items successfully', async () => {
      // Arrange
      const mockItems = [mockItem, { ...mockItem, id: 'item-2' }];
      (itemRepository.findActiveSaleItems as jest.Mock).mockResolvedValue(
        mockItems
      );

      // Act
      const result = await itemService.getActiveSaleItems();

      // Assert
      expect(itemRepository.findActiveSaleItems).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });
  });

  describe('getLowStockItems', () => {
    it('should get low stock items with default threshold', async () => {
      // Arrange
      const mockItems = [mockItem];
      (itemRepository.findLowStockItems as jest.Mock).mockResolvedValue(
        mockItems
      );

      // Act
      const result = await itemService.getLowStockItems();

      // Assert
      expect(itemRepository.findLowStockItems).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockItems);
    });

    it('should get low stock items with custom threshold', async () => {
      // Arrange
      const threshold = 20;
      const mockItems = [mockItem];
      (itemRepository.findLowStockItems as jest.Mock).mockResolvedValue(
        mockItems
      );

      // Act
      const result = await itemService.getLowStockItems(threshold);

      // Assert
      expect(itemRepository.findLowStockItems).toHaveBeenCalledWith(threshold);
      expect(result).toEqual(mockItems);
    });
  });

  describe('getStats', () => {
    it('should get item statistics successfully', async () => {
      // Arrange
      (itemRepository.countByStatus as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15);

      // Act
      const result = await itemService.getStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 15,
        outOfStock: 5,
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ItemService;
      const instance2 = ItemService;

      expect(instance1).toBe(instance2);
    });
  });
});
