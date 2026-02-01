import rabbitmqConfig from '@config/rabbitmq.config';
import mailConfig from '@config/smtp.config';
import logger from '@utils/logger.util';
import { In_MailOptions } from '@interfaces/config.interface';

/**
 * Queue Processor
 * Handles processing of messages from RabbitMQ queues
 */
class QueueProcessor {
  private static instance: QueueProcessor;
  private isProcessing: boolean = false;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    lastProcessed: null as Date | null,
    processingRate: 0,
  };

  private constructor() {}

  public static getInstance(): QueueProcessor {
    if (!QueueProcessor.instance) {
      QueueProcessor.instance = new QueueProcessor();
    }
    return QueueProcessor.instance;
  }

  /**
   * Start processing messages from all queues
   */
  public async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Queue processor is already running');
      return;
    }

    try {
      this.isProcessing = true;

      // Start consuming from different queues
      await this.consumeEmailQueue();
      await this.consumeReservationQueue();
      await this.consumeNotificationQueue();

      logger.info('✅ Queue processor started successfully');
    } catch (error) {
      this.isProcessing = false;
      logger.error('❌ Failed to start queue processor', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn('Queue processor is not running');
      return;
    }

    try {
      logger.info('Stopping queue processor...');

      // Get list queue will stopped
      const activeQueues = [
        'email_queue',
        'reservation_queue',
        'notification_queue',
      ];

      // Stop consumer
      for (const queueName of activeQueues) {
        await rabbitmqConfig.stopConsume(queueName);
        logger.info(`Stopped consuming from ${queueName}`);
      }

      this.isProcessing = false;
      logger.info('✅ Queue processor stopped successfully');
    } catch (error) {
      logger.error('❌ Error during queue processor shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Consume Email Queue
   */
  private async consumeEmailQueue(): Promise<void> {
    const queueName = 'email_queue';

    try {
      await rabbitmqConfig.createQueue(queueName, { durable: true });

      await rabbitmqConfig.consume(queueName, async (data) => {
        logger.info(`Processing email for: ${data.to}`);
        await this.handleEmailTask(data);
        this.updateStats();
      });

      logger.info(`Started consuming from ${queueName}`);
    } catch (error) {
      logger.error(`Failed to start ${queueName} consumer`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Consume Reservation Queue
   */
  private async consumeReservationQueue(): Promise<void> {
    const queueName = 'reservation_queue';

    try {
      await rabbitmqConfig.createQueue(queueName, { durable: true });

      await rabbitmqConfig.consume(queueName, async (data) => {
        logger.info(`Processing reservation: ${data.reservationId}`);
        this.updateStats();
      });

      logger.info(`Started consuming from ${queueName}`);
    } catch (error) {
      logger.error(`Failed to start ${queueName} consumer`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Consume Notification Queue
   */
  private async consumeNotificationQueue(): Promise<void> {
    const queueName = 'notification_queue';

    try {
      await rabbitmqConfig.createQueue(queueName, { durable: true });

      await rabbitmqConfig.consume(queueName, async (data) => {
        logger.info(`Processing notification for user: ${data.userId}`);
        this.updateStats();
      });

      logger.info(`Started consuming from ${queueName}`);
    } catch (error) {
      logger.error(`Failed to start ${queueName} consumer`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private updateStats(): void {
    this.stats.totalProcessed++;
    this.stats.lastProcessed = new Date();
  }

  private async handleEmailTask(data: any): Promise<void> {
    try {
      await mailConfig.sendMail({
        to: data.to,
        subject: data.subject,
        template: data.template,
        context: data.context,
      } as In_MailOptions);
    } catch (error) {
      this.stats.totalFailed++;
      await this.handleFailedMessage(data, error);
    }
  }

  private async handleFailedMessage(
    message: any,
    error: unknown
  ): Promise<void> {
    try {
      await rabbitmqConfig.createQueue('dlq_queue', { durable: true });

      await rabbitmqConfig.publish('dlq_queue', {
        originalMessage: message,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', { error: dlqError });
    }
  }

  public getStats() {
    return this.stats;
  }
}

export default QueueProcessor.getInstance();
