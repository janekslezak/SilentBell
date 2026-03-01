// ─── Central State Management Module ─────────────────────────────
// Provides single source of truth for application state with
// reactive subscriptions and immutable updates.

import { Storage } from './storage.js';

// Current schema version for migrations
export const SCHEMA_VERSION = 2;

// Default state configuration
const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  timer: {
    selectedMinutes: 20,
    selectedSeconds: 0,
    prepareSeconds: 10,
    isRunning: false,
    isPaused: false,
    endTimestamp: null,
    sessionStart: null,
    plannedDuration: 0,
    remainingSeconds: 0
  },
  audio: {
    currentSound: 'bell',
    intervalMinutes: 0,
    nextIntervalAt: null,
    contextState: 'suspended', // 'suspended' | 'running' | 'interrupted' | 'closed'
    lastError: null
  },
  settings: {
    duration: 20,
    sound: 'bell',
    prepare: 10,
    interval: 0,
    notes: true,
    language: 'en',
    theme: 'dark'
  },
  log: {
    chartMode: 'week', // 'week' | 'average'
    sessions: []
  },
  wakeLock: {
    isActive: false,
    type: null // 'native' | 'nosleep' | 'video' | 'none'
  }
};

// Deep freeze utility for immutable state
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;
  
  const props = Object.getOwnPropertyNames(obj);
  for (const prop of props) {
    const value = obj[prop];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

// Deep clone utility
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(deepClone);
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

// State store class
class StateStore {
  constructor() {
    this._state = deepFreeze(deepClone(DEFAULT_STATE));
    this._listeners = new Map();
    this._listenerId = 0;
    this._batchDepth = 0;
    this._pendingNotifications = new Set();
  }

  // Get current state (immutable)
  getState() {
    return this._state;
  }

  // Get specific path from state
  get(path) {
    const keys = path.split('.');
    let value = this._state;
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  // Subscribe to state changes
  subscribe(path, callback) {
    const id = ++this._listenerId;
    const entry = { path, callback, id };
    
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    this._listeners.get(path).add(entry);
    
    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(path);
      if (listeners) {
        listeners.delete(entry);
        if (listeners.size === 0) {
          this._listeners.delete(path);
        }
      }
    };
  }

  // Batch multiple updates
  batch(callback) {
    this._batchDepth++;
    try {
      callback();
    } finally {
      this._batchDepth--;
      if (this._batchDepth === 0) {
        this._flushNotifications();
      }
    }
  }

  // Update state at path
  set(path, value) {
    const keys = path.split('.');
    const newState = deepClone(this._state);
    let target = newState;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target[keys[i]] = deepClone(target[keys[i]]);
      target = target[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    this._state = deepFreeze(newState);
    
    if (oldValue !== value) {
      this._queueNotification(path);
    }
    
    if (this._batchDepth === 0) {
      this._flushNotifications();
    }
    
    return this._state;
  }

  // Merge partial state
  merge(path, partial) {
    const current = this.get(path);
    if (typeof current !== 'object' || current === null) {
      throw new Error(`Cannot merge into non-object at path: ${path}`);
    }
    return this.set(path, { ...current, ...partial });
  }

  // Reset state to defaults
  reset() {
    this._state = deepFreeze(deepClone(DEFAULT_STATE));
    this._notifyAll();
  }

  // Load state from storage with migration
  loadFromStorage() {
    try {
      const storage = new Storage();
      const saved = storage.get('app_state');
      
      if (!saved) {
        this._migrateLegacySettings();
        return;
      }
      
      // Version migration
      const version = saved.version || 1;
      const migrated = this._migrateState(saved, version);
      
      // Merge with defaults to ensure all fields exist
      const merged = this._mergeWithDefaults(migrated);
      this._state = deepFreeze(merged);
      
      this._notifyAll();
    } catch (error) {
      console.warn('State.loadFromStorage:', error);
      this._migrateLegacySettings();
    }
  }

  // Save state to storage
  saveToStorage() {
    try {
      const storage = new Storage();
      storage.set('app_state', deepClone(this._state));
    } catch (error) {
      console.warn('State.saveToStorage:', error);
    }
  }

  // Legacy migration from individual localStorage keys
  _migrateLegacySettings() {
    const storage = new Storage();
    const legacy = {
      duration: storage.getRaw('settings_duration'),
      sound: storage.getRaw('settings_sound'),
      prepare: storage.getRaw('settings_prepare'),
      interval: storage.getRaw('settings_interval'),
      notes: storage.getRaw('settings_notes'),
      language: storage.getRaw('lang'),
      theme: storage.getRaw('theme'),
      chartMode: storage.getRaw('log_chart_mode')
    };
    
    const updates = {};
    
    if (legacy.duration) updates.duration = parseInt(legacy.duration, 10);
    if (legacy.sound) updates.sound = legacy.sound;
    if (legacy.prepare !== null) updates.prepare = parseInt(legacy.prepare, 10);
    if (legacy.interval) updates.interval = parseInt(legacy.interval, 10);
    if (legacy.notes) updates.notes = legacy.notes === 'on';
    if (legacy.language) updates.language = legacy.language;
    if (legacy.theme) updates.theme = legacy.theme;
    if (legacy.chartMode) updates.chartMode = legacy.chartMode;
    
    if (Object.keys(updates).length > 0) {
      this.batch(() => {
        for (const [key, value] of Object.entries(updates)) {
          if (key === 'chartMode') {
            this.set('log.chartMode', value);
          } else {
            this.set(`settings.${key}`, value);
          }
        }
      });
      this.saveToStorage();
    }
  }

  // Migrate state between versions
  _migrateState(state, fromVersion) {
    if (fromVersion === SCHEMA_VERSION) return state;
    
    let migrated = deepClone(state);
    
    // v1 -> v2: Added wakeLock and audio.contextState
    if (fromVersion < 2) {
      migrated.wakeLock = deepClone(DEFAULT_STATE.wakeLock);
      migrated.audio = { ...migrated.audio, ...DEFAULT_STATE.audio };
    }
    
    migrated.version = SCHEMA_VERSION;
    return migrated;
  }

  // Merge saved state with defaults
  _mergeWithDefaults(saved) {
    const merged = deepClone(DEFAULT_STATE);
    
    function mergeRecursive(target, source) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (target[key] !== undefined && typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            mergeRecursive(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }
    
    mergeRecursive(merged, saved);
    return merged;
  }

  // Queue notification for path
  _queueNotification(path) {
    this._pendingNotifications.add(path);
    
    // Also queue parent paths
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) {
      this._pendingNotifications.add(parts.slice(0, i).join('.'));
    }
  }

  // Flush pending notifications
  _flushNotifications() {
    if (this._pendingNotifications.size === 0) return;
    
    const notified = new Set();
    
    for (const path of this._pendingNotifications) {
      this._notifyPath(path, notified);
    }
    
    this._pendingNotifications.clear();
  }

  // Notify listeners for specific path
  _notifyPath(path, notified) {
    if (notified.has(path)) return;
    notified.add(path);
    
    const listeners = this._listeners.get(path);
    if (listeners) {
      const value = this.get(path);
      for (const { callback } of listeners) {
        try {
          callback(value, path);
        } catch (error) {
          console.warn('State listener error:', error);
        }
      }
    }
    
    // Notify wildcard listeners
    const wildcard = this._listeners.get('*');
    if (wildcard) {
      for (const { callback } of wildcard) {
        try {
          callback(this._state, path);
        } catch (error) {
          console.warn('State wildcard listener error:', error);
        }
      }
    }
  }

  // Notify all listeners
  _notifyAll() {
    for (const path of this._listeners.keys()) {
      this._notifyPath(path, new Set());
    }
  }
}

// Create singleton instance
export const state = new StateStore();

// Convenience exports
export const getState = () => state.getState();
export const get = (path) => state.get(path);
export const set = (path, value) => state.set(path, value);
export const merge = (path, partial) => state.merge(path, partial);
export const subscribe = (path, callback) => state.subscribe(path, callback);
export const batch = (callback) => state.batch(callback);
export const reset = () => state.reset();
export const loadFromStorage = () => state.loadFromStorage();
export const saveToStorage = () => state.saveToStorage();

// Debug helper (only in development)
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  window.__STATE__ = state;
}
