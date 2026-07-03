// ─── Silent Bell - Main Application Entry Point ──────────────────
// Version 1.4.0 - Improved audio engine, RAF timer, code optimization

import { t, initI18n, setLang, getCurrentLang } from './modules/i18n.js';
import { unlockAudio, preloadSoundSet, stopAllAudio, primeAudio } from './modules/audio.js';
import { startSilentLoop } from './modules/silent-loop.js';
import {
  formatTime, getTotalSeconds, setTime, changeTime, isTimerRunning,
  startCountdown, startSession, stopSession, getTimerState
} from './modules/timer.js';
import {
  renderLog, exportCSV, importCSV, saveManualSession, clearLog,
  setSessionStart, setPlannedDuration, setCurrentSoundForLog
} from './modules/log.js';
import { initSettingsRefs, loadSettings, setupSettingsListeners } from './modules/settings.js';
import { loadFromStorage, saveToStorage, get as getState } from './modules/state.js';
import { createDragHandler } from './modules/debounced-drag.js';
import { getWakeLockInfo } from './modules/wakelock.js';
import { setDimmerEnabled } from './modules/screen-dimmer.js';
import { isIOS, isStandalone } from './modules/platform.js';

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const intervalSelect = document.getElementById('interval-select');
const displayWrap = document.getElementById('display-wrap');

const NoSleep = window.NoSleep;
let noSleep = null;

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[App]', ...args); }

// ─── Service Worker ──────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => { log('SW registered:', reg.scope); })
      .catch(err => { log('SW registration failed:', err); });
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

// ─── Timer Display Drag Handler ──────────────────────────────────

function initDragHandler() {
  if (!displayWrap) return;
  createDragHandler(displayWrap, {
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
    onValueChange: (info) => { setTime(info.value, display); },
    onEnd: () => { saveToStorage(); }
  });
}

// ─── Arrow Button Handlers ───────────────────────────────────────

document.getElementById('display-up')?.addEventListener('click', (e) => {
  if (!changeTime()) return;
  const delta = e.shiftKey ? 1 : 60;
  setTime(getTotalSeconds() + delta, display);
  saveToStorage();
});

document.getElementById('display-down')?.addEventListener('click', (e) => {
  if (!changeTime()) return;
  const delta = e.shiftKey ? 1 : 60;
  setTime(getTotalSeconds() - delta, display);
  saveToStorage();
});

// ─── Start / Stop ────────────────────────────────────────────────

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
    statusEl.textContent = t('status_preparing') || 'Preparing...';
    startSilentLoop();

    setSessionStart(Date.now());
    setPlannedDuration(getTotalSeconds());
    setCurrentSoundForLog(getTimerState().currentSound);

    setStartButtonLoading(false);

    startCountdown(display, statusEl, btnStart, btnStop, () => {
      startSession(display, statusEl, btnStart, btnStop, intervalSelect?.value, currentSound);
    });
  } catch (error) {
    log('Start error:', error);
    setStartButtonLoading(false);
    statusEl.textContent = t('status_error') || 'Error';
  }
}

// iOS: enable NoSleep synchronously during user gesture
function handleIOSStart(e) {
  if (isStarting || btnStart.disabled) return;
  log('iOS Start');
  if (!noSleep && NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();
  const currentSound = document.getElementById('settings-sound')?.value || 'bell';
  unlockAudio();
  primeAudio(currentSound);
  processStart(currentSound);
}

// Standard handler
async function handleStandardStart() {
  if (isStarting || btnStart.disabled) return;
  log('Standard start');
  if (!noSleep && NoSleep) noSleep = new NoSleep();
  if (noSleep) await noSleep.enable();
  const currentSound = document.getElementById('settings-sound')?.value || 'bell';
  await unlockAudio();
  startSilentLoop();
  processStart(currentSound);
}

if (btnStart) {
  if (isIOS) {
    btnStart.addEventListener('touchstart', handleIOSStart, { passive: false });
    btnStart.addEventListener('click', handleIOSStart);
  } else {
    btnStart.addEventListener('click', handleStandardStart);
  }
}

btnStop?.addEventListener('click', () => {
  try {
    log('Stop');
    if (noSleep) noSleep.disable();
    stopSession(display, statusEl, btnStart, btnStop);
  } catch (error) {
    log('Error stopping:', error);
    btnStart.disabled = false;
    btnStart.textContent = originalStartText;
    btnStop.disabled = true;
    statusEl.textContent = t('status_ready');
    display.textContent = formatTime(getTotalSeconds());
  }
});

// ─── Log Actions ─────────────────────────────────────────────────

document.getElementById('btn-export')?.addEventListener('click', exportCSV);

document.getElementById('btn-import-csv')?.addEventListener('click', () => {
  document.getElementById('import-csv-file')?.click();
});

document.getElementById('import-csv-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importCSV(file,
    (count) => { alert(t('import_success')?.replace('{count}', count) || `Imported ${count} sessions`); },
    (err) => { alert((t('import_error') || 'Import error: ') + err); }
  );
  e.target.value = '';
});

document.getElementById('btn-manual-log')?.addEventListener('click', () => {
  const form = document.getElementById('manual-entry');
  if (!form) return;
  if (form.style.display === 'flex') {
    form.style.display = 'none';
    return;
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('manual-date')?.value && (document.getElementById('manual-date').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
  document.getElementById('manual-time')?.value && (document.getElementById('manual-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`);
  document.getElementById('manual-duration') && (document.getElementById('manual-duration').value = '');
  document.getElementById('manual-note') && (document.getElementById('manual-note').value = '');
  form.style.display = 'flex';
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
  if (!durVal || durVal < 1) { alert(t('manual_err_dur')); return; }
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const finalDate = dateVal || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const finalTime = timeVal || '00:00';
  saveManualSession(finalDate, finalTime, durVal, noteVal);
  document.getElementById('manual-entry').style.display = 'none';
  renderLog();
  alert(t('manual_saved'));
});

document.getElementById('btn-clear-log')?.addEventListener('click', () => {
  if (confirm(t('confirm_clear'))) { clearLog(); renderLog(); }
});

// ─── Test Sound ──────────────────────────────────────────────────

document.getElementById('btn-test-sound')?.addEventListener('click', async () => {
  const type = document.getElementById('settings-sound')?.value;
  if (!type || type === 'none') return;
  try {
    await unlockAudio();
    // Import playSingleSound dynamically to avoid circular deps
    const { playSingleSound } = await import('./modules/audio.js');
    await playSingleSound(type);
  } catch (e) { log('Test sound failed:', e); }
});

// ─── Language Button ─────────────────────────────────────────────

const langButton = document.getElementById('btn-lang');
if (langButton) {
  const languages = ['en', 'pl', 'ko'];
  const langLabels = { en: 'EN', pl: 'PL', ko: 'KO' };

  async function handleLangSwitch() {
    const current = getCurrentLang();
    const nextLang = languages[(languages.indexOf(current) + 1) % languages.length];
    try { await unlockAudio(); } catch {}
    setLang(nextLang);
    langButton.textContent = langLabels[nextLang];
    loadSettings(display);
    if (!isTimerRunning() && statusEl) statusEl.textContent = t('status_ready');
  }

  langButton.addEventListener('click', handleLangSwitch);
  if (isIOS) {
    langButton.addEventListener('touchstart', handleLangSwitch, { passive: true });
  }
  langButton.textContent = langLabels[getCurrentLang()] || 'EN';
}

// ─── Theme Button ────────────────────────────────────────────────

const themeButton = document.getElementById('btn-theme');
if (themeButton) {
  const getSavedTheme = () => { try { return localStorage.getItem('theme'); } catch { return null; } };
  const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const getCurrentTheme = () => getSavedTheme() || getSystemTheme();

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
    themeButton.textContent = theme === 'dark' ? '☀️' : '🌙';

    const darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    const lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    if (darkMeta && lightMeta) {
      if (theme === 'dark') { darkMeta.removeAttribute('media'); lightMeta.setAttribute('media', '(prefers-color-scheme: light)'); }
      else { lightMeta.removeAttribute('media'); darkMeta.setAttribute('media', '(prefers-color-scheme: dark)'); }
    }
  };

  setTheme(getCurrentTheme());

  async function handleThemeSwitch() {
    try { await unlockAudio(); } catch {}
    setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
  }

  themeButton.addEventListener('click', handleThemeSwitch);
  if (isIOS) {
    themeButton.addEventListener('touchstart', handleThemeSwitch, { passive: true });
  }
}

// ─── iOS Install Banner ──────────────────────────────────────────

(function initIOSBanner() {
  const dismissed = localStorage.getItem('iosPromptDismissed');
  if (!isIOS || isStandalone || dismissed) return;
  const banner = document.getElementById('ios-install-banner');
  const text = document.getElementById('ios-install-text');
  const close = document.getElementById('ios-install-close');
  if (!banner) return;
  text.textContent = t('ios_install');
  banner.style.display = 'flex';
  close?.addEventListener('click', () => { banner.style.display = 'none'; localStorage.setItem('iosPromptDismissed', '1'); });
})();

// ─── iOS Loading Screen ──────────────────────────────────────────

function showIOSLoadingScreen() {
  const screen = document.getElementById('ios-loading-screen');
  if (screen && isIOS && isStandalone) {
    screen.style.display = 'flex';
    setTimeout(() => {
      screen.classList.add('hidden');
      setTimeout(() => { screen.style.display = 'none'; }, 500);
    }, 1500);
  }
}

// ─── Keyboard Shortcuts ──────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    if (!btnStart?.disabled) btnStart?.click();
    else if (!btnStop?.disabled) btnStop?.click();
  }
  if (e.code === 'Escape' && isTimerRunning()) btnStop?.click();
});

// ─── Global Error Handlers ───────────────────────────────────────

window.addEventListener('error', (e) => log('Global error:', e.message));
window.addEventListener('unhandledrejection', (e) => log('Unhandled rejection:', e.reason));

// ─── Beforeunload Protection ─────────────────────────────────────
// Prevent accidental page close during active meditation sessions.

window.addEventListener('beforeunload', (e) => {
  if (isTimerRunning()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ─── Page Lifecycle (iOS freeze/resume) ──────────────────────────
// Supplement visibilitychange with pagehide/pageshow for iOS Safari
// which may fire pagehide without visibilitychange when task-switching.

window.addEventListener('pagehide', () => {
  log('Page hidden (pagehide)');
});

window.addEventListener('pageshow', (e) => {
  log('Page shown (pageshow), persisted:', e.persisted);
  if (e.persisted) {
    // Page was restored from bfcache — re-acquire audio if needed
    unlockAudio().catch(() => {});
  }
});

// ─── Dimmer Setting Sync ─────────────────────────────────────────
// Listen for dimmer setting changes and update the module in real time.
// This avoids settings.js having to know about screen-dimmer.js.

// Dimmer sync: read directly from DOM to avoid state race condition.
// Must be called AFTER settings.js has attached its own change handler.
function setupDimmerSync() {
  const dimmerSelect = document.getElementById('settings-dimmer');
  if (!dimmerSelect) return;

  function onDimmerChange() {
    // Read directly from DOM element — always current, no state lag
    setDimmerEnabled(dimmerSelect.value === 'on');
  }

  dimmerSelect.addEventListener('change', onDimmerChange);
  if (isIOS) {
    dimmerSelect.addEventListener('touchstart', onDimmerChange, { passive: true });
  }

  // Sync initial value on load
  setDimmerEnabled(dimmerSelect.value === 'on');
}

// ─── Debug Helpers (development only) ────────────────────────────

if (DEBUG && typeof window !== 'undefined') {
  window.SilentBell = {
    getWakeLockInfo,
    isTimerRunning,
    saveToStorage,
    loadFromStorage,
    unlockAudio,
    getAudioMode: async () => {
      const { getAudioMode } = await import('./modules/audio.js');
      return getAudioMode();
    }
  };
}

// ─── Initialization ──────────────────────────────────────────────

function init() {
  log('Initializing Silent Bell v1.4.0...');
  log('Platform:', isIOS ? 'iOS' : 'Desktop');
  log('Standalone:', isStandalone);

  initI18n();
  loadFromStorage();
  initSettingsRefs();
  loadSettings(display);
  setupSettingsListeners(display);
  setupDimmerSync();  // After settings listeners — reads DOM directly
  initDragHandler();
  saveToStorage();

  // Preload default sound set
  preloadSoundSet('bell').catch(() => {});

  // iOS-specific setup
  if (isIOS) {
    showIOSLoadingScreen();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        unlockAudio().catch(() => {});
      }
    });
  }

  log('Silent Bell initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
