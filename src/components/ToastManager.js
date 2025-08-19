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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToast = exports.ToastContext = void 0;
const react_1 = __importStar(require("react"));
const Toast_1 = __importDefault(require("./Toast"));
exports.ToastContext = react_1.default.createContext(null);
const useToast = () => {
    const context = react_1.default.useContext(exports.ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastManager');
    }
    return context;
};
exports.useToast = useToast;
const ToastManager = ({ children }) => {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const showToast = (0, react_1.useCallback)((message, type, duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);
    }, []);
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);
    const showSuccess = (0, react_1.useCallback)((message, duration) => {
        showToast(message, 'success', duration);
    }, [showToast]);
    const showError = (0, react_1.useCallback)((message, duration) => {
        showToast(message, 'error', duration);
    }, [showToast]);
    const showInfo = (0, react_1.useCallback)((message, duration) => {
        showToast(message, 'info', duration);
    }, [showToast]);
    const showWarning = (0, react_1.useCallback)((message, duration) => {
        showToast(message, 'warning', duration);
    }, [showToast]);
    const contextValue = {
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning
    };
    return (react_1.default.createElement(exports.ToastContext.Provider, { value: contextValue },
        children,
        react_1.default.createElement("div", { className: "fixed top-4 right-4 z-50 space-y-2" }, toasts.map((toast, index) => (react_1.default.createElement("div", { key: toast.id, style: {
                transform: `translateY(${index * 80}px)`,
                zIndex: 1000 - index
            } },
            react_1.default.createElement(Toast_1.default, { message: toast.message, type: toast.type, duration: toast.duration, onClose: () => removeToast(toast.id) })))))));
};
exports.default = ToastManager;
