import cron, { ScheduledTask } from 'node-cron';
import reservationRepository from '@repositories/reservation.repository';
import stockManagementService from '@services/stockManagement.service';
import logger from '@utils/logger.util';
import { En_ReservationStatus } from '@constants/enum.constant';

interface JobStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalExpiredProcessed: number;
  lastRunTime: Date | null;
  lastRunDuration: number;
  lastRunStatus: 'success' | 'failure' | 'idle';
  errors: Array<{ timestamp: Date; error: string }>;
}

class ExpiredReservationScheduler {
  private static instance: ExpiredReservationScheduler;
  private cronJob: ScheduledTask | null = null;
  private isRunning: boolean = false;
  private stats: JobStatistics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    totalExpiredProcessed: 0,
    lastRunTime: null,
    lastRunDuration: 0,
    lastRunStatus: 'idle',
    errors: [],
  };

  private readonly MAX_ERROR_LOG = 100; // Keep last 100 errors

  private constructor() {}

  public static getInstance(): ExpiredReservationScheduler {
    if (!ExpiredReservationScheduler.instance) {
      ExpiredReservationScheduler.instance = new ExpiredReservationScheduler();
    }
    return ExpiredReservationScheduler.instance;
  }

  /** Schedule: Every 1 minute */
  start(): void {
    if (this.cronJob) {
      logger.warn('Expired reservation scheduler is already running');
      return;
    }

    this.cronJob = cron.schedule('*/1 * * * *', async () => {
      await this.processExpiredReservations();
    });

    logger.info('Expired reservation scheduler started', {
      schedule: 'Every 1 minute',
      nextRun: this.getNextRunTime(),
    });
  }

  /** Stop the cron job*/
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Expired reservation scheduler stopped');
    } else {
      logger.warn('Expired reservation scheduler is not running');
    }
  }

  /** Processing function */
  private async processExpiredReservations(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      logger.warn('Previous job still running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.stats.totalRuns++;
    this.stats.lastRunTime = new Date();

    logger.info('🔄 Starting expired reservation processing', {
      runNumber: this.stats.totalRuns,
    });

    try {
      const expiredReservations = await reservationRepository.findExpired();

      if (expiredReservations.length === 0) {
        logger.info('✅ No expired reservations found', {
          duration: Date.now() - startTime,
        });
        this.stats.successfulRuns++;
        this.stats.lastRunStatus = 'success';
        this.stats.lastRunDuration = Date.now() - startTime;
        return;
      }

      logger.info(
        `Found ${expiredReservations.length} expired reservations to process`
      );

      let processedCount = 0;
      let failedCount = 0;

      // Process each expired reservation
      for (const reservation of expiredReservations) {
        try {
          // Release the reserved stock
          await stockManagementService.releaseStock(
            reservation.itemId,
            reservation.quantity
          );

          // Update reservation status to expired
          await reservationRepository.update(reservation.id, {
            status: En_ReservationStatus.EXPIRED,
          });

          processedCount++;

          logger.info('Expired reservation processed', {
            reservationId: reservation.id,
            reservationCode: reservation.reservationCode,
            userId: reservation.userId,
            itemId: reservation.itemId,
            quantity: reservation.quantity,
            expiresAt: reservation.expiresAt,
          });
        } catch (error) {
          failedCount++;
          logger.error('Failed to process expired reservation', {
            reservationId: reservation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Store error for statistics
          this.addError(
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      // Update statistics
      this.stats.totalExpiredProcessed += processedCount;
      const duration = Date.now() - startTime;
      this.stats.lastRunDuration = duration;

      if (failedCount === 0) {
        this.stats.successfulRuns++;
        this.stats.lastRunStatus = 'success';
        logger.info(
          '✅ Expired reservation processing completed successfully',
          {
            processed: processedCount,
            failed: failedCount,
            duration,
          }
        );
      } else {
        this.stats.lastRunStatus = 'failure';
        logger.warn('⚠️ Expired reservation processing completed with errors', {
          processed: processedCount,
          failed: failedCount,
          duration,
        });
      }
    } catch (error) {
      this.stats.failedRuns++;
      this.stats.lastRunStatus = 'failure';
      this.stats.lastRunDuration = Date.now() - startTime;

      logger.error('Expired reservation processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });

      this.addError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isRunning = false;
    }
  }

  /** Add error to statistics */
  private addError(error: string): void {
    this.stats.errors.push({
      timestamp: new Date(),
      error,
    });

    // Keep only last MAX_ERROR_LOG errors
    if (this.stats.errors.length > this.MAX_ERROR_LOG) {
      this.stats.errors.shift();
    }
  }

  /**  Run the job manually (for testing or admin trigger) */
  async runManually(): Promise<{
    success: boolean;
    processed: number;
    duration: number;
  }> {
    logger.info('Manual execution of expired reservation job triggered');
    const startTime = Date.now();

    try {
      const expiredReservations = await reservationRepository.findExpired();
      let processedCount = 0;

      for (const reservation of expiredReservations) {
        try {
          await stockManagementService.releaseStock(
            reservation.itemId,
            reservation.quantity
          );

          await reservationRepository.update(reservation.id, {
            status: En_ReservationStatus.EXPIRED,
          });

          processedCount++;
        } catch (error) {
          logger.error('Failed to process reservation in manual run', {
            reservationId: reservation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Manual execution completed', {
        processed: processedCount,
        duration,
      });

      return {
        success: true,
        processed: processedCount,
        duration,
      };
    } catch (error) {
      logger.error('Manual execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        processed: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  /** Get job statistics */
  getStatistics(): JobStatistics {
    return { ...this.stats };
  }

  /** Get job status */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextRun: string | null;
    stats: JobStatistics;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      nextRun: this.getNextRunTime(),
      stats: this.getStatistics(),
    };
  }

  /** Get next scheduled run time*/
  private getNextRunTime(): string | null {
    if (!this.cronJob) return null;

    // Calculate next minute
    const now = new Date();
    const next = new Date(now.getTime() + 60000);
    next.setSeconds(0);
    next.setMilliseconds(0);

    return next.toISOString();
  }

  /** Reset statistics */
  resetStatistics(): void {
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalExpiredProcessed: 0,
      lastRunTime: null,
      lastRunDuration: 0,
      lastRunStatus: 'idle',
      errors: [],
    };
    logger.info('Job statistics reset');
  }

  /** Get health status */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
  } {
    if (!this.cronJob) {
      return {
        status: 'unhealthy',
        message: 'Scheduler is not running',
      };
    }

    if (this.stats.totalRuns === 0) {
      return {
        status: 'healthy',
        message: 'Scheduler is running but has not executed yet',
      };
    }

    const successRate = this.stats.successfulRuns / this.stats.totalRuns;

    if (successRate >= 0.95) {
      return {
        status: 'healthy',
        message: `Scheduler is healthy (${(successRate * 100).toFixed(1)}% success rate)`,
      };
    } else if (successRate >= 0.8) {
      return {
        status: 'degraded',
        message: `Scheduler is degraded (${(successRate * 100).toFixed(1)}% success rate)`,
      };
    } else {
      return {
        status: 'unhealthy',
        message: `Scheduler is unhealthy (${(successRate * 100).toFixed(1)}% success rate)`,
      };
    }
  }
}

export default ExpiredReservationScheduler.getInstance();
