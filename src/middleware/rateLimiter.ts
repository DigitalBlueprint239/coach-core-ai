import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
// import { redis } from './redis'; // Redis is not available in this environment

export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    // store: new RedisStore({ client: redis }), // Disabled for now
  });
};

// Different limiters for different endpoints
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const apiLimiter = createRateLimiter(1 * 60 * 1000, 100); // 100 requests per minute
export const uploadLimiter = createRateLimiter(1 * 60 * 1000, 10); // 10 uploads per minute
