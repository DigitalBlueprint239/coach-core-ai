// src/components/ui/TouchableOpacity.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';

// Optional haptics import for mobile devices - using dynamic import to avoid Vite scanning
let Haptics: any = null;

// Initialize haptics lazily to avoid dependency scanning issues
const initializeHaptics = async () => {
  if (Haptics) return Haptics;
  
  try {
    // Only try to load haptics if we're in a mobile environment
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      const hapticsModule = await import('@capacitor/haptics');
      Haptics = hapticsModule.Haptics;
    } else {
      throw new Error('Not in mobile environment');
    }
  } catch (e) {
    // Haptics not available, will use fallback
    Haptics = {
      impact: () => Promise.resolve(),
      selection: () => Promise.resolve(),
      notification: () => Promise.resolve()
    };
  }
  
  return Haptics;
};

interface TouchableOpacityProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  style?: React.CSSProperties;
  className?: string;
  hapticFeedback?:
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'error'
    | 'warning';
  longPressDelay?: number;
  touchTargetSize?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export const TouchableOpacity: React.FC<TouchableOpacityProps> = ({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled = false,
  activeOpacity = 0.7,
  style = {},
  className = '',
  hapticFeedback,
  longPressDelay = 500,
  touchTargetSize = 44,
  preventDefault = true,
  stopPropagation = true,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPositionRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const hasMovedRef = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // ============================================
  // HAPTIC FEEDBACK UTILITIES
  // ============================================

  const triggerHapticFeedback = useCallback(
    async (type: string) => {
      if (!hapticFeedback) return;

      try {
        const haptics = await initializeHaptics();
        
        switch (type) {
          case 'light':
            await haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await haptics.impact({ style: 'medium' });
            break;
          case 'heavy':
            await haptics.impact({ style: 'heavy' });
            break;
          case 'success':
            await haptics.notification({ type: 'success' });
            break;
          case 'error':
            await haptics.notification({ type: 'error' });
            break;
          case 'warning':
            await haptics.notification({ type: 'warning' });
            break;
          default:
            await haptics.impact({ style: 'light' });
        }
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    },
    [hapticFeedback]
  );

  // ============================================
  // TOUCH EVENT HANDLERS
  // ============================================

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;

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

      onPressIn?.();

      // Start long press timer
      pressTimerRef.current = setTimeout(() => {
        if (!hasMovedRef.current) {
          setIsLongPressed(true);
          onLongPress?.();
          triggerHapticFeedback('medium');
        }
      }, longPressDelay);
    },
    [
      disabled,
      preventDefault,
      stopPropagation,
      onPressIn,
      onLongPress,
      longPressDelay,
      triggerHapticFeedback,
    ]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;

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
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;

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

      onPressOut?.();

      if (isQuickTap && onPress) {
        onPress();
        triggerHapticFeedback('light');
      }
    },
    [
      disabled,
      preventDefault,
      stopPropagation,
      onPressOut,
      onPress,
      longPressDelay,
      triggerHapticFeedback,
    ]
  );

  const handleTouchCancel = useCallback(
    (event: React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(false);
      setIsLongPressed(false);

      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }

      onPressOut?.();
    },
    [disabled, onPressOut]
  );

  // ============================================
  // MOUSE EVENT HANDLERS (FOR DESKTOP)
  // ============================================

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      setIsPressed(true);
      onPressIn?.();
    },
    [disabled, preventDefault, stopPropagation, onPressIn]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      setIsPressed(false);
      onPressOut?.();

      if (onPress) {
        onPress();
      }
    },
    [disabled, preventDefault, stopPropagation, onPressOut, onPress]
  );

  const handleMouseLeave = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      setIsPressed(false);
      onPressOut?.();
    },
    [disabled, onPressOut]
  );

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  // ============================================
  // STYLES
  // ============================================

  const touchTargetStyle: React.CSSProperties = {
    minWidth: `${touchTargetSize}px`,
    minHeight: `${touchTargetSize}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    opacity: disabled ? 0.5 : isPressed ? activeOpacity : 1,
    transition: 'opacity 0.1s ease-in-out',
    ...style,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={elementRef}
      className={`touchable-opacity ${className}`}
      style={touchTargetStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
};

// ============================================
// EXPORT
// ============================================

export default TouchableOpacity;
