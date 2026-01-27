type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const vibrationPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50],
  selection: 5,
};

export function triggerHaptic(type: HapticType = 'medium'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    const pattern = vibrationPatterns[type] || vibrationPatterns.medium;
    navigator.vibrate(pattern);
  } catch (e) {
    // Haptics not supported or permission denied
  }
}

export function hapticLike(): void {
  triggerHaptic('success');
}

export function hapticPass(): void {
  triggerHaptic('light');
}

export function hapticMatch(): void {
  triggerHaptic('heavy');
  setTimeout(() => triggerHaptic('success'), 150);
}

export function hapticError(): void {
  triggerHaptic('error');
}

export function hapticSelection(): void {
  triggerHaptic('selection');
}
