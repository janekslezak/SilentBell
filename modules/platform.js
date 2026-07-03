// ─── Platform Detection Module ───────────────────────────────────
// Single source of truth for platform detection. All other modules
// import from here — never duplicate platform checks.

const ua = navigator.userAgent;

export const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
export const isAndroid = /Android/.test(ua);
export const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
export const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
export const isMobile = isIOS || isAndroid;
export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// iOS version detection (for feature-gating if needed)
export function getIOSVersion() {
  if (!isIOS) return 0;
  const match = ua.match(/OS (\d+)[_\.]?(\d+)?/);
  return match ? parseInt(match[1], 10) : 0;
}

// Web Audio API support check
export function supportsWebAudio() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

// Native Wake Lock API support
export function supportsWakeLock() {
  return 'wakeLock' in navigator;
}

// Vibration API support
export function supportsVibration() {
  return 'vibrate' in navigator;
}

// LocalStorage availability check
export function supportsLocalStorage() {
  try {
    const test = '__ls_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
