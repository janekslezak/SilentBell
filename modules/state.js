/**
 * State Module - Consolidated with Storage
 * Maintains exact same API as original for compatibility
 */

import { Storage, QuotaExceededError } from './storage.js';
import { STORAGE, LIMITS, DEBUG } from './config.js';

const consoleLog = (...args) => DEBUG && console.log('[State]', ...args);

// Initialize storage engine
const storage = new Storage({
  prefix: STORAGE.PREFIX,
  schemaVersion: STORAGE.SCHEMA_VERSION,
  compression: true
});

// Default state object
const defaultState = {
  timer: {
    selectedMinutes: LIMITS.DEFAULT_MINUTES,
    selectedSeconds: 0,
    prepareSeconds: 10
  },
  audio: {
    currentSound: 'bell'
  },
  settings: {
    duration: LIMITS.DEFAULT_MINUTES,
    sound: 'bell',
    interval: 0,
    prepare: 10,
    notes: true
  }
};

// Deep clone for initial state
export let state = JSON.parse(JSON.stringify(defaultState));

/**
 * Load state from storage
 */
export function loadFromStorage() {
  try {
    const stored = storage.get('app_state');
    if (stored) {
      // Deep merge to ensure all fields exist
      state = { ...defaultState, ...stored };
      
      // Ensure nested objects exist
      state.timer = { ...defaultState.timer, ...state.timer };
      state.audio = { ...defaultState.audio, ...state.audio };
      state.settings = { ...defaultState.settings, ...state.settings };
      
      consoleLog('State loaded from storage');
    } else {
      // Try legacy migration
      const migrated = migrateFromLegacy();
      if (Object.keys(migrated).length > 0) {
        Object.assign(state, migrated);
        saveToStorage();
        consoleLog('State migrated from legacy format');
      }
    }
  } catch (e) {
    consoleLog('Load error:', e.message);
    state = JSON.parse(JSON.stringify(defaultState));
  }
}

/**
 * Save state to storage
 */
export function saveToStorage() {
  try {
    storage.set('app_state', state);
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      consoleLog('Quota exceeded, cleaning up...');
      storage._cleanupOldData?.();
      try {
        storage.set('app_state', state);
      } catch (e2) {
        consoleLog('Failed to save after cleanup:', e2.message);
      }
    } else {
      consoleLog('Save error:', e.message);
    }
  }
}

/**
 * Get value by dot-notation key
 */
export function get(key) {
  const keys = key.split('.');
  let value = state;
  for (const k of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[k];
  }
  return value;
}

/**
 * Set value by dot-notation key
 */
export function set(key, value) {
  const keys = key.split('.');
  let target = state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

// Legacy migration helper
function migrateFromLegacy() {
  const result = {};
  const legacyKeys = {
    'settings_duration': { path: ['settings', 'duration'], type: 'number' },
    'settings_sound': { path: ['settings', 'sound'], type: 'string' },
    'settings_prepare': { path: ['settings', 'prepare'], type: 'number' },
    'settings_interval': { path: ['settings', 'interval'], type: 'number' },
    'settings_notes': { path: ['settings', 'notes'], type: 'boolean' }
  };
  
  for (const [legacyKey, config] of Object.entries(legacyKeys)) {
    const value = localStorage.getItem(legacyKey) || localStorage.getItem(STORAGE.PREFIX + legacyKey);
    if (value !== null) {
      let parsed = value;
      if (config.type === 'number') parsed = parseInt(value, 10);
      if (config.type === 'boolean') parsed = value === 'true' || value === 'on';
      
      // Set nested value
      let target = result;
      for (let i = 0; i < config.path.length - 1; i++) {
        if (!target[config.path[i]]) target[config.path[i]] = {};
        target = target[config.path[i]];
      }
      target[config.path[config.path.length - 1]] = parsed;
      
      // Clean up legacy
      try {
        localStorage.removeItem(legacyKey);
        localStorage.removeItem(STORAGE.PREFIX + legacyKey);
      } catch (e) {}
    }
  }
  
  return result;
}

// Backward compatibility: export storage for advanced usage
export { storage };
