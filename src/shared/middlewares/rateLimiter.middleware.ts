import rateLimit from 'express-rate-limit';
import RedisStore, { RedisReply } from 'rate-limit-redis';
import redisConfig from '@config/redis.config';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';
import lang from '@lang/index';
import { Request, Response } from 'express';

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
   * Helper untuk membuat sendCommand yang type-safe untuk ioredis
   */
  private redisSender = async (...args: string[]): Promise<RedisReply> => {
    const result = await redisConfig
      .getClient()
      .call(args[0]!, ...args.slice(1));
    return result as RedisReply;
  };

  /**
   * Rate limiter untuk pembuatan reservasi
   */
  reservationCreationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    // DIPERBAIKI: Matikan validasi IPv6 untuk menghindari ERR_ERL_KEY_GEN_IPV6
    validate: false,
    store: new RedisStore({
      sendCommand: this.redisSender,
      prefix: 'rate_limit:reservation:',
    }),
    keyGenerator: (req: Request): string => {
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
      return req.user?.roles?.includes('admin') || false;
    },
  });

  /**
   * General API rate limiter
   */
  generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // DIPERBAIKI
    store: new RedisStore({
      sendCommand: this.redisSender,
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
   * Rate limiter ketat untuk autentikasi
   */
  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // DIPERBAIKI
    store: new RedisStore({
      sendCommand: this.redisSender,
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
   * Factory untuk custom rate limiter
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
      validate: false, // DIPERBAIKI
      store: new RedisStore({
        sendCommand: this.redisSender,
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
