/**
 * Haptic feedback utility using the Vibration API (navigator.vibrate)
 * Provides subtle, tactile feedback on touchscreen mobile devices.
 */

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'statusChange' 
  | 'swipe' 
  | 'toggle' 
  | 'success' 
  | 'warning' 
  | 'error';

export const isVibrationSupported = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Triggers haptic vibration based on specified interaction type
 */
export const triggerHaptic = (type: HapticType = 'selection'): void => {
  try {
    if (!isVibrationSupported()) return;

    switch (type) {
      case 'selection':
      case 'light':
        // Crisp, ultra-short tap for selecting items/dates/tabs
        navigator.vibrate(12);
        break;

      case 'medium':
        // Distinct tap for primary actions
        navigator.vibrate(22);
        break;

      case 'heavy':
        // Heavy feedback for critical actions (e.g. deletion, bulk unifications)
        navigator.vibrate(45);
        break;

      case 'statusChange':
        // Dual-pulse pattern for status alterations (Agendada -> Realizada / Falta)
        navigator.vibrate([18, 30, 22]);
        break;

      case 'swipe':
        // Snappy, gentle tick when swiping between calendar months/weeks/days
        navigator.vibrate(15);
        break;

      case 'toggle':
        // Short double-click when toggling intimations or switches
        navigator.vibrate([12, 25, 12]);
        break;

      case 'success':
        // Joyful double pulse on save/update success
        navigator.vibrate([15, 35, 30]);
        break;

      case 'warning':
        // Warning vibration
        navigator.vibrate([30, 40, 30]);
        break;

      case 'error':
        // Sharp triple pulse on validation/error
        navigator.vibrate([35, 30, 35, 30, 40]);
        break;

      default:
        navigator.vibrate(12);
        break;
    }
  } catch {
    // Ignore any browser restrictions or permission errors gracefully
  }
};

// Convenience helpers
export const hapticSelection = () => triggerHaptic('selection');
export const hapticStatusChange = () => triggerHaptic('statusChange');
export const hapticSwipe = () => triggerHaptic('swipe');
export const hapticToggle = () => triggerHaptic('toggle');
export const hapticSuccess = () => triggerHaptic('success');
export const hapticError = () => triggerHaptic('error');
export const hapticHeavy = () => triggerHaptic('heavy');
