import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import env from './env.config';
import logger from '../shared/utils/logger.util';

class DatabaseConfig {
  private static instance: DatabaseConfig;
  private dataSource: DataSource | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  /**
   * Get TypeORM DataSource configuration
   */
  public getDataSourceOptions(): DataSourceOptions {
    const baseOptions: DataSourceOptions = {
      type: 'postgres',
      host: env.dbHost,
      port: env.dbPort,
      username: env.dbUsername,
      password: env.dbPassword,
      database: env.dbDatabase,
      synchronize: env.dbSynchronize,
      logging: env.dbLogging,
      entities: [join(__dirname, '../database/models/**/*.model{.ts,.js}')],
      migrations: [join(__dirname, '../database/migrations/**/*{.ts,.js}')],
      subscribers: [],
      migrationsTableName: 'migrations',
      ssl: env.isProduction()
        ? {
            rejectUnauthorized: false,
          }
        : false,
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
      poolSize: 10,
      connectTimeoutMS: 5000,
      maxQueryExecutionTime: 5000, // Log queries that take more than 5 seconds
    };

    return baseOptions;
  }

  public async connect(): Promise<DataSource> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        logger.info('Database already connected');
        return this.dataSource;
      }

      const options = this.getDataSourceOptions();
      this.dataSource = new DataSource(options);

      await this.dataSource.initialize();

      logger.info('✅ Database connection established successfully', {
        host: env.dbHost,
        database: env.dbDatabase,
        port: env.dbPort,
      });

      // Test the connection
      await this.testConnection();

      return this.dataSource;
    } catch (error) {
      logger.error('❌ Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: env.dbHost,
        database: env.dbDatabase,
      });
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.dataSource) {
      throw new Error('DataSource not initialized');
    }

    try {
      await this.dataSource.query('SELECT 1');
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.dataSource;
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.dataSource = null;
        logger.info('✅ Database connection closed successfully');
      }
    } catch (error) {
      logger.error('❌ Error closing database connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        await this.connect();
      }

      logger.info('Running database migrations...');
      const migrations = await this.dataSource!.runMigrations({
        transaction: 'all',
      });

      if (migrations.length === 0) {
        logger.info('No pending migrations to run');
      } else {
        logger.info(`✅ Successfully ran ${migrations.length} migration(s)`, {
          migrations: migrations.map((m) => m.name),
        });
      }
    } catch (error) {
      logger.error('❌ Failed to run migrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async revertMigration(): Promise<void> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        await this.connect();
      }

      logger.info('Reverting last migration...');
      await this.dataSource!.undoLastMigration({
        transaction: 'all',
      });
      logger.info('✅ Successfully reverted last migration');
    } catch (error) {
      logger.error('❌ Failed to revert migration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.dataSource !== null && this.dataSource.isInitialized;
  }

  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          details: { message: 'Database not connected' },
        };
      }

      // Test query
      await this.dataSource!.query('SELECT 1');

      // Get pool status
      const driver = this.dataSource!.driver as any;
      const poolSize = driver.master?.pool?.totalCount || 0;
      const idleConnections = driver.master?.pool?.idleCount || 0;

      return {
        status: 'healthy',
        details: {
          connected: true,
          host: env.dbHost,
          database: env.dbDatabase,
          poolSize,
          idleConnections,
          activeConnections: poolSize - idleConnections,
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

  public async clearDatabase(): Promise<void> {
    if (env.isProduction()) {
      throw new Error('Cannot clear database in production env');
    }

    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        await this.connect();
      }

      const entities = this.dataSource!.entityMetadatas;

      logger.warn('⚠️  Clearing database...');

      // Disable foreign key checks
      await this.dataSource!.query('SET session_replication_role = replica;');

      // Truncate all tables
      for (const entity of entities) {
        const repository = this.dataSource!.getRepository(entity.name);
        await repository.query(
          `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`
        );
      }

      // Re-enable foreign key checks
      await this.dataSource!.query('SET session_replication_role = DEFAULT;');

      logger.info('✅ Database cleared successfully');
    } catch (error) {
      logger.error('❌ Failed to clear database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getQueryRunner() {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not connected');
    }
    return this.dataSource.createQueryRunner();
  }
}

const databaseConfig = DatabaseConfig.getInstance();
export default databaseConfig;

export const AppDataSource = new DataSource(
  databaseConfig.getDataSourceOptions()
);
