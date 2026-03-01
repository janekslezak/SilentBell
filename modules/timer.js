// ─── Timer Module ────────────────────────────────────────────────
// Meditation timer with countdown, interval bells, and session management.

import { t } from './i18n.js';
import { ensureAudioContext, getAudioContext } from './audio-context.js';
import { playSound, playStrokes, playChugpiNow, getChugpiMaster, playTempleBell, playTempleBellHigh, playSingingBowlEdge, playSingingBowlEdgeHigh } from './audio.js';
import { stopSilentLoop } from './silent-loop.js';
import { saveSession, showNoteField } from './log.js';
import { state, set, get } from './state.js';

let timerInterval = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;

// Get timer state for external access
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

// State setters that sync with central state
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

// Format time as MM:SS
export function formatTime(secs) {
  const totalSeconds = Math.abs(Math.floor(secs));
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Get total seconds from state
export function getTotalSeconds() {
  const mins = get('timer.selectedMinutes') || 20;
  const secs = get('timer.selectedSeconds') || 0;
  return mins * 60 + secs;
}

// Set time and update display
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

// Check if time can be changed
export function changeTime(deltaSecs) {
  if (timerInterval || countdownInterval) {
    return false;
  }
  return true;
}

// Check if timer is running
export function isTimerRunning() {
  return timerInterval !== null || countdownInterval !== null;
}

// Set meditating visual state
function setMeditating(active) {
  const viewTimer = document.getElementById('view-timer');
  if (viewTimer) {
    viewTimer.classList.toggle('meditating', active);
  }
  set('timer.isRunning', active);
}

// ─── Prepare Countdown ───────────────────────────────────────────

export function startCountdown(displayEl, statusEl, btnStart, btnStop, onComplete) {
  const prepareSeconds = get('timer.prepareSeconds') || 10;
  let secsLeft = prepareSeconds;
  
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

// ─── Session Management ──────────────────────────────────────────

export function startSession(displayEl, statusEl, btnStart, btnStop, intervalSelectValue) {
  intervalBellMs = parseInt(intervalSelectValue, 10) * 60 * 1000 || 0;
  plannedDuration = getTotalSeconds();
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;
  
  // Ensure audio context is ready
  ensureAudioContext().catch(err => {
    console.warn('Audio context ensure failed:', err);
  });
  
  // Play start sound
  const currentSound = get('audio.currentSound') || 'bell';
  
  try {
    if (currentSound === 'chugpi') {
      playStrokes('chugpi', 3);
    } else if (currentSound !== 'none') {
      playStrokes(currentSound, 1);
    }
  } catch (error) {
    console.warn('Start sound failed:', error);
  }
  
  // Update UI
  if (statusEl) statusEl.textContent = t('status_meditating');
  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;
  
  setMeditating(true);
  
  // Start timer tick
  timerInterval = setInterval(() => {
    tick(displayEl, statusEl, btnStart, btnStop);
  }, 500);
}

// Timer tick function
function tick(displayEl, statusEl, btnStart, btnStop) {
  const now = Date.now();
  const remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  
  if (displayEl) {
    displayEl.textContent = formatTime(remaining);
  }
  
  // Check for interval bell
  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    const currentSound = get('audio.currentSound') || 'bell';
    
    try {
      playSound(currentSound);
    } catch (error) {
      console.warn('Interval bell failed:', error);
    }
    
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) {
      nextIntervalAt = null;
    }
  }
  
  // Check for session end
  if (remaining <= 0) {
    completeSession(displayEl, statusEl, btnStart, btnStop);
  }
}

// Complete meditation session
function completeSession(displayEl, statusEl, btnStart, btnStop) {
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  // Play ending sounds
  const currentSound = get('audio.currentSound') || 'bell';
  
  try {
    const ctx = getAudioContext();
    
    function doEnding() {
      const now = ctx.currentTime;
      
      if (currentSound === 'none') { 
        stopSilentLoop(); 
        return; 
      }
      
      if (currentSound === 'chugpi') {
        getChugpiMaster();
        playChugpiNow(now + 0.15, 1.0);
        playChugpiNow(now + 1.65, 1.0);
        playChugpiNow(now + 3.15, 1.0);
      } else if (currentSound === 'bell-high') {
        playSingingBowlEdgeHigh(now + 0.0);
        playTempleBellHigh(now + 1.8, 0.55);
        playTempleBellHigh(now + 5.8, 1.0);
        playTempleBellHigh(now + 9.8, 1.0);
      } else {
        playSingingBowlEdge(now + 0.0);
        playTempleBell(now + 1.8, 0.55);
        playTempleBell(now + 5.8, 1.0);
        playTempleBell(now + 9.8, 1.0);
      }
      
      setTimeout(stopSilentLoop, 13000);
    }
    
    if (ctx.state === 'suspended') { 
      ctx.resume().then(doEnding).catch(doEnding); 
    } else { 
      doEnding(); 
    }
  } catch (error) {
    console.warn('Ending sounds failed:', error);
    stopSilentLoop();
  }
  
  // Handle notes/save
  const notesEnabled = get('settings.notes') !== false;
  
  if (notesEnabled) {
    showNoteField(true, undefined);
  } else {
    saveSession(true, undefined, '');
  }
  
  // Update UI
  if (statusEl) statusEl.textContent = t('status_complete');
  if (btnStart) {
    btnStart.disabled = false;
    btnStart.textContent = t('btn_start');
  }
  if (btnStop) btnStop.disabled = true;
  if (displayEl) displayEl.textContent = formatTime(plannedDuration);
}

// Stop session
export function stopSession(displayEl, statusEl, btnStart, btnStop) {
  // Handle countdown stop
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    
    stopSilentLoop();
    
    if (statusEl) statusEl.textContent = t('status_ready');
    if (btnStart) btnStart.disabled = false;
    if (btnStop) btnStop.disabled = true;
    if (displayEl) displayEl.textContent = formatTime(getTotalSeconds());
    
    return { stopped: true, early: false };
  }
  
  if (!timerInterval) return { stopped: false };
  
  clearInterval(timerInterval);
  timerInterval = null;
  
  setMeditating(false);
  
  stopSilentLoop();
  
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

// ─── Legacy NoSleep Compatibility ────────────────────────────────

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
