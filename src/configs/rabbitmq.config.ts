import amqp, { Channel, ConsumeMessage, ChannelModel } from 'amqplib';

import env from '@config/env.config';
import logger from '@utils/logger.util';

export interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: any;
}

export interface ExchangeOptions {
  type?: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: any;
}

class RabbitMQConfig {
  private static instance: RabbitMQConfig;

  /** amqplib.connect() returns ChannelModel */
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectInterval = 5000;

  private activeConsumers: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): RabbitMQConfig {
    if (!RabbitMQConfig.instance) {
      RabbitMQConfig.instance = new RabbitMQConfig();
    }
    return RabbitMQConfig.instance;
  }

  /**
   * Build RabbitMQ connection URL
   */
  private getConnectionUrl(): string {
    const {
      rabbitmqUser,
      rabbitmqPassword,
      rabbitmqHost,
      rabbitmqPort,
      rabbitmqVhost,
    } = env;

    return `amqp://${rabbitmqUser}:${rabbitmqPassword}@${rabbitmqHost}:${rabbitmqPort}${rabbitmqVhost}`;
  }

  /**
   * Initialize RabbitMQ connection
   */
  public async connect(): Promise<void> {
    if (this.isConnecting) return;
    if (this.connection && this.channel) return;

    this.isConnecting = true;

    try {
      const url = this.getConnectionUrl();

      logger.info('Connecting to RabbitMQ...');

      this.connection = await amqp.connect(url, {
        heartbeat: 60,
        timeout: 10000,
      });

      logger.info('Creating RabbitMQ channel...');
      this.channel = await this.connection.createChannel();

      await this.channel.prefetch(1);

      this.setupEventHandlers();

      await this.createExchange(env.rabbitmqExchange, {
        type: 'topic',
        durable: true,
      });

      logger.info('✅ RabbitMQ connected successfully');
    } catch (error) {
      logger.error('❌ RabbitMQ connection failed', {
        error: error instanceof Error ? error.message : error,
      });

      this.scheduleReconnect();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection || !this.channel) return;

    this.connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      this.connection = null;
      this.channel = null;
      this.scheduleReconnect();
    });

    this.channel.on('error', (err) => {
      logger.error('RabbitMQ channel error', { error: err.message });
    });

    this.channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
      this.channel = null;
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(async () => {
      try {
        logger.info('Reconnecting to RabbitMQ...');
        await this.connect();
      } catch {}
    }, this.reconnectInterval);
  }

  public getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  /**
   * Get health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          details: { message: 'RabbitMQ not connected' },
        };
      }

      return {
        status: 'healthy',
        details: {
          connected: true,
          host: env.rabbitmqHost,
          port: env.rabbitmqPort,
          vhost: env.rabbitmqVhost,
          exchange: env.rabbitmqExchange,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Exchange
   */
  public async createExchange(
    exchangeName: string,
    options: ExchangeOptions = {}
  ): Promise<void> {
    const channel = this.getChannel();

    await channel.assertExchange(exchangeName, options.type ?? 'topic', {
      durable: true,
      autoDelete: false,
      internal: false,
      ...options,
    });
  }

  /**
   * Queue
   */
  public async createQueue(
    queueName: string,
    options: QueueOptions = {}
  ): Promise<void> {
    await this.getChannel().assertQueue(queueName, {
      durable: true,
      autoDelete: false,
      exclusive: false,
      ...options,
    });
  }

  public async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string
  ): Promise<void> {
    await this.getChannel().bindQueue(queue, exchange, routingKey);
  }

  /**
   * Publish
   */
  public publish(
    routingKey: string,
    message: any,
    options: {
      exchange?: string;
      persistent?: boolean;
      headers?: any;
    } = {}
  ): boolean {
    const channel = this.getChannel();

    return channel.publish(
      options.exchange ?? env.rabbitmqExchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: options.persistent !== false,
        contentType: 'application/json',
        timestamp: Date.now(),
        headers: options.headers,
      }
    );
  }

  /** Consume messages with advanced options like prefetch */
  public async subscribe(
    queue: string,
    handler: (data: any, raw: ConsumeMessage) => Promise<void>,
    options: { noAck?: boolean; prefetch?: number } = {}
  ): Promise<string> {
    const channel = this.getChannel();

    // Set prefetch if existed (Flow Control)
    if (options.prefetch) {
      await channel.prefetch(options.prefetch);
    }

    const consumeResult = await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload, msg);
          if (!options.noAck) {
            this.channel!.ack(msg);
          }
        } catch (err) {
          logger.error('Consumer error', { error: err });
          if (!options.noAck) {
            channel!.nack(msg, false, true);
          }
        }
      },
      { noAck: options.noAck ?? false }
    );

    this.activeConsumers.set(queue, consumeResult.consumerTag);
    return consumeResult.consumerTag;
  }

  /**
   * Disconnect
   */
  public async disconnect(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();

    this.channel = null;
    this.connection = null;
  }

  public isConnected(): boolean {
    return !!this.connection && !!this.channel;
  }

  /** Consume messages with advanced options like prefetch */
  public async consume(
    queue: string,
    handler: (data: any, raw: ConsumeMessage) => Promise<void>,
    options: { noAck?: boolean; prefetch?: number } = {}
  ): Promise<string> {
    const channel = this.getChannel();

    // Set prefetch if existed (Flow Control)
    if (options.prefetch) {
      await channel.prefetch(options.prefetch);
    }

    const consumeResult = await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload, msg);
          if (!options.noAck) {
            channel.ack(msg);
          }
        } catch (err) {
          logger.error('Consumer error', { queue, error: err });
          if (!options.noAck) {
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: options.noAck ?? false }
    );
    this.activeConsumers.set(queue, consumeResult.consumerTag);
    return consumeResult.consumerTag;
  }

  /** Stop new consume */
  public async stopConsume(queue: string): Promise<void> {
    const consumerTag = this.activeConsumers.get(queue);

    if (!consumerTag) {
      logger.warn(`No active consumer found for queue: ${queue}`);
      return;
    }

    try {
      const channel = this.getChannel();
      await channel.cancel(consumerTag);

      // Remove from active consumer
      this.activeConsumers.delete(queue);

      logger.info(
        `Successfully stopped consumer for queue: ${queue} (Tag: ${consumerTag})`
      );
    } catch (error) {
      logger.error(`Failed to cancel consumer for queue: ${queue}`, {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

export default RabbitMQConfig.getInstance();
