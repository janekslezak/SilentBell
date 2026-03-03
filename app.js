// ─── Silent Bell - Main Application Entry Point ──────────────────

import { t, initI18n } from './modules/i18n.js';
import { unlockAudio } from './modules/audio-context.js';
import { 
  playSingleSound, 
  preloadSoundSet, 
  stopAllAudio,
  isAudioLoading
} from './modules/audio.js';
import { startSilentLoop, stopSilentLoop } from './modules/silent-loop.js';
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

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const intervalSelect = document.getElementById('interval-select');
const displayWrap = document.getElementById('display-wrap');

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[App]', ...args);
}

function showIOSLoadingScreen() {
  const loadingScreen = document.getElementById('ios-loading-screen');
  if (loadingScreen && isIOS && isStandalone) {
    loadingScreen.style.display = 'flex';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }, 1500);
  }
}

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

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

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

btnStart?.addEventListener('click', async () => {
  if (isStarting || btnStart.disabled) {
    log('Start already in progress, ignoring');
    return;
  }
  
  try {
    log('Start button clicked');
    setStartButtonLoading(true);
    statusEl.textContent = t('status_preparing') || 'Preparing audio...';
    
    const currentSound = document.getElementById('settings-sound')?.value || 'bell';
    
    log('Unlocking audio...');
    await unlockAudio();
    log('Audio unlocked');
    
    startSilentLoop();
    
    log('Preloading sounds...');
    await preloadSoundSet(currentSound);
    log('Sounds preloaded');
    
    initNoSleep();
    enableNoSleep();
    
    const timerState = getTimerState();
    setSessionStart(Date.now());
    setPlannedDuration(getTotalSeconds());
    setCurrentSoundForLog(timerState.currentSound);
    
    setStartButtonLoading(false);
    
    startCountdown(display, statusEl, btnStart, btnStop, () => {
      startSession(display, statusEl, btnStart, btnStop, intervalSelect?.value);
    });
  } catch (error) {
    log('Start session failed:', error);
    setStartButtonLoading(false);
    statusEl.textContent = t('status_error') || 'Error - tap to retry';
  }
});

btnStop?.addEventListener('click', () => {
  try {
    log('Stop button clicked');
    const result = stopSession(display, statusEl, btnStart, btnStop);
    
    if (result.stopped && !result.early) {
      disableNoSleep();
    }
  } catch (error) {
    log('Error stopping session:', error);
    btnStart.disabled = false;
    btnStart.textContent = originalStartText;
    btnStop.disabled = true;
    statusEl.textContent = t('status_ready');
    display.textContent = formatTime(getTotalSeconds());
  }
});

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

document.getElementById('btn-clear-log')?.addEventListener('click', () => {
  if (confirm(t('confirm_clear'))) {
    clearLog();
    renderLog();
  }
});

let testAudioPlaying = false;
let currentTestAudio = null;

document.getElementById('btn-test-sound')?.addEventListener('click', async () => {
  log('Test sound clicked');
  
  try {
    if (testAudioPlaying && currentTestAudio) {
      log('Stopping test sound');
      try {
        currentTestAudio.pause();
        currentTestAudio.currentTime = 0;
      } catch (e) {}
      testAudioPlaying = false;
      currentTestAudio = null;
      stopSilentLoop();
      return;
    }
    
    await unlockAudio();
    startSilentLoop();
    
    const type = document.getElementById('settings-sound')?.value;
    log('Playing test sound:', type);
    
    if (type && type !== 'none') {
      const files = {
        'bell': 'sounds/temple_bell_standard.mp3',
        'bell-high': 'sounds/temple_bell_high.mp3',
        'chugpi': 'sounds/chugpi.mp3'
      };
      
      const src = files[type];
      if (src) {
        currentTestAudio = new Audio(src);
        currentTestAudio.volume = 1.0;
        currentTestAudio.loop = false;
        
        currentTestAudio.addEventListener('ended', () => {
          testAudioPlaying = false;
          currentTestAudio = null;
          stopSilentLoop();
        });
        
        currentTestAudio.addEventListener('error', () => {
          testAudioPlaying = false;
          currentTestAudio = null;
          stopSilentLoop();
        });
        
        await currentTestAudio.play();
        testAudioPlaying = true;
      }
    }
  } catch (error) {
    log('Test sound failed:', error);
    testAudioPlaying = false;
    currentTestAudio = null;
    stopSilentLoop();
  }
});

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

if (isIOS) {
  log('iOS detected, setting up handlers');
  showIOSLoadingScreen();
  setupVisibilityHandler();
}

window.addEventListener('error', (e) => {
  log('Global error:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  log('Unhandled promise rejection:', e.reason);
});

if (typeof window !== 'undefined') {
  window.SilentBell = {
    getWakeLockInfo,
    isTimerRunning,
    saveToStorage,
    loadFromStorage,
    preloadSoundSet,
    unlockAudio
  };
}

function init() {
  log('Initializing Silent Bell v1.3.1...');
  log('Platform:', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop');
  log('Standalone:', isStandalone);
  
  initI18n();
  loadFromStorage();
  initSettingsRefs();
  loadSettings(display);
  setupSettingsListeners(display);
  initDragHandler();
  saveToStorage();
  
  const defaultSound = 'bell';
  preloadSoundSet(defaultSound).catch(() => {});
  
  log('Silent Bell initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
