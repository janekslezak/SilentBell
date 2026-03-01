// ─── Storage Module ──────────────────────────────────────────────
// Provides LocalStorage access with schema versioning,
// quota error handling, and graceful fallbacks.

// Storage quota information
const QUOTA_INFO = {
  estimatedLimit: 5 * 1024 * 1024, // 5MB typical limit
  warningThreshold: 0.8, // 80%
  maxItemSize: 1024 * 1024 // 1MB per item
};

// Custom error types
export class StorageError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
  }
}

export class QuotaExceededError extends StorageError {
  constructor(message, details = {}) {
    super(message, 'QUOTA_EXCEEDED', details);
    this.name = 'QuotaExceededError';
  }
}

export class SchemaError extends StorageError {
  constructor(message, details = {}) {
    super(message, 'SCHEMA_MISMATCH', details);
    this.name = 'SchemaError';
  }
}

// Storage class with error handling
export class Storage {
  constructor(options = {}) {
    this.prefix = options.prefix || 'silentbell_';
    this.schemaVersion = options.schemaVersion || 1;
    this.compressionEnabled = options.compression !== false;
    this.fallbackStorage = new Map(); // In-memory fallback
    this._checkAvailability();
  }

  // Check if localStorage is available
  _checkAvailability() {
    this._available = false;
    this._quotaExceeded = false;
    
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      
      const testKey = this._key('__test__');
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      this._available = true;
    } catch (error) {
      if (this._isQuotaError(error)) {
        this._quotaExceeded = true;
      }
      console.warn('Storage not available:', error.message);
    }
  }

  // Check if error is quota-related
  _isQuotaError(error) {
    if (!error) return false;
    
    const quotaMessages = [
      'quota exceeded',
      'quotaexceedederror',
      'storage quota',
      'exceeded the quota',
      '22', // Safari quota error code
      '1014' // Firefox quota error code
    ];
    
    const message = (error.message || error.name || '').toLowerCase();
    return quotaMessages.some(qm => message.includes(qm));
  }

  // Get prefixed key
  _key(key) {
    return this.prefix + key;
  }

  // Compress data (simple RLE for repetitive data)
  _compress(data) {
    if (!this.compressionEnabled) return data;
    
    try {
      const json = JSON.stringify(data);
      
      // Only compress if data is large enough
      if (json.length < 1000) return data;
      
      // Simple compression for repetitive strings
      let compressed = json;
      const patterns = [
        /"date":"\d{4}-\d{2}-\d{2}"/g,
        /"startTime":"\d{2}:\d{2}"/g,
        /"completed":(true|false)/g,
        /"sound":"(bell|bell-high|chugpi|none)"/g
      ];
      
      const tokens = new Map();
      let tokenId = 0;
      
      for (const pattern of patterns) {
        compressed = compressed.replace(pattern, (match) => {
          if (!tokens.has(match)) {
            tokens.set(match, `§${tokenId++}`);
          }
          return tokens.get(match);
        });
      }
      
      if (compressed.length < json.length * 0.9) {
        return {
          __compressed: true,
          tokens: Object.fromEntries(tokens),
          data: compressed
        };
      }
    } catch (error) {
      console.warn('Compression failed:', error);
    }
    
    return data;
  }

  // Decompress data
  _decompress(data) {
    if (!data || !data.__compressed) return data;
    
    try {
      let decompressed = data.data;
      
      // Reverse token substitution
      for (const [token, value] of Object.entries(data.tokens)) {
        decompressed = decompressed.split(token).join(value);
      }
      
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }

  // Get storage usage estimate
  getUsage() {
    if (!this._available) {
      return { used: 0, total: 0, percent: 0 };
    }
    
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key) || '';
          used += key.length + value.length;
        }
      }
      
      return {
        used,
        total: QUOTA_INFO.estimatedLimit,
        percent: used / QUOTA_INFO.estimatedLimit
      };
    } catch (error) {
      return { used: 0, total: 0, percent: 0, error: error.message };
    }
  }

  // Check if approaching quota limit
  isNearQuota() {
    const usage = this.getUsage();
    return usage.percent > QUOTA_INFO.warningThreshold;
  }

  // Get item with error handling
  get(key, defaultValue = null) {
    const fullKey = this._key(key);
    
    try {
      // Try localStorage first
      if (this._available) {
        const value = localStorage.getItem(fullKey);
        if (value !== null) {
          const parsed = JSON.parse(value);
          return this._decompress(parsed);
        }
      }
      
      // Fall back to memory storage
      if (this.fallbackStorage.has(fullKey)) {
        return this.fallbackStorage.get(fullKey);
      }
      
      return defaultValue;
    } catch (error) {
      console.warn(`Storage.get('${key}'):`, error);
      return defaultValue;
    }
  }

  // Get raw string value (for migration)
  getRaw(key) {
    const fullKey = this._key(key);
    
    try {
      if (this._available) {
        return localStorage.getItem(fullKey);
      }
    } catch (error) {
      console.warn(`Storage.getRaw('${key}'):`, error);
    }
    return null;
  }

  // Set item with error handling
  set(key, value) {
    const fullKey = this._key(key);
    
    try {
      const compressed = this._compress(value);
      const serialized = JSON.stringify(compressed);
      
      // Check item size
      if (serialized.length > QUOTA_INFO.maxItemSize) {
        throw new QuotaExceededError(
          `Item size (${serialized.length}) exceeds maximum (${QUOTA_INFO.maxItemSize})`,
          { key, size: serialized.length, maxSize: QUOTA_INFO.maxItemSize }
        );
      }
      
      if (this._available) {
        try {
          localStorage.setItem(fullKey, serialized);
          return true;
        } catch (error) {
          if (this._isQuotaError(error)) {
            // Try to free up space
            this._cleanupOldData();
            
            // Retry once
            try {
              localStorage.setItem(fullKey, serialized);
              return true;
            } catch (retryError) {
              throw new QuotaExceededError(
                'Storage quota exceeded after cleanup',
                { key, originalError: error.message }
              );
            }
          }
          throw error;
        }
      } else {
        // Use memory fallback
        this.fallbackStorage.set(fullKey, value);
        return true;
      }
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw error;
      }
      throw new StorageError(
        `Failed to set '${key}': ${error.message}`,
        'SET_ERROR',
        { key, originalError: error.message }
      );
    }
  }

  // Remove item
  remove(key) {
    const fullKey = this._key(key);
    
    try {
      if (this._available) {
        localStorage.removeItem(fullKey);
      }
      this.fallbackStorage.delete(fullKey);
      return true;
    } catch (error) {
      console.warn(`Storage.remove('${key}'):`, error);
      return false;
    }
  }

  // Clear all items with this prefix
  clear() {
    try {
      if (this._available) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      }
      this.fallbackStorage.clear();
      return true;
    } catch (error) {
      console.warn('Storage.clear:', error);
      return false;
    }
  }

  // Get all keys with this prefix
  keys() {
    const keys = [];
    
    try {
      if (this._available) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keys.push(key.slice(this.prefix.length));
          }
        }
      }
      
      for (const key of this.fallbackStorage.keys()) {
        const shortKey = key.startsWith(this.prefix) ? key.slice(this.prefix.length) : key;
        if (!keys.includes(shortKey)) {
          keys.push(shortKey);
        }
      }
    } catch (error) {
      console.warn('Storage.keys:', error);
    }
    
    return keys;
  }

  // Clean up old data to free space
  _cleanupOldData() {
    try {
      // Remove legacy keys that are now in state
      const legacyKeys = [
        'settings_duration', 'settings_sound', 'settings_prepare',
        'settings_interval', 'settings_notes', 'lang', 'theme', 'log_chart_mode'
      ];
      
      for (const key of legacyKeys) {
        const fullKey = this._key(key);
        if (localStorage.getItem(fullKey)) {
          localStorage.removeItem(fullKey);
        }
      }
      
      // If still near quota, trim meditation log
      if (this.isNearQuota()) {
        this._trimLogData();
      }
    } catch (error) {
      console.warn('Storage cleanup failed:', error);
    }
  }

  // Trim oldest log entries
  _trimLogData() {
    try {
      const logKey = this._key('meditation_log');
      const logData = localStorage.getItem(logKey);
      
      if (logData) {
        const sessions = JSON.parse(logData);
        if (Array.isArray(sessions) && sessions.length > 50) {
          // Keep only the 50 most recent sessions
          const trimmed = sessions.slice(0, 50);
          localStorage.setItem(logKey, JSON.stringify(trimmed));
        }
      }
    } catch (error) {
      console.warn('Log trim failed:', error);
    }
  }

  // Export all data
  export() {
    const data = {};
    
    try {
      for (const key of this.keys()) {
        data[key] = this.get(key);
      }
    } catch (error) {
      console.warn('Storage.export:', error);
    }
    
    return data;
  }

  // Import data
  import(data, options = {}) {
    const { merge = false, validate = true } = options;
    
    try {
      if (!merge) {
        this.clear();
      }
      
      for (const [key, value] of Object.entries(data)) {
        if (validate && key === 'app_state' && value.version) {
          // Validate schema version
          if (value.version > this.schemaVersion) {
            throw new SchemaError(
              `Cannot import data from newer schema version (${value.version} > ${this.schemaVersion})`,
              { importedVersion: value.version, currentVersion: this.schemaVersion }
            );
          }
        }
        
        this.set(key, value);
      }
      
      return true;
    } catch (error) {
      console.warn('Storage.import:', error);
      throw error;
    }
  }
}

// Create default storage instance
export const storage = new Storage({ schemaVersion: 2 });

// Convenience exports
export const getItem = (key, defaultValue) => storage.get(key, defaultValue);
export const setItem = (key, value) => storage.set(key, value);
export const removeItem = (key) => storage.remove(key);
export const clearStorage = () => storage.clear();
export const getStorageUsage = () => storage.getUsage();
export const isStorageNearQuota = () => storage.isNearQuota();

// Migration helper
export function migrateFromLegacy() {
  const legacyKeys = {
    'settings_duration': { path: 'settings.duration', type: 'number' },
    'settings_sound': { path: 'settings.sound', type: 'string' },
    'settings_prepare': { path: 'settings.prepare', type: 'number' },
    'settings_interval': { path: 'settings.interval', type: 'number' },
    'settings_notes': { path: 'settings.notes', type: 'boolean', transform: v => v === 'on' },
    'lang': { path: 'settings.language', type: 'string' },
    'theme': { path: 'settings.theme', type: 'string' },
    'log_chart_mode': { path: 'log.chartMode', type: 'string' }
  };
  
  const migrated = {};
  
  for (const [legacyKey, config] of Object.entries(legacyKeys)) {
    const value = storage.getRaw(legacyKey);
    if (value !== null) {
      let parsed = value;
      if (config.type === 'number') parsed = parseInt(value, 10);
      if (config.type === 'boolean') parsed = value === 'true' || value === 'on';
      if (config.transform) parsed = config.transform(value);
      
      migrated[config.path] = parsed;
      
      // Remove legacy key
      try {
        localStorage.removeItem(storage._key(legacyKey));
      } catch (e) {}
    }
  }
  
  return migrated;
}
