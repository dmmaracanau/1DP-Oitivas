import { useRef, TouchEvent } from 'react';
import { hapticSwipe } from './haptics';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number;
  maxVerticalOffset?: number;
  enabled?: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

/**
 * Hook for detecting clean horizontal swipe gestures on touch devices.
 * Automatically triggers haptic feedback on successful swipe.
 */
export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 50,
  maxVerticalOffset = 70,
  enabled = true,
}: SwipeGestureOptions): SwipeHandlers => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!enabled) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!enabled) return;
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchEndX.current === null ||
      touchEndY.current === null
    ) {
      return;
    }

    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;

    // Check if horizontal movement exceeds minDistance and vertical movement is within tolerance
    const isHorizontalSwipe =
      Math.abs(deltaX) >= minDistance && Math.abs(deltaY) <= maxVerticalOffset;

    if (isHorizontalSwipe) {
      if (deltaX < 0 && onSwipeLeft) {
        // Swiped Left -> Advance forward (Next month / week / day)
        hapticSwipe();
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        // Swiped Right -> Go backward (Previous month / week / day)
        hapticSwipe();
        onSwipeRight();
      }
    }

    // Reset touch coordinates
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
