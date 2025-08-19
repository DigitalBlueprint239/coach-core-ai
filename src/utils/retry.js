"use strict";
// src/utils/retry.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseRetryableFunction = exports.createNetworkRetryableFunction = exports.createRetryableFunction = exports.useRetry = exports.databaseRetryable = exports.networkRetryable = exports.retryable = exports.withAPIRetry = exports.withDatabaseRetry = exports.withNetworkRetry = exports.withRetry = void 0;
const withRetry = (fn, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const { maxAttempts = 3, delay = 1000, backoffMultiplier = 2, maxDelay = 30000, onRetry, shouldRetry } = options;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return yield fn();
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // Check if we should retry this error
            if (shouldRetry && !shouldRetry(err)) {
                throw err;
            }
            // If this is the last attempt, throw the error
            if (i === maxAttempts - 1) {
                throw err;
            }
            // Call onRetry callback if provided
            if (onRetry) {
                onRetry(i + 1, err);
            }
            // Calculate delay with exponential backoff
            const currentDelay = Math.min(delay * Math.pow(backoffMultiplier, i), maxDelay);
            yield new Promise(resolve => setTimeout(resolve, currentDelay));
        }
    }
    throw new Error('Max retries reached');
});
exports.withRetry = withRetry;
// ============================================
// SPECIALIZED RETRY FUNCTIONS
// ============================================
const withNetworkRetry = (fn, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.withRetry)(fn, Object.assign({ maxAttempts: 3, delay: 1000, shouldRetry: (error) => {
            // Retry network-related errors
            return error.name === 'NetworkError' ||
                error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('timeout');
        } }, options));
});
exports.withNetworkRetry = withNetworkRetry;
const withDatabaseRetry = (fn, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.withRetry)(fn, Object.assign({ maxAttempts: 5, delay: 500, shouldRetry: (error) => {
            // Retry database-related errors
            return error.name === 'QuotaExceededError' ||
                error.message.includes('database') ||
                error.message.includes('indexeddb') ||
                error.message.includes('quota');
        } }, options));
});
exports.withDatabaseRetry = withDatabaseRetry;
const withAPIRetry = (fn, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.withRetry)(fn, Object.assign({ maxAttempts: 3, delay: 1000, shouldRetry: (error) => {
            // Retry API-related errors
            const retryableStatuses = [408, 429, 500, 502, 503, 504];
            const statusMatch = error.message.match(/HTTP (\d+)/);
            if (statusMatch) {
                const status = parseInt(statusMatch[1]);
                return retryableStatuses.includes(status);
            }
            return error.message.includes('timeout') ||
                error.message.includes('network') ||
                error.message.includes('connection');
        } }, options));
});
exports.withAPIRetry = withAPIRetry;
// ============================================
// RETRY DECORATORS
// ============================================
const retryable = (options = {}) => {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, exports.withRetry)(() => originalMethod.apply(this, args), options);
            });
        };
        return descriptor;
    };
};
exports.retryable = retryable;
const networkRetryable = (options = {}) => {
    return (0, exports.retryable)(Object.assign({ maxAttempts: 3, delay: 1000, shouldRetry: (error) => {
            return error.name === 'NetworkError' ||
                error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('timeout');
        } }, options));
};
exports.networkRetryable = networkRetryable;
const databaseRetryable = (options = {}) => {
    return (0, exports.retryable)(Object.assign({ maxAttempts: 5, delay: 500, shouldRetry: (error) => {
            return error.name === 'QuotaExceededError' ||
                error.message.includes('database') ||
                error.message.includes('indexeddb') ||
                error.message.includes('quota');
        } }, options));
};
exports.databaseRetryable = databaseRetryable;
// ============================================
// RETRY HOOKS FOR REACT
// ============================================
const react_1 = require("react");
const useRetry = () => {
    const retry = (0, react_1.useCallback)((fn, options = {}) => {
        return (0, exports.withRetry)(fn, options);
    }, []);
    const networkRetry = (0, react_1.useCallback)((fn, options = {}) => {
        return (0, exports.withNetworkRetry)(fn, options);
    }, []);
    const databaseRetry = (0, react_1.useCallback)((fn, options = {}) => {
        return (0, exports.withDatabaseRetry)(fn, options);
    }, []);
    const apiRetry = (0, react_1.useCallback)((fn, options = {}) => {
        return (0, exports.withAPIRetry)(fn, options);
    }, []);
    return {
        retry,
        networkRetry,
        databaseRetry,
        apiRetry
    };
};
exports.useRetry = useRetry;
// ============================================
// RETRY UTILITIES
// ============================================
const createRetryableFunction = (fn, options = {}) => {
    return ((...args) => __awaiter(void 0, void 0, void 0, function* () {
        return (0, exports.withRetry)(() => fn(...args), options);
    }));
};
exports.createRetryableFunction = createRetryableFunction;
const createNetworkRetryableFunction = (fn) => {
    return (0, exports.createRetryableFunction)(fn, {
        maxAttempts: 3,
        delay: 1000,
        shouldRetry: (error) => {
            return error.name === 'NetworkError' ||
                error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('timeout');
        }
    });
};
exports.createNetworkRetryableFunction = createNetworkRetryableFunction;
const createDatabaseRetryableFunction = (fn) => {
    return (0, exports.createRetryableFunction)(fn, {
        maxAttempts: 5,
        delay: 500,
        shouldRetry: (error) => {
            return error.name === 'QuotaExceededError' ||
                error.message.includes('database') ||
                error.message.includes('indexeddb') ||
                error.message.includes('quota');
        }
    });
};
exports.createDatabaseRetryableFunction = createDatabaseRetryableFunction;
// ============================================
// DEFAULT EXPORT
// ============================================
exports.default = exports.withRetry;
