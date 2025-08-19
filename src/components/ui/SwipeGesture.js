"use strict";
// src/components/ui/SwipeGesture.tsx
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
exports.SwipeGesture = void 0;
const react_1 = __importStar(require("react"));
const haptics_1 = require("@capacitor/haptics");
const SwipeGesture = ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeDelete, onPullToRefresh, swipeThreshold = 50, swipeVelocity = 0.3, enableSwipeDelete = true, enablePullToRefresh = true, enableSwipeNavigation = true, className = '', style = {}, }) => {
    const containerRef = (0, react_1.useRef)(null);
    const touchStateRef = (0, react_1.useRef)({
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        currentY: 0,
        velocityX: 0,
        velocityY: 0,
        isMoving: false,
    });
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    const [pullDistance, setPullDistance] = (0, react_1.useState)(0);
    const [swipeOffset, setSwipeOffset] = (0, react_1.useState)(0);
    const [showDeleteButton, setShowDeleteButton] = (0, react_1.useState)(false);
    // ============================================
    // HAPTIC FEEDBACK
    // ============================================
    const triggerHapticFeedback = (0, react_1.useCallback)((type) => __awaiter(void 0, void 0, void 0, function* () {
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
            }
        }
        catch (error) {
            console.warn('Haptic feedback not available:', error);
        }
    }), []);
    // ============================================
    // TOUCH EVENT HANDLERS
    // ============================================
    const handleTouchStart = (0, react_1.useCallback)((event) => {
        var _a;
        const touch = event.touches[0];
        const rect = (_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return;
        touchStateRef.current = {
            startX: touch.clientX - rect.left,
            startY: touch.clientY - rect.top,
            startTime: Date.now(),
            currentX: touch.clientX - rect.left,
            currentY: touch.clientY - rect.top,
            velocityX: 0,
            velocityY: 0,
            isMoving: false,
        };
        // Reset states
        setSwipeOffset(0);
        setShowDeleteButton(false);
    }, []);
    const handleTouchMove = (0, react_1.useCallback)((event) => {
        var _a;
        const touch = event.touches[0];
        const rect = (_a = containerRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return;
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        const deltaX = currentX - touchStateRef.current.startX;
        const deltaY = currentY - touchStateRef.current.startY;
        const deltaTime = Date.now() - touchStateRef.current.startTime;
        // Update touch state
        touchStateRef.current.currentX = currentX;
        touchStateRef.current.currentY = currentY;
        touchStateRef.current.velocityX = deltaX / deltaTime;
        touchStateRef.current.velocityY = deltaY / deltaTime;
        touchStateRef.current.isMoving = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
        // Handle pull-to-refresh
        if (enablePullToRefresh && deltaY > 0 && currentY < 100) {
            const pullDistance = Math.min(deltaY * 0.5, 100);
            setPullDistance(pullDistance);
            if (pullDistance > 80) {
                triggerHapticFeedback('medium');
            }
        }
        // Handle swipe-to-delete
        if (enableSwipeDelete && deltaX < 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
            const swipeDistance = Math.min(Math.abs(deltaX), 100);
            setSwipeOffset(-swipeDistance);
            if (swipeDistance > 80) {
                setShowDeleteButton(true);
                triggerHapticFeedback('light');
            }
        }
        // Handle swipe navigation
        if (enableSwipeNavigation && Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
                triggerHapticFeedback('success');
            }
            else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
                triggerHapticFeedback('success');
            }
        }
    }, [enablePullToRefresh, enableSwipeDelete, enableSwipeNavigation, swipeThreshold, onSwipeRight, onSwipeLeft, triggerHapticFeedback]);
    const handleTouchEnd = (0, react_1.useCallback)((event) => {
        const deltaX = touchStateRef.current.currentX - touchStateRef.current.startX;
        const deltaY = touchStateRef.current.currentY - touchStateRef.current.startY;
        const deltaTime = Date.now() - touchStateRef.current.startTime;
        const velocityX = Math.abs(touchStateRef.current.velocityX);
        const velocityY = Math.abs(touchStateRef.current.velocityY);
        // Handle pull-to-refresh completion
        if (enablePullToRefresh && deltaY > 80 && onPullToRefresh) {
            setIsRefreshing(true);
            onPullToRefresh().finally(() => {
                setIsRefreshing(false);
                setPullDistance(0);
                triggerHapticFeedback('success');
            });
        }
        else {
            setPullDistance(0);
        }
        // Handle swipe-to-delete completion
        if (enableSwipeDelete && deltaX < -80 && onSwipeDelete) {
            onSwipeDelete();
            triggerHapticFeedback('success');
        }
        else {
            setSwipeOffset(0);
            setShowDeleteButton(false);
        }
        // Handle swipe navigation with velocity
        if (enableSwipeNavigation && velocityX > swipeVelocity) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight();
                triggerHapticFeedback('success');
            }
            else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft();
                triggerHapticFeedback('success');
            }
        }
        // Handle vertical swipes
        if (velocityY > swipeVelocity) {
            if (deltaY > 0 && onSwipeDown) {
                onSwipeDown();
                triggerHapticFeedback('success');
            }
            else if (deltaY < 0 && onSwipeUp) {
                onSwipeUp();
                triggerHapticFeedback('success');
            }
        }
        // Reset touch state
        touchStateRef.current.isMoving = false;
    }, [enablePullToRefresh, enableSwipeDelete, enableSwipeNavigation, swipeVelocity, onPullToRefresh, onSwipeDelete, onSwipeRight, onSwipeLeft, onSwipeUp, onSwipeDown, triggerHapticFeedback]);
    // ============================================
    // EFFECTS
    // ============================================
    (0, react_1.useEffect)(() => {
        const container = containerRef.current;
        if (!container)
            return;
        // Add touch event listeners
        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: false });
        // Cleanup
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    // ============================================
    // RENDER
    // ============================================
    const containerStyle = Object.assign({ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', transform: `translateX(${swipeOffset}px)`, transition: touchStateRef.current.isMoving ? 'none' : 'transform 0.3s ease-out' }, style);
    const pullIndicatorStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${Math.max(0, pullDistance)}px`,
        backgroundColor: '#007AFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: '500',
        transform: `translateY(-${Math.max(0, pullDistance)}px)`,
        transition: 'transform 0.2s ease-out',
    };
    const deleteButtonStyle = {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '80px',
        backgroundColor: '#E74C3C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: '500',
        transform: `translateX(${showDeleteButton ? 0 : 100}%)`,
        transition: 'transform 0.3s ease-out',
    };
    return (react_1.default.createElement("div", { ref: containerRef, className: `swipe-gesture-container ${className}`, style: containerStyle },
        enablePullToRefresh && (react_1.default.createElement("div", { className: "pull-indicator", style: pullIndicatorStyle }, isRefreshing ? 'Refreshing...' : 'Pull to refresh')),
        react_1.default.createElement("div", { className: "swipe-content" }, children),
        enableSwipeDelete && (react_1.default.createElement("div", { className: "delete-button", style: deleteButtonStyle }, "Delete"))));
};
exports.SwipeGesture = SwipeGesture;
// ============================================
// EXPORT
// ============================================
exports.default = exports.SwipeGesture;
