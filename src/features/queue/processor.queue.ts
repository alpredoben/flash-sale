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

      logger.info('Queue processor started successfully');
    } catch (error) {
      this.isProcessing = false;
      logger.error('Failed to start queue processor', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stop processing messages
   */
  public async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn('Queue processor is not running');
      return;
    }

    this.isProcessing = false;
    logger.info('Queue processor stopped');
  }

  /**
   * Process email queue messages
   */
  private async consumeEmailQueue(): Promise<void> {
    try {
      await rabbitmqConfig.consume(
        'email_queue',
        async (message: any) => {
          const startTime = Date.now();

          try {
            logger.debug('Processing email message', {
              to: message.to,
              subject: message.subject,
            });

            // Send email
            await this.processEmailMessage(message);

            // Update statistics
            this.stats.totalProcessed++;
            this.stats.lastProcessed = new Date();

            const duration = Date.now() - startTime;
            logger.info('Email sent successfully', {
              to: message.to,
              subject: message.subject,
              duration: `${duration}ms`,
            });
          } catch (error) {
            this.stats.totalFailed++;
            logger.error('Failed to process email message', {
              to: message.to,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            // Optionally: Send to Dead Letter Queue (DLQ)
            await this.handleFailedMessage(message, error);
          }
        },
        {
          prefetch: 5, // Process 5 messages at a time
        }
      );

      logger.info('Email queue consumer started');
    } catch (error) {
      logger.error('Failed to start email queue consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process reservation queue messages
   */
  private async consumeReservationQueue(): Promise<void> {
    try {
      await rabbitmqConfig.consume(
        'reservation_queue',
        async (message: any) => {
          const startTime = Date.now();

          try {
            logger.debug('Processing reservation message', {
              type: message.type,
              reservationId: message.reservationId,
            });

            // Process reservation event
            await this.processReservationMessage(message);

            this.stats.totalProcessed++;
            this.stats.lastProcessed = new Date();

            const duration = Date.now() - startTime;
            logger.info('Reservation message processed', {
              type: message.type,
              reservationId: message.reservationId,
              duration: `${duration}ms`,
            });
          } catch (error) {
            this.stats.totalFailed++;
            logger.error('Failed to process reservation message', {
              reservationId: message.reservationId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            await this.handleFailedMessage(message, error);
          }
        },
        {
          prefetch: 10,
        }
      );

      logger.info('Reservation queue consumer started');
    } catch (error) {
      logger.error('Failed to start reservation queue consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process notification queue messages
   */
  private async consumeNotificationQueue(): Promise<void> {
    try {
      await rabbitmqConfig.consume(
        'notification_queue',
        async (message: any) => {
          const startTime = Date.now();

          try {
            logger.debug('Processing notification message', {
              type: message.type,
              userId: message.userId,
            });

            // Process notification
            await this.processNotificationMessage(message);

            this.stats.totalProcessed++;
            this.stats.lastProcessed = new Date();

            const duration = Date.now() - startTime;
            logger.info('Notification processed', {
              type: message.type,
              userId: message.userId,
              duration: `${duration}ms`,
            });
          } catch (error) {
            this.stats.totalFailed++;
            logger.error('Failed to process notification message', {
              userId: message.userId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            await this.handleFailedMessage(message, error);
          }
        },
        {
          prefetch: 10,
        }
      );

      logger.info('Notification queue consumer started');
    } catch (error) {
      logger.error('Failed to start notification queue consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process email message
   */
  private async processEmailMessage(message: any): Promise<void> {
    const emailOptions: In_MailOptions = {
      to: message.to,
      subject: message.subject,
      template: message.template,
      context: message.context,
      html: message.html,
      text: message.text,
    };

    await mailConfig.sendMail(emailOptions);
  }

  /**
   * Process reservation message
   */
  private async processReservationMessage(message: any): Promise<void> {
    const { type, reservationId, userId, itemId, data } = message;

    switch (type) {
      case 'reservation.created':
        await this.handleReservationCreated(
          reservationId,
          userId,
          itemId,
          data
        );
        break;

      case 'reservation.confirmed':
        await this.handleReservationConfirmed(reservationId, userId, data);
        break;

      case 'reservation.cancelled':
        await this.handleReservationCancelled(reservationId, userId, data);
        break;

      case 'reservation.expired':
        await this.handleReservationExpired(reservationId, userId, data);
        break;

      default:
        logger.warn('Unknown reservation message type', { type });
    }
  }

  /**
   * Process notification message
   */
  private async processNotificationMessage(message: any): Promise<void> {
    const { type, userId, data } = message;

    // Here you can implement different notification handlers
    // For example: push notifications, SMS, in-app notifications, etc.

    logger.info('Notification processed', {
      type,
      userId,
      data,
    });

    // Example: Send push notification
    // await pushNotificationService.send(userId, data);
  }

  /**
   * Handle reservation created event
   */
  private async handleReservationCreated(
    reservationId: string,
    userId: string,
    itemId: string,
    data: any
  ): Promise<void> {
    logger.info('Handling reservation created event', {
      reservationId,
      userId,
      itemId,
    });

    // Send confirmation email
    await rabbitmqConfig.publish('email_queue', {
      to: data.userEmail,
      subject: 'Reservation Created',
      template: 'reservation-created',
      context: {
        userName: data.userName,
        itemName: data.itemName,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        reservationCode: data.reservationCode,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Handle reservation confirmed event
   */
  private async handleReservationConfirmed(
    reservationId: string,
    userId: string,
    data: any
  ): Promise<void> {
    logger.info('Handling reservation confirmed event', {
      reservationId,
      userId,
    });

    // Send confirmation email
    await rabbitmqConfig.publish('email_queue', {
      to: data.userEmail,
      subject: 'Reservation Confirmed',
      template: 'reservation-confirmed',
      context: {
        userName: data.userName,
        itemName: data.itemName,
        reservationCode: data.reservationCode,
        totalPrice: data.totalPrice,
      },
    });
  }

  /**
   * Handle reservation cancelled event
   */
  private async handleReservationCancelled(
    reservationId: string,
    userId: string,
    data: any
  ): Promise<void> {
    logger.info('Handling reservation cancelled event', {
      reservationId,
      userId,
    });

    // Send cancellation email
    await rabbitmqConfig.publish('email_queue', {
      to: data.userEmail,
      subject: 'Reservation Cancelled',
      template: 'reservation-cancelled',
      context: {
        userName: data.userName,
        itemName: data.itemName,
        reservationCode: data.reservationCode,
        cancellationReason: data.cancellationReason,
      },
    });
  }

  /**
   * Handle reservation expired event
   */
  private async handleReservationExpired(
    reservationId: string,
    userId: string,
    data: any
  ): Promise<void> {
    logger.info('Handling reservation expired event', {
      reservationId,
      userId,
    });

    // Send expiration notification email
    await rabbitmqConfig.publish('email_queue', {
      to: data.userEmail,
      subject: 'Reservation Expired',
      template: 'reservation-expired',
      context: {
        userName: data.userName,
        itemName: data.itemName,
        reservationCode: data.reservationCode,
      },
    });
  }

  /**
   * Handle failed message
   */
  private async handleFailedMessage(
    message: any,
    error: unknown
  ): Promise<void> {
    try {
      // Optionally send to Dead Letter Queue
      await rabbitmqConfig.publish('dlq_queue', {
        originalMessage: message,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: message.retryCount || 0,
      });

      logger.info('Failed message sent to DLQ', {
        messageId: message.id || 'unknown',
      });
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', {
        error: dlqError instanceof Error ? dlqError.message : 'Unknown error',
      });
    }
  }

  /**
   * Get processor statistics
   */
  public getStats() {
    return {
      ...this.stats,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      lastProcessed: null,
      processingRate: 0,
    };
    logger.info('Queue processor statistics reset');
  }

  /**
   * Check if processor is running
   */
  public isRunning(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export default QueueProcessor.getInstance();
export { QueueProcessor };
