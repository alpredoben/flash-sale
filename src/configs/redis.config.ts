import Redis, { RedisOptions } from 'ioredis';
import env from '@config/env.config';
import logger from '@utils/logger.util';

class RedisConfig {
  private static instance: RedisConfig;
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  private getRedisOptions(): RedisOptions {
    const options: RedisOptions = {
      host: env.redisHost,
      port: env.redisPort,
      db: env.redisDb,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      lazyConnect: false,
      keepAlive: 30000,
      family: 4,
      reconnectOnError: (err) => {
        if (err.message.includes('READONLY')) {
          logger.error('Redis reconnect on READONLY error');
          return true;
        }
        return false;
      },
    };

    if (env.redisPassword) {
      options.password = env.redisPassword;
    }

    return options;
  }

  public async connect(): Promise<Redis> {
    try {
      const client = this.getClient();

      if (client.status === 'ready') {
        return client;
      }

      await new Promise<void>((resolve, reject) => {
        client.once('ready', resolve);
        client.once('error', reject);
      });

      await this.testConnection();
      return client;
    } catch (error) {
      logger.error('❌ Redis connection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.getRedisOptions());
      this.setupEventHandlers(this.client, 'Main Client');
    }
    return this.client;
  }

  // --- Fungsi yang dibutuhkan oleh index.ts ---

  /**
   * Mengecek apakah client sudah terinisialisasi dan siap
   */
  public isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Memberikan detail status kesehatan untuk Config.getHealthStatus()
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      // Jika instance client saja belum ada
      if (!this.client) {
        return {
          status: 'unhealthy',
          details: { message: 'Redis instance not created' },
        };
      }

      // Jika sedang menyambung tapi belum ready
      if (this.client.status !== 'ready') {
        return {
          status: 'unhealthy',
          details: {
            status: this.client.status,
            message: 'Redis is not ready',
          },
        };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      const info = await this.client.info();
      const serverInfo: any = {};
      info.split('\r\n').forEach((line) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) serverInfo[key.trim()] = value.trim();
        }
      });

      return {
        status: 'healthy',
        details: {
          host: env.redisHost,
          port: env.redisPort,
          latency: `${latency}ms`,
          version: serverInfo.redis_version,
          connectedClients: serverInfo.connected_clients,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // --- Fungsi lainnya ---

  public async disconnect(): Promise<void> {
    const promises: Promise<any>[] = [];
    if (this.client) promises.push(this.client.quit());
    if (this.subscriber) promises.push(this.subscriber.quit());
    if (this.publisher) promises.push(this.publisher.quit());

    await Promise.all(promises);
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    logger.info('✅ Redis connections closed');
  }

  private setupEventHandlers(client: Redis, name: string): void {
    client.on('connect', () => logger.info(`Redis ${name} connecting...`));
    client.on('ready', () => logger.info(`Redis ${name} ready`));
    client.on('error', (err) =>
      logger.error(`Redis ${name} error: ${err.message}`)
    );
  }

  private async testConnection(): Promise<void> {
    const pong = await this.client?.ping();
    if (pong !== 'PONG') throw new Error('Redis Ping Failed');
  }
}

export default RedisConfig.getInstance();
