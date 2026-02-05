import ReservationService from '../../../src/app/services/reservation.service';
import reservationRepository from '../../../src/app/repositories/reservation.repository';
import itemRepository from '../../../src/app/repositories/item.repository';
import itemService from '../../../src/app/services/item.service';
import { AppDataSource } from '../../../src/configs/database.config';
import logger from '../../../src/shared/utils/logger.util';
import {
  En_ReservationStatus,
  En_ItemStatus,
} from '../../../src/shared/constants/enum.constant';
import { Reservation } from '../../../src/database/models/reservation.model';
import { Item } from '../../../src/database/models/item.model';
import {
  In_DTO_CreateReservation,
  In_DTO_CheckoutReservation,
  In_DTO_CancelReservation,
  In_ReservationListParams,
} from '../../../src/interfaces/dto.interface';

// Mock all dependencies
jest.mock('@repositories/reservation.repository');
jest.mock('@repositories/item.repository');
jest.mock('@services/item.service');
jest.mock('@config/database.config');
jest.mock('@utils/logger.util');

describe('ReservationService', () => {
  let reservationService: typeof ReservationService;
  let mockQueryRunner: any;
  let mockReservation: Partial<Reservation>;
  let mockItem: Partial<Item>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get singleton instance
    reservationService = ReservationService;

    // Setup mock query runner
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
      },
    };

    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(
      mockQueryRunner
    );

    // Setup mock item
    mockItem = {
      id: 'item-123',
      sku: 'ITEM-001',
      name: 'Test Item',
      price: 100,
      stock: 50,
      reservedStock: 10,
      availableStock: 40,
      status: En_ItemStatus.ACTIVE,
      maxPerUser: 5,
      saleStartDate: new Date(Date.now() - 86400000), // Yesterday
      saleEndDate: new Date(Date.now() + 86400000), // Tomorrow
    };

    // Setup mock reservation
    mockReservation = {
      id: 'reservation-123',
      reservationCode: 'RES-001',
      userId: 'user-123',
      itemId: 'item-123',
      quantity: 2,
      price: 100,
      totalPrice: 200,
      status: En_ReservationStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
      item: mockItem as Item,
    };
  });

  describe('create', () => {
    const userId = 'user-123';
    const createData: In_DTO_CreateReservation = {
      itemId: 'item-123',
      quantity: 2,
    };

    it('should successfully create a reservation', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (
        reservationRepository.getUserReservedQuantity as jest.Mock
      ).mockResolvedValue(0);
      (
        reservationRepository.generateReservationCode as jest.Mock
      ).mockResolvedValue('RES-001');
      mockQueryRunner.manager.create.mockReturnValue(mockReservation);
      mockQueryRunner.manager.save.mockResolvedValue(mockReservation);
      (reservationRepository.findById as jest.Mock).mockResolvedValue(
        mockReservation
      );

      // Act
      const result = await reservationService.create(userId, createData);

      // Assert
      expect(itemRepository.findByIdWithLock).toHaveBeenCalledWith(
        createData.itemId,
        mockQueryRunner.manager
      );
      expect(
        reservationRepository.getUserReservedQuantity
      ).toHaveBeenCalledWith(userId, createData.itemId);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockReservation);
      expect(logger.info).toHaveBeenCalledWith(
        'Reservation created successfully',
        expect.any(Object)
      );
    });

    it('should throw error if quantity is 0 or negative', async () => {
      // Arrange
      const invalidData = { ...createData, quantity: 0 };

      // Act & Assert
      await expect(
        reservationService.create(userId, invalidData)
      ).rejects.toThrow('Quantity must be greater than 0');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if item not found', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow('Item not found');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if item is not active', async () => {
      // Arrange
      const inactiveItem = { ...mockItem, status: En_ItemStatus.INACTIVE };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        inactiveItem
      );

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow('Item is not available for reservation');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw error if sale has not started', async () => {
      // Arrange
      const futureItem = {
        ...mockItem,
        saleStartDate: new Date(Date.now() + 86400000),
      };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        futureItem
      );

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow('Sale has not started yet');
    });

    it('should throw error if sale has ended', async () => {
      // Arrange
      const expiredItem = {
        ...mockItem,
        saleEndDate: new Date(Date.now() - 86400000),
      };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        expiredItem
      );

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow('Sale has ended');
    });

    it('should throw error if user exceeded max per user limit', async () => {
      // Arrange
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (
        reservationRepository.getUserReservedQuantity as jest.Mock
      ).mockResolvedValue(4);

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow(/You can only reserve up to/);
    });

    it('should throw error if insufficient stock', async () => {
      // Arrange
      const lowStockItem = { ...mockItem, availableStock: 1 };
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        lowStockItem
      );
      (
        reservationRepository.getUserReservedQuantity as jest.Mock
      ).mockResolvedValue(0);

      // Act & Assert
      await expect(
        reservationService.create(userId, createData)
      ).rejects.toThrow('Insufficient stock available');
    });
  });

  describe('checkout', () => {
    const userId = 'user-123';
    const checkoutData: In_DTO_CheckoutReservation = {
      reservationId: 'reservation-123',
    };

    it('should successfully checkout a reservation', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockReservation
      );
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (reservationRepository.update as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: En_ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Act
      const result = await reservationService.checkout(userId, checkoutData);

      // Assert
      expect(reservationRepository.findByIdWithLock).toHaveBeenCalledWith(
        checkoutData.reservationId,
        mockQueryRunner.manager
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe(En_ReservationStatus.CONFIRMED);
      expect(logger.info).toHaveBeenCalledWith(
        'Reservation checked out successfully',
        expect.any(Object)
      );
    });

    it('should throw error if reservation not found', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        null
      );

      // Act & Assert
      await expect(
        reservationService.checkout(userId, checkoutData)
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw error if reservation does not belong to user', async () => {
      // Arrange
      const otherUserReservation = { ...mockReservation, userId: 'other-user' };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        otherUserReservation
      );

      // Act & Assert
      await expect(
        reservationService.checkout(userId, checkoutData)
      ).rejects.toThrow(
        'Unauthorized: This reservation does not belong to you'
      );
    });

    it('should throw error if reservation is not pending', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: En_ReservationStatus.CONFIRMED,
      };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        confirmedReservation
      );

      // Act & Assert
      await expect(
        reservationService.checkout(userId, checkoutData)
      ).rejects.toThrow(/Cannot checkout reservation with status/);
    });

    it('should throw error if reservation has expired', async () => {
      // Arrange
      const expiredReservation = {
        ...mockReservation,
        expiresAt: new Date(Date.now() - 1000),
      };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        expiredReservation
      );

      // Act & Assert
      await expect(
        reservationService.checkout(userId, checkoutData)
      ).rejects.toThrow('Reservation has expired');
    });

    it('should throw error if item not found during checkout', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockReservation
      );
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        reservationService.checkout(userId, checkoutData)
      ).rejects.toThrow('Item not found');
    });
  });

  describe('cancel', () => {
    const userId = 'user-123';
    const cancelData: In_DTO_CancelReservation = {
      reservationId: 'reservation-123',
      reason: 'Changed my mind',
    };

    it('should successfully cancel a reservation', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockReservation
      );
      (itemRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockItem
      );
      (reservationRepository.update as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: En_ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: cancelData.reason,
      });

      // Act
      const result = await reservationService.cancel(userId, cancelData);

      // Assert
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe(En_ReservationStatus.CANCELLED);
      expect(result.cancellationReason).toBe(cancelData.reason);
      expect(logger.info).toHaveBeenCalledWith(
        'Reservation cancelled successfully',
        expect.any(Object)
      );
    });

    it('should throw error if reservation not found', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        null
      );

      // Act & Assert
      await expect(
        reservationService.cancel(userId, cancelData)
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw error if reservation does not belong to user', async () => {
      // Arrange
      const otherUserReservation = { ...mockReservation, userId: 'other-user' };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        otherUserReservation
      );

      // Act & Assert
      await expect(
        reservationService.cancel(userId, cancelData)
      ).rejects.toThrow(
        'Unauthorized: This reservation does not belong to you'
      );
    });

    it('should throw error if reservation is not pending', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: En_ReservationStatus.CONFIRMED,
      };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        confirmedReservation
      );

      // Act & Assert
      await expect(
        reservationService.cancel(userId, cancelData)
      ).rejects.toThrow(/Cannot cancel reservation with status/);
    });
  });

  describe('getUserReservations', () => {
    const userId = 'user-123';

    it('should get user reservations successfully', async () => {
      // Arrange
      const mockReservations = [
        mockReservation,
        { ...mockReservation, id: 'res-2' },
      ];
      (reservationRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockReservations
      );

      // Act
      const result = await reservationService.getUserReservations(userId);

      // Assert
      expect(reservationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        undefined
      );
      expect(result).toEqual(mockReservations);
    });

    it('should get user reservations with status filter', async () => {
      // Arrange
      const mockReservations = [mockReservation];
      (reservationRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockReservations
      );

      // Act
      const result = await reservationService.getUserReservations(
        userId,
        En_ReservationStatus.PENDING
      );

      // Assert
      expect(reservationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        En_ReservationStatus.PENDING
      );
      expect(result).toEqual(mockReservations);
    });
  });

  describe('getById', () => {
    const reservationId = 'reservation-123';
    const userId = 'user-123';

    it('should get reservation by id successfully', async () => {
      // Arrange
      (reservationRepository.findById as jest.Mock).mockResolvedValue(
        mockReservation
      );

      // Act
      const result = await reservationService.getById(reservationId);

      // Assert
      expect(reservationRepository.findById).toHaveBeenCalledWith(
        reservationId
      );
      expect(result).toEqual(mockReservation);
    });

    it('should throw error if reservation not found', async () => {
      // Arrange
      (reservationRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(reservationService.getById(reservationId)).rejects.toThrow(
        'Reservation not found'
      );
    });

    it('should check ownership if userId provided', async () => {
      // Arrange
      (reservationRepository.findById as jest.Mock).mockResolvedValue(
        mockReservation
      );

      // Act
      const result = await reservationService.getById(reservationId, userId);

      // Assert
      expect(result).toEqual(mockReservation);
    });

    it('should throw error if reservation does not belong to user', async () => {
      // Arrange
      const otherUserReservation = { ...mockReservation, userId: 'other-user' };
      (reservationRepository.findById as jest.Mock).mockResolvedValue(
        otherUserReservation
      );

      // Act & Assert
      await expect(
        reservationService.getById(reservationId, userId)
      ).rejects.toThrow(
        'Unauthorized: This reservation does not belong to you'
      );
    });
  });

  describe('getAll', () => {
    it('should get all reservations with pagination', async () => {
      // Arrange
      const params: In_ReservationListParams = { page: 1, limit: 10 };
      const mockResult = {
        data: [mockReservation],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };
      (reservationRepository.findAll as jest.Mock).mockResolvedValue(
        mockResult
      );

      // Act
      const result = await reservationService.getAll(params);

      // Assert
      expect(reservationRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResult);
    });
  });

  describe('processExpiredReservations', () => {
    it('should process expired reservations successfully', async () => {
      // Arrange
      const expiredReservations = [
        { ...mockReservation, expiresAt: new Date(Date.now() - 1000) },
        {
          ...mockReservation,
          id: 'res-2',
          expiresAt: new Date(Date.now() - 2000),
        },
      ];
      (reservationRepository.findExpired as jest.Mock).mockResolvedValue(
        expiredReservations
      );
      (itemService.releaseStock as jest.Mock).mockResolvedValue(undefined);
      (reservationRepository.update as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: En_ReservationStatus.EXPIRED,
      });

      // Act
      const result = await reservationService.processExpiredReservations();

      // Assert
      expect(result).toBe(2);
      expect(itemService.releaseStock).toHaveBeenCalledTimes(2);
      expect(reservationRepository.update).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return 0 if no expired reservations found', async () => {
      // Arrange
      (reservationRepository.findExpired as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await reservationService.processExpiredReservations();

      // Assert
      expect(result).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('No expired reservations found');
    });

    it('should continue processing if one reservation fails', async () => {
      // Arrange
      const expiredReservations = [
        { ...mockReservation, expiresAt: new Date(Date.now() - 1000) },
        {
          ...mockReservation,
          id: 'res-2',
          expiresAt: new Date(Date.now() - 2000),
        },
      ];
      (reservationRepository.findExpired as jest.Mock).mockResolvedValue(
        expiredReservations
      );
      (itemService.releaseStock as jest.Mock)
        .mockRejectedValueOnce(new Error('Stock release failed'))
        .mockResolvedValueOnce(undefined);

      // Act
      const result = await reservationService.processExpiredReservations();

      // Assert
      expect(result).toBe(2);
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing expired reservation',
        expect.any(Object)
      );
    });
  });

  describe('getStats', () => {
    it('should get reservation statistics successfully', async () => {
      // Arrange
      const mockStats = {
        total: 100,
        pending: 20,
        confirmed: 70,
        cancelled: 5,
        expired: 5,
      };
      (reservationRepository.getStats as jest.Mock).mockResolvedValue(
        mockStats
      );

      // Act
      const result = await reservationService.getStats();

      // Assert
      expect(reservationRepository.getStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('should get user-specific statistics', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = {
        total: 10,
        pending: 2,
        confirmed: 7,
        cancelled: 1,
        expired: 0,
      };
      (reservationRepository.getStats as jest.Mock).mockResolvedValue(
        mockStats
      );

      // Act
      const result = await reservationService.getStats(userId);

      // Assert
      expect(reservationRepository.getStats).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockStats);
    });
  });

  describe('adminCancel', () => {
    const reservationId = 'reservation-123';
    const reason = 'Policy violation';
    const adminId = 'admin-123';

    it('should successfully cancel reservation by admin', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        mockReservation
      );
      (itemService.releaseStock as jest.Mock).mockResolvedValue(undefined);
      (reservationRepository.update as jest.Mock).mockResolvedValue({
        ...mockReservation,
        status: En_ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: `Admin cancelled: ${reason}`,
        updatedBy: adminId,
      });

      // Act
      const result = await reservationService.adminCancel(
        reservationId,
        reason,
        adminId
      );

      // Assert
      expect(itemService.releaseStock).toHaveBeenCalledWith(
        mockReservation.itemId,
        mockReservation.quantity
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.cancellationReason).toContain('Admin cancelled');
      expect(logger.info).toHaveBeenCalledWith(
        'Reservation cancelled by admin',
        expect.any(Object)
      );
    });

    it('should throw error if reservation not found', async () => {
      // Arrange
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        null
      );

      // Act & Assert
      await expect(
        reservationService.adminCancel(reservationId, reason, adminId)
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw error if reservation is not pending', async () => {
      // Arrange
      const confirmedReservation = {
        ...mockReservation,
        status: En_ReservationStatus.CONFIRMED,
      };
      (reservationRepository.findByIdWithLock as jest.Mock).mockResolvedValue(
        confirmedReservation
      );

      // Act & Assert
      await expect(
        reservationService.adminCancel(reservationId, reason, adminId)
      ).rejects.toThrow(/Cannot cancel reservation with status/);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ReservationService;
      const instance2 = ReservationService;

      expect(instance1).toBe(instance2);
    });
  });
});
