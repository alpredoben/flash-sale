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

  public getDataSourceOptions(): DataSourceOptions {
    const data: DataSourceOptions = {
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
      ssl: env.isProduction() ? { rejectUnauthorized: false } : false,
      extra: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    };
    return data;
  }

  /**
   * Initialize database connection
   */
  public async connect(): Promise<DataSource> {
    try {
      // Jika sudah terkoneksi, kembalikan yang ada
      if (this.dataSource && this.dataSource.isInitialized) {
        return this.dataSource;
      }

      // Gunakan getDataSource untuk memastikan instance tersedia
      const ds = this.getDataSource();

      if (!ds.isInitialized) {
        await ds.initialize();
      }

      logger.info('✅ Database connection established successfully');
      await this.testConnection();
      return ds;
    } catch (error) {
      logger.error('❌ Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get DataSource instance
   * DIPERBAIKI: Tidak melempar error jika belum terkoneksi,
   * agar Repository bisa mengambil referensi objeknya saat startup.
   */
  public getDataSource(): DataSource {
    if (!this.dataSource) {
      // Buat instance baru jika belum ada, tapi jangan panggil .initialize() di sini
      this.dataSource = new DataSource(this.getDataSourceOptions());
    }
    return this.dataSource;
  }

  public isConnected(): boolean {
    return this.dataSource !== null && this.dataSource.isInitialized;
  }

  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      // Jangan gunakan isConnected() agar detail error lebih informatif
      if (!this.dataSource) {
        return {
          status: 'unhealthy',
          details: { message: 'DataSource instance not created' },
        };
      }

      if (!this.dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          details: { message: 'Database not initialized' },
        };
      }

      await this.dataSource.query('SELECT 1');
      const driver = this.dataSource.driver as any;

      return {
        status: 'healthy',
        details: {
          host: env.dbHost,
          database: env.dbDatabase,
          poolSize: driver.master?.pool?.totalCount || 0,
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

  // ... (Method disconnect, runMigrations, dll tetap sama)
  public async disconnect(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
  }

  private async testConnection(): Promise<void> {
    if (this.dataSource) await this.dataSource.query('SELECT 1');
  }
}

const databaseConfig = DatabaseConfig.getInstance();
export default databaseConfig;

export const AppDataSource = databaseConfig.getDataSource();
