import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw, CheckCircle2, ShieldAlert, CloudDownload } from 'lucide-react';
import { triggerHaptic, hapticSuccess } from '../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing' | 'success'>('idle');
  const startY = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);
  const hasTriggeredHapticReady = useRef<boolean>(false);

  const THRESHOLD = 65; // pixels to pull before triggering refresh
  const MAX_PULL = 100; // max visual displacement in px

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshState === 'refreshing') return;
    
    // Only allow pull-to-refresh if window is scrolled to top
    if (window.scrollY <= 2) {
      startY.current = e.touches[0].clientY;
      isPullingRef.current = true;
      hasTriggeredHapticReady.current = false;
    } else {
      startY.current = null;
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || startY.current === null || refreshState === 'refreshing') return;
    
    // If user scrolled down before pulling, abort pull
    if (window.scrollY > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      setRefreshState('idle');
      return;
    }

    const currentY = e.touches[0].clientY;
    const rawDelta = currentY - startY.current;

    if (rawDelta > 0) {
      // Damped curve for smooth physical resistance feel
      const damped = Math.min(Math.pow(rawDelta, 0.82) * 2.2, MAX_PULL);
      setPullDistance(damped);

      if (damped >= THRESHOLD) {
        setRefreshState('ready');
        if (!hasTriggeredHapticReady.current) {
          triggerHaptic('medium');
          hasTriggeredHapticReady.current = true;
        }
      } else {
        setRefreshState('pulling');
        hasTriggeredHapticReady.current = false;
      }
    } else {
      setPullDistance(0);
      setRefreshState('idle');
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || startY.current === null) return;
    isPullingRef.current = false;
    startY.current = null;

    if (refreshState === 'ready' || pullDistance >= THRESHOLD) {
      setRefreshState('refreshing');
      setPullDistance(56); // Keep indicator visible while syncing

      try {
        await onRefresh();
        setRefreshState('success');
        hapticSuccess();
        setTimeout(() => {
          setPullDistance(0);
          setTimeout(() => setRefreshState('idle'), 250);
        }, 700);
      } catch (error) {
        console.error('Erro no pull-to-refresh:', error);
        triggerHaptic('error');
        setRefreshState('idle');
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
      setRefreshState('idle');
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull-To-Refresh Visual Indicator Banner */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 8 ? Math.min(pullDistance / THRESHOLD, 1) : 0,
        }}
        className={`w-full overflow-hidden transition-[height,opacity] duration-150 ease-out flex items-center justify-center pointer-events-none z-20 ${
          refreshState === 'refreshing' || refreshState === 'success' ? 'transition-all duration-300' : ''
        }`}
      >
        <div className="py-2 flex items-center justify-center">
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#17102e] border-2 border-purple-500/80 shadow-xl shadow-purple-950/80 text-white backdrop-blur-md">
            {refreshState === 'pulling' && (
              <>
                <CloudDownload 
                  className="w-4 h-4 text-purple-400 transition-transform duration-150"
                  style={{ transform: `rotate(${Math.min(pullDistance * 3.5, 180)}deg)` }} 
                />
                <span className="text-[11px] font-bold text-purple-200">
                  Puxe para sincronizar...
                </span>
              </>
            )}

            {refreshState === 'ready' && (
              <>
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-[11px] font-black text-emerald-300">
                  Solte para atualizar do Firestore
                </span>
              </>
            )}

            {refreshState === 'refreshing' && (
              <>
                <RefreshCw className="w-4 h-4 text-purple-300 animate-spin" />
                <span className="text-[11px] font-bold text-purple-200 animate-pulse">
                  Atualizando oitivas do Firestore...
                </span>
              </>
            )}

            {refreshState === 'success' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-black text-emerald-300">
                  Sincronizado com a nuvem!
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          transform: pullDistance > 0 && refreshState !== 'refreshing' && refreshState !== 'success'
            ? `translateY(${Math.min(pullDistance * 0.2, 16)}px)` 
            : 'none',
          transition: isPullingRef.current ? 'none' : 'transform 0.25s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};
