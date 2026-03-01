// ─── Settings Module ─────────────────────────────────────────────
// Application settings management with central state integration
// and storage persistence.

import { t } from './i18n.js';
import { 
  setCurrentSound, 
  setPrepareSeconds, 
  setNotesEnabled, 
  setSelectedMinutes, 
  setSelectedSeconds, 
  formatTime 
} from './timer.js';
import { state, set, get, subscribe } from './state.js';
import { storage, QuotaExceededError } from './storage.js';

// DOM element references
let settingsDuration = null;
let settingsSound = null;
let settingsPrepare = null;
let settingsNotes = null;
let intervalSelect = null;

// Initialize DOM references
export function initSettingsRefs() {
  settingsDuration = document.getElementById('settings-duration');
  settingsSound = document.getElementById('settings-sound');
  settingsPrepare = document.getElementById('settings-prepare');
  settingsNotes = document.getElementById('settings-notes');
  intervalSelect = document.getElementById('interval-select');
}

// Load settings from central state
export function loadSettings(displayEl) {
  try {
    // Ensure state is loaded from storage
    state.loadFromStorage();
    
    // Get settings from central state
    const settings = get('settings') || {};
    const timer = get('timer') || {};
    
    // Apply duration setting
    const duration = settings.duration || timer.selectedMinutes || 20;
    if (settingsDuration) {
      settingsDuration.value = duration;
    }
    setSelectedMinutes(duration);
    setSelectedSeconds(0);
    
    if (displayEl) {
      displayEl.textContent = formatTime(duration * 60);
    }
    
    // Apply sound setting
    const sound = settings.sound || 'bell';
    if (settingsSound) {
      settingsSound.value = sound;
    }
    setCurrentSound(sound);
    
    // Apply interval setting
    const interval = settings.interval || 0;
    if (intervalSelect) {
      intervalSelect.value = interval;
    }
    
    // Apply prepare setting
    const prepare = settings.prepare !== undefined ? settings.prepare : 10;
    setPrepareSeconds(prepare);
    if (settingsPrepare) {
      settingsPrepare.value = prepare;
    }
    
    // Apply notes setting
    const notes = settings.notes !== undefined ? settings.notes : true;
    setNotesEnabled(notes);
    if (settingsNotes) {
      settingsNotes.value = notes ? 'on' : 'off';
    }
    
    // Apply language setting
    const language = settings.language || 'en';
    // Language is handled by i18n module
    
    // Apply theme setting
    const theme = settings.theme || 'dark';
    // Theme is handled by i18n module
    
  } catch (error) {
    console.warn('Settings.loadSettings:', error);
    
    // Apply defaults on error
    applyDefaultSettings(displayEl);
  }
}

// Apply default settings
function applyDefaultSettings(displayEl) {
  if (settingsDuration) settingsDuration.value = 20;
  setSelectedMinutes(20);
  setSelectedSeconds(0);
  
  if (displayEl) displayEl.textContent = formatTime(1200);
  
  if (settingsSound) settingsSound.value = 'bell';
  setCurrentSound('bell');
  
  if (intervalSelect) intervalSelect.value = 0;
  
  setPrepareSeconds(10);
  if (settingsPrepare) settingsPrepare.value = 10;
  
  setNotesEnabled(true);
  if (settingsNotes) settingsNotes.value = 'on';
}

// Setup settings change listeners
export function setupSettingsListeners(displayEl) {
  // Sound setting
  if (settingsSound) {
    settingsSound.addEventListener('change', handleSoundChange);
  }
  
  // Interval setting
  if (intervalSelect) {
    intervalSelect.addEventListener('change', handleIntervalChange);
  }
  
  // Duration setting
  if (settingsDuration) {
    settingsDuration.addEventListener('change', handleDurationChange.bind(null, displayEl));
  }
  
  // Prepare setting
  if (settingsPrepare) {
    settingsPrepare.addEventListener('change', handlePrepareChange);
  }
  
  // Notes setting
  if (settingsNotes) {
    settingsNotes.addEventListener('change', handleNotesChange);
  }
  
  // Subscribe to state changes for cross-module sync
  subscribe('settings', handleSettingsStateChange);
}

// Handle sound change
function handleSoundChange() {
  const sound = settingsSound.value;
  
  try {
    setCurrentSound(sound);
    set('settings.sound', sound);
    state.saveToStorage();
  } catch (error) {
    handleStorageError('sound', error);
  }
}

// Handle interval change
function handleIntervalChange() {
  const interval = parseInt(intervalSelect.value, 10) || 0;
  
  try {
    set('settings.interval', interval);
    state.saveToStorage();
  } catch (error) {
    handleStorageError('interval', error);
  }
}

// Handle duration change
function handleDurationChange(displayEl) {
  const dur = parseInt(settingsDuration.value, 10);
  
  if (dur > 0 && dur <= 480) {
    try {
      set('settings.duration', dur);
      setSelectedMinutes(dur);
      setSelectedSeconds(0);
      
      if (displayEl) {
        displayEl.textContent = formatTime(dur * 60);
      }
      
      state.saveToStorage();
    } catch (error) {
      handleStorageError('duration', error);
    }
  } else {
    // Revert to valid value
    const currentDuration = get('settings.duration') || 20;
    settingsDuration.value = currentDuration;
  }
}

// Handle prepare change
function handlePrepareChange() {
  const prep = parseInt(settingsPrepare.value, 10);
  
  if (!isNaN(prep) && prep >= 0 && prep <= 60) {
    try {
      setPrepareSeconds(prep);
      set('settings.prepare', prep);
      state.saveToStorage();
    } catch (error) {
      handleStorageError('prepare', error);
    }
  } else {
    // Revert to valid value
    const currentPrepare = get('settings.prepare') || 10;
    settingsPrepare.value = currentPrepare;
  }
}

// Handle notes change
function handleNotesChange() {
  const notes = settingsNotes.value === 'on';
  
  try {
    setNotesEnabled(notes);
    set('settings.notes', notes);
    state.saveToStorage();
  } catch (error) {
    handleStorageError('notes', error);
  }
}

// Handle settings state change (from other modules)
function handleSettingsStateChange(newSettings) {
  // Sync DOM elements with state if they exist
  if (settingsSound && newSettings.sound) {
    settingsSound.value = newSettings.sound;
  }
  
  if (settingsDuration && newSettings.duration) {
    settingsDuration.value = newSettings.duration;
  }
  
  if (settingsPrepare && newSettings.prepare !== undefined) {
    settingsPrepare.value = newSettings.prepare;
  }
  
  if (settingsNotes && newSettings.notes !== undefined) {
    settingsNotes.value = newSettings.notes ? 'on' : 'off';
  }
  
  if (intervalSelect && newSettings.interval !== undefined) {
    intervalSelect.value = newSettings.interval;
  }
}

// Handle storage errors
function handleStorageError(setting, error) {
  console.warn(`Settings save error [${setting}]:`, error);
  
  if (error instanceof QuotaExceededError) {
    // Show user-friendly error
    showNotification(t('settings_quota_error') || 'Storage full. Some settings may not be saved.', 'warning');
  }
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    background: ${type === 'warning' ? 'var(--danger, #bf616a)' : 'var(--accent, #88c0d0)'};
    color: var(--bg, #111820);
    font-size: 14px;
    z-index: 1000;
    animation: notification-slide-in 0.3s ease;
  `;
  
  // Add animation styles if not present
  if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      @keyframes notification-slide-in {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes notification-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after delay
  setTimeout(() => {
    notification.style.animation = 'notification-fade-out 0.3s ease forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Export settings getters
export function getSetting(key) {
  return get(`settings.${key}`);
}

export function setSetting(key, value) {
  set(`settings.${key}`, value);
  state.saveToStorage();
}

// Reset all settings to defaults
export function resetSettings() {
  const defaults = {
    duration: 20,
    sound: 'bell',
    prepare: 10,
    interval: 0,
    notes: true
  };
  
  set('settings', defaults);
  state.saveToStorage();
  
  // Update DOM
  if (settingsDuration) settingsDuration.value = defaults.duration;
  if (settingsSound) settingsSound.value = defaults.sound;
  if (settingsPrepare) settingsPrepare.value = defaults.prepare;
  if (settingsNotes) settingsNotes.value = defaults.notes ? 'on' : 'off';
  if (intervalSelect) intervalSelect.value = defaults.interval;
  
  // Update timer state
  setSelectedMinutes(defaults.duration);
  setSelectedSeconds(0);
  setCurrentSound(defaults.sound);
  setPrepareSeconds(defaults.prepare);
  setNotesEnabled(defaults.notes);
}

// Import settings from object (for backup restore)
export function importSettings(settingsObj) {
  const validSettings = {};
  
  // Validate and sanitize
  if (settingsObj.duration && settingsObj.duration > 0 && settingsObj.duration <= 480) {
    validSettings.duration = settingsObj.duration;
  }
  
  if (settingsObj.sound && ['bell', 'bell-high', 'chugpi', 'none'].includes(settingsObj.sound)) {
    validSettings.sound = settingsObj.sound;
  }
  
  if (settingsObj.prepare !== undefined && settingsObj.prepare >= 0 && settingsObj.prepare <= 60) {
    validSettings.prepare = settingsObj.prepare;
  }
  
  if (settingsObj.interval !== undefined && [0, 5, 10, 15, 20].includes(settingsObj.interval)) {
    validSettings.interval = settingsObj.interval;
  }
  
  if (settingsObj.notes !== undefined) {
    validSettings.notes = Boolean(settingsObj.notes);
  }
  
  if (settingsObj.language && ['en', 'pl', 'ko'].includes(settingsObj.language)) {
    validSettings.language = settingsObj.language;
  }
  
  if (settingsObj.theme && ['dark', 'light'].includes(settingsObj.theme)) {
    validSettings.theme = settingsObj.theme;
  }
  
  // Apply settings
  set('settings', { ...get('settings'), ...validSettings });
  state.saveToStorage();
  
  // Update timer module
  if (validSettings.duration) {
    setSelectedMinutes(validSettings.duration);
    setSelectedSeconds(0);
  }
  if (validSettings.sound) setCurrentSound(validSettings.sound);
  if (validSettings.prepare !== undefined) setPrepareSeconds(validSettings.prepare);
  if (validSettings.notes !== undefined) setNotesEnabled(validSettings.notes);
  
  return validSettings;
}

// Export settings as object (for backup)
export function exportSettings() {
  return get('settings') || {};
}
