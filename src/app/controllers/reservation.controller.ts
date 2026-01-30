// src/app/controllers/reservation.controller.ts
import { Request, Response, NextFunction } from 'express';
import reservationService from '@services/reservation.service';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';
import {
  In_DTO_CreateReservation,
  In_ReservationListParams,
} from '@interfaces/dto.interface';
import { En_ReservationStatus } from '@constants/enum.constant';

class ReservationController {
  private static instance: ReservationController;

  private constructor() {}

  public static getInstance(): ReservationController {
    if (!ReservationController.instance) {
      ReservationController.instance = new ReservationController();
    }
    return ReservationController.instance;
  }

  /** Create new reservation - [POST] /api/v1/reservations (User) */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const data: In_DTO_CreateReservation = req.body;

      const reservation = await reservationService.create(userId, data);

      apiResponse.sendCreated(res, lang.__('success.reservation.create'), {
        reservation: {
          id: reservation.id,
          reservationCode: reservation.reservationCode,
          item: {
            id: reservation.item.id,
            sku: reservation.item.sku,
            name: reservation.item.name,
            imageUrl: reservation.item.imageUrl,
          },
          quantity: reservation.quantity,
          price: reservation.price,
          totalPrice: reservation.totalPrice,
          status: reservation.status,
          expiresAt: reservation.expiresAt,
          createdAt: reservation.createdAt,
        },
      });
    } catch (error) {
      logger.error('Create reservation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body,
      });
      next(error);
    }
  }

  /** Checkout reservation - [POST] /api/v1/reservations/:id/checkout (User) */
  async checkout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const reservationId = req.params.id;

      const reservation = await reservationService.checkout(userId, {
        reservationId: reservationId as any,
      });

      apiResponse.sendSuccess(res, lang.__('success.reservation.checkout'), {
        reservation: {
          id: reservation.id,
          reservationCode: reservation.reservationCode,
          item: {
            id: reservation.item.id,
            sku: reservation.item.sku,
            name: reservation.item.name,
          },
          quantity: reservation.quantity,
          totalPrice: reservation.totalPrice,
          status: reservation.status,
          confirmedAt: reservation.confirmedAt,
        },
      });
    } catch (error) {
      logger.error('Checkout reservation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        reservationId: req.params.id,
      });
      next(error);
    }
  }

  /** Cancel reservation - [POST] /api/v1/reservations/:id/cancel (User) */
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const reservationId = req.params.id;
      const { reason } = req.body;

      const reservation = await reservationService.cancel(userId, {
        reservationId: reservationId as any,
        reason,
      });

      apiResponse.sendSuccess(res, lang.__('success.reservation.cancel'), {
        reservation: {
          id: reservation.id,
          reservationCode: reservation.reservationCode,
          status: reservation.status,
          cancelledAt: reservation.cancelledAt,
          cancellationReason: reservation.cancellationReason,
        },
      });
    } catch (error) {
      logger.error('Cancel reservation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        reservationId: req.params.id,
      });
      next(error);
    }
  }

  /** Get user's reservations - [GET] /api/v1/reservations/my (User) */
  async getMyReservations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const status = req.query.status as En_ReservationStatus | undefined;

      const reservations = await reservationService.getUserReservations(
        userId,
        status
      );

      apiResponse.sendSuccess(
        res,
        lang.__('success.reservation.fetch', { name: 'Your reservations' }),
        {
          reservations: reservations.map((r: any) => ({
            id: r.id,
            reservationCode: r.reservationCode,
            item: {
              id: r.item.id,
              sku: r.item.sku,
              name: r.item.name,
              imageUrl: r.item.imageUrl,
            },
            quantity: r.quantity,
            price: r.price,
            totalPrice: r.totalPrice,
            status: r.status,
            expiresAt: r.expiresAt,
            confirmedAt: r.confirmedAt,
            cancelledAt: r.cancelledAt,
            cancellationReason: r.cancellationReason,
            createdAt: r.createdAt,
          })),
        }
      );
    } catch (error) {
      logger.error('Get my reservations error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /** Get reservation by ID - [GET] /api/v1/reservations/:id (User) */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const reservation = await reservationService.getById(id as any, userId);

      apiResponse.sendSuccess(
        res,
        lang.__('success.reservation.fetch', { name: 'Reservation' }),
        {
          reservation: {
            id: reservation.id,
            reservationCode: reservation.reservationCode,
            user: {
              id: reservation.user.id,
              firstName: reservation.user.firstName,
              lastName: reservation.user.lastName,
              email: reservation.user.email,
            },
            item: {
              id: reservation.item.id,
              sku: reservation.item.sku,
              name: reservation.item.name,
              description: reservation.item.description,
              imageUrl: reservation.item.imageUrl,
            },
            quantity: reservation.quantity,
            price: reservation.price,
            totalPrice: reservation.totalPrice,
            status: reservation.status,
            expiresAt: reservation.expiresAt,
            confirmedAt: reservation.confirmedAt,
            cancelledAt: reservation.cancelledAt,
            cancellationReason: reservation.cancellationReason,
            createdAt: reservation.createdAt,
            updatedAt: reservation.updatedAt,
          },
        }
      );
    } catch (error) {
      logger.error('Get reservation by ID error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        id: req.params.id,
      });
      next(error);
    }
  }

  /** Get all reservations - [GET] /api/v1/admin/reservations (Admin only) */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: In_ReservationListParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as En_ReservationStatus,
        userId: req.query.userId as string,
        itemId: req.query.itemId as string,
        sortBy: req.query.sortBy as any,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const result = await reservationService.getAll(params);

      apiResponse.sendSuccess(
        res,
        lang.__('success.reservation.fetch', { name: 'Reservations' }),
        {
          reservations: result.data.map((r) => ({
            id: r.id,
            reservationCode: r.reservationCode,
            user: {
              id: r.user.id,
              firstName: r.user.firstName,
              lastName: r.user.lastName,
              email: r.user.email,
            },
            item: {
              id: r.item.id,
              sku: r.item.sku,
              name: r.item.name,
            },
            quantity: r.quantity,
            price: r.price,
            totalPrice: r.totalPrice,
            status: r.status,
            expiresAt: r.expiresAt,
            confirmedAt: r.confirmedAt,
            cancelledAt: r.cancelledAt,
            createdAt: r.createdAt,
          })),
        },
        result.meta
      );
    } catch (error) {
      logger.error('Get all reservations error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      next(error);
    }
  }

  /** Admin cancel reservation - [POST] /api/v1/admin/reservations/:id/cancel (Admin only) */
  async adminCancel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const adminId: any = req.user?.id;
      const reservationId: any = req.params.id;
      const { reason } = req.body;

      if (!reason) {
        apiResponse.sendBadRequest(res, 'Cancellation reason is required');
        return;
      }

      const reservation = await reservationService.adminCancel(
        reservationId,
        reason,
        adminId
      );

      apiResponse.sendSuccess(
        res,
        lang.__('success.reservation.admin-cancel'),
        {
          reservation: {
            id: reservation.id,
            reservationCode: reservation.reservationCode,
            status: reservation.status,
            cancelledAt: reservation.cancelledAt,
            cancellationReason: reservation.cancellationReason,
          },
        }
      );
    } catch (error) {
      logger.error('Admin cancel reservation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adminId: req.user?.id,
        reservationId: req.params.id,
      });
      next(error);
    }
  }

  /** Get reservation statistics - [GET] /api/v1/reservations/stats (User gets own stats) */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const stats = await reservationService.getStats(userId);

      apiResponse.sendSuccess(res, lang.__('success.reservation.statistic'), {
        stats,
      });
    } catch (error) {
      logger.error('Get reservation stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /** Get all reservation statistics - [GET] /api/v1/admin/reservations/stats (Admin only) */
  async getAllStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await reservationService.getStats();

      apiResponse.sendSuccess(res, lang.__('success.reservation.statistic'), {
        stats,
      });
    } catch (error) {
      logger.error('Get all reservation stats error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

export default ReservationController.getInstance();
