"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = exports.trackPerformance = exports.initializeMonitoring = void 0;
const Sentry = __importStar(require("@sentry/react"));
const tracing_1 = require("@sentry/tracing");
const config_1 = require("../firebase/config");
const analytics_1 = require("firebase/analytics");
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const initializeMonitoring = () => {
    if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
        Sentry.init({
            dsn: SENTRY_DSN,
            integrations: [
                new tracing_1.BrowserTracing(),
            ],
            tracesSampleRate: 0.1,
            environment: ENVIRONMENT,
        });
    }
};
exports.initializeMonitoring = initializeMonitoring;
// Performance monitoring
function trackPerformance(metricName, value) {
    if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/metrics', JSON.stringify({
            metric: metricName,
            value,
            timestamp: Date.now(),
        }));
    }
}
exports.trackPerformance = trackPerformance;
// User analytics
function trackEvent(eventName, properties) {
    if (config_1.firebase.analytics) {
        (0, analytics_1.logEvent)(config_1.firebase.analytics, eventName, properties);
    }
}
exports.trackEvent = trackEvent;
