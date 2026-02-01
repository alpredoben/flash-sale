import {
  isAccountApprovalEvent,
  isEmailVerificationEvent,
  isPasswordChangedEvent,
  isPasswordResetEvent,
  Ty_EmailEvent,
  validateEmailEvent,
} from '@/interfaces/emailEvent.interface';
import {
  RoutingKeys,
  Ty_EmailEventType,
} from '@/shared/constants/queue.constant';
import environment from '@config/env.config';
import rabbitmqConfig from '@config/rabbitmq.config';
import logger from '@utils/logger.util';
import smtpMail from '@config/smtp.config';
import { In_MailOptions } from '@/interfaces/config.interface';

const QUEUE_MAP: Record<string, string> = {
  [RoutingKeys.EMAIL_VERIFICATION]: 'queue_email_verification',
  [RoutingKeys.EMAIL_PASSWORD_RESET]: 'queue_email_password_reset',
  [RoutingKeys.EMAIL_PASSWORD_CHANGED]: 'queue_email_password_changed',
  [RoutingKeys.EMAIL_ACCOUNT_APPROVAL]: 'queue_email_account_approval',
};

class EmailSubscriber {
  private static instance: EmailSubscriber;
  private isProcessing = false;

  public static getInstance(): EmailSubscriber {
    if (!EmailSubscriber.instance) {
      EmailSubscriber.instance = new EmailSubscriber();
    }
    return EmailSubscriber.instance;
  }

  public async start(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('[Email Subscriber] ---> 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Already running');
      return;
    }

    try {
      // 1. Connect RabbitMQ (no-op if already connected)
      if (!rabbitmqConfig.isConnected()) {
        await rabbitmqConfig.connect();
      }

      // 2. Connect SMTP (no-op if already connected)
      if (!smtpMail.isMailConnected()) {
        await smtpMail.connect();
      }

      // 3. Declare queues + bindings, then subscribe
      await this.setupQueues();
      await this.runSubscribe();

      this.isProcessing = true;
      logger.info(
        '[Email Subscriber] ---> ✅ Started — listening on all email queues'
      );
    } catch (error) {
      logger.error('[Email Subscriber] ---> ❌ Failed to start', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn('Queue processor is not running');
      return;
    }

    try {
      logger.info('[Email Subscriber] ---> Stop email subscriber processing');

      for (const queue of Object.values(QUEUE_MAP)) {
        await rabbitmqConfig.stopConsume(queue);
      }

      this.isProcessing = false;
      logger.info('[Email Subscriber] ---> ✅ Stop email subscriber successfully');
    } catch (error) {
      logger.error('[Email Subscriber] ---> ❌ Error while stopping', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async setupQueues(): Promise<void> {
    const exchange = environment.rabbitmqExchange;

    for (const [routingKey, queueName] of Object.entries(QUEUE_MAP)) {
      await rabbitmqConfig.createQueue(queueName, { durable: true });
      await rabbitmqConfig.bindQueue(queueName, exchange, routingKey);
      logger.info(
        `[Email Subscriber] ---> Queue "${queueName}" bound to "${routingKey}"`
      );
    }
  }

  private async runSubscribe(): Promise<void> {
    for (const queueName of Object.values(QUEUE_MAP)) {
      await rabbitmqConfig.consume(
        queueName,
        (payload) => this.handleMessage(payload),
        { prefetch: 5 }
      );
    }
  }

  private async handleMessage(payload: unknown): Promise<void> {
    if (!validateEmailEvent(payload)) {
      logger.error(
        '[Email Subscriber] ---> Invalid email event payload received',
        { payload }
      );
      return;
    }

    const event = payload as Ty_EmailEvent;

    logger.info('[Email Subscriber] ---> Processing email event', {
      type: event.type,
      to: event.to,
      userId: event.metadata?.userId ?? '',
      retryCount: event.metadata?.retryCount ?? 0,
    });

    try {
      switch (event.type) {
        case Ty_EmailEventType.VERIFICATION:
          await this.sendVerification(event);
          break;

        case Ty_EmailEventType.PASSWORD_RESET:
          await this.sendPasswordReset(event);
          break;

        case Ty_EmailEventType.PASSWORD_CHANGED:
          await this.sendPasswordChanged(event);
          break;

        case Ty_EmailEventType.ACCOUNT_APPROVAL:
          await this.sendAccountApproval(event);
          break;

        default:
          logger.warn('[Email Subscriber] ---> Unknown event type', {
            type: (event as any).type,
          });
          return;
      }

      logger.info('[Email Subscriber] ---> ✅ Email sent successfully', {
        type: event.type,
        to: event.to,
        userId: event.metadata?.userId,
      });
    } catch (error) {
      logger.error('[Email Subscriber] ---> ❌ Failed to send email', {
        type: event.type,
        to: event.to,
        retryCount: event.metadata?.retryCount ?? 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async sendVerification(event: Ty_EmailEvent): Promise<void> {
    if (!isEmailVerificationEvent(event)) {
      throw new Error(`Malformed your VERIFICATION event`);
    }

    const { verificationToken, expiresAt, userName } = event.data;

    const verificationUrl =
      event.data.verificationUrl ??
      `${environment.frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOption: In_MailOptions = {
      to: event.to,
      subject: 'Verify Your Email Address',
      template: 'verification-email',
      context: {
        userName,
        verificationUrl,
        expiresAt,
        recipientEmail: event.to,
        appName: environment.appName,
        appUrl: environment.frontendUrl,
      },
    };
    await smtpMail.sendMail(mailOption);
  }

  private async sendPasswordReset(event: Ty_EmailEvent): Promise<void> {
    if (!isPasswordResetEvent(event)) {
      throw new Error('Malformed PASSWORD_RESET event');
    }

    const { resetToken, expiresAt, userName } = event.data;
    const resetUrl =
      event.data.resetUrl ??
      `${environment.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOption: In_MailOptions = {
      to: event.to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        userName,
        resetUrl,
        expiresAt,
        requestedAt: new Date(), // timestamp when the consumer actually processes
        recipientEmail: event.to,
        appName: environment.appName,
        appUrl: environment.frontendUrl,
      },
    };

    await smtpMail.sendMail(mailOption);
  }

  private async sendPasswordChanged(event: Ty_EmailEvent): Promise<void> {
    if (!isPasswordChangedEvent(event)) {
      throw new Error('Malformed PASSWORD_CHANGED event');
    }

    const { userName } = event.data;
    const mailOption: In_MailOptions = {
      to: event.to,
      subject: 'Your Password Has Been Changed',
      template: 'password-changed',
      context: {
        userName,
        changedAt: event.data.changedAt ?? new Date(),
        recipientEmail: event.to,
        appName: environment.appName,
        appUrl: environment.frontendUrl,
      },
    };
    await smtpMail.sendMail(mailOption);
  }

  private async sendAccountApproval(event: Ty_EmailEvent): Promise<void> {
    if (!isAccountApprovalEvent(event)) {
      throw new Error('Malformed ACCOUNT_APPROVAL event');
    }

    const { userName } = event.data;
    const loginUrl = event.data.loginUrl ?? `${environment.frontendUrl}/login`;

    const mailOption: In_MailOptions = {
      to: event.to,
      subject: 'Your Account Has Been Approved',
      template: 'approval-account',
      context: {
        userName,
        loginUrl,
        approvedAt: event.data.approvedAt ?? new Date(),
        recipientEmail: event.to,
        appName: environment.appName,
        appUrl: environment.frontendUrl,
      },
    };
    await smtpMail.sendMail(mailOption);
  }
}

export default EmailSubscriber.getInstance();
