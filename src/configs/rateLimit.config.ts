import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisConfig from '@config/redis.config';
import { Request, Response } from 'express';
import apiResponse from '@utils/response.util';
import logger from '@utils/logger.util';

/**
 * Rate Limiter Configuration Interface
 */
interface RateLimiterConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Default rate limiter handler
 */
const defaultHandler = (req: Request, res: Response, message: string) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    userId: req.user?.id,
  });

  apiResponse.sendRateLimit(res, message);
};

/**
 * Create rate limiter with Redis store
 */
const createRateLimiter = (
  config: RateLimiterConfig
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - Known issue with types
      client: redisConfig.getClient(),
      prefix: 'rate_limit:',
    }),
    keyGenerator:
      config.keyGenerator ||
      ((req: Request): string => {
        return req.user?.id || req.ip || 'unknown';
      }),
    handler: (req: Request, res: Response) => {
      defaultHandler(
        req,
        res,
        config.message || 'Too many requests. Please try again later.'
      );
    },
    skip: config.skip,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
  });
};

/**
 * Rate Limiter Presets
 */
export const RateLimiters = {
  /**
   * CRITICAL: Reservation Creation
   * Prevents abuse of reservation system
   *
   * Limit: 5 requests per minute per user
   * Exempt: Admin users
   */
  reservationCreation: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message:
      'Too many reservation attempts. Please wait 1 minute before trying again.',
    skipFailedRequests: false, // Count failed attempts too
    skip: (req: Request): boolean => {
      // Skip rate limiting for admin users
      return req.user?.roles?.includes('admin') || false;
    },
  }),

  /**
   * Reservation Checkout
   * Prevents rapid checkout attempts
   *
   * Limit: 10 requests per minute per user
   * Exempt: Admin users
   */
  reservationCheckout: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many checkout attempts. Please wait before trying again.',
    skipSuccessfulRequests: true, // Only count failed attempts
    skip: (req: Request): boolean => {
      return req.user?.roles?.includes('admin') || false;
    },
  }),

  /**
   * Reservation Cancellation
   * Limit: 10 requests per minute per user
   */
  reservationCancellation: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many cancellation attempts. Please wait before trying again.',
  }),

  /**
   * General API Access
   * Broad protection against API abuse
   *
   * Limit: 100 requests per 15 minutes per IP
   */
  generalApi: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP. Please try again later.',
    keyGenerator: (req: Request): string => {
      return req.ip || 'unknown';
    },
  }),

  /**
   * Authentication Endpoints
   * Strict limiting to prevent brute force attacks
   *
   * Limit: 5 requests per 15 minutes per IP
   */
  authentication: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message:
      'Too many authentication attempts. Please try again after 15 minutes.',
    keyGenerator: (req: Request): string => {
      // Use IP for auth endpoints to prevent account enumeration
      return req.ip || 'unknown';
    },
    skipSuccessfulRequests: true, // Only count failed login attempts
  }),

  /**
   * Password Reset
   * Prevents abuse of password reset functionality
   *
   * Limit: 3 requests per hour per IP
   */
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts. Please try again after 1 hour.',
    keyGenerator: (req: Request): string => {
      return req.ip || 'unknown';
    },
  }),

  /**
   * Item Creation (Admin)
   * Prevent accidental or malicious bulk creation
   *
   * Limit: 20 requests per minute per admin
   */
  itemCreation: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many item creation requests. Please slow down.',
  }),

  /**
   * Search/Query Endpoints
   * Prevent expensive query abuse
   *
   * Limit: 30 requests per minute per user
   */
  search: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests. Please wait before searching again.',
  }),

  /**
   * File Upload
   * Limit file upload requests
   *
   * Limit: 10 requests per 5 minutes per user
   */
  fileUpload: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many file uploads. Please wait before uploading again.',
  }),
};

/**
 * Custom rate limiter factory
 * For creating custom rate limiters on the fly
 */
export const createCustomRateLimiter = (
  name: string,
  config: RateLimiterConfig
): RateLimitRequestHandler => {
  logger.info('Creating custom rate limiter', { name, config });
  return createRateLimiter(config);
};

/**
 * Rate limit middleware that applies to multiple endpoints
 */
export const applyRateLimiters = {
  /**
   * Apply to all reservation endpoints
   */
  reservation: [RateLimiters.generalApi, RateLimiters.reservationCreation],

  /**
   * Apply to all auth endpoints
   */
  auth: [RateLimiters.authentication],

  /**
   * Apply to admin endpoints
   */
  admin: [RateLimiters.generalApi],
};

/**
 * Global rate limiter for entire application
 * This is a last line of defense against DDoS
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute per IP
  message: 'Too many requests from this IP. Please try again later.',
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
});

/**
 * Check rate limit status (for monitoring)
 */
export const getRateLimitStatus = async (key: string): Promise<any> => {
  try {
    const data = await (await redisConfig.connect()).get(`rate_limit:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Failed to get rate limit status', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

/**
 * Reset rate limit for a specific key (admin action)
 */
export const resetRateLimit = async (key: string): Promise<boolean> => {
  try {
    await (await redisConfig.connect()).del(`rate_limit:${key}`);
    logger.info('Rate limit reset', { key });
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

export default RateLimiters;
