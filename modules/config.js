/**
 * Silent Bell Configuration
 * Centralized constants and environment detection
 */

// Environment detection
export const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const IS_ANDROID = /Android/.test(navigator.userAgent);
export const IS_STANDALONE = window.navigator.standalone === true || 
                            window.matchMedia('(display-mode: standalone)').matches;

// Timing Constants (milliseconds)
export const TIMING = {
  AUDIO_CLEANUP: {
    IOS: 12000,      // iOS audio fade-out duration
    ANDROID: 20000,  // Android needs longer for fade
    DEFAULT: 15000
  },
  WAKE_LOCK_RELEASE: {
    IOS: 10000,
    ANDROID: 18000,
    DEFAULT: 15000
  },
  LOADING_SCREEN: 1500,
  PRELOAD_TIMEOUT: 5000
};

// Session Limits (seconds)
export const LIMITS = {
  MIN_DURATION: 60,
  MAX_DURATION: 28800,
  DEFAULT_MINUTES: 20
};

// Storage Configuration
export const STORAGE = {
  KEY: 'silent_bell_state',
  SCHEMA_VERSION: 2,
  QUOTA_BYTES: 5 * 1024 * 1024,
  WARNING_THRESHOLD: 0.8,
  MAX_ITEM_SIZE: 1024 * 1024,
  PREFIX: 'silentbell_'
};

// Debug
export const DEBUG = true;

export function log(scope, ...args) {
  if (DEBUG) console.log(`[${scope}]`, ...args);
}
