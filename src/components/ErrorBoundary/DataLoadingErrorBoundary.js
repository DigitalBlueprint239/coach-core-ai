"use strict";
/**
 * Data Loading Error Boundary
 *
 * Specialized error boundary for data-related components:
 * - Dashboard (data loading errors)
 * - TeamManagement (permission errors)
 * - Analytics (calculation errors)
 * - Firebase errors
 * - Permission issues
 */
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLoadingErrorBoundary = void 0;
const react_1 = __importStar(require("react"));
const BaseErrorBoundary_1 = __importDefault(require("./BaseErrorBoundary"));
const BaseErrorBoundary_2 = require("./BaseErrorBoundary");
class DataLoadingErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.dataRefreshTimeout = null;
        this.cacheCheckInterval = null;
        this.handleDataRefresh = () => {
            this.setState({ dataStatus: 'loading' });
            if (this.props.onDataRefresh) {
                this.props.onDataRefresh();
            }
            else {
                // Default refresh behavior
                window.location.reload();
            }
        };
        this.handlePermissionRequest = () => {
            if (this.props.onPermissionRequest) {
                this.props.onPermissionRequest();
            }
            else {
                // Default permission request behavior
                window.location.href = '/auth/login';
            }
        };
        this.handleCacheRefresh = () => {
            this.setState({
                dataStatus: 'loading',
                dataSource: 'firebase',
                lastDataSync: Date.now()
            });
            this.handleDataRefresh();
        };
        this.state = Object.assign(Object.assign({}, this.state), { dataStatus: 'loading', permissionLevel: 'none', lastDataSync: Date.now(), cacheExpiry: Date.now() + (props.cacheTimeout || 300000), dataSource: 'unknown' });
    }
    componentDidMount() {
        // Start cache management
        if (this.props.enableCaching) {
            this.startCacheManagement();
        }
    }
    componentWillUnmount() {
        if (this.dataRefreshTimeout) {
            clearTimeout(this.dataRefreshTimeout);
        }
        if (this.cacheCheckInterval) {
            clearInterval(this.cacheCheckInterval);
        }
    }
    componentDidCatch(error, errorInfo) {
        // Determine data error type
        const errorType = this.classifyDataError(error);
        this.setState({
            dataStatus: 'error',
            dataSource: this.determineDataSource(error)
        });
        // Handle permission errors
        if ((0, BaseErrorBoundary_2.isAuthError)(error)) {
            this.handlePermissionError(error);
        }
        // Handle data validation errors
        if ((0, BaseErrorBoundary_2.isDataError)(error)) {
            this.handleDataValidationError(error);
        }
        // Call parent error handler
        super.componentDidCatch(error, errorInfo);
    }
    classifyDataError(error) {
        const message = error.message.toLowerCase();
        if ((0, BaseErrorBoundary_2.isAuthError)(error) || message.includes('permission') || message.includes('unauthorized')) {
            return 'permission';
        }
        if ((0, BaseErrorBoundary_2.isDataError)(error) || message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        }
        if ((0, BaseErrorBoundary_2.isNetworkError)(error)) {
            return 'network';
        }
        if (message.includes('firebase') || message.includes('firestore')) {
            return 'firebase';
        }
        return 'unknown';
    }
    determineDataSource(error) {
        const message = error.message.toLowerCase();
        if (message.includes('firebase') || message.includes('firestore')) {
            return 'firebase';
        }
        if (message.includes('cache') || message.includes('localstorage')) {
            return 'cache';
        }
        if (message.includes('local') || message.includes('memory')) {
            return 'local';
        }
        return 'unknown';
    }
    handlePermissionError(error) {
        // Determine permission level from error
        const message = error.message.toLowerCase();
        let permissionLevel = 'none';
        if (message.includes('admin') || message.includes('owner')) {
            permissionLevel = 'admin';
        }
        else if (message.includes('write') || message.includes('edit')) {
            permissionLevel = 'write';
        }
        else if (message.includes('read') || message.includes('view')) {
            permissionLevel = 'read';
        }
        this.setState({ permissionLevel });
    }
    handleDataValidationError(error) {
        console.warn('Data validation error:', error.message);
        // Try to recover from cache if available
        if (this.props.enableCaching) {
            this.tryLoadFromCache();
        }
    }
    startCacheManagement() {
        this.cacheCheckInterval = setInterval(() => {
            this.checkCacheExpiry();
        }, 60000); // Check every minute
    }
    checkCacheExpiry() {
        const { cacheExpiry } = this.state;
        if (Date.now() > cacheExpiry) {
            this.setState({
                dataStatus: 'error',
                dataSource: 'cache'
            });
        }
    }
    tryLoadFromCache() {
        try {
            const cacheKey = `data_cache_${this.props.dataType}`;
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                const { data, timestamp } = JSON.parse(cachedData);
                const cacheAge = Date.now() - timestamp;
                if (cacheAge < (this.props.cacheTimeout || 300000)) {
                    this.setState({
                        dataStatus: 'cached',
                        dataSource: 'cache',
                        lastDataSync: timestamp
                    });
                    return;
                }
            }
        }
        catch (error) {
            console.warn('Failed to load from cache:', error);
        }
    }
    getErrorMessage() {
        const { dataSource, permissionLevel, dataStatus } = this.state;
        if (dataStatus === 'cached') {
            return 'Showing cached data. Some information may be outdated.';
        }
        switch (dataSource) {
            case 'firebase':
                if (permissionLevel === 'none') {
                    return 'You don\'t have permission to access this data. Please contact your administrator.';
                }
                return 'Unable to load data from the database. Please check your connection and try again.';
            case 'cache':
                return 'Cached data is no longer available. Please refresh to load current data.';
            case 'local':
                return 'Local data is corrupted or unavailable. Please refresh the page.';
            default:
                return 'Unable to load the requested data. Please try again.';
        }
    }
    getRecoveryActions() {
        const { dataSource, permissionLevel, dataStatus } = this.state;
        const actions = [];
        // Primary action based on data source and status
        if (dataStatus === 'cached') {
            actions.push({
                label: 'Refresh Data',
                action: this.handleCacheRefresh,
                primary: true
            });
        }
        else if (permissionLevel === 'none') {
            actions.push({
                label: 'Request Access',
                action: this.handlePermissionRequest,
                primary: true
            });
        }
        else {
            actions.push({
                label: 'Try Again',
                action: this.handleDataRefresh,
                primary: true
            });
        }
        // Secondary actions
        if (this.props.enableCaching && dataStatus !== 'cached') {
            actions.push({
                label: 'Load Cached Data',
                action: this.tryLoadFromCache
            });
        }
        actions.push({
            label: 'Go Back',
            action: () => window.history.back()
        });
        actions.push({
            label: 'Reload Page',
            action: () => window.location.reload()
        });
        return actions;
    }
    render() {
        const _a = this.props, { children, fallback } = _a, props = __rest(_a, ["children", "fallback"]);
        const { dataStatus, dataSource, permissionLevel, lastDataSync } = this.state;
        // Custom fallback for data loading errors
        const dataLoadingFallback = (error, errorInfo, retry, reset) => {
            const actions = this.getRecoveryActions();
            return (react_1.default.createElement("div", { className: "data-loading-error-boundary" },
                react_1.default.createElement("div", { className: "data-loading-error-container" },
                    react_1.default.createElement("div", { className: "data-loading-error-header" },
                        react_1.default.createElement("div", { className: "data-loading-error-icon" }, "\uD83D\uDCCA"),
                        react_1.default.createElement("h2", { className: "data-loading-error-title" }, "Data Loading Error"),
                        react_1.default.createElement("p", { className: "data-loading-error-message" }, this.getErrorMessage())),
                    react_1.default.createElement("div", { className: "data-loading-status" },
                        react_1.default.createElement("div", { className: "status-grid" },
                            react_1.default.createElement("div", { className: "status-item" },
                                react_1.default.createElement("span", { className: "status-label" }, "Data Type:"),
                                react_1.default.createElement("span", { className: "status-value" }, props.dataType || 'Unknown')),
                            react_1.default.createElement("div", { className: "status-item" },
                                react_1.default.createElement("span", { className: "status-label" }, "Source:"),
                                react_1.default.createElement("span", { className: "status-value" }, dataSource)),
                            react_1.default.createElement("div", { className: "status-item" },
                                react_1.default.createElement("span", { className: "status-label" }, "Status:"),
                                react_1.default.createElement("span", { className: `status-value ${dataStatus}` }, dataStatus)),
                            react_1.default.createElement("div", { className: "status-item" },
                                react_1.default.createElement("span", { className: "status-label" }, "Last Sync:"),
                                react_1.default.createElement("span", { className: "status-value" }, new Date(lastDataSync).toLocaleTimeString())))),
                    react_1.default.createElement("div", { className: "data-loading-error-actions" }, actions.map((action, index) => (react_1.default.createElement("button", { key: index, className: `data-loading-error-button ${action.primary ? 'primary' : 'secondary'}`, onClick: action.action }, action.label)))),
                    permissionLevel === 'none' && (react_1.default.createElement("div", { className: "permission-info" },
                        react_1.default.createElement("h3", null, "Permission Required"),
                        react_1.default.createElement("p", null, "You need appropriate permissions to access this data. Contact your team administrator or coach to request access."),
                        react_1.default.createElement("div", { className: "permission-levels" },
                            react_1.default.createElement("div", { className: "permission-level" },
                                react_1.default.createElement("strong", null, "Read Access:"),
                                " View team data and analytics"),
                            react_1.default.createElement("div", { className: "permission-level" },
                                react_1.default.createElement("strong", null, "Write Access:"),
                                " Edit team information and create content"),
                            react_1.default.createElement("div", { className: "permission-level" },
                                react_1.default.createElement("strong", null, "Admin Access:"),
                                " Full team management capabilities")))),
                    react_1.default.createElement("div", { className: "data-loading-error-help" },
                        react_1.default.createElement("h3", null, "Troubleshooting Tips"),
                        react_1.default.createElement("ul", null,
                            dataSource === 'firebase' && (react_1.default.createElement("li", null, "Check your internet connection")),
                            permissionLevel === 'none' && (react_1.default.createElement("li", null, "Verify you have the correct permissions")),
                            dataStatus === 'cached' && (react_1.default.createElement("li", null, "Refresh to get the latest data")),
                            react_1.default.createElement("li", null, "Try clearing your browser cache"),
                            react_1.default.createElement("li", null, "Contact support if the problem persists")))),
                react_1.default.createElement("style", null, `
            .data-loading-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .data-loading-error-container {
              max-width: 700px;
              width: 100%;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 40px;
              text-align: center;
            }
            
            .data-loading-error-header {
              margin-bottom: 32px;
            }
            
            .data-loading-error-icon {
              font-size: 80px;
              margin-bottom: 20px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            }
            
            .data-loading-error-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            
            .data-loading-error-message {
              font-size: 18px;
              color: #6b7280;
              margin: 0;
              line-height: 1.6;
              max-width: 500px;
              margin: 0 auto;
            }
            
            .data-loading-status {
              margin-bottom: 32px;
            }
            
            .status-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
              background-color: #f8fafc;
              border-radius: 12px;
              padding: 24px;
              border: 1px solid #e2e8f0;
            }
            
            .status-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            
            .status-label {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .status-value {
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
            }
            
            .status-value.cached {
              color: #059669;
            }
            
            .status-value.error {
              color: #dc2626;
            }
            
            .data-loading-error-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-bottom: 32px;
              flex-wrap: wrap;
            }
            
            .data-loading-error-button {
              padding: 14px 28px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 140px;
            }
            
            .data-loading-error-button.primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .data-loading-error-button.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .data-loading-error-button.secondary {
              background-color: #f8fafc;
              color: #374151;
              border: 2px solid #e2e8f0;
            }
            
            .data-loading-error-button.secondary:hover {
              background-color: #e2e8f0;
              border-color: #cbd5e1;
            }
            
            .permission-info,
            .data-loading-error-help {
              text-align: left;
              margin-top: 32px;
              padding: 24px;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            
            .permission-info h3,
            .data-loading-error-help h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
            }
            
            .permission-levels {
              display: grid;
              gap: 12px;
              margin-top: 16px;
            }
            
            .permission-level {
              padding: 12px;
              background-color: white;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 14px;
              color: #4b5563;
            }
            
            .data-loading-error-help ul {
              margin: 0;
              padding-left: 20px;
            }
            
            .data-loading-error-help li {
              margin-bottom: 8px;
              color: #4b5563;
              line-height: 1.5;
            }
          `)));
        };
        return (react_1.default.createElement(BaseErrorBoundary_1.default, Object.assign({}, props, { fallback: fallback || dataLoadingFallback, componentName: props.componentName || 'DataLoadingComponent', context: Object.assign(Object.assign({}, props.context), { dataType: props.dataType, dataSource: this.state.dataSource, dataStatus: this.state.dataStatus, permissionLevel: this.state.permissionLevel }) }), children));
    }
}
exports.DataLoadingErrorBoundary = DataLoadingErrorBoundary;
exports.default = DataLoadingErrorBoundary;
