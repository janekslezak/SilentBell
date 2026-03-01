// ─── Silent Bell - Main Application Entry Point ──────────────────

import { t, initI18n } from './modules/i18n.js';
import { unlockAudio } from './modules/audio-context.js';
import { playSound, playStrokes } from './modules/audio.js';
import { stopSilentLoop } from './modules/silent-loop.js';
import {
  formatTime, getTotalSeconds, setTime, changeTime, isTimerRunning,
  startCountdown, startSession, stopSession,
  initNoSleep, enableNoSleep, disableNoSleep,
  getTimerState
} from './modules/timer.js';
import {
  renderLog, exportCSV, importCSV, saveManualSession, clearLog,
  setSessionStart, setPlannedDuration, setCurrentSoundForLog
} from './modules/log.js';
import { initSettingsRefs, loadSettings, setupSettingsListeners } from './modules/settings.js';
import { state, loadFromStorage, saveToStorage } from './modules/state.js';
import { createDragHandler } from './modules/debounced-drag.js';
import { setupVisibilityHandler, getWakeLockInfo } from './modules/wakelock.js';

// ─── DOM References ──────────────────────────────────────────────

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const intervalSelect = document.getElementById('interval-select');
const displayWrap = document.getElementById('display-wrap');

// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Debug logging
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[App]', ...args);
}

// ─── Service Worker Registration ─────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        log('SW registered:', registration.scope);
      })
      .catch(error => {
        log('SW registration failed:', error);
      });
  });
}

// ─── Navigation ──────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

// ─── Interactive Timer Display with Debounced Drag ───────────────

let dragHandler = null;

function initDragHandler() {
  if (!displayWrap) return;
  
  dragHandler = createDragHandler(displayWrap, {
    pixelsPerUnit: 12,
    minDelta: 2,
    minValue: 60,
    maxValue: 28800,
    smoothing: true,
    smoothingFactor: 0.3,
    hapticFeedback: true,
    visualFeedback: true,
    
    getValue: () => getTotalSeconds(),
    shouldIgnore: () => isTimerRunning(),
    
    onValueChange: (info) => {
      setTime(info.value, display);
    },
    
    onEnd: () => {
      saveToStorage();
    }
  });
}

// Arrow button handlers
document.getElementById('display-up')?.addEventListener('click', (e) => {
  if (!changeTime(0)) return;
  const delta = e.shiftKey ? 1 : 60;
  setTime(getTotalSeconds() + delta, display);
  saveToStorage();
});

document.getElementById('display-down')?.addEventListener('click', (e) => {
  if (!changeTime(0)) return;
  const delta = e.shiftKey ? 1 : 60;
  setTime(getTotalSeconds() - delta, display);
  saveToStorage();
});

// ─── Start / Stop Buttons ────────────────────────────────────────

btnStart?.addEventListener('click', async () => {
  try {
    log('Start button clicked');
    
    // Unlock audio context first (critical for iOS)
    await unlockAudio();
    log('Audio unlocked');
    
    btnStart.disabled = true;
    statusEl.textContent = t('status_ready');
    
    // Initialize wake lock
    initNoSleep();
    enableNoSleep();
    
    // Get timer state for logging
    const timerState = getTimerState();
    setSessionStart(Date.now());
    setPlannedDuration(getTotalSeconds());
    setCurrentSoundForLog(timerState.currentSound);
    
    // Start countdown
    startCountdown(display, statusEl, btnStart, btnStop, () => {
      startSession(display, statusEl, btnStart, btnStop, intervalSelect?.value);
    });
  } catch (error) {
    log('Start session failed:', error);
    statusEl.textContent = t('status_error') || 'Error starting session';
    btnStart.disabled = false;
  }
});

btnStop?.addEventListener('click', () => {
  const result = stopSession(display, statusEl, btnStart, btnStop);
  
  if (result.stopped && !result.early) {
    disableNoSleep();
  }
});

// ─── CSV Export / Import ─────────────────────────────────────────

document.getElementById('btn-export')?.addEventListener('click', exportCSV);

document.getElementById('btn-import-csv')?.addEventListener('click', () => {
  document.getElementById('import-csv-file')?.click();
});

document.getElementById('import-csv-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  importCSV(file, 
    (count) => {
      alert(t('import_success')?.replace('{count}', count) || `Imported ${count} sessions from CSV.`);
    },
    (err) => {
      alert((t('import_error') || 'Could not import CSV: ') + err);
    }
  );
  
  e.target.value = '';
});

// ─── Manual Session Entry ────────────────────────────────────────

document.getElementById('btn-manual-log')?.addEventListener('click', () => {
  const form = document.getElementById('manual-entry');
  if (!form) return;
  
  const visible = form.style.display === 'flex';
  
  if (visible) {
    form.style.display = 'none';
  } else {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    
    const dateInput = document.getElementById('manual-date');
    const timeInput = document.getElementById('manual-time');
    const durationInput = document.getElementById('manual-duration');
    const noteInput = document.getElementById('manual-note');
    
    if (dateInput) {
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (timeInput) {
      timeInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    if (durationInput) {
      durationInput.value = '';
    }
    if (noteInput) {
      noteInput.value = '';
      noteInput.placeholder = t('note_placeholder');
    }
    
    form.style.display = 'flex';
  }
});

document.getElementById('manual-cancel-btn')?.addEventListener('click', () => {
  const form = document.getElementById('manual-entry');
  if (form) form.style.display = 'none';
});

document.getElementById('manual-save-btn')?.addEventListener('click', () => {
  const dateVal = document.getElementById('manual-date')?.value;
  const timeVal = document.getElementById('manual-time')?.value;
  const durVal = parseInt(document.getElementById('manual-duration')?.value);
  const noteVal = document.getElementById('manual-note')?.value.trim();
  
  if (!durVal || durVal < 1) {
    alert(t('manual_err_dur'));
    return;
  }
  
  let finalDate = dateVal;
  if (!finalDate) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    finalDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  
  const finalTime = timeVal || '00:00';
  
  saveManualSession(finalDate, finalTime, durVal, noteVal);
  
  const form = document.getElementById('manual-entry');
  if (form) form.style.display = 'none';
  
  renderLog();
  alert(t('manual_saved'));
});

// ─── Clear Log ────────────────────────────────────────────────────

document.getElementById('btn-clear-log')?.addEventListener('click', () => {
  if (confirm(t('confirm_clear'))) {
    clearLog();
    renderLog();
  }
});

// ─── Test Sound ───────────────────────────────────────────────────

document.getElementById('btn-test-sound')?.addEventListener('click', async () => {
  log('Test sound clicked');
  await unlockAudio();
  const type = document.getElementById('settings-sound')?.value;
  log('Playing test sound:', type);
  
  if (type === 'chugpi') {
    playStrokes('chugpi', 1);
  } else if (type && type !== 'none') {
    playSound(type);
  }
});

// ─── iOS Install Banner ───────────────────────────────────────────

(function initIOSBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const dismissed = localStorage.getItem('iosPromptDismissed');
  
  if (!isIos || isStandalone || dismissed) return;
  
  const banner = document.getElementById('ios-install-banner');
  const text = document.getElementById('ios-install-text');
  const close = document.getElementById('ios-install-close');
  
  if (!banner) return;
  
  text.textContent = t('ios_install');
  banner.style.display = 'flex';
  
  close?.addEventListener('click', () => {
    banner.style.display = 'none';
    localStorage.setItem('iosPromptDismissed', '1');
  });
})();

// ─── Keyboard Shortcuts ──────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    
    if (!btnStart?.disabled) {
      btnStart?.click();
    } else if (!btnStop?.disabled) {
      btnStop?.click();
    }
  }
  
  if (e.code === 'Escape' && isTimerRunning()) {
    btnStop?.click();
  }
});

// ─── iOS-Specific Setup ──────────────────────────────────────────

if (isIOS) {
  log('iOS detected, setting up handlers');
  
  // Setup visibility handler for iOS wake lock reacquisition
  setupVisibilityHandler();
  
  // Handle iOS-specific page lifecycle
  window.addEventListener('pagehide', () => {
    log('Page hide - maintaining audio session');
  });
  
  window.addEventListener('pageshow', () => {
    log('Page show - checking audio session');
  });
}

// ─── Debug Helpers (development only) ────────────────────────────

if (typeof window !== 'undefined') {
  window.SilentBell = {
    getWakeLockInfo,
    isTimerRunning,
    saveToStorage,
    loadFromStorage
  };
}

// ─── Initialization ──────────────────────────────────────────────

function init() {
  log('Initializing Silent Bell...');
  
  initI18n();
  loadFromStorage();
  initSettingsRefs();
  loadSettings(display);
  setupSettingsListeners(display);
  initDragHandler();
  saveToStorage();
  
  log('Silent Bell initialized');
  log('Platform:', isIOS ? 'iOS' : 'Other');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
