"use strict";
// src/components/ui/TouchableOpacity.tsx
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
exports.TouchableOpacity = void 0;
const react_1 = __importStar(require("react"));
const haptics_1 = require("@capacitor/haptics");
const TouchableOpacity = ({ children, onPress, onLongPress, onPressIn, onPressOut, disabled = false, activeOpacity = 0.7, style = {}, className = '', hapticFeedback, longPressDelay = 500, touchTargetSize = 44, preventDefault = true, stopPropagation = true, }) => {
    const [isPressed, setIsPressed] = (0, react_1.useState)(false);
    const [isLongPressed, setIsLongPressed] = (0, react_1.useState)(false);
    const pressTimerRef = (0, react_1.useRef)(null);
    const touchStartTimeRef = (0, react_1.useRef)(0);
    const touchStartPositionRef = (0, react_1.useRef)({ x: 0, y: 0 });
    const hasMovedRef = (0, react_1.useRef)(false);
    const elementRef = (0, react_1.useRef)(null);
    // ============================================
    // HAPTIC FEEDBACK UTILITIES
    // ============================================
    const triggerHapticFeedback = (0, react_1.useCallback)((type) => __awaiter(void 0, void 0, void 0, function* () {
        if (!hapticFeedback)
            return;
        try {
            switch (type) {
                case 'light':
                    yield haptics_1.Haptics.impact({ style: 'light' });
                    break;
                case 'medium':
                    yield haptics_1.Haptics.impact({ style: 'medium' });
                    break;
                case 'heavy':
                    yield haptics_1.Haptics.impact({ style: 'heavy' });
                    break;
                case 'success':
                    yield haptics_1.Haptics.notification({ type: 'success' });
                    break;
                case 'error':
                    yield haptics_1.Haptics.notification({ type: 'error' });
                    break;
                case 'warning':
                    yield haptics_1.Haptics.notification({ type: 'warning' });
                    break;
                default:
                    yield haptics_1.Haptics.impact({ style: 'light' });
            }
        }
        catch (error) {
            console.warn('Haptic feedback not available:', error);
        }
    }), [hapticFeedback]);
    // ============================================
    // TOUCH EVENT HANDLERS
    // ============================================
    const handleTouchStart = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        if (preventDefault) {
            event.preventDefault();
        }
        if (stopPropagation) {
            event.stopPropagation();
        }
        const touch = event.touches[0];
        touchStartTimeRef.current = Date.now();
        touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
        hasMovedRef.current = false;
        setIsPressed(true);
        onPressIn === null || onPressIn === void 0 ? void 0 : onPressIn();
        // Start long press timer
        pressTimerRef.current = setTimeout(() => {
            if (!hasMovedRef.current) {
                setIsLongPressed(true);
                onLongPress === null || onLongPress === void 0 ? void 0 : onLongPress();
                triggerHapticFeedback('medium');
            }
        }, longPressDelay);
    }, [disabled, preventDefault, stopPropagation, onPressIn, onLongPress, longPressDelay, triggerHapticFeedback]);
    const handleTouchMove = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
        const moveThreshold = 10; // pixels
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            hasMovedRef.current = true;
            if (pressTimerRef.current) {
                clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
            }
        }
    }, [disabled]);
    const handleTouchEnd = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        if (preventDefault) {
            event.preventDefault();
        }
        if (stopPropagation) {
            event.stopPropagation();
        }
        const touchDuration = Date.now() - touchStartTimeRef.current;
        const isQuickTap = touchDuration < longPressDelay && !hasMovedRef.current;
        setIsPressed(false);
        setIsLongPressed(false);
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        onPressOut === null || onPressOut === void 0 ? void 0 : onPressOut();
        if (isQuickTap && onPress) {
            onPress();
            triggerHapticFeedback('light');
        }
    }, [disabled, preventDefault, stopPropagation, onPressOut, onPress, longPressDelay, triggerHapticFeedback]);
    const handleTouchCancel = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        setIsPressed(false);
        setIsLongPressed(false);
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        onPressOut === null || onPressOut === void 0 ? void 0 : onPressOut();
    }, [disabled, onPressOut]);
    // ============================================
    // MOUSE EVENT HANDLERS (FOR DESKTOP)
    // ============================================
    const handleMouseDown = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        if (preventDefault) {
            event.preventDefault();
        }
        if (stopPropagation) {
            event.stopPropagation();
        }
        setIsPressed(true);
        onPressIn === null || onPressIn === void 0 ? void 0 : onPressIn();
    }, [disabled, preventDefault, stopPropagation, onPressIn]);
    const handleMouseUp = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        if (preventDefault) {
            event.preventDefault();
        }
        if (stopPropagation) {
            event.stopPropagation();
        }
        setIsPressed(false);
        onPressOut === null || onPressOut === void 0 ? void 0 : onPressOut();
        if (onPress) {
            onPress();
        }
    }, [disabled, preventDefault, stopPropagation, onPressOut, onPress]);
    const handleMouseLeave = (0, react_1.useCallback)((event) => {
        if (disabled)
            return;
        setIsPressed(false);
        onPressOut === null || onPressOut === void 0 ? void 0 : onPressOut();
    }, [disabled, onPressOut]);
    // ============================================
    // CLEANUP
    // ============================================
    (0, react_1.useEffect)(() => {
        return () => {
            if (pressTimerRef.current) {
                clearTimeout(pressTimerRef.current);
            }
        };
    }, []);
    // ============================================
    // STYLES
    // ============================================
    const touchTargetStyle = Object.assign({ minWidth: `${touchTargetSize}px`, minHeight: `${touchTargetSize}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', opacity: disabled ? 0.5 : isPressed ? activeOpacity : 1, transition: 'opacity 0.1s ease-in-out' }, style);
    // ============================================
    // RENDER
    // ============================================
    return (react_1.default.createElement("div", { ref: elementRef, className: `touchable-opacity ${className}`, style: touchTargetStyle, onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchCancel, onMouseDown: handleMouseDown, onMouseUp: handleMouseUp, onMouseLeave: handleMouseLeave, role: "button", tabIndex: disabled ? -1 : 0, "aria-disabled": disabled }, children));
};
exports.TouchableOpacity = TouchableOpacity;
// ============================================
// EXPORT
// ============================================
exports.default = exports.TouchableOpacity;
