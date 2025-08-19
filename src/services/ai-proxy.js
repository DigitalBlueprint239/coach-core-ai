"use strict";
// src/services/ai-proxy.ts
// Server-side proxy for OpenAI API calls to prevent API key exposure
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
exports.useAIProxy = exports.AIProxyService = void 0;
class AIProxyService {
    constructor(config) {
        this.config = Object.assign({ timeout: 30000, retries: 3 }, config);
    }
    makeRequest(request) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            let lastError = null;
            for (let attempt = 1; attempt <= this.config.retries; attempt++) {
                try {
                    const response = yield fetch(this.config.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.REACT_APP_AI_PROXY_TOKEN || ''}`
                        },
                        body: JSON.stringify(request),
                        signal: AbortSignal.timeout(this.config.timeout)
                    });
                    if (!response.ok) {
                        const errorData = yield response.json().catch(() => ({}));
                        throw new Error(`AI Proxy error: ${response.status} ${errorData.error || response.statusText}`);
                    }
                    const data = yield response.json();
                    const latency = Date.now() - startTime;
                    return {
                        success: true,
                        data: data.response,
                        metadata: {
                            model: ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.model) || 'unknown',
                            tokens: ((_b = data.metadata) === null || _b === void 0 ? void 0 : _b.tokens) || 0,
                            cost: ((_c = data.metadata) === null || _c === void 0 ? void 0 : _c.cost) || 0,
                            latency
                        }
                    };
                }
                catch (error) {
                    lastError = error;
                    console.warn(`AI proxy attempt ${attempt} failed:`, error);
                    if (attempt < this.config.retries) {
                        yield this.delay(1000 * attempt); // Exponential backoff
                    }
                }
            }
            return {
                success: false,
                error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'All AI proxy attempts failed'
            };
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AIProxyService = AIProxyService;
// ============================================
// REACT HOOKS
// ============================================
const react_1 = require("react");
const useAIProxy = (config) => {
    const [service] = (0, react_1.useState)(() => new AIProxyService(config));
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const makeRequest = (0, react_1.useCallback)((request) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        try {
            const result = yield service.makeRequest(request);
            if (!result.success) {
                throw new Error(result.error || 'AI request failed');
            }
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to make AI request';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }), [service]);
    return {
        service,
        loading,
        error,
        makeRequest
    };
};
exports.useAIProxy = useAIProxy;
