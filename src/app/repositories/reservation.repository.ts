// src/app/repositories/reservation.repository.ts
import { Repository, LessThan, In } from 'typeorm';
import { Reservation } from '@models/reservation.model';
import databaseConfig from '@config/database.config';
import { En_ReservationStatus } from '@constants/enum.constant';
import { In_ReservationListParams } from '@interfaces/dto.interface';
import { In_PaginationResult } from '@/interfaces/pagination.interface';

class ReservationRepository {
  private static instance: ReservationRepository;
  private repository: Repository<Reservation>;

  private constructor() {
    const dataSource = databaseConfig.getDataSource();
    this.repository = dataSource.getRepository(Reservation);
  }

  public static getInstance(): ReservationRepository {
    if (!ReservationRepository.instance) {
      ReservationRepository.instance = new ReservationRepository();
    }
    return ReservationRepository.instance;
  }

  /** Find reservation by ID */
  async findById(id: string): Promise<Reservation | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'item'],
    });
  }

  /** Find reservation by code */
  async findByCode(reservationCode: string): Promise<Reservation | null> {
    return await this.repository.findOne({
      where: { reservationCode },
      relations: ['user', 'item'],
    });
  }

  /** Create new reservation */
  async create(reservationData: Partial<Reservation>): Promise<Reservation> {
    const reservation = this.repository.create(reservationData);
    return await this.repository.save(reservation);
  }

  /** Update reservation */
  async update(id: string, data: Partial<Reservation>): Promise<Reservation> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Reservation not found after update');
    }
    return updated;
  }

  /** Soft delete reservation */
  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.repository.update(id, { deletedBy });
    await this.repository.softDelete(id);
  }

  /** Get all reservations with pagination and filters */
  async findAll(
    params: In_ReservationListParams
  ): Promise<In_PaginationResult<Reservation>> {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      itemId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      startDate,
      endDate,
    } = params;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.user', 'user')
      .leftJoinAndSelect('reservation.item', 'item');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('reservation.userId = :userId', { userId });
    }

    if (itemId) {
      queryBuilder.andWhere('reservation.itemId = :itemId', { itemId });
    }

    if (startDate) {
      queryBuilder.andWhere('reservation.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('reservation.createdAt <= :endDate', { endDate });
    }

    // Apply sorting
    queryBuilder.orderBy(`reservation.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const reservations = await queryBuilder.skip(skip).take(limit).getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: reservations,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** Find user's reservations by user ID */
  async findByUserId(
    userId: string,
    status?: En_ReservationStatus
  ): Promise<Reservation[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return await this.repository.find({
      where,
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Find item's reservations */
  async findByItemId(
    itemId: string,
    status?: En_ReservationStatus
  ): Promise<Reservation[]> {
    const where: any = { itemId };
    if (status) {
      where.status = status;
    }

    return await this.repository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Find expired reservations */
  async findExpired(): Promise<Reservation[]> {
    const now = new Date();
    return await this.repository.find({
      where: {
        status: En_ReservationStatus.PENDING,
        expiresAt: LessThan(now),
      },
      relations: ['item'],
    });
  }

  /** Count user's active reservations for an item */
  async countUserActiveReservations(
    userId: string,
    itemId: string
  ): Promise<number> {
    return await this.repository.count({
      where: {
        userId,
        itemId,
        status: In([
          En_ReservationStatus.PENDING,
          En_ReservationStatus.CONFIRMED,
        ]),
      },
    });
  }

  /** Get user's total reserved quantity for an item */
  async getUserReservedQuantity(
    userId: string,
    itemId: string
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('reservation')
      .select('SUM(reservation.quantity)', 'total')
      .where('reservation.userId = :userId', { userId })
      .andWhere('reservation.itemId = :itemId', { itemId })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [
          En_ReservationStatus.PENDING,
          En_ReservationStatus.CONFIRMED,
        ],
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /** Find reservation with lock */
  async findByIdWithLock(id: string): Promise<Reservation | null> {
    return await this.repository
      .createQueryBuilder('reservation')
      .where('reservation.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  /** Generate unique reservation code */
  async generateReservationCode(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `RSV-${timestamp}-${random}`;

    // Check if code already exists (very unlikely)
    const exists = await this.repository.findOne({
      where: { reservationCode: code },
    });

    if (exists) {
      // Recursively generate new code if collision occurs
      return this.generateReservationCode();
    }

    return code;
  }

  /** Get reservation statistics */
  async getStats(userId?: string): Promise<any> {
    const queryBuilder = this.repository.createQueryBuilder('reservation');

    if (userId) {
      queryBuilder.where('reservation.userId = :userId', { userId });
    }

    const [total, pending, confirmed, cancelled, expired] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .andWhere('reservation.status = :status', {
          status: En_ReservationStatus.PENDING,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('reservation.status = :status', {
          status: En_ReservationStatus.CONFIRMED,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('reservation.status = :status', {
          status: En_ReservationStatus.CANCELLED,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('reservation.status = :status', {
          status: En_ReservationStatus.EXPIRED,
        })
        .getCount(),
    ]);

    const totalRevenue = await this.repository
      .createQueryBuilder('reservation')
      .select('SUM(reservation.totalPrice)', 'total')
      .where(userId ? 'reservation.userId = :userId' : '1=1', { userId })
      .andWhere('reservation.status = :status', {
        status: En_ReservationStatus.CONFIRMED,
      })
      .getRawOne();

    return {
      total,
      pending,
      confirmed,
      cancelled,
      expired,
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
    };
  }

  /** Bulk update reservation status */
  async bulkUpdateStatus(
    ids: string[],
    status: En_ReservationStatus,
    additionalData?: Partial<Reservation>
  ): Promise<void> {
    const updateData: any = { status, ...additionalData };
    await this.repository.update({ id: In(ids) }, updateData);
  }
}

export default ReservationRepository.getInstance();
