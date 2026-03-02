// ─── Settings Module ─────────────────────────────────────────────
// Settings UI bindings and persistence.

import { t } from './i18n.js';
import { state, get, set, saveToStorage } from './state.js';

const settingsRefs = {};

export function initSettingsRefs() {
  settingsRefs.duration = document.getElementById('settings-duration');
  settingsRefs.sound = document.getElementById('settings-sound');
  settingsRefs.prepare = document.getElementById('settings-prepare');
  settingsRefs.interval = document.getElementById('interval-select');
  settingsRefs.notes = document.getElementById('settings-notes');
}

export function loadSettings(displayEl) {
  const duration = get('settings.duration') || 20;
  const sound = get('settings.sound') || 'bell';
  const prepare = get('settings.prepare') !== undefined ? get('settings.prepare') : 10;
  const interval = get('settings.interval') || 0;
  const notes = get('settings.notes') !== false;
  
  if (settingsRefs.duration) {
    settingsRefs.duration.value = duration;
  }
  
  if (settingsRefs.sound) {
    settingsRefs.sound.value = sound;
  }
  
  if (settingsRefs.prepare) {
    settingsRefs.prepare.value = prepare;
  }
  
  if (settingsRefs.interval) {
    settingsRefs.interval.value = interval;
  }
  
  if (settingsRefs.notes) {
    settingsRefs.notes.value = notes ? 'on' : 'off';
  }
  
  // Update timer display
  if (displayEl) {
    const totalSeconds = duration * 60;
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    displayEl.textContent = `${m}:${s}`;
  }
  
  // Update state
  set('timer.selectedMinutes', duration);
  set('timer.selectedSeconds', 0);
  set('timer.prepareSeconds', prepare);
  set('audio.currentSound', sound);
}

export function setupSettingsListeners(displayEl) {
  // Duration
  if (settingsRefs.duration) {
    settingsRefs.duration.addEventListener('change', () => {
      const value = parseInt(settingsRefs.duration.value, 10);
      if (value >= 1 && value <= 480) {
        set('settings.duration', value);
        set('timer.selectedMinutes', value);
        set('timer.selectedSeconds', 0);
        saveToStorage();
        
        if (displayEl) {
          const totalSeconds = value * 60;
          const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
          const s = String(totalSeconds % 60).padStart(2, '0');
          displayEl.textContent = `${m}:${s}`;
        }
      }
    });
  }
  
  // Sound
  if (settingsRefs.sound) {
    settingsRefs.sound.addEventListener('change', () => {
      const value = settingsRefs.sound.value;
      set('settings.sound', value);
      set('audio.currentSound', value);
      saveToStorage();
    });
  }
  
  // Prepare
  if (settingsRefs.prepare) {
    settingsRefs.prepare.addEventListener('change', () => {
      const value = parseInt(settingsRefs.prepare.value, 10);
      if (value >= 0 && value <= 60) {
        set('settings.prepare', value);
        set('timer.prepareSeconds', value);
        saveToStorage();
      }
    });
  }
  
  // Interval
  if (settingsRefs.interval) {
    settingsRefs.interval.addEventListener('change', () => {
      const value = parseInt(settingsRefs.interval.value, 10);
      set('settings.interval', value);
      saveToStorage();
    });
  }
  
  // Notes
  if (settingsRefs.notes) {
    settingsRefs.notes.addEventListener('change', () => {
      const value = settingsRefs.notes.value === 'on';
      set('settings.notes', value);
      saveToStorage();
    });
  }
}
