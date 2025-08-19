"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.apiLimiter = exports.authLimiter = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// import { redis } from './redis'; // Redis is not available in this environment
const createRateLimiter = (windowMs, max) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        // store: new RedisStore({ client: redis }), // Disabled for now
    });
};
exports.createRateLimiter = createRateLimiter;
// Different limiters for different endpoints
exports.authLimiter = (0, exports.createRateLimiter)(15 * 60 * 1000, 5); // 5 requests per 15 minutes
exports.apiLimiter = (0, exports.createRateLimiter)(1 * 60 * 1000, 100); // 100 requests per minute
exports.uploadLimiter = (0, exports.createRateLimiter)(1 * 60 * 1000, 10); // 10 uploads per minute 
