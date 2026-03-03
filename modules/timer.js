// ─── Timer Module ────────────────────────────────────────────────
// Meditation timer with countdown, interval bells, and session management.

import { t } from './i18n.js';
import { getAudioContext } from './audio-context.js';
import { 
  playStartSound, 
  playIntervalSound, 
  playEndSound,
  preloadSoundSet,
  stopAllAudio
} from './audio.js';
import { startSilentLoop, stopSilentLoop } from './silent-loop.js';
import { saveSession, showNoteField } from './log.js';
import { state, set, get } from './state.js';
import { acquireWakeLock, releaseWakeLock, startAudioKeepalive, stopAudioKeepalive } from './wakelock.js';

let timerInterval = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;
let wakeLockAcquired = false;
let audioKeepaliveStarted = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);

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
  
  // Reset state flags
  wakeLockAcquired = false;
  audioKeepaliveStarted = false;
  
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

export async function startSession(displayEl, statusEl, btnStart, btnStop, intervalSelectValue) {
  intervalBellMs = parseInt(intervalSelectValue, 10) * 60 * 1000 || 0;
  plannedDuration = getTotalSeconds();
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;
  
  log('Starting session, duration:', plannedDuration, 'seconds');
  
  // Ensure silent loop is running (keeps audio session alive)
  startSilentLoop();
  
  const currentSound = get('audio.currentSound') || 'bell';
  
  // Preload sounds
  await preloadSoundSet(currentSound);
  
  // Acquire wake lock
  try {
    const method = await acquireWakeLock();
    wakeLockAcquired = true;
    log('Wake lock acquired:', method);
  } catch (err) {
    log('Wake lock failed:', err.message);
    wakeLockAcquired = false;
  }
  
  // Start audio keepalive for iOS
  if (isIOS) {
    try {
      const ctx = getAudioContext();
      startAudioKeepalive(ctx);
      audioKeepaliveStarted = true;
      log('iOS audio keepalive started');
    } catch (err) {
      log('Audio keepalive failed:', err.message);
      audioKeepaliveStarted = false;
    }
  }
  
  // Play start sound
  try {
    await playStartSound(currentSound);
  } catch (error) {
    log('Start sound failed:', error.message);
  }
  
  if (statusEl) statusEl.textContent = t('status_meditating');
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;
  
  setMeditating(true);
  
  timerInterval = setInterval(() => {
    tick(displayEl, statusEl, btnStart, btnStop);
  }, 500);
}

function tick(displayEl, statusEl, btnStart, btnStop) {
  const now = Date.now();
  const remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  
  if (displayEl) {
    displayEl.textContent = formatTime(remaining);
  }
  
  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    const currentSound = get('audio.currentSound') || 'bell';
    
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
    completeSession(displayEl, statusEl, btnStart, btnStop);
  }
}

async function completeSession(displayEl, statusEl, btnStart, btnStop) {
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  const currentSound = get('audio.currentSound') || 'bell';
  
  // Keep silent loop running for end bell on locked screen
  
  try {
    // Ensure audio context is active before playing end sound
    if (isIOS) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
        log('Resumed AudioContext for end bell');
      }
    }
    
    log('Playing end sound...');
    await playEndSound(currentSound);
    log('End sound played');
    
    // Stop silent loop after end bell (with delay for long end sequences)
    setTimeout(() => {
      stopSilentLoop();
      stopAllAudio();
    }, 15000);
  } catch (error) {
    log('Ending sounds failed:', error.message);
    stopSilentLoop();
    stopAllAudio();
  }
  
  // Release wake lock
  if (wakeLockAcquired) {
    try {
      await releaseWakeLock();
      wakeLockAcquired = false;
    } catch (e) {
      log('Error releasing wake lock:', e.message);
    }
  }
  
  if (audioKeepaliveStarted) {
    stopAudioKeepalive();
    audioKeepaliveStarted = false;
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
  
  // Handle countdown stop (preparation phase)
  if (countdownInterval) {
    log('Stopping during countdown phase');
    
    try {
      clearInterval(countdownInterval);
    } catch (e) {
      log('Error clearing countdown interval:', e.message);
    }
    countdownInterval = null;
    
    // Only release resources if they were acquired
    if (wakeLockAcquired) {
      try {
        releaseWakeLock().catch(() => {});
      } catch (e) {
        log('Error releasing wake lock:', e.message);
      }
      wakeLockAcquired = false;
    }
    
    if (audioKeepaliveStarted) {
      try {
        stopAudioKeepalive();
      } catch (e) {
        log('Error stopping audio keepalive:', e.message);
      }
      audioKeepaliveStarted = false;
    }
    
    try {
      stopSilentLoop();
    } catch (e) {
      log('Error stopping silent loop:', e.message);
    }
    
    try {
      stopAllAudio();
    } catch (e) {
      log('Error stopping audio:', e.message);
    }
    
    if (statusEl) statusEl.textContent = t('status_ready');
    if (btnStart) btnStart.disabled = false;
    if (btnStop) btnStop.disabled = true;
    if (displayEl) displayEl.textContent = formatTime(getTotalSeconds());
    
    return { stopped: true, early: false };
  }
  
  // Not running
  if (!timerInterval) {
    log('No active timer to stop');
    return { stopped: false };
  }
  
  // Stop main timer
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  if (wakeLockAcquired) {
    try {
      releaseWakeLock().catch(() => {});
    } catch (e) {
      log('Error releasing wake lock:', e.message);
    }
    wakeLockAcquired = false;
  }
  
  if (audioKeepaliveStarted) {
    try {
      stopAudioKeepalive();
    } catch (e) {
      log('Error stopping audio keepalive:', e.message);
    }
    audioKeepaliveStarted = false;
  }
  
  try {
    stopSilentLoop();
  } catch (e) {
    log('Error stopping silent loop:', e.message);
  }
  
  try {
    stopAllAudio();
  } catch (e) {
    log('Error stopping audio:', e.message);
  }
  
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
