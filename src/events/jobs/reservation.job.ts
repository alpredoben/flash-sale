import cron, { ScheduledTask } from 'node-cron';
import reservationService from '@services/reservation.service';
import logger from '@utils/logger.util';

class ReservationJob {
  private static instance: ReservationJob;
  private cronJob: ScheduledTask | null = null;

  private constructor() {}

  public static getInstance(): ReservationJob {
    if (!ReservationJob.instance) {
      ReservationJob.instance = new ReservationJob();
    }
    return ReservationJob.instance;
  }

  /** Start the cron job to process expired reservations */
  start(): void {
    if (this.cronJob) {
      logger.warn('Expired reservation job is already running');
      return;
    }

    // Run every 1 minute: '*/1 * * * *'
    this.cronJob = cron.schedule('*/1 * * * *', async () => {
      try {
        logger.info('Starting expired reservation job...');

        const processedCount =
          await reservationService.processExpiredReservations();

        logger.info(
          `Expired reservation job completed. Processed ${processedCount} reservations.`
        );
      } catch (error) {
        logger.error('Error in expired reservation job', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

    logger.info('Expired reservation job started. Running every 1 minute.');
  }

  /** Stop the cron job */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Expired reservation job stopped');
    } else {
      logger.warn('Expired reservation job is not running');
    }
  }

  /** Get job status */
  isRunning(): boolean {
    return this.cronJob !== null;
  }

  /** Run the job manually (for testing purposes) */
  async runManually(): Promise<number> {
    try {
      logger.info('Running expired reservation job manually...');
      const processedCount =
        await reservationService.processExpiredReservations();
      logger.info(
        `Manual expired reservation job completed. Processed ${processedCount} reservations.`
      );
      return processedCount;
    } catch (error) {
      logger.error('Error in manual expired reservation job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default ReservationJob.getInstance();
