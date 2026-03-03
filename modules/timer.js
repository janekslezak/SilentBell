// ─── Timer Module ────────────────────────────────────────────────
// Meditation timer with countdown, interval bells, and session management.

import { t } from './i18n.js';
import { 
  playStartSound, 
  playIntervalSound, 
  playEndSound,
  stopAllAudio,
  startIOSSession,
  stopIOSSession
} from './audio.js';
import { startSilentLoop, stopSilentLoop } from './silent-loop.js';
import { saveSession, showNoteField } from './log.js';
import { state, set, get } from './state.js';
import { acquireWakeLock, releaseWakeLock } from './wakelock.js';

let timerInterval = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;
let wakeLockAcquired = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Timer]', ...args);
}

export function getTimerState() {
  return {
    currentSound: get('audio.currentSound') || 'bell',
    selectedMinutes: get('timer.selectedMinutes') || 20,
    selectedSeconds: get('timer.selectedSeconds') || 0,
    prepareSeconds: get('timer.prepareSeconds') || 10,
    notesEnabled: get('settings.notes') !== false,
    isRunning: isTimerRunning()
  };
}

export function setCurrentSound(sound) {
  set('audio.currentSound', sound);
}

export function setPrepareSeconds(secs) {
  const value = Math.max(0, Math.min(60, parseInt(secs, 10) || 0));
  set('timer.prepareSeconds', value);
}

export function setNotesEnabled(enabled) {
  set('settings.notes', enabled);
}

export function setSelectedMinutes(mins) {
  const value = Math.max(0, Math.min(480, parseInt(mins, 10) || 0));
  set('timer.selectedMinutes', value);
}

export function setSelectedSeconds(secs) {
  const value = Math.max(0, Math.min(59, parseInt(secs, 10) || 0));
  set('timer.selectedSeconds', value);
}

export function formatTime(secs) {
  const totalSeconds = Math.abs(Math.floor(secs));
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function getTotalSeconds() {
  const mins = get('timer.selectedMinutes') || 20;
  const secs = get('timer.selectedSeconds') || 0;
  return mins * 60 + secs;
}

export function setTime(totalSecs, displayEl) {
  const clamped = Math.min(28800, Math.max(60, totalSecs));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  
  set('timer.selectedMinutes', mins);
  set('timer.selectedSeconds', secs);
  
  if (displayEl) {
    displayEl.textContent = formatTime(clamped);
  }
}

export function changeTime(deltaSecs) {
  if (timerInterval || countdownInterval) {
    return false;
  }
  return true;
}

export function isTimerRunning() {
  return timerInterval !== null || countdownInterval !== null;
}

function setMeditating(active) {
  const viewTimer = document.getElementById('view-timer');
  if (viewTimer) {
    viewTimer.classList.toggle('meditating', active);
  }
  set('timer.isRunning', active);
}

export function startCountdown(displayEl, statusEl, btnStart, btnStop, onComplete) {
  const prepareSeconds = get('timer.prepareSeconds') || 10;
  let secsLeft = prepareSeconds;
  
  wakeLockAcquired = false;
  
  if (secsLeft <= 0) {
    onComplete();
    return;
  }
  
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;
  
  const updateDisplay = () => {
    if (statusEl) {
      statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    }
    if (displayEl) {
      displayEl.textContent = formatTime(secsLeft);
    }
  };
  
  updateDisplay();
  
  countdownInterval = setInterval(() => {
    secsLeft--;
    
    if (secsLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      onComplete();
    } else {
      updateDisplay();
    }
  }, 1000);
}

export function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    return true;
  }
  return false;
}

export async function startSession(displayEl, statusEl, btnStart, btnStop, intervalSelectValue, currentSound) {
  intervalBellMs = parseInt(intervalSelectValue, 10) * 60 * 1000 || 0;
  plannedDuration = getTotalSeconds();
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;
  
  const sound = currentSound || get('audio.currentSound') || 'bell';
  
  log('Starting session, duration:', plannedDuration, 'sound:', sound);
  
  if (!isIOS) {
    startSilentLoop();
  } else {
    // For iOS, restart silent loop to ensure it continues
    stopSilentLoop();
    startSilentLoop();
  }
  
  // Acquire wake lock (critical for screen-off)
  try {
    const method = await acquireWakeLock();
    wakeLockAcquired = true;
    log('Wake lock acquired:', method);
  } catch (err) {
    log('Wake lock failed:', err.message);
    wakeLockAcquired = false;
  }
  
  // Play start sound
  try {
    log('Playing start sound...');
    await playStartSound(sound);
  } catch (error) {
    log('Start sound error:', error.message);
  }
  
  if (statusEl) statusEl.textContent = t('status_meditating');
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;
  
  setMeditating(true);
  
  timerInterval = setInterval(() => {
    tick(displayEl, statusEl, btnStart, btnStop, sound);
  }, 1000);
}

function tick(displayEl, statusEl, btnStart, btnStop, currentSound) {
  const now = Date.now();
  const remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  
  if (displayEl) {
    displayEl.textContent = formatTime(remaining);
  }
  
  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    try {
      playIntervalSound(currentSound);
    } catch (error) {
      log('Interval bell failed:', error.message);
    }
    
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) {
      nextIntervalAt = null;
    }
  }
  
  if (remaining <= 0) {
    completeSession(displayEl, statusEl, btnStart, btnStop, currentSound);
  }
}

async function completeSession(displayEl, statusEl, btnStart, btnStop, currentSound) {
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  const sound = currentSound || get('audio.currentSound') || 'bell';
  
  log('Session complete, playing end sound:', sound);
  
  try {
    await playEndSound(sound);
    log('End sound completed');
  } catch (error) {
    log('End sound error:', error.message);
  }
  
  // Cleanup
  setTimeout(() => {
    stopSilentLoop();
    stopIOSSession();
    stopAllAudio();
  }, 10000);
  
  if (wakeLockAcquired) {
    try {
      await releaseWakeLock();
      wakeLockAcquired = false;
    } catch (e) {
      log('Error releasing wake lock:', e.message);
    }
  }
  
  const notesEnabled = get('settings.notes') !== false;
  
  if (notesEnabled) {
    showNoteField(true, undefined);
  } else {
    saveSession(true, undefined, '');
  }
  
  if (statusEl) statusEl.textContent = t('status_complete');
  if (btnStart) {
    btnStart.disabled = false;
    btnStart.textContent = t('btn_start');
  }
  if (btnStop) btnStop.disabled = true;
  if (displayEl) displayEl.textContent = formatTime(plannedDuration);
}

export function stopSession(displayEl, statusEl, btnStart, btnStop) {
  log('Stopping session...');
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    
    if (wakeLockAcquired) {
      releaseWakeLock().catch(() => {});
      wakeLockAcquired = false;
    }
    
    stopSilentLoop();
    stopIOSSession();
    stopAllAudio();
    
    if (statusEl) statusEl.textContent = t('status_ready');
    if (btnStart) btnStart.disabled = false;
    if (btnStop) btnStop.disabled = true;
    if (displayEl) displayEl.textContent = formatTime(getTotalSeconds());
    
    return { stopped: true, early: false };
  }
  
  if (!timerInterval) {
    return { stopped: false };
  }
  
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  if (wakeLockAcquired) {
    releaseWakeLock().catch(() => {});
    wakeLockAcquired = false;
  }
  
  stopSilentLoop();
  stopIOSSession();
  stopAllAudio();
  
  const actual = Math.round((Date.now() - sessionStart) / 1000);
  const notesEnabled = get('settings.notes') !== false;
  
  if (notesEnabled) {
    showNoteField(false, actual);
  } else {
    saveSession(false, actual, '');
  }
  
  if (statusEl) statusEl.textContent = t('status_stopped');
  if (btnStart) {
    btnStart.disabled = false;
    btnStart.textContent = t('btn_start');
  }
  if (btnStop) btnStop.disabled = true;
  if (displayEl) displayEl.textContent = formatTime(plannedDuration);
  
  return { stopped: true, early: true, actual };
}

let noSleep = null;

export function initNoSleep() {
  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  return noSleep;
}

export function enableNoSleep() {
  if (noSleep) {
    noSleep.enable().catch(() => {});
  }
}

export function disableNoSleep() {
  if (noSleep) {
    noSleep.disable();
  }
}
