import { Request, Response, NextFunction } from 'express';
import expiredReservationScheduler from '@/events/jobs/expired-reservation.job';
import stockManagementService from '@services/stockManagement.service';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';

class MonitoringController {
  private static instance: MonitoringController;

  private constructor() {}

  public static getInstance(): MonitoringController {
    if (!MonitoringController.instance) {
      MonitoringController.instance = new MonitoringController();
    }
    return MonitoringController.instance;
  }

  /** Get scheduler job status and statistics */
  async getSchedulerStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = expiredReservationScheduler.getStatus();
      const health = expiredReservationScheduler.getHealth();

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'Scheduler status' }),
        {
          scheduler: {
            ...status,
            health,
          },
        }
      );
    } catch (error) {
      logger.error('Failed to get scheduler status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Trigger scheduler job manually */
  async triggerScheduler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await expiredReservationScheduler.runManually();

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.trigger', { name: 'Scheduler' }),
        {
          result,
        }
      );
    } catch (error) {
      logger.error('Failed to trigger scheduler', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Reset scheduler statistics */
  async resetSchedulerStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      expiredReservationScheduler.resetStatistics();

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.reset', { name: 'Scheduler statistics' })
      );
    } catch (error) {
      logger.error('Failed to reset scheduler statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Check stock consistency */
  async checkStockConsistency(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await stockManagementService.checkStockConsistency();

      if (result.consistent) {
        apiResponse.sendSuccess(res, lang.__('success.stock.consistent'), {
          consistent: true,
          itemsChecked: 'all',
        });
      } else {
        apiResponse.sendSuccess(res, lang.__('success.stock.inconsistent'), {
          consistent: false,
          inconsistencies: result.inconsistencies,
        });
      }
    } catch (error) {
      logger.error('Failed to check stock consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Fix stock consistency issues */
  async fixStockConsistency(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const itemsFixed = await stockManagementService.fixStockConsistency();

      apiResponse.sendSuccess(res, lang.__('success.stock.fix-consistent'), {
        itemsFixed,
      });
    } catch (error) {
      logger.error('Failed to fix stock consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get stock statistics */
  async getStockStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await stockManagementService.getStockStatistics();

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'Stock statistics' }),
        {
          stats,
        }
      );
    } catch (error) {
      logger.error('Failed to get stock statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get system health */
  async getSystemHealth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schedulerHealth = expiredReservationScheduler.getHealth();
      const stockConsistency =
        await stockManagementService.checkStockConsistency();

      const overallStatus =
        schedulerHealth.status === 'healthy' && stockConsistency.consistent
          ? 'healthy'
          : schedulerHealth.status === 'unhealthy' ||
              !stockConsistency.consistent
            ? 'unhealthy'
            : 'degraded';

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'System health' }),
        {
          health: {
            status: overallStatus,
            components: {
              scheduler: schedulerHealth,
              stock: {
                consistent: stockConsistency.consistent,
                inconsistencyCount: stockConsistency.inconsistencies.length,
              },
            },
            timestamp: new Date().toISOString(),
          },
        }
      );
    } catch (error) {
      logger.error('Failed to get system health', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /** Get monitoring dashboard data */
  async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const [schedulerStatus, stockStats, stockConsistency] = await Promise.all(
        [
          Promise.resolve(expiredReservationScheduler.getStatus()),
          stockManagementService.getStockStatistics(),
          stockManagementService.checkStockConsistency(),
        ]
      );

      apiResponse.sendSuccess(
        res,
        lang.__('success.default.fetch', { name: 'Dashboard data' }),
        {
          dashboard: {
            scheduler: {
              ...schedulerStatus,
              health: expiredReservationScheduler.getHealth(),
            },
            stock: {
              ...stockStats,
              consistent: stockConsistency.consistent,
              inconsistencyCount: stockConsistency.inconsistencies.length,
            },
            timestamp: new Date().toISOString(),
          },
        }
      );
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

export default MonitoringController.getInstance();
