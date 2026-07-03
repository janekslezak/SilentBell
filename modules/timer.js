// ─── Timer Module ────────────────────────────────────────────────
// Meditation timer with high-precision countdown using
// requestAnimationFrame + timestamp comparison (no setInterval drift).
//
// Session lifecycle:
//   startCountdown() → prepare phase → startSession() → RAF tick loop → completeSession()
//                                       ↑                │
//                                       └──── stopSession() ←──┘

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
import { dimScreen, restoreScreen } from './screen-dimmer.js';
import { isIOS } from './platform.js';

let rafId = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;
let wakeLockAcquired = false;
let lastTickSecond = -1;

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Timer]', ...args); }

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

export function setCurrentSound(sound) { set('audio.currentSound', sound); }
export function setPrepareSeconds(secs) { set('timer.prepareSeconds', Math.max(0, Math.min(60, parseInt(secs, 10) || 0))); }
export function setNotesEnabled(enabled) { set('settings.notes', enabled); }
export function setSelectedMinutes(mins) { set('timer.selectedMinutes', Math.max(0, Math.min(480, parseInt(mins, 10) || 0))); }
export function setSelectedSeconds(secs) { set('timer.selectedSeconds', Math.max(0, Math.min(59, parseInt(secs, 10) || 0))); }

export function formatTime(secs) {
  const total = Math.abs(Math.floor(secs));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function getTotalSeconds() {
  return (get('timer.selectedMinutes') || 20) * 60 + (get('timer.selectedSeconds') || 0);
}

export function setTime(totalSecs, displayEl) {
  const clamped = Math.min(28800, Math.max(60, totalSecs));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  set('timer.selectedMinutes', mins);
  set('timer.selectedSeconds', secs);
  if (displayEl) displayEl.textContent = formatTime(clamped);
}

export function changeTime() {
  return !isTimerRunning();
}

export function isTimerRunning() {
  return rafId !== null || countdownInterval !== null;
}

function setMeditating(active) {
  document.getElementById('view-timer')?.classList.toggle('meditating', active);
  document.body.classList.toggle('meditating', active);
  set('timer.isRunning', active);
}

// ─── Preparation Countdown ───────────────────────────────────────

export function startCountdown(displayEl, statusEl, btnStart, btnStop, onComplete) {
  const prepareSeconds = get('timer.prepareSeconds') || 10;
  let secsLeft = prepareSeconds;
  wakeLockAcquired = false;

  if (secsLeft <= 0) { onComplete(); return; }

  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;

  const update = () => {
    if (statusEl) statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    if (displayEl) displayEl.textContent = formatTime(secsLeft);
  };
  update();

  countdownInterval = setInterval(() => {
    secsLeft--;
    if (secsLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      onComplete();
    } else {
      update();
    }
  }, 1000);
}

export function clearCountdown() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; return true; }
  return false;
}

// ─── Main Session — RAF-based High Precision Timer ───────────────

export async function startSession(displayEl, statusEl, btnStart, btnStop, intervalSelectValue, currentSound) {
  intervalBellMs = parseInt(intervalSelectValue, 10) * 60 * 1000 || 0;
  plannedDuration = getTotalSeconds();
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;
  lastTickSecond = -1;

  const sound = currentSound || get('audio.currentSound') || 'bell';
  log('Starting session, duration:', plannedDuration, 'sound:', sound);

  // Wake lock
  try {
    const method = await acquireWakeLock();
    wakeLockAcquired = true;
    log('Wake lock acquired:', method);
  } catch (err) {
    log('Wake lock failed:', err.message);
    wakeLockAcquired = false;
  }

  // Start sound
  try {
    await playStartSound(sound);
  } catch (e) { log('Start sound error:', e.message); }

  if (statusEl) statusEl.textContent = t('status_meditating');
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;

  setMeditating(true);

  // Dim screen after session begins (if setting enabled)
  dimScreen();

  // Start the RAF loop
  tick(displayEl, statusEl, btnStart, btnStop, sound);
}

function tick(displayEl, statusEl, btnStart, btnStop, currentSound) {
  const now = Date.now();
  const remainingMs = endTimestamp - now;
  const remaining = Math.max(0, Math.round(remainingMs / 1000));

  // Only update display when the second changes (reduces DOM thrashing)
  if (remaining !== lastTickSecond) {
    lastTickSecond = remaining;
    if (displayEl) displayEl.textContent = formatTime(remaining);
  }

  // Interval bell
  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    try { playIntervalSound(currentSound); } catch {}
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) nextIntervalAt = null;
  }

  // Session complete
  if (remaining <= 0) {
    completeSession(displayEl, statusEl, btnStart, btnStop, currentSound);
    return;
  }

  rafId = requestAnimationFrame(() => tick(displayEl, statusEl, btnStart, btnStop, currentSound));
}

// ─── Session Completion ──────────────────────────────────────────

async function completeSession(displayEl, statusEl, btnStart, btnStop, currentSound) {
  rafId = null;
  setMeditating(false);
  restoreScreen();

  const sound = currentSound || get('audio.currentSound') || 'bell';
  log('Session complete, playing end sound:', sound);

  try {
    await playEndSound(sound);
    log('End sound completed');
  } catch (e) { log('End sound error:', e.message); }

  // Platform-specific cleanup delays
  const cleanupDelay = isIOS ? 12000 : 20000;
  const wakeLockDelay = isIOS ? 10000 : 18000;

  setTimeout(() => {
    stopSilentLoop();
    stopIOSSession();
    stopAllAudio();
    log('Audio cleanup completed');
  }, cleanupDelay);

  if (wakeLockAcquired) {
    setTimeout(async () => {
      try { await releaseWakeLock(); wakeLockAcquired = false; log('Wake lock released'); }
      catch (e) { log('Wake lock release error:', e.message); }
    }, wakeLockDelay);
  }

  // Notes
  const notesEnabled = get('settings.notes') !== false;
  if (notesEnabled) { showNoteField(true, undefined); }
  else { saveSession(true, undefined, ''); }

  if (statusEl) statusEl.textContent = t('status_complete');
  if (btnStart) { btnStart.disabled = false; btnStart.textContent = t('btn_start'); }
  if (btnStop) btnStop.disabled = true;
  if (displayEl) displayEl.textContent = formatTime(plannedDuration);
}

// ─── Stop Session ────────────────────────────────────────────────

export function stopSession(displayEl, statusEl, btnStart, btnStop) {
  log('Stopping session...');

  // Stop countdown if active
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    cleanupAfterStop(displayEl, statusEl, btnStart, btnStop, false);
    return { stopped: true, early: false };
  }

  if (!rafId) return { stopped: false };

  cancelAnimationFrame(rafId);
  rafId = null;
  setMeditating(false);
  cleanupAfterStop(displayEl, statusEl, btnStart, btnStop, true);

  const actual = Math.round((Date.now() - sessionStart) / 1000);
  return { stopped: true, early: true, actual };
}

function cleanupAfterStop(displayEl, statusEl, btnStart, btnStop, wasEarly) {
  restoreScreen();

  if (wakeLockAcquired) {
    releaseWakeLock().catch(() => {});
    wakeLockAcquired = false;
  }
  stopSilentLoop();
  stopIOSSession();
  stopAllAudio();

  if (wasEarly) {
    const actual = Math.round((Date.now() - sessionStart) / 1000);
    const notesEnabled = get('settings.notes') !== false;
    if (notesEnabled) { showNoteField(false, actual); }
    else { saveSession(false, actual, ''); }
    if (statusEl) statusEl.textContent = t('status_stopped');
  } else {
    if (statusEl) statusEl.textContent = t('status_ready');
  }

  if (btnStart) { btnStart.disabled = false; btnStart.textContent = t('btn_start'); }
  if (btnStop) btnStop.disabled = true;
  if (displayEl) displayEl.textContent = formatTime(plannedDuration);
}
