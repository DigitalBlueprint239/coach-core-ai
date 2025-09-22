// src/components/ui/SwipeGesture.tsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
// Optional haptics import for mobile devices
let Haptics: any = null;
try {
  Haptics = require('@capacitor/haptics').Haptics;
} catch (e) {
  // Haptics not available, will use fallback
  Haptics = {
    impact: () => Promise.resolve(),
    selection: () => Promise.resolve(),
    notification: () => Promise.resolve()
  };
}

interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeDelete?: () => void;
  onPullToRefresh?: () => Promise<void>;
  swipeThreshold?: number;
  swipeVelocity?: number;
  enableSwipeDelete?: boolean;
  enablePullToRefresh?: boolean;
  enableSwipeNavigation?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  velocityX: number;
  velocityY: number;
  isMoving: boolean;
}

export const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onSwipeDelete,
  onPullToRefresh,
  swipeThreshold = 50,
  swipeVelocity = 0.3,
  enableSwipeDelete = true,
  enablePullToRefresh = true,
  enableSwipeNavigation = true,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0,
    isMoving: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDeleteButton, setShowDeleteButton] = useState(false);

  // ============================================
  // HAPTIC FEEDBACK
  // ============================================

  const triggerHapticFeedback = useCallback(
    async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
      try {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await Haptics.impact({ style: 'medium' });
            break;
          case 'heavy':
            await Haptics.impact({ style: 'heavy' });
            break;
          case 'success':
            await Haptics.notification({ type: 'success' });
            break;
          case 'error':
            await Haptics.notification({ type: 'error' });
            break;
        }
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    },
    []
  );

  // ============================================
  // TOUCH EVENT HANDLERS
  // ============================================

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) return;

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

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) return;

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
      touchStateRef.current.isMoving =
        Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;

      // Handle pull-to-refresh
      if (enablePullToRefresh && deltaY > 0 && currentY < 100) {
        const pullDistance = Math.min(deltaY * 0.5, 100);
        setPullDistance(pullDistance);

        if (pullDistance > 80) {
          triggerHapticFeedback('medium');
        }
      }

      // Handle swipe-to-delete
      if (
        enableSwipeDelete &&
        deltaX < 0 &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        const swipeDistance = Math.min(Math.abs(deltaX), 100);
        setSwipeOffset(-swipeDistance);

        if (swipeDistance > 80) {
          setShowDeleteButton(true);
          triggerHapticFeedback('light');
        }
      }

      // Handle swipe navigation
      if (
        enableSwipeNavigation &&
        Math.abs(deltaX) > swipeThreshold &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
          triggerHapticFeedback('success');
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
          triggerHapticFeedback('success');
        }
      }
    },
    [
      enablePullToRefresh,
      enableSwipeDelete,
      enableSwipeNavigation,
      swipeThreshold,
      onSwipeRight,
      onSwipeLeft,
      triggerHapticFeedback,
    ]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const deltaX =
        touchStateRef.current.currentX - touchStateRef.current.startX;
      const deltaY =
        touchStateRef.current.currentY - touchStateRef.current.startY;
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
      } else {
        setPullDistance(0);
      }

      // Handle swipe-to-delete completion
      if (enableSwipeDelete && deltaX < -80 && onSwipeDelete) {
        onSwipeDelete();
        triggerHapticFeedback('success');
      } else {
        setSwipeOffset(0);
        setShowDeleteButton(false);
      }

      // Handle swipe navigation with velocity
      if (enableSwipeNavigation && velocityX > swipeVelocity) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
          triggerHapticFeedback('success');
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
          triggerHapticFeedback('success');
        }
      }

      // Handle vertical swipes
      if (velocityY > swipeVelocity) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
          triggerHapticFeedback('success');
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
          triggerHapticFeedback('success');
        }
      }

      // Reset touch state
      touchStateRef.current.isMoving = false;
    },
    [
      enablePullToRefresh,
      enableSwipeDelete,
      enableSwipeNavigation,
      swipeVelocity,
      onPullToRefresh,
      onSwipeDelete,
      onSwipeRight,
      onSwipeLeft,
      onSwipeUp,
      onSwipeDown,
      triggerHapticFeedback,
    ]
  );

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'pan-y', // Allow vertical scrolling
    transform: `translateX(${swipeOffset}px)`,
    transition: touchStateRef.current.isMoving
      ? 'none'
      : 'transform 0.3s ease-out',
    ...style,
  };

  const pullIndicatorStyle: React.CSSProperties = {
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

  const deleteButtonStyle: React.CSSProperties = {
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

  return (
    <div
      ref={containerRef}
      className={`swipe-gesture-container ${className}`}
      style={containerStyle}
    >
      {/* Pull-to-refresh indicator */}
      {enablePullToRefresh && (
        <div className="pull-indicator" style={pullIndicatorStyle}>
          {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
        </div>
      )}

      {/* Main content */}
      <div className="swipe-content">{children}</div>

      {/* Swipe-to-delete button */}
      {enableSwipeDelete && (
        <div className="delete-button" style={deleteButtonStyle}>
          Delete
        </div>
      )}
    </div>
  );
};

// ============================================
// EXPORT
// ============================================

export default SwipeGesture;
