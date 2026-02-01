import { Repository, LessThan, In, EntityManager } from 'typeorm';
import { Reservation } from '@models/reservation.model';
import databaseConfig from '@config/database.config';
import { En_ReservationStatus } from '@constants/enum.constant';
import { In_ReservationListParams } from '@interfaces/dto.interface';
import { In_PaginationResult } from '@/interfaces/pagination.interface';
import { TableNames } from '@/shared/constants/tableName.constant';

class ReservationRepository {
  private static instance: ReservationRepository;

  private constructor() {}

  public static getInstance(): ReservationRepository {
    if (!ReservationRepository.instance) {
      ReservationRepository.instance = new ReservationRepository();
    }
    return ReservationRepository.instance;
  }

  public get repository(): Repository<Reservation> {
    return databaseConfig.getDataSource().getRepository(Reservation);
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
  async update(
    id: string,
    data: Partial<Reservation>,
    manager?: EntityManager
  ): Promise<Reservation> {
    const repo = manager ? manager.getRepository(Reservation) : this.repository;

    await repo.update(id, data);
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
    itemId: string,
    manager?: EntityManager
  ): Promise<number> {
    const repo = manager ? manager.getRepository(Reservation) : this.repository;

    const result = await repo
      .createQueryBuilder(TableNames.Reservation)
      .select(`SUM(${TableNames.Reservation}.quantity)`, 'total')
      .where(`${TableNames.Reservation}.userId = :userId`, { userId })
      .andWhere(`${TableNames.Reservation}.itemId = :itemId`, { itemId })
      .andWhere(`${TableNames.Reservation}.status IN (:...arrayStatus)`, {
        arrayStatus: [
          En_ReservationStatus.PENDING,
          En_ReservationStatus.CONFIRMED,
        ],
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /** Find reservation with lock */
  async findByIdWithLock(
    id: string,
    manager?: EntityManager
  ): Promise<Reservation | null> {
    const repo = manager ? manager.getRepository(Reservation) : this.repository;
    return await repo
      .createQueryBuilder(TableNames.Reservation)
      .where(`${TableNames.Reservation}.id = :id`, { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  /** Generate unique reservation code */
  async generateReservationCode(manager?: EntityManager): Promise<string> {
    const repo = manager ? manager.getRepository(Reservation) : this.repository;

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `RSV-${timestamp}-${random}`;

    const exists = await repo.findOne({
      where: { reservationCode: code },
    });

    if (exists) {
      return this.generateReservationCode(manager);
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
