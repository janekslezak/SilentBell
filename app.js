// ─── Silent Bell - Main Application Entry Point ──────────────────

import { t, initI18n, getCurrentLang, setLang } from './modules/i18n.js';
import { unlockAudio } from './modules/audio-context.js';
import { 
  playSingleSound, 
  primeAudio,
  preloadSoundSet, 
  stopAllAudio
} from './modules/audio.js';
import { startSilentLoop, stopSilentLoop } from './modules/silent-loop.js';
import {
  formatTime, getTotalSeconds, setTime, changeTime, isTimerRunning,
  startCountdown, startSession, stopSession,
  getTimerState
} from './modules/timer.js';
import {
  renderLog, exportCSV, importCSV, saveManualSession, clearLog,
  setSessionStart, setPlannedDuration, setCurrentSoundForLog
} from './modules/log.js';
import { initSettingsRefs, loadSettings, setupSettingsListeners } from './modules/settings.js';
import { state, loadFromStorage, saveToStorage } from './modules/state.js';
import { createDragHandler } from './modules/debounced-drag.js';
import { setupVisibilityHandler } from './modules/wakelock.js';
import { IS_IOS, IS_ANDROID, IS_STANDALONE, TIMING, DEBUG } from './modules/config.js';

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const intervalSelect = document.getElementById('interval-select');
const displayWrap = document.getElementById('display-wrap');

// NoSleep reference
const NoSleep = window.NoSleep;
let noSleep = null;

function log(...args) {
  if (DEBUG) console.log('[App]', ...args);
}

// ─── Loading Screen (iOS & Android) ─────────────────────────────

function showLoadingScreen() {
  const loadingScreen = document.getElementById('ios-loading-screen');
  if (loadingScreen && IS_STANDALONE) {
    loadingScreen.style.display = 'flex';
    log('Showing loading screen');
    
    setTimeout(() => {
      hideLoadingScreen();
    }, TIMING.LOADING_SCREEN);
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('ios-loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

// ─── Service Worker ─────────────────────────────────────────────

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

// ─── Navigation ─────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const viewId = `view-${btn.dataset.view}`;
    const viewEl = document.getElementById(viewId);
    if (viewEl) viewEl.classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

// ─── Drag Handler ───────────────────────────────────────────────

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

// Arrow buttons
const displayUp = document.getElementById('display-up');
const displayDown = document.getElementById('display-down');

if (displayUp) {
  displayUp.addEventListener('click', (e) => {
    if (!changeTime(0)) return;
    const delta = e.shiftKey ? 1 : 60;
    setTime(getTotalSeconds() + delta, display);
    saveToStorage();
  });
}

if (displayDown) {
  displayDown.addEventListener('click', (e) => {
    if (!changeTime(0)) return;
    const delta = e.shiftKey ? 1 : 60;
    setTime(getTotalSeconds() - delta, display);
    saveToStorage();
  });
}

// ─── Start / Stop Session ───────────────────────────────────────

const originalStartText = btnStart?.textContent || 'Start';
let isStarting = false;

function setStartButtonLoading(loading) {
  if (!btnStart) return;
  
  if (loading) {
    isStarting = true;
    btnStart.disabled = true;
    btnStart.textContent = t('status_loading') || 'Loading...';
    btnStart.classList.add('loading');
  } else {
    isStarting = false;
    btnStart.disabled = false;
    btnStart.textContent = originalStartText;
    btnStart.classList.remove('loading');
  }
}

async function processStart(currentSound) {
  try {
    isStarting = true;
    setStartButtonLoading(true);
    if (statusEl) statusEl.textContent = t('status_preparing') || 'Preparing...';
    
    startSilentLoop();
    
    if (!noSleep && NoSleep) {
      noSleep = new NoSleep();
    }
    if (noSleep) {
      await noSleep.enable();
    }
    
    const timerState = getTimerState();
    setSessionStart(Date.now());
    setPlannedDuration(getTotalSeconds());
    setCurrentSoundForLog(timerState.currentSound);
    
    setStartButtonLoading(false);
    
    startCountdown(display, statusEl, btnStart, btnStop, () => {
      startSession(display, statusEl, btnStart, btnStop, intervalSelect?.value, currentSound);
    });
  } catch (error) {
    log('Start error:', error);
    setStartButtonLoading(false);
    if (statusEl) statusEl.textContent = t('status_error') || 'Error';
  }
}

// iOS-specific start handler with audio priming fix
function handleIOSStart(e) {
  if (isStarting || !btnStart || btnStart.disabled) return;
  
  log('iOS Start: Priming audio');
  
  // Enable NoSleep synchronously
  if (!noSleep && NoSleep) {
    noSleep = new NoSleep();
  }
  if (noSleep) {
    noSleep.enable();
  }
  
  const currentSound = document.getElementById('settings-sound')?.value || 'bell';
  
  // CRITICAL FIX: Prime audio immediately during user gesture
  // This prevents loud audible playback during countdown on first use
  if (typeof primeAudio === 'function') {
    primeAudio(currentSound);
  }
  
  processStart(currentSound);
}

// Standard start handler
async function handleStandardStart() {
  if (isStarting || !btnStart || btnStart.disabled) return;
  
  log('Standard start');
  
  if (!noSleep && NoSleep) {
    noSleep = new NoSleep();
  }
  if (noSleep) {
    await noSleep.enable();
  }
  
  const currentSound = document.getElementById('settings-sound')?.value || 'bell';
  
  await unlockAudio();
  startSilentLoop();
  
  // Prime audio for non-iOS as well to ensure consistency
  if (typeof primeAudio === 'function') {
    primeAudio(currentSound);
  }
  
  processStart(currentSound);
}

// Attach start handlers
if (btnStart) {
  if (IS_IOS) {
    btnStart.addEventListener('touchstart', handleIOSStart, { passive: false });
    btnStart.addEventListener('click', handleIOSStart);
  } else {
    btnStart.addEventListener('click', handleStandardStart);
  }
}

// Stop handler
if (btnStop) {
  btnStop.addEventListener('click', () => {
    try {
      log('Stop button clicked');
      
      if (noSleep) {
        noSleep.disable();
      }
      
      stopSession(display, statusEl, btnStart, btnStop);
    } catch (error) {
      log('Error stopping session:', error);
      if (btnStart) {
        btnStart.disabled = false;
        btnStart.textContent = originalStartText;
      }
      if (btnStop) btnStop.disabled = true;
      if (statusEl) statusEl.textContent = t('status_ready');
      if (display) display.textContent = formatTime(getTotalSeconds());
    }
  });
}

// ─── CSV & Manual Entry ─────────────────────────────────────────

const btnExport = document.getElementById('btn-export');
if (btnExport) {
  btnExport.addEventListener('click', exportCSV);
}

const btnImportCsv = document.getElementById('btn-import-csv');
const importCsvFile = document.getElementById('import-csv-file');

if (btnImportCsv && importCsvFile) {
  btnImportCsv.addEventListener('click', () => {
    importCsvFile.click();
  });
  
  importCsvFile.addEventListener('change', (e) => {
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
}

const btnManualLog = document.getElementById('btn-manual-log');
if (btnManualLog) {
  btnManualLog.addEventListener('click', () => {
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
      if (durationInput) durationInput.value = '';
      if (noteInput) {
        noteInput.value = '';
        noteInput.placeholder = t('note_placeholder');
      }
      
      form.style.display = 'flex';
    }
  });
}

const manualCancelBtn = document.getElementById('manual-cancel-btn');
if (manualCancelBtn) {
  manualCancelBtn.addEventListener('click', () => {
    const form = document.getElementById('manual-entry');
    if (form) form.style.display = 'none';
  });
}

const manualSaveBtn = document.getElementById('manual-save-btn');
if (manualSaveBtn) {
  manualSaveBtn.addEventListener('click', () => {
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
}

const btnClearLog = document.getElementById('btn-clear-log');
if (btnClearLog) {
  btnClearLog.addEventListener('click', () => {
    if (confirm(t('confirm_clear'))) {
      clearLog();
      renderLog();
    }
  });
}

const btnTestSound = document.getElementById('btn-test-sound');
if (btnTestSound) {
  btnTestSound.addEventListener('click', async () => {
    const type = document.getElementById('settings-sound')?.value;
    if (!type || type === 'none') return;
    
    log('Test sound:', type);
    
    try {
      await unlockAudio();
      await playSingleSound(type);
    } catch (error) {
      log('Test sound failed:', error);
    }
  });
}

// ─── Language & Theme ───────────────────────────────────────────

const langButton = document.getElementById('btn-lang');
if (langButton) {
  const languages = ['en', 'pl', 'ko'];
  const langLabels = { en: 'EN', pl: 'PL', ko: 'KO' };
  
  // Set initial label
  langButton.textContent = langLabels[getCurrentLang()] || 'EN';
  
  langButton.addEventListener('click', async () => {
    const currentLang = getCurrentLang();
    const currentIndex = languages.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % languages.length;
    const nextLang = languages[nextIndex];
    
    log('Switching language from', currentLang, 'to', nextLang);
    
    try { await unlockAudio(); } catch (e) {}
    
    setLang(nextLang);
    langButton.textContent = langLabels[nextLang];
    loadSettings(display);
    
    if (!isTimerRunning() && statusEl) {
      statusEl.textContent = t('status_ready');
    }
  });
}

const themeButton = document.getElementById('btn-theme');
if (themeButton) {
  const getSavedTheme = () => {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  };
  
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  
  const getCurrentTheme = () => getSavedTheme() || getSystemTheme();
  
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    
    themeButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    
    const darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    const lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    
    if (darkMeta && lightMeta) {
      if (theme === 'dark') {
        darkMeta.removeAttribute('media');
        lightMeta.setAttribute('media', '(prefers-color-scheme: light)');
      } else {
        lightMeta.removeAttribute('media');
        darkMeta.setAttribute('media', '(prefers-color-scheme: dark)');
      }
    }
  };
  
  setTheme(getCurrentTheme());
  
  themeButton.addEventListener('click', async () => {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    try { await unlockAudio(); } catch (e) {}
    setTheme(next);
  });
}

// ─── iOS Install Banner ─────────────────────────────────────────

(function initIOSBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const dismissed = localStorage.getItem('iosPromptDismissed');
  
  if (!isIos || IS_STANDALONE || dismissed) return;
  
  const banner = document.getElementById('ios-install-banner');
  const text = document.getElementById('ios-install-text');
  const close = document.getElementById('ios-install-close');
  
  if (!banner) return;
  
  text.textContent = t('ios_install');
  banner.style.display = 'flex';
  
  if (close) {
    close.addEventListener('click', () => {
      banner.style.display = 'none';
      localStorage.setItem('iosPromptDismissed', '1');
    });
  }
})();

// ─── Keyboard Shortcuts ─────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    
    if (btnStart && !btnStart.disabled) {
      btnStart.click();
    } else if (btnStop && !btnStop.disabled) {
      btnStop.click();
    }
  }
  
  if (e.code === 'Escape' && isTimerRunning()) {
    if (btnStop) btnStop.click();
  }
});

// ─── Platform Setup ─────────────────────────────────────────────

if (IS_IOS) {
  log('iOS detected');
  if (IS_STANDALONE) showLoadingScreen();
  setupVisibilityHandler();
}

if (IS_ANDROID) {
  log('Android detected');
  if (IS_STANDALONE) showLoadingScreen();
  setupVisibilityHandler();
}

window.addEventListener('error', (e) => log('Global error:', e.message));
window.addEventListener('unhandledrejection', (e) => log('Unhandled rejection:', e.reason));

if (typeof window !== 'undefined') {
  window.SilentBell = {
    isTimerRunning,
    saveToStorage,
    loadFromStorage,
    preloadSoundSet,
    unlockAudio
  };
}

// ─── Initialization ─────────────────────────────────────────────

function init() {
  log('Initializing Silent Bell...');
  log('Platform:', IS_IOS ? 'iOS' : IS_ANDROID ? 'Android' : 'Desktop');
  log('Standalone:', IS_STANDALONE);
  
  initI18n();
  loadFromStorage();
  initSettingsRefs();
  loadSettings(display);
  setupSettingsListeners(display);
  initDragHandler();
  saveToStorage();
  
  // Preload default sound set
  preloadSoundSet('bell').catch(() => {});
  
  log('Silent Bell initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
