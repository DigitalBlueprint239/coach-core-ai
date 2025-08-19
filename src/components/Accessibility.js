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
exports.useReducedMotion = exports.useHighContrast = exports.ScreenReaderOnly = exports.SkipLink = exports.FocusTrap = void 0;
const react_1 = __importStar(require("react"));
// Focus trap for modals
const FocusTrap = ({ children, isActive }) => {
    const containerRef = react_1.default.useRef(null);
    (0, react_1.useEffect)(() => {
        if (!isActive || !containerRef.current)
            return;
        const focusableElements = containerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                }
                else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        firstElement === null || firstElement === void 0 ? void 0 : firstElement.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive]);
    return react_1.default.createElement("div", { ref: containerRef }, children);
};
exports.FocusTrap = FocusTrap;
// Skip link for keyboard navigation
const SkipLink = () => (react_1.default.createElement("a", { href: "#main-content", className: "skip-link", style: {
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: '#000',
        color: '#fff',
        padding: '8px',
        textDecoration: 'none',
        zIndex: 1000,
        borderRadius: '4px'
    }, onFocus: (e) => {
        e.currentTarget.style.top = '6px';
    }, onBlur: (e) => {
        e.currentTarget.style.top = '-40px';
    } }, "Skip to main content"));
exports.SkipLink = SkipLink;
// Screen reader only text
const ScreenReaderOnly = ({ children }) => (react_1.default.createElement("span", { style: {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0'
    } }, children));
exports.ScreenReaderOnly = ScreenReaderOnly;
// High contrast mode detection
const useHighContrast = () => {
    const [isHighContrast, setIsHighContrast] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        setIsHighContrast(mediaQuery.matches);
        const handler = (e) => setIsHighContrast(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);
    return isHighContrast;
};
exports.useHighContrast = useHighContrast;
// Reduced motion detection
const useReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const handler = (e) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);
    return prefersReducedMotion;
};
exports.useReducedMotion = useReducedMotion;
