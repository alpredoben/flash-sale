// src/shared/middlewares/requestLogger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '@utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests with timing information
 */
class LoggerMiddleware {
  private static instance: LoggerMiddleware;

  private constructor() {}

  public static getInstance(): LoggerMiddleware {
    if (!LoggerMiddleware.instance) {
      LoggerMiddleware.instance = new LoggerMiddleware();
    }
    return LoggerMiddleware.instance;
  }

  /**
   * Main request logger middleware
   */
  public logRequest = (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID
    const requestId = uuidv4();
    req.headers['x-request-id'] = requestId;

    // Record start time
    const startTime = Date.now();

    // Get request information
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = (req as any).user?.id || 'Anonymous';

    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method,
      url: originalUrl,
      ip: this.getClientIp(req),
      userAgent,
      userId,
      query: req.query,
      body: this.sanitizeBody(req.body),
    });

    // Override res.json to log response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log response
      logger.info('Outgoing response', {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        userId,
      });

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          requestId,
          method,
          url: originalUrl,
          duration: `${duration}ms`,
        });
      }

      return originalJson(body);
    };

    // Handle response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logData = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        path: req.path,
        ip: this.getClientIp(req),
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
        userId,
      };

      // Log error responses
      if (res.statusCode >= 500) {
        logger.error('Request completed with server error', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('Request completed with client error', logData);
      } else {
        logger.http('Request completed successfully', logData);
      }
    });

    next();
  };

  /**
   * Get real client IP address
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0]?.trim() || req.ip || 'Unknown';
    }
    return (
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.ip ||
      'Unknown'
    );
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'confirmPassword',
      'currentPassword',
      'newPassword',
      'token',
      'refreshToken',
      'accessToken',
      'apiKey',
      'secret',
      'creditCard',
      'cvv',
      'ssn',
    ];

    const sanitized = { ...body };

    // Recursively sanitize nested objects
    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      const result: any = Array.isArray(obj) ? [] : {};

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();

          // Check if field is sensitive
          const isSensitive = sensitiveFields.some((field) =>
            lowerKey.includes(field.toLowerCase())
          );

          if (isSensitive) {
            result[key] = '***REDACTED***';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            result[key] = sanitizeObject(obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Log API metrics (optional middleware)
   */
  public logMetrics = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      // Log metrics
      logger.debug('API Metrics', {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      });
    });

    next();
  };

  /**
   * Error logger middleware
   */
  public logError = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const requestId = req.headers['x-request-id'] as string;
    const { method, originalUrl } = req;
    const userId = (req as any).user?.id || 'Anonymous';

    logger.error('Request error', {
      requestId,
      method,
      url: originalUrl,
      userId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    });

    next(err);
  };

  /**
   * Skip logging for specific paths (health checks, etc.)
   */
  public skipLogging = (paths: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const shouldSkip = paths.some((path) => req.originalUrl.includes(path));

      if (shouldSkip) {
        return next();
      }

      return this.logRequest(req, res, next);
    };
  };
}

// Export singleton instance
const requestLogger = LoggerMiddleware.getInstance();

export default requestLogger.logRequest;
export { LoggerMiddleware, requestLogger };
