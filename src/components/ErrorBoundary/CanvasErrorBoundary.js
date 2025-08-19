"use strict";
/**
 * Canvas Error Boundary
 *
 * Specialized error boundary for canvas-related components:
 * - SmartPlaybook (canvas crashes)
 * - WebGL errors
 * - Canvas context failures
 * - Memory issues
 * - Touch/pointer events
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
exports.CanvasErrorBoundary = void 0;
const react_1 = __importStar(require("react"));
const BaseErrorBoundary_1 = __importDefault(require("./BaseErrorBoundary"));
const BaseErrorBoundary_2 = require("./BaseErrorBoundary");
class CanvasErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.canvasRef = react_1.default.createRef();
        this.handleCanvasReset = () => {
            this.setState({
                contextLost: false,
                fallbackMode: false,
                hasError: false,
                error: null,
                errorInfo: null
            });
            if (this.props.onCanvasReset) {
                this.props.onCanvasReset();
            }
        };
        this.handleContextRecovery = () => {
            this.setState({ contextLost: false });
            if (this.props.onContextLost) {
                this.props.onContextLost();
            }
        };
        this.handleWebGLFallback = () => {
            this.setState({ fallbackMode: true });
        };
        this.state = Object.assign(Object.assign({}, this.state), { contextLost: false, webglSupported: this.checkWebGLSupport(), fallbackMode: false });
    }
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        }
        catch (_a) {
            return false;
        }
    }
    componentDidCatch(error, errorInfo) {
        // Check if it's a canvas-specific error
        if ((0, BaseErrorBoundary_2.isCanvasError)(error)) {
            this.handleCanvasError(error, errorInfo);
        }
        else {
            super.componentDidCatch(error, errorInfo);
        }
    }
    handleCanvasError(error, errorInfo) {
        console.error('Canvas error detected:', error);
        // Check for context lost
        if (error.message.includes('context') || error.message.includes('lost')) {
            this.setState({ contextLost: true });
        }
        // Check for WebGL errors
        if (error.message.includes('webgl') && this.props.enableWebGLFallback) {
            this.setState({ fallbackMode: true });
        }
        // Call parent error handler
        super.componentDidCatch(error, errorInfo);
    }
    render() {
        const _a = this.props, { children, fallback } = _a, props = __rest(_a, ["children", "fallback"]);
        const { contextLost, webglSupported, fallbackMode } = this.state;
        // Custom fallback for canvas errors
        const canvasFallback = (error, errorInfo, retry, reset) => (react_1.default.createElement("div", { className: "canvas-error-boundary" },
            react_1.default.createElement("div", { className: "canvas-error-container" },
                react_1.default.createElement("div", { className: "canvas-error-header" },
                    react_1.default.createElement("div", { className: "canvas-error-icon" }, "\uD83C\uDFA8"),
                    react_1.default.createElement("h2", { className: "canvas-error-title" }, "Canvas Error"),
                    react_1.default.createElement("p", { className: "canvas-error-message" }, contextLost
                        ? 'The canvas context was lost. This can happen when the browser reclaims memory.'
                        : fallbackMode
                            ? 'WebGL is not supported or failed to initialize. Using fallback mode.'
                            : 'There was an error with the canvas rendering. This might be due to memory issues or browser limitations.')),
                react_1.default.createElement("div", { className: "canvas-error-actions" },
                    contextLost && (react_1.default.createElement("button", { className: "canvas-error-button primary", onClick: this.handleContextRecovery }, "Recover Context")),
                    !webglSupported && !fallbackMode && (react_1.default.createElement("button", { className: "canvas-error-button primary", onClick: this.handleWebGLFallback }, "Use Fallback Mode")),
                    react_1.default.createElement("button", { className: "canvas-error-button secondary", onClick: this.handleCanvasReset }, "Reset Canvas"),
                    react_1.default.createElement("button", { className: "canvas-error-button secondary", onClick: retry }, "Try Again"),
                    react_1.default.createElement("button", { className: "canvas-error-button secondary", onClick: () => window.location.reload() }, "Reload Page")),
                react_1.default.createElement("div", { className: "canvas-error-info" },
                    react_1.default.createElement("h3", null, "Canvas Information"),
                    react_1.default.createElement("ul", null,
                        react_1.default.createElement("li", null,
                            react_1.default.createElement("strong", null, "WebGL Support:"),
                            " ",
                            webglSupported ? 'Yes' : 'No'),
                        react_1.default.createElement("li", null,
                            react_1.default.createElement("strong", null, "Canvas Type:"),
                            " ",
                            props.canvasType || '2d'),
                        react_1.default.createElement("li", null,
                            react_1.default.createElement("strong", null, "Context Lost:"),
                            " ",
                            contextLost ? 'Yes' : 'No'),
                        react_1.default.createElement("li", null,
                            react_1.default.createElement("strong", null, "Fallback Mode:"),
                            " ",
                            fallbackMode ? 'Active' : 'Inactive'))),
                react_1.default.createElement("div", { className: "canvas-error-help" },
                    react_1.default.createElement("h3", null, "Troubleshooting Tips"),
                    react_1.default.createElement("ul", null,
                        react_1.default.createElement("li", null, "Try refreshing the page"),
                        react_1.default.createElement("li", null, "Close other browser tabs to free up memory"),
                        react_1.default.createElement("li", null, "Update your graphics drivers"),
                        react_1.default.createElement("li", null, "Try a different browser"),
                        react_1.default.createElement("li", null, "Disable browser extensions that might interfere")))),
            react_1.default.createElement("style", null, `
          .canvas-error-boundary {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .canvas-error-container {
            max-width: 700px;
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
          }
          
          .canvas-error-header {
            margin-bottom: 32px;
          }
          
          .canvas-error-icon {
            font-size: 80px;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
          }
          
          .canvas-error-title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 12px 0;
          }
          
          .canvas-error-message {
            font-size: 18px;
            color: #6b7280;
            margin: 0;
            line-height: 1.6;
            max-width: 500px;
            margin: 0 auto;
          }
          
          .canvas-error-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
          }
          
          .canvas-error-button {
            padding: 14px 28px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 140px;
          }
          
          .canvas-error-button.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          
          .canvas-error-button.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          
          .canvas-error-button.secondary {
            background-color: #f8fafc;
            color: #374151;
            border: 2px solid #e2e8f0;
          }
          
          .canvas-error-button.secondary:hover {
            background-color: #e2e8f0;
            border-color: #cbd5e1;
          }
          
          .canvas-error-info,
          .canvas-error-help {
            text-align: left;
            margin-top: 32px;
            padding: 24px;
            background-color: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          
          .canvas-error-info h3,
          .canvas-error-help h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
          }
          
          .canvas-error-info ul,
          .canvas-error-help ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .canvas-error-info li,
          .canvas-error-help li {
            margin-bottom: 8px;
            color: #4b5563;
            line-height: 1.5;
          }
          
          .canvas-error-info strong {
            color: #1f2937;
          }
        `)));
        return (react_1.default.createElement(BaseErrorBoundary_1.default, Object.assign({}, props, { fallback: fallback || canvasFallback, componentName: props.componentName || 'CanvasComponent', context: Object.assign(Object.assign({}, props.context), { canvasType: props.canvasType, webglSupported: this.state.webglSupported, contextLost: this.state.contextLost, fallbackMode: this.state.fallbackMode }) }), children));
    }
}
exports.CanvasErrorBoundary = CanvasErrorBoundary;
exports.default = CanvasErrorBoundary;
