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
exports.LoadingWrapper = exports.Progress = exports.Skeleton = exports.LoadingState = void 0;
// src/components/LoadingStates.tsx
const react_1 = __importStar(require("react"));
// ============================================
// MAIN LOADING COMPONENT
// ============================================
const LoadingState = ({ type = 'spinner', size = 'medium', color = '#3B82F6', text, showProgress = false, progress = 0, duration = 2000, className = '' }) => {
    const [currentProgress, setCurrentProgress] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (showProgress && progress > 0) {
            const interval = setInterval(() => {
                setCurrentProgress(prev => {
                    if (prev >= progress)
                        return progress;
                    return prev + 1;
                });
            }, duration / progress);
            return () => clearInterval(interval);
        }
    }, [showProgress, progress, duration]);
    const renderLoader = () => {
        switch (type) {
            case 'spinner':
                return react_1.default.createElement(SpinnerLoader, { size: size, color: color });
            case 'skeleton':
                return react_1.default.createElement(SkeletonLoader, { size: size });
            case 'progress':
                return react_1.default.createElement(ProgressLoader, { value: currentProgress, color: color });
            case 'pulse':
                return react_1.default.createElement(PulseLoader, { size: size, color: color });
            case 'shimmer':
                return react_1.default.createElement(ShimmerLoader, { size: size });
            case 'dots':
                return react_1.default.createElement(DotsLoader, { size: size, color: color });
            case 'bars':
                return react_1.default.createElement(BarsLoader, { size: size, color: color });
            default:
                return react_1.default.createElement(SpinnerLoader, { size: size, color: color });
        }
    };
    return (react_1.default.createElement("div", { className: `loading-state loading-${type} loading-${size} ${className}` },
        react_1.default.createElement("div", { className: "loading-content" },
            renderLoader(),
            text && react_1.default.createElement("div", { className: "loading-text" }, text),
            showProgress && (react_1.default.createElement("div", { className: "loading-progress" },
                react_1.default.createElement(exports.Progress, { value: currentProgress, max: 100, type: "linear", color: color }))))));
};
exports.LoadingState = LoadingState;
// ============================================
// SPINNER LOADER
// ============================================
const SpinnerLoader = ({ size, color }) => {
    const sizeMap = {
        small: '16px',
        medium: '32px',
        large: '48px'
    };
    return (react_1.default.createElement("div", { className: "spinner-loader", style: {
            width: sizeMap[size],
            height: sizeMap[size],
            borderColor: color
        } },
        react_1.default.createElement("style", null, `
        .spinner-loader {
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `)));
};
// ============================================
// SKELETON LOADER
// ============================================
const SkeletonLoader = ({ size }) => {
    const sizeMap = {
        small: { width: '100px', height: '16px' },
        medium: { width: '200px', height: '24px' },
        large: { width: '300px', height: '32px' }
    };
    const dimensions = sizeMap[size];
    return (react_1.default.createElement("div", { className: "skeleton-loader", style: dimensions },
        react_1.default.createElement("style", null, `
        .skeleton-loader {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `)));
};
// ============================================
// PROGRESS LOADER
// ============================================
const ProgressLoader = ({ value, color }) => {
    return (react_1.default.createElement("div", { className: "progress-loader" },
        react_1.default.createElement("div", { className: "progress-bar", style: {
                width: `${value}%`,
                backgroundColor: color
            } }),
        react_1.default.createElement("style", null, `
        .progress-loader {
          width: 200px;
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          transition: width 0.3s ease;
        }
      `)));
};
// ============================================
// PULSE LOADER
// ============================================
const PulseLoader = ({ size, color }) => {
    const sizeMap = {
        small: '16px',
        medium: '32px',
        large: '48px'
    };
    return (react_1.default.createElement("div", { className: "pulse-loader", style: {
            width: sizeMap[size],
            height: sizeMap[size],
            backgroundColor: color
        } },
        react_1.default.createElement("style", null, `
        .pulse-loader {
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
      `)));
};
// ============================================
// SHIMMER LOADER
// ============================================
const ShimmerLoader = ({ size }) => {
    const sizeMap = {
        small: { width: '100px', height: '16px' },
        medium: { width: '200px', height: '24px' },
        large: { width: '300px', height: '32px' }
    };
    const dimensions = sizeMap[size];
    return (react_1.default.createElement("div", { className: "shimmer-loader", style: dimensions },
        react_1.default.createElement("style", null, `
        .shimmer-loader {
          background: linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `)));
};
// ============================================
// DOTS LOADER
// ============================================
const DotsLoader = ({ size, color }) => {
    const sizeMap = {
        small: '4px',
        medium: '6px',
        large: '8px'
    };
    const dotSize = sizeMap[size];
    return (react_1.default.createElement("div", { className: "dots-loader" },
        [0, 1, 2].map(i => (react_1.default.createElement("div", { key: i, className: "dot", style: {
                width: dotSize,
                height: dotSize,
                backgroundColor: color,
                animationDelay: `${i * 0.2}s`
            } }))),
        react_1.default.createElement("style", null, `
        .dots-loader {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .dot {
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `)));
};
// ============================================
// BARS LOADER
// ============================================
const BarsLoader = ({ size, color }) => {
    const sizeMap = {
        small: { width: '3px', height: '16px' },
        medium: { width: '4px', height: '24px' },
        large: { width: '6px', height: '32px' }
    };
    const dimensions = sizeMap[size];
    return (react_1.default.createElement("div", { className: "bars-loader" },
        [0, 1, 2, 3, 4].map(i => (react_1.default.createElement("div", { key: i, className: "bar", style: {
                width: dimensions.width,
                height: dimensions.height,
                backgroundColor: color,
                animationDelay: `${i * 0.1}s`
            } }))),
        react_1.default.createElement("style", null, `
        .bars-loader {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        
        .bar {
          animation: bars 1.2s ease-in-out infinite;
        }
        
        @keyframes bars {
          0%, 40%, 100% { transform: scaleY(0.4); }
          20% { transform: scaleY(1); }
        }
      `)));
};
// ============================================
// SKELETON COMPONENTS
// ============================================
const Skeleton = ({ type, lines = 1, width, height, className = '' }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'text':
                return (react_1.default.createElement("div", { className: `skeleton-text ${className}` }, Array.from({ length: lines }).map((_, i) => (react_1.default.createElement("div", { key: i, className: "skeleton-line", style: {
                        width: width || (i === lines - 1 ? '60%' : '100%'),
                        height: height || '16px'
                    } })))));
            case 'avatar':
                return (react_1.default.createElement("div", { className: `skeleton-avatar ${className}`, style: {
                        width: width || '40px',
                        height: height || '40px'
                    } }));
            case 'button':
                return (react_1.default.createElement("div", { className: `skeleton-button ${className}`, style: {
                        width: width || '120px',
                        height: height || '36px'
                    } }));
            case 'card':
                return (react_1.default.createElement("div", { className: `skeleton-card ${className}` },
                    react_1.default.createElement("div", { className: "skeleton-card-header", style: { height: height || '200px' } }),
                    react_1.default.createElement("div", { className: "skeleton-card-content" },
                        react_1.default.createElement("div", { className: "skeleton-line", style: { width: '80%', height: '16px' } }),
                        react_1.default.createElement("div", { className: "skeleton-line", style: { width: '60%', height: '16px' } }),
                        react_1.default.createElement("div", { className: "skeleton-line", style: { width: '40%', height: '16px' } }))));
            case 'table':
                return (react_1.default.createElement("div", { className: `skeleton-table ${className}` }, Array.from({ length: lines }).map((_, i) => (react_1.default.createElement("div", { key: i, className: "skeleton-row" },
                    react_1.default.createElement("div", { className: "skeleton-cell", style: { width: '30%' } }),
                    react_1.default.createElement("div", { className: "skeleton-cell", style: { width: '40%' } }),
                    react_1.default.createElement("div", { className: "skeleton-cell", style: { width: '30%' } }))))));
            case 'form':
                return (react_1.default.createElement("div", { className: `skeleton-form ${className}` }, Array.from({ length: lines }).map((_, i) => (react_1.default.createElement("div", { key: i, className: "skeleton-form-field" },
                    react_1.default.createElement("div", { className: "skeleton-label", style: { width: '80px', height: '14px' } }),
                    react_1.default.createElement("div", { className: "skeleton-input", style: { width: '100%', height: '36px' } }))))));
            default:
                return react_1.default.createElement("div", { className: "skeleton-default", style: { width, height } });
        }
    };
    return (react_1.default.createElement(react_1.default.Fragment, null,
        renderSkeleton(),
        react_1.default.createElement("style", null, `
        .skeleton-text {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        .skeleton-avatar {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 50%;
        }
        
        .skeleton-button {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
        
        .skeleton-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .skeleton-card-header {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-row {
          display: flex;
          gap: 8px;
        }
        
        .skeleton-cell {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          height: 20px;
        }
        
        .skeleton-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .skeleton-form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .skeleton-label {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 2px;
        }
        
        .skeleton-input {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
        
        .skeleton-default {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `)));
};
exports.Skeleton = Skeleton;
// ============================================
// PROGRESS COMPONENT
// ============================================
const Progress = ({ value, max = 100, type = 'linear', color = '#3B82F6', showLabel = false, animated = true, className = '' }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const renderProgress = () => {
        switch (type) {
            case 'linear':
                return (react_1.default.createElement("div", { className: `progress-linear ${className}` },
                    react_1.default.createElement("div", { className: "progress-track" },
                        react_1.default.createElement("div", { className: `progress-fill ${animated ? 'animated' : ''}`, style: {
                                width: `${percentage}%`,
                                backgroundColor: color
                            } })),
                    showLabel && react_1.default.createElement("div", { className: "progress-label" },
                        Math.round(percentage),
                        "%")));
            case 'circular':
                return (react_1.default.createElement("div", { className: `progress-circular ${className}` },
                    react_1.default.createElement("svg", { className: "progress-svg", viewBox: "0 0 36 36" },
                        react_1.default.createElement("path", { className: "progress-bg", d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" }),
                        react_1.default.createElement("path", { className: `progress-fill ${animated ? 'animated' : ''}`, style: { stroke: color }, strokeDasharray: `${percentage}, 100`, d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" })),
                    showLabel && react_1.default.createElement("div", { className: "progress-label" },
                        Math.round(percentage),
                        "%")));
            case 'steps':
                return (react_1.default.createElement("div", { className: `progress-steps ${className}` },
                    Array.from({ length: max }).map((_, i) => (react_1.default.createElement("div", { key: i, className: `progress-step ${i < value ? 'completed' : ''}`, style: { backgroundColor: i < value ? color : '#e5e7eb' } }))),
                    showLabel && react_1.default.createElement("div", { className: "progress-label" },
                        value,
                        " / ",
                        max)));
            default:
                return null;
        }
    };
    return (react_1.default.createElement(react_1.default.Fragment, null,
        renderProgress(),
        react_1.default.createElement("style", null, `
        .progress-linear {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .progress-track {
          flex: 1;
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .progress-fill.animated {
          transition: width 0.3s ease;
        }
        
        .progress-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          min-width: 40px;
          text-align: right;
        }
        
        .progress-circular {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .progress-svg {
          width: 36px;
          height: 36px;
          transform: rotate(-90deg);
        }
        
        .progress-bg {
          fill: none;
          stroke: #e5e7eb;
          stroke-width: 3;
        }
        
        .progress-fill {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease;
        }
        
        .progress-steps {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .progress-step {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        
        .progress-step.completed {
          background-color: currentColor;
        }
      `)));
};
exports.Progress = Progress;
// ============================================
// LOADING WRAPPER COMPONENT
// ============================================
const LoadingWrapper = ({ loading, error, children, fallback, errorFallback }) => {
    if (error) {
        return errorFallback ? (react_1.default.createElement(react_1.default.Fragment, null, errorFallback)) : (react_1.default.createElement("div", { className: "error-state" },
            react_1.default.createElement("div", { className: "error-icon" }, "\u26A0\uFE0F"),
            react_1.default.createElement("div", { className: "error-message" }, error),
            react_1.default.createElement("style", null, `
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
          }
          
          .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          .error-message {
            color: #dc2626;
            font-size: 16px;
          }
        `)));
    }
    if (loading) {
        return fallback ? (react_1.default.createElement(react_1.default.Fragment, null, fallback)) : (react_1.default.createElement(exports.LoadingState, { type: "spinner", text: "Loading..." }));
    }
    return react_1.default.createElement(react_1.default.Fragment, null, children);
};
exports.LoadingWrapper = LoadingWrapper;
exports.default = exports.LoadingState;
