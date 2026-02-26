// ─── Timer Module ────────────────────────────────────────────────

import { t } from './i18n.js';
import { ensureAudioContext, getAudioContext } from './audio-context.js';
import { playSound, playStrokes, playChugpiNow, getChugpiMaster, playTempleBell, playTempleBellHigh, playSingingBowlEdge, playSingingBowlEdgeHigh } from './audio.js';
import { stopSilentLoop } from './silent-loop.js';
import { saveSession, showNoteField } from './log.js';

let noSleep = null;
let timerInterval = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;
let currentSound = 'bell';
let selectedMinutes = 20;
let selectedSeconds = 0;
let prepareSeconds = 10;
let notesEnabled = true;

export function getTimerState() {
  return {
    currentSound, selectedMinutes, selectedSeconds, prepareSeconds, notesEnabled
  };
}

export function setCurrentSound(sound) { currentSound = sound; }
export function setPrepareSeconds(secs) { prepareSeconds = secs; }
export function setNotesEnabled(enabled) { notesEnabled = enabled; }
export function setSelectedMinutes(mins) { selectedMinutes = mins; }
export function setSelectedSeconds(secs) { selectedSeconds = secs; }

export function formatTime(secs) {
  var m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  var s = String(Math.abs(secs) % 60).padStart(2, '0');
  return m + ':' + s;
}

export function getTotalSeconds() {
  return selectedMinutes * 60 + selectedSeconds;
}

export function setTime(totalSecs, displayEl) {
  totalSecs = Math.min(28800, Math.max(60, totalSecs));
  selectedMinutes = Math.floor(totalSecs / 60);
  selectedSeconds = totalSecs % 60;
  if (displayEl) displayEl.textContent = formatTime(totalSecs);
}

export function changeTime(deltaSecs) {
  if (timerInterval || countdownInterval) return false;
  return true;
}

export function isTimerRunning() {
  return timerInterval !== null || countdownInterval !== null;
}

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

// ─── Prepare Countdown ───────────────────────────────────────────

export function startCountdown(displayEl, statusEl, btnStart, btnStop, onComplete) {
  var secsLeft = prepareSeconds;
  if (secsLeft <= 0) { onComplete(); return; }
  btnStart.disabled = true;
  btnStop.disabled = false;
  function updateDisplay() {
    statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    displayEl.textContent = formatTime(secsLeft);
  }
  updateDisplay();
  countdownInterval = setInterval(function() {
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

// ─── Session ─────────────────────────────────────────────────────

export function startSession(displayEl, statusEl, btnStart, btnStop, intervalSelectValue) {
  intervalBellMs = +intervalSelectValue * 60 * 1000;
  plannedDuration = getTotalSeconds();
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;

  ensureAudioContext();

  if (currentSound === 'chugpi') playStrokes('chugpi', 3);
  else playStrokes(currentSound, 1);

  statusEl.textContent = t('status_meditating');
  btnStart.disabled = true;
  btnStop.disabled = false;
  setMeditating(true);
  timerInterval = setInterval(function() { tick(displayEl, statusEl, btnStart, btnStop); }, 500);
}

function tick(displayEl, statusEl, btnStart, btnStop) {
  var now = Date.now();
  var remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  displayEl.textContent = formatTime(remaining);

  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    playSound(currentSound);
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) nextIntervalAt = null;
  }

  if (remaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    setMeditating(false);
    if (noSleep) noSleep.disable();

    var ctx = ensureAudioContext();
    function doEnding() {
      var now = ctx.currentTime;
      if (currentSound === 'none') { stopSilentLoop(); return; }
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
    if (ctx.state === 'suspended') { ctx.resume().then(doEnding); } else { doEnding(); }

    if (notesEnabled) showNoteField(true, undefined);
    else saveSession(true, undefined, '');

    statusEl.textContent = t('status_complete');
    btnStart.disabled = false;
    btnStop.disabled = true;
    btnStart.textContent = t('btn_start');
    displayEl.textContent = formatTime(plannedDuration);
  }
}

export function stopSession(displayEl, statusEl, btnStart, btnStop) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    if (noSleep) noSleep.disable();
    stopSilentLoop();
    statusEl.textContent = t('status_ready');
    btnStart.disabled = false;
    btnStop.disabled = true;
    displayEl.textContent = formatTime(getTotalSeconds());
    return { stopped: true, early: false };
  }
  if (!timerInterval) return { stopped: false };
  clearInterval(timerInterval);
  timerInterval = null;
  setMeditating(false);
  if (noSleep) noSleep.disable();
  stopSilentLoop();
  var actual = Math.round((Date.now() - sessionStart) / 1000);

  if (notesEnabled) showNoteField(false, actual);
  else saveSession(false, actual, '');

  statusEl.textContent = t('status_stopped');
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnStart.textContent = t('btn_start');
  displayEl.textContent = formatTime(plannedDuration);
  return { stopped: true, early: true, actual };
}

export function initNoSleep() {
  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  return noSleep;
}

export function enableNoSleep() {
  if (noSleep) noSleep.enable();
}

export function disableNoSleep() {
  if (noSleep) noSleep.disable();
}
