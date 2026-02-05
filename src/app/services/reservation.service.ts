import reservationRepository from '@repositories/reservation.repository';
import itemRepository from '@repositories/item.repository';
import itemService from '@services/item.service';
import { Reservation } from '@models/reservation.model';
import {
  In_DTO_CreateReservation,
  In_DTO_CheckoutReservation,
  In_DTO_CancelReservation,
  In_ReservationListParams,
} from '@/interfaces/dto.interface';
import { In_PaginationResult } from '@/interfaces/pagination.interface';
import { En_ReservationStatus } from '@constants/enum.constant';
import logger from '@utils/logger.util';
import { AppDataSource } from '@config/database.config';
import { Item } from '@/database/models/item.model';

class ReservationService {
  private static instance: ReservationService;
  private readonly RESERVATION_EXPIRY_MINUTES = 15;

  private constructor() {}

  public static getInstance(): ReservationService {
    if (!ReservationService.instance) {
      ReservationService.instance = new ReservationService();
    }
    return ReservationService.instance;
  }

  /** Create new reservation (User) */
  async create(
    userId: string,
    data: In_DTO_CreateReservation
  ): Promise<Reservation> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { itemId, quantity } = data;

      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Get item with lock
      const item = await itemRepository.findByIdWithLock(
        itemId,
        queryRunner.manager
      );

      if (!item) {
        throw new Error('Item not found');
      }

      // Check if item is available
      if (item.status !== 'active') {
        throw new Error('Item is not available for reservation');
      }

      // Check sale period
      const now = new Date();
      if (item.saleStartDate && new Date(item.saleStartDate) > now) {
        throw new Error('Sale has not started yet');
      }
      if (item.saleEndDate && new Date(item.saleEndDate) < now) {
        throw new Error('Sale has ended');
      }

      // Check if user has reached max per user limit
      const userReservedQty =
        await reservationRepository.getUserReservedQuantity(userId, itemId);

      if (userReservedQty + quantity > item.maxPerUser) {
        throw new Error(
          `You can only reserve up to ${item.maxPerUser} units of this item. You already have ${userReservedQty} reserved.`
        );
      }

      // Check stock availability
      if (item.availableStock < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Reserve stock
      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          reservedStock: () => `reserved_stock + ${quantity}`,
          availableStock: () => `stock - (reserved_stock + ${quantity})`,
        })
        .where('id = :id', { id: itemId })
        .execute();

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.RESERVATION_EXPIRY_MINUTES
      );

      const reservation = queryRunner.manager.create(Reservation, {
        userId,
        itemId,
        quantity,
        price: item.price,
        totalPrice: item.price * quantity,
        status: En_ReservationStatus.PENDING,
        expiresAt,
        reservationCode: await reservationRepository.generateReservationCode(
          queryRunner.manager
        ),
      });

      const savedReservation = await queryRunner.manager.save(reservation);

      await queryRunner.commitTransaction();

      logger.info('Reservation created successfully', {
        reservation: savedReservation,
        userId,
        itemId,
        quantity,
      });

      return (await reservationRepository.findById(savedReservation.id))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error creating reservation', { error, userId, data });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Checkout reservation (User) */
  async checkout(
    userId: string,
    data: In_DTO_CheckoutReservation
  ): Promise<Reservation> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { reservationId } = data;

      // Get reservation with lock
      const reservation = await reservationRepository.findByIdWithLock(
        reservationId,
        queryRunner.manager
      );
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Check ownership
      if (reservation.userId !== userId) {
        throw new Error(
          'Unauthorized: This reservation does not belong to you'
        );
      }

      // Check status
      if (reservation.status !== En_ReservationStatus.PENDING) {
        throw new Error(
          `Cannot checkout reservation with status: ${reservation.status}`
        );
      }

      // Check if expired
      if (new Date() > reservation.expiresAt) {
        throw new Error('Reservation has expired');
      }

      // Confirm stock (reduce total stock and reserved stock
      const itemQuantity = reservation.quantity;
      const myItem = await itemRepository.findByIdWithLock(
        reservation.itemId,
        queryRunner.manager
      );

      if (!myItem) {
        throw new Error('Item not found');
      }

      // Update stock atomically (reduce both total and reserved stock)
      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          stock: () => `stock + ${-itemQuantity}`,
          reservedStock: () => `reserved_stock + ${-itemQuantity}`,
          availableStock: () => `stock - reserved_stock`,
        })
        .where('id = :id', { id: reservation.itemId })
        .execute();

      logger.info('Stock confirmed successfully', {
        itemId: reservation.itemId,
        quantity: itemQuantity,
      });

      // Update reservation status
      const updatedReservation = await reservationRepository.update(
        reservationId,
        {
          status: En_ReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        queryRunner.manager
      );

      await queryRunner.commitTransaction();

      logger.info('Reservation checked out successfully', {
        reservationId,
        userId,
      });

      return updatedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error checking out reservation', { error, userId, data });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Cancel reservation (User) */
  async cancel(
    userId: string,
    data: In_DTO_CancelReservation
  ): Promise<Reservation> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { reservationId, reason } = data;

      // Get reservation with lock
      const reservation = await reservationRepository.findByIdWithLock(
        reservationId,
        queryRunner.manager
      );
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Check ownership
      if (reservation.userId !== userId) {
        throw new Error(
          'Unauthorized: This reservation does not belong to you'
        );
      }

      // Check status
      if (reservation.status !== En_ReservationStatus.PENDING) {
        throw new Error(
          `Cannot cancel reservation with status: ${reservation.status}`
        );
      }

      // Release stock
      const myItem = await itemRepository.findByIdWithLock(
        reservation.itemId,
        queryRunner.manager
      );

      if (!myItem) {
        throw new Error('Item not found');
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(Item)
        .set({
          reservedStock: () => `reserved_stock + ${-reservation.quantity}`,
          availableStock: () => `stock - reserved_stock`,
        })
        .where('id = :id', { id: reservation.itemId })
        .execute();

      // Update reservation status
      const updatedReservation = await reservationRepository.update(
        reservationId,
        {
          status: En_ReservationStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
        queryRunner.manager
      );

      await queryRunner.commitTransaction();

      logger.info('Reservation cancelled successfully', {
        reservationId,
        userId,
        reason,
      });

      return updatedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error cancelling reservation', { error, userId, data });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Get user's reservations */
  async getUserReservations(
    userId: string,
    status?: En_ReservationStatus
  ): Promise<Reservation[]> {
    try {
      return await reservationRepository.findByUserId(userId, status);
    } catch (error) {
      logger.error('Error getting user reservations', {
        error,
        userId,
        status,
      });
      throw error;
    }
  }

  /** Get reservation by ID */
  async getById(id: string, userId?: string): Promise<Reservation> {
    try {
      const reservation = await reservationRepository.findById(id);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // If userId is provided, check ownership (for user role)
      if (userId && reservation.userId !== userId) {
        throw new Error(
          'Unauthorized: This reservation does not belong to you'
        );
      }

      return reservation;
    } catch (error) {
      logger.error('Error getting reservation by ID', { error, id, userId });
      throw error;
    }
  }

  /** Get all reservations with filters (Admin only) */
  async getAll(
    params: In_ReservationListParams
  ): Promise<In_PaginationResult<Reservation>> {
    try {
      return await reservationRepository.findAll(params);
    } catch (error) {
      logger.error('Error getting all reservations', { error, params });
      throw error;
    }
  }

  /** Process expired reservations (Scheduler job) */
  async processExpiredReservations(): Promise<number> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find all expired reservations
      const expiredReservations = await reservationRepository.findExpired();

      if (expiredReservations.length === 0) {
        logger.info('No expired reservations found');
        return 0;
      }

      logger.info(
        `Processing ${expiredReservations.length} expired reservations`
      );

      // Process each expired reservation
      for (const reservation of expiredReservations) {
        try {
          // Release stock
          await itemService.releaseStock(
            reservation.itemId,
            reservation.quantity
          );

          // Update reservation status
          await reservationRepository.update(reservation.id, {
            status: En_ReservationStatus.EXPIRED,
          });

          logger.info('Expired reservation processed', {
            reservationId: reservation.id,
            itemId: reservation.itemId,
            quantity: reservation.quantity,
          });
        } catch (error) {
          logger.error('Error processing expired reservation', {
            reservationId: reservation.id,
            error,
          });
          // Continue processing other reservations
        }
      }

      await queryRunner.commitTransaction();

      logger.info(
        `Successfully processed ${expiredReservations.length} expired reservations`
      );
      return expiredReservations.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error processing expired reservations', { error });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Get reservation statistics */
  async getStats(userId?: string): Promise<any> {
    try {
      return await reservationRepository.getStats(userId);
    } catch (error) {
      logger.error('Error getting reservation stats', { error, userId });
      throw error;
    }
  }

  /** Admin: Cancel reservation by admin */
  async adminCancel(
    reservationId: string | string[] | any | undefined,
    reason: string,
    adminId: string
  ): Promise<Reservation> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get reservation with lock
      const reservation =
        await reservationRepository.findByIdWithLock(reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Check status
      if (reservation.status !== En_ReservationStatus.PENDING) {
        throw new Error(
          `Cannot cancel reservation with status: ${reservation.status}`
        );
      }

      // Release stock
      await itemService.releaseStock(reservation.itemId, reservation.quantity);

      // Update reservation status
      const updatedReservation = await reservationRepository.update(
        reservationId,
        {
          status: En_ReservationStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: `Admin cancelled: ${reason}`,
          updatedBy: adminId,
        }
      );

      await queryRunner.commitTransaction();

      logger.info('Reservation cancelled by admin', {
        reservationId,
        adminId,
        reason,
      });

      return updatedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error admin cancelling reservation', {
        error,
        reservationId,
        reason,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

export { ReservationService };
export default ReservationService.getInstance();
