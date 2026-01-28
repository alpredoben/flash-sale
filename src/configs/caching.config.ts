import { In_CacheOptions } from '@interfaces/util.interface';
import redisConfig from '@config/redis.config';
import logger from '@utils/logger.util';

class Caching {
  private static instance: Caching;
  private defaultTTL: number = 3600; // 1 hour
  private defaultPrefix: string = 'cache:';

  private constructor() {}

  public static getInstance(): Caching {
    if (!Caching.instance) {
      Caching.instance = new Caching();
    }
    return Caching.instance;
  }

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.defaultPrefix;
    return `${finalPrefix}${key}`;
  }

  public async set<T>(
    key: string,
    value: T,
    options?: In_CacheOptions
  ): Promise<void> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;

      const serialized = JSON.stringify(value);
      await redis.setex(cacheKey, ttl, serialized);

      logger.debug('Cache set', {
        key: cacheKey,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to set cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
    }
  }

  public async get<T>(
    key: string,
    options?: In_CacheOptions
  ): Promise<T | null> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      const cached = await redis.get(cacheKey);

      if (!cached) {
        logger.debug('Cache miss', { key: cacheKey });
        return null;
      }

      logger.debug('Cache hit', { key: cacheKey });
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Failed to get cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return null;
    }
  }

  public async del(key: string, options?: In_CacheOptions): Promise<void> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      await redis.del(cacheKey);

      logger.debug('Cache deleted', { key: cacheKey });
    } catch (error) {
      logger.error('Failed to delete cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
    }
  }

  public async exists(
    key: string,
    options?: In_CacheOptions
  ): Promise<boolean> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      const result = await redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache existence', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return false;
    }
  }

  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: In_CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key, options);

      if (cached !== null) {
        return cached;
      }

      // Fetch data
      const data = await fetchFn();

      // Store in cache
      await this.set(key, data, options);

      return data;
    } catch (error) {
      logger.error('Failed to get or set cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      // Fallback to fetching data
      return fetchFn();
    }
  }

  public async delPattern(
    pattern: string,
    options?: In_CacheOptions
  ): Promise<number> {
    try {
      const redis = redisConfig.getClient();
      const prefix = options?.prefix || this.defaultPrefix;
      const searchPattern = `${prefix}${pattern}`;

      const keys = await redis.keys(searchPattern);

      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);

      logger.debug('Cache pattern deleted', {
        pattern: searchPattern,
        count: keys.length,
      });

      return keys.length;
    } catch (error) {
      logger.error('Failed to delete cache pattern', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pattern,
      });
      return 0;
    }
  }

  public async incr(key: string, options?: In_CacheOptions): Promise<number> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      const value = await redis.incr(cacheKey);

      if (options?.ttl) {
        await redis.expire(cacheKey, options.ttl);
      }

      return value;
    } catch (error) {
      logger.error('Failed to increment cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return 0;
    }
  }

  public async decr(key: string, options?: In_CacheOptions): Promise<number> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      const value = await redis.decr(cacheKey);

      // Set expiration if provided
      if (options?.ttl) {
        await redis.expire(cacheKey, options.ttl);
      }

      return value;
    } catch (error) {
      logger.error('Failed to decrement cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return 0;
    }
  }

  public async getTTL(key: string, options?: In_CacheOptions): Promise<number> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      const ttl = await redis.ttl(cacheKey);
      return Math.max(0, ttl);
    } catch (error) {
      logger.error('Failed to get cache TTL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
      return 0;
    }
  }

  public async expire(
    key: string,
    ttl: number,
    options?: In_CacheOptions
  ): Promise<void> {
    try {
      const redis = redisConfig.getClient();
      const cacheKey = this.generateKey(key, options?.prefix);

      await redis.expire(cacheKey, ttl);

      logger.debug('Cache expiration set', {
        key: cacheKey,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to set cache expiration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
    }
  }

  public async cacheUser(
    userId: string,
    userData: any,
    ttl?: number
  ): Promise<void> {
    await this.set(`user:${userId}`, userData, {
      ttl: ttl || 1800, // 30 minutes
      prefix: 'auth:',
    });
  }

  public async getCachedUser(userId: string): Promise<any | null> {
    return this.get(`user:${userId}`, {
      prefix: 'auth:',
    });
  }

  public async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`, {
      prefix: 'auth:',
    });
  }

  public async cacheApiResponse(
    endpoint: string,
    response: any,
    ttl?: number
  ): Promise<void> {
    await this.set(endpoint, response, {
      ttl: ttl || 300, // 5 minutes
      prefix: 'api:',
    });
  }

  public async getCachedApiResponse(endpoint: string): Promise<any | null> {
    return this.get(endpoint, {
      prefix: 'api:',
    });
  }

  public async invalidateAllApiCache(): Promise<number> {
    return this.delPattern('*', {
      prefix: 'api:',
    });
  }

  public async cacheQuery(
    queryKey: string,
    result: any,
    ttl?: number
  ): Promise<void> {
    await this.set(queryKey, result, {
      ttl: ttl || 600, // 10 minutes
      prefix: 'query:',
    });
  }

  public async getCachedQuery(queryKey: string): Promise<any | null> {
    return this.get(queryKey, {
      prefix: 'query:',
    });
  }

  public async invalidateQueryCache(pattern: string): Promise<number> {
    return this.delPattern(pattern, {
      prefix: 'query:',
    });
  }

  public async setRateLimit(
    identifier: string,
    count: number,
    ttl: number
  ): Promise<void> {
    await this.set(`ratelimit:${identifier}`, count, {
      ttl,
      prefix: '',
    });
  }

  public async getRateLimit(identifier: string): Promise<number | null> {
    return this.get<number>(`ratelimit:${identifier}`, {
      prefix: '',
    });
  }

  public async incrementRateLimit(
    identifier: string,
    ttl: number
  ): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const count = await this.incr(key, { prefix: '', ttl });
    return count;
  }

  public async mget<T>(
    keys: string[],
    options?: In_CacheOptions
  ): Promise<(T | null)[]> {
    try {
      const redis = redisConfig.getClient();
      const cacheKeys = keys.map((key) =>
        this.generateKey(key, options?.prefix)
      );

      const values = await redis.mget(...cacheKeys);

      return values.map((value: any) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Failed to get multiple cache values', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return keys.map(() => null);
    }
  }

  public async mset<T>(
    entries: Array<{ key: string; value: T }>,
    options?: In_CacheOptions
  ): Promise<void> {
    try {
      const redis = redisConfig.getClient();
      const ttl = options?.ttl || this.defaultTTL;

      for (const entry of entries) {
        const cacheKey = this.generateKey(entry.key, options?.prefix);
        const serialized = JSON.stringify(entry.value);
        await redis.setex(cacheKey, ttl, serialized);
      }

      logger.debug('Multiple cache values set', {
        count: entries.length,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to set multiple cache values', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default Caching.getInstance();
