/**
 * Central configuration export
 *
 * This file exports all configuration modules as a single point of access
 * for the entire application.
 */

import env from '@config/env.config';
import databaseConfig, { AppDataSource } from '@config/database.config';
import redisConfig from '@config/redis.config';
import rabbitmqConfig from '@config/rabbitmq.config';
import swaggerConfig from '@docs/swagger';

/**
 * Configuration class that manages all system configurations
 */
class Config {
  private static instance: Config;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Initialize all configurations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Configuration already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing application configurations...');
      console.log(`env: ${env.nodeEnv}`);
      console.log(`App Name: ${env.appName}`);
      console.log(`App URL: ${env.appUrl}`);
      console.log('─────────────────────────────────────────');

      // Initialize database connection
      console.log('📦 Connecting to database...');
      await databaseConfig.connect();

      // Initialize Redis connection
      console.log('📦 Connecting to Redis...');
      await redisConfig.connect();

      // Initialize RabbitMQ connection
      console.log('📦 Connecting to RabbitMQ...');
      await rabbitmqConfig.connect();

      console.log('─────────────────────────────────────────');
      console.log('✅ All configurations initialized successfully');

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize configurations:', error);
      throw error;
    }
  }

  /**
   * Shutdown all connections gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down application gracefully...');
      console.log('─────────────────────────────────────────');

      // Disconnect from RabbitMQ
      if (rabbitmqConfig.isConnected()) {
        console.log('📦 Disconnecting from RabbitMQ...');
        await rabbitmqConfig.disconnect();
      }

      // Disconnect from Redis
      if (redisConfig.isConnected()) {
        console.log('📦 Disconnecting from Redis...');
        await redisConfig.disconnect();
      }

      // Disconnect from database
      if (databaseConfig.isConnected()) {
        console.log('📦 Disconnecting from database...');
        await databaseConfig.disconnect();
      }

      console.log('─────────────────────────────────────────');
      console.log('✅ Application shutdown completed');

      this.initialized = false;
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get health status of all services
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      database: any;
      redis: any;
      rabbitmq: any;
    };
  }> {
    const [databaseHealth, redisHealth, rabbitmqHealth] = await Promise.all([
      databaseConfig.getHealthStatus().catch(() => ({
        status: 'unhealthy' as const,
        details: { message: 'Failed to check database health' },
      })),
      redisConfig.getHealthStatus().catch(() => ({
        status: 'unhealthy' as const,
        details: { message: 'Failed to check Redis health' },
      })),
      rabbitmqConfig.getHealthStatus().catch(() => ({
        status: 'unhealthy' as const,
        details: { message: 'Failed to check RabbitMQ health' },
      })),
    ]);

    // Determine overall status
    const services = {
      database: databaseHealth,
      redis: redisHealth,
      rabbitmq: rabbitmqHealth,
    };

    const healthStatuses = Object.values(services).map((s) => s.status);
    const unhealthyCount = healthStatuses.filter(
      (s) => s === 'unhealthy'
    ).length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (unhealthyCount === 0) {
      overallStatus = 'healthy';
    } else if (unhealthyCount === healthStatuses.length) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    };
  }

  /**
   * Check if all services are initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get env configuration
   */
  public getEnv() {
    return env;
  }

  /**
   * Get database configuration
   */
  public getDatabase() {
    return databaseConfig;
  }

  /**
   * Get Redis configuration
   */
  public getRedis() {
    return redisConfig;
  }

  /**
   * Get RabbitMQ configuration
   */
  public getRabbitMQ() {
    return rabbitmqConfig;
  }

  /**
   * Get Swagger configuration
   */
  public getSwagger() {
    return swaggerConfig;
  }
}

// Export singleton instance
const config = Config.getInstance();

// Export individual configurations for direct access
export {
  env,
  databaseConfig,
  AppDataSource,
  redisConfig,
  rabbitmqConfig,
  swaggerConfig,
};

// Export main config instance
export default config;
