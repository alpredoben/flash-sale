import 'reflect-metadata';

import express, { Application, Request, Response, NextFunction } from 'express';

import swaggerUi from 'swagger-ui-express';
import config, { environment } from '@config/index';
import { getSwaggerSpec, getSwaggerUIOptions } from '@docs/swagger';

import logger from '@utils/logger.util';
import appMiddleware from '@/shared/middlewares/app.middleware';
import lang from '@lang/index';
import morgan from 'morgan';
import loggerMiddleware from '@middlewares/logger.middleware';
import rateLimiterMiddleware from './shared/middlewares/rateLimiter.middleware';
import apiResponse from '@utils/response.util';
import apiRoute from '@routes/index';
import errorMiddleware from '@middlewares/error.middleware';
import expiredReservationJob from '@jobs/expired-reservation.job';
import queueProcessor from '@queue/processor.queue';

class ApplicationServer {
  private app: Application;
  private port: number;
  private isShuttingDown: boolean = false;
  private httpServer: any;

  constructor() {
    this.app = express();
    this.port = environment.appPort;
  }

  /** Initialize server component */
  public async initialize(): Promise<void> {
    try {
      // Initialize Language
      this.setupLanguage();

      // Initialize Configuration
      await this.setupConfig();

      // Initialize Middleware
      this.setupMiddleware();

      // Initialize Health Endpoint
      this.setupHealthEndpoint();

      // Initialize Root Endpoint
      this.setupRootEndpoint();

      // Initialize API Route
      this.setupApiRoute();

      // Initialize Error Handler
      this.setupErrorHandling();

      // Initialize Cron Job
      await this.setupJob();

      // Initialize Queue Listener
      await this.setupQueue();

      // Setup Graceful Shutdown
      this.setupGracefulShutdown();

      logger.info('✅ Server initialization completed successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }

  /** Language */
  public setupLanguage() {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (req?.headers?.lang) {
        const local: string | any = req?.headers?.lang;
        lang.setLocale(local);
      } else {
        lang.setLocale(environment.appLang);
        req.headers.lang = environment.appLang;
      }
      next();
    };
  }

  /** Configuration */
  private async setupConfig(): Promise<void> {
    try {
      await config.initialize();
    } catch (error) {
      logger.error('Configuration initialization failed', error);
      throw error;
    }
  }

  /** Middleware */
  private setupMiddleware(): void {
    logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Middleware 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

    // Security Headers
    this.app.use(appMiddleware.helmet());

    // Cors Configuration
    this.app.use(appMiddleware.cors());

    // Whitelist
    this.app.use(appMiddleware.hpp());

    // Compression
    this.app.use(appMiddleware.compression());

    // Body Parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie Parser
    this.app.use(appMiddleware.cookie());

    // Custom Headers
    this.app.use(appMiddleware.customHeaders);

    // Prevent information disclosure
    this.app.use(appMiddleware.preventInfoDisclosure);

    // Request ID for tracking
    this.app.use(appMiddleware.addRequestId);

    // API Version Headers
    this.app.use(appMiddleware.addApiVersion);

    // Request logger
    if (environment.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }
    this.app.use(loggerMiddleware);

    // Rate limiting (global)
    this.app.use(rateLimiterMiddleware.generalApiLimiter);

    // Trust proxy (if behind a proxy/load balancer)
    this.app.set('trust proxy', 1);

    logger.info('✅ Middlewares setup completed');
  }

  /** Health Endpoint */
  private setupHealthEndpoint(): void {
    logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Health Endpoint 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');
    this.app.get('/health', async (_req: Request, res: Response) => {
      try {
        const healthStatus = await config.getHealthStatus();
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

        return apiResponse.sendSuccess(res, 'Health check success', {
          healthStatus,
          statusCode,
        });
      } catch (error) {
        return apiResponse.sendError(
          res,
          503,
          'Health check failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });

    logger.info('✅ Health endpoint setup completed');
  }

  /** Root Endpoint */
  private setupRootEndpoint(): void {
    logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Root Endpoint 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

    this.app.get('/', (req: Request, res: Response) => {
      const payload: Record<string, any> = {
        name: environment.appName,
        version: environment.apiVersion,
        environment: environment.nodeEnv,
        docs: `${environment.appUrl}/api-docs`,
        clientIp: req.ip,
      };
      const message: string = 'Welcome to Flash Sale API';
      return apiResponse.sendSuccess(res, message, payload);
    });

    const swaggerSpec = getSwaggerSpec(environment);
    const uiOptions = getSwaggerUIOptions(environment);

    if (environment.nodeEnv !== 'production') {
      this.app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
          explorer: true,
          ...uiOptions,
        })
      );

      logger.info(
        `📚 Swagger documentation available at ${environment.appUrl}/api-docs`
      );
    }

    logger.info('✅ Root endpoint setup completed');
  }

  /** API Route */
  private setupApiRoute(): void {
    logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup API Route 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');
    this.app.use('/api/v1', apiRoute);

    logger.info('✅ API route setup completed');
  }

  /** Error Handling */
  private setupErrorHandling(): void {
    logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Error Handling 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

    this.app.use(errorMiddleware.handle);

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      });

      // Activate shutdown gracefully on production
      if (environment.nodeEnv === 'production') {
        this.shutdown();
      }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
      });

      // Shutdown gracefully
      this.shutdown();
    });

    logger.info('✅ Error handling setup completed');
  }

  /** Job */
  private async setupJob(): Promise<void> {
    try {
      logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Background Cron Job 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

      await expiredReservationJob.start();

      logger.info('✅ Cron job initialize successfully on background');
    } catch (error) {
      logger.error('Failed to initialize background jobs:', error);
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info('🛑🛑🛑 Starting graceful shutdown 🛑🛑🛑');

    try {
      // Stop accepting new requests
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer.close(() => {
            logger.info('✅ HTTP server closed');
            resolve();
          });
        });
      }

      // Stop background jobs
      logger.info('📦 Stopping background jobs...');
      await expiredReservationJob.stop();

      // Stop queue processors
      logger.info('📦 Stopping queue processors...');
      await queueProcessor.stopProcessing();

      // Close all configurations (Database, Redis, RabbitMQ)
      logger.info('📦 Closing configuration connections...');
      await config.shutdown();

      logger.info('✅ Now Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  private async setupQueue(): Promise<void> {
    try {
      logger.info('🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️ Setup Queue Processing 🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️');

      await queueProcessor.startProcessing();

      logger.info('✅ Queue processing initialize successfully on background');
    } catch (error) {
      logger.error('Failed to initialize queue processors:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    // SIGTERM signal
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received');
      this.shutdown();
    });

    // SIGINT signal (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT signal received');
      this.shutdown();
    });

    // SIGUSR2 signal (nodemon restart)
    process.once('SIGUSR2', () => {
      logger.info('SIGUSR2 signal received (nodemon restart)');
      this.shutdown();
    });
  }

  public async startApp(): Promise<void> {
    try {
      // Initialize server
      await this.initialize();

      // Start HTTP server
      this.httpServer = this.app.listen(this.port, () => {
        logger.info('─────────────────────────────────────────');
        logger.info(`🚀 ${environment.appName} v${environment.apiVersion}`);
        logger.info(`📡 Server running on: ${environment.appUrl}`);
        logger.info(`🌍 Environment: ${environment.nodeEnv}`);
        logger.info(`📊 Process ID: ${process.pid}`);
        logger.info('─────────────────────────────────────────');
        logger.info('✅ Server is ready to accept connections');
        logger.info('─────────────────────────────────────────');
      });

      // Handle server errors
      this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

const server = new ApplicationServer();

if (environment.nodeEnv !== 'test') {
  server.startApp().catch((error) => {
    logger.error('Fatal error during server startup', error);
    process.exit(1);
  });
}

export default server;
export { ApplicationServer };
