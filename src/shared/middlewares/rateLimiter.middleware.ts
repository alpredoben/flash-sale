// src/shared/middlewares/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisConfig from '@config/redis.config';
import { Request, Response } from 'express';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';

class RateLimiterMiddleware {
  private static instance: RateLimiterMiddleware;

  private constructor() {}

  public static getInstance(): RateLimiterMiddleware {
    if (!RateLimiterMiddleware.instance) {
      RateLimiterMiddleware.instance = new RateLimiterMiddleware();
    }
    return RateLimiterMiddleware.instance;
  }

  /**
   * Rate limiter for reservation creation
   * Limit: 5 requests per minute per user
   */
  reservationCreationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new RedisStore({
      // @ts-expect-error - Known issue with @types/express-rate-limit
      client: redisConfig.getClient(),
      prefix: 'rate_limit:reservation:',
    }),
    keyGenerator: (req: Request): string => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded for reservation creation', {
        userId: req.user?.id,
        ip: req.ip,
      });
      apiResponse.sendRateLimit(
        res,
        lang.__('error.rate-limit.many-request', { name: 'reservation' })
      );
    },
    skip: (req: Request): boolean => {
      // Skip rate limiting for admin users
      return req.user?.roles?.includes('admin') || false;
    },
  });

  /**
   * Rate limiter for checkout
   * Limit: 10 requests per minute per user
   */
  checkoutLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - Known issue with @types/express-rate-limit
      client: redisConfig.getClient(),
      prefix: 'rate_limit:checkout:',
    }),
    keyGenerator: (req: Request): string => {
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded for checkout', {
        userId: req.user?.id,
        ip: req.ip,
      });
      apiResponse.sendRateLimit(
        res,
        lang.__('error.rate-limit.many-request', { name: 'checkout' })
      );
    },
    skip: (req: Request): boolean => {
      return req.user?.roles?.includes('admin') || false;
    },
  });

  /**
   * General API rate limiter
   * Limit: 100 requests per 15 minutes per IP
   */
  generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - Known issue with @types/express-rate-limit
      client: redisConfig.getClient(),
      prefix: 'rate_limit:general:',
    }),
    keyGenerator: (req: Request): string => {
      return req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('General rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      apiResponse.sendRateLimit(
        res,
        'Too many requests. Please try again later.'
      );
    },
  });

  /**
   * Strict rate limiter for authentication endpoints
   * Limit: 5 requests per 15 minutes per IP
   */
  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - Known issue with @types/express-rate-limit
      client: redisConfig.getClient(),
      prefix: 'rate_limit:auth:',
    }),
    keyGenerator: (req: Request): string => {
      return req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      apiResponse.sendRateLimit(
        res,
        'Too many authentication attempts. Please try again after 15 minutes.'
      );
    },
  });

  /**
   * Custom rate limiter factory
   */
  createCustomLimiter(options: {
    windowMs: number;
    max: number;
    prefix: string;
    message?: string;
    skipAdmin?: boolean;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - Known issue with @types/express-rate-limit
        client: redisConfig.getClient(),
        prefix: `rate_limit:${options.prefix}:`,
      }),
      keyGenerator: (req: Request): string => {
        return req.user?.id || req.ip || 'unknown';
      },
      handler: (req: Request, res: Response) => {
        logger.warn(`Rate limit exceeded for ${options.prefix}`, {
          userId: req.user?.id,
          ip: req.ip,
        });
        apiResponse.sendRateLimit(
          res,
          options.message || 'Too many requests. Please try again later.'
        );
      },
      skip: options.skipAdmin
        ? (req: Request): boolean => {
            return req.user?.roles?.includes('admin') || false;
          }
        : undefined,
    });
  }
}

export default RateLimiterMiddleware.getInstance();
