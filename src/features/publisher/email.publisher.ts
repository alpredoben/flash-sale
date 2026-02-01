import {
  In_AccountApprovalEvent,
  In_EmailVerificationEvent,
  In_PasswordChangedEvent,
  In_PasswordResetEvent,
  Ty_EmailEvent,
} from '@/interfaces/emailEvent.interface';
import logger from '@utils/logger.util';
import rabbitmqConfig from '@config/rabbitmq.config';
import environment from '@config/env.config';
import {
  RoutingKeys,
  Ty_EmailEventType,
} from '@/shared/constants/queue.constant';

class EmailPublisher {
  private static instance: EmailPublisher;

  private constructor() {}

  public static getInstance(): EmailPublisher {
    if (!EmailPublisher.instance) {
      EmailPublisher.instance = new EmailPublisher();
    }
    return EmailPublisher.instance;
  }

  private async publishEmailToQueue(
    routingKey: string,
    event: Ty_EmailEvent
  ): Promise<void> {
    try {
      if (!rabbitmqConfig.isConnected()) {
        logger.warn('RabbitMQ is not connected, attempting to reconnect...');
        await rabbitmqConfig.connect();
      }

      // Publish event to RabbitMQ
      const success = rabbitmqConfig.publish(routingKey, event, {
        exchange: environment.rabbitmqExchange,
        persistent: true,
        headers: {
          timestamp: Date.now(),
          userId: event,
        },
      });

      if (!success) {
        throw new Error('Failed to publish email event to queue RabbitMQ');
      }

      logger.info('Email event published successfully', {
        routingKey,
        eventType: event.type,
        recipient: event.to,
        userId: event.metadata?.userId,
      });
    } catch (error) {
      logger.error('Failed to publish email to queue event', {
        routingKey,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async publishVerificationEmail(
    to: string,
    fullName: string,
    verificationToken: string,
    expiresAt: Date,
    userId?: string
  ): Promise<void> {
    const event: In_EmailVerificationEvent = {
      type: Ty_EmailEventType.VERIFICATION,
      data: {
        userName: fullName,
        verificationToken,
        expiresAt,
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        retryCount: 0,
      },
      to,
    };

    await this.publishEmailToQueue(RoutingKeys.EMAIL_VERIFICATION, event);
  }

  async publishPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string,
    expiresAt: Date,
    userId?: string
  ): Promise<void> {
    const event: In_PasswordResetEvent = {
      type: Ty_EmailEventType.PASSWORD_RESET,
      to,
      data: {
        userName,
        resetToken,
        expiresAt,
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        retryCount: 0,
      },
    };

    await this.publishEmailToQueue(RoutingKeys.EMAIL_PASSWORD_RESET, event);
  }

  async publishPasswordChangedEmail(
    to: string,
    userName: string,
    userId?: string
  ): Promise<void> {
    const event: In_PasswordChangedEvent = {
      type: Ty_EmailEventType.PASSWORD_CHANGED,
      to,
      data: {
        userName,
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        retryCount: 0,
      },
    };

    await this.publishEmailToQueue(RoutingKeys.EMAIL_PASSWORD_CHANGED, event);
  }

  async publishAccountApprovalEmail(
    to: string,
    userName: string,
    userId?: string
  ): Promise<void> {
    const event: In_AccountApprovalEvent = {
      type: Ty_EmailEventType.ACCOUNT_APPROVAL,
      to,
      data: {
        userName,
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        retryCount: 0,
      },
    };

    await this.publishEmailToQueue(RoutingKeys.EMAIL_ACCOUNT_APPROVAL, event);
  }

  async batchPublishVerificationEmails(
    users: Array<{
      email: string;
      userName: string;
      token: string;
      expiresAt: Date;
      userId?: string;
    }>
  ): Promise<void> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const user of users) {
      try {
        await this.publishVerificationEmail(
          user.email,
          user.userName,
          user.token,
          user.expiresAt,
          user.userId
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Failed to publish verification email in batch', {
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Batch verification emails published', {
      total: users.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });

    if (results.failed > 0) {
      throw new Error(
        `Failed to publish ${results.failed} out of ${users.length} verification emails`
      );
    }
  }

  getStatistics(): {
    isConnected: boolean;
    exchange: string;
    availableEventTypes: string[];
  } {
    return {
      isConnected: rabbitmqConfig.isConnected(),
      exchange: environment.rabbitmqExchange,
      availableEventTypes: Object.values(Ty_EmailEventType),
    };
  }
}

export default EmailPublisher.getInstance();
