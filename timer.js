import { t } from './lang.js';
import {
  ensureAudioContext, unlockAudio, stopSilentLoop,
  playStrokes, playSound, playSessionEnd
} from './audio.js';
import { showNoteField, saveSession, renderLog } from './log.js';
import { currentSound, prepareSeconds, notesEnabled } from './settings.js';

// ─── State ────────────────────────────────────────────────────────

var timerInterval    = null;
var countdownInterval = null;
var sessionStart     = null;
var endTimestamp     = null;
var plannedDuration  = 0;
var intervalBellMs   = 0;
var nextIntervalAt   = null;
var selectedMinutes  = 20;
var selectedSeconds  = 0;
export let noSleep   = null;

// ─── DOM refs ─────────────────────────────────────────────────────

var display    = document.getElementById('display');
var statusEl   = document.getElementById('status');
var btnStart   = document.getElementById('btn-start');
var btnStop    = document.getElementById('btn-stop');
var intervalSelect = document.getElementById('interval-select');

// ─── Helpers ──────────────────────────────────────────────────────

export function formatTime(secs) {
  var m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  var s = String(Math.abs(secs) % 60).padStart(2, '0');
  return m + ':' + s;
}

export function getTotalSeconds() { return selectedMinutes * 60 + selectedSeconds; }

export function setTime(totalSecs) {
  totalSecs       = Math.min(28800, Math.max(60, totalSecs));
  selectedMinutes = Math.floor(totalSecs / 60);
  selectedSeconds = totalSecs % 60;
  display.textContent = formatTime(totalSecs);
}

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

function changeTime(deltaSecs) {
  if (timerInterval || countdownInterval) return;
  setTime(getTotalSeconds() + deltaSecs);
}

// ─── Display drag ─────────────────────────────────────────────────

export function initDisplayControls() {
  var displayWrap = document.getElementById('display-wrap');
  var dragStartY = null, dragTotal = null, dragUnit = 60;

  document.getElementById('display-up').addEventListener('click', function(e) {
    changeTime(e.shiftKey ? 1 : 60);
  });
  document.getElementById('display-down').addEventListener('click', function(e) {
    changeTime(e.shiftKey ? -1 : -60);
  });

  displayWrap.addEventListener('touchstart', function(e) {
    if (timerInterval || countdownInterval) return;
    var touch    = e.touches[0];
    var rect     = displayWrap.getBoundingClientRect();
    dragUnit   = (touch.clientX - rect.left) < rect.width / 2 ? 60 : 1;
    dragStartY = touch.clientY;
    dragTotal  = getTotalSeconds();
  }, { passive: true });

  displayWrap.addEventListener('touchmove', function(e) {
    if (dragStartY === null) return;
    var delta    = Math.round((dragStartY - e.touches[0].clientY) / 12);
    var newTotal = Math.min(28800, Math.max(60, dragTotal + delta * dragUnit));
    selectedMinutes     = Math.floor(newTotal / 60);
    selectedSeconds     = newTotal % 60;
    display.textContent = formatTime(newTotal);
  }, { passive: true });

  displayWrap.addEventListener('touchend', function() { dragStartY = null; dragTotal = null; });

  displayWrap.addEventListener('mousedown', function(e) {
    if (timerInterval || countdownInterval) return;
    var rect   = displayWrap.getBoundingClientRect();
    dragUnit   = (e.clientX - rect.left) < rect.width / 2 ? 60 : 1;
    dragStartY = e.clientY;
    dragTotal  = getTotalSeconds();
  });
  document.addEventListener('mousemove', function(e) {
    if (dragStartY === null) return;
    var delta    = Math.round((dragStartY - e.clientY) / 12);
    var newTotal = Math.min(28800, Math.max(60, dragTotal + delta * dragUnit));
    selectedMinutes     = Math.floor(newTotal / 60);
    selectedSeconds     = newTotal % 60;
    display.textContent = formatTime(newTotal);
  });
  document.addEventListener('mouseup', function() { dragStartY = null; dragTotal = null; });
}

// ─── Countdown ────────────────────────────────────────────────────

function startCountdown() {
  var secsLeft = prepareSeconds;
  if (secsLeft <= 0) { startSession(); return; }
  btnStart.disabled = true;
  btnStop.disabled  = false;
  function update() {
    statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    display.textContent  = formatTime(secsLeft);
  }
  update();
  countdownInterval = setInterval(function() {
    secsLeft--;
    if (secsLeft <= 0) {
      clearInterval(countdownInterval); countdownInterval = null;
      startSession();
    } else { update(); }
  }, 1000);
}

// ─── Session ──────────────────────────────────────────────────────

function startSession() {
  intervalBellMs  = +intervalSelect.value * 60 * 1000;
  plannedDuration = getTotalSeconds();
  sessionStart    = Date.now();
  endTimestamp    = sessionStart + plannedDuration * 1000;
  nextIntervalAt  = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;

  ensureAudioContext();
  if (currentSound === 'chugpi') playStrokes('chugpi', 3);
  else playStrokes(currentSound, 1);

  statusEl.textContent = t('status_meditating');
  btnStart.disabled = true;
  btnStop.disabled  = false;
  setMeditating(true);
  timerInterval = setInterval(tick, 500);
}

var lastRemaining = -1;
function tick() {
  var now       = Date.now();
  var remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  if (remaining !== lastRemaining) {
    display.textContent = formatTime(remaining);
    lastRemaining = remaining;
  }

  if (intervalBellMs > 0 && nextIntervalAt && now >= nextIntervalAt) {
    playSound(currentSound);
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) nextIntervalAt = null;
  }

  if (remaining <= 0) {
    clearInterval(timerInterval); timerInterval = null;
    setMeditating(false);
    if (noSleep) noSleep.disable();

    var ctx = ensureAudioContext();
    function doEnding() {
      if (currentSound === 'none') { stopSilentLoop(); return; }
      playSessionEnd(ctx, currentSound);
    }
    if (ctx.state === 'suspended') { ctx.resume().then(doEnding); } else { doEnding(); }

    if (notesEnabled) showNoteField(sessionStart, plannedDuration, currentSound, true, undefined);
    else saveSession(sessionStart, plannedDuration, true, undefined, currentSound, '');

    statusEl.textContent = t('status_complete');
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    btnStart.textContent = t('btn_start');
    display.textContent  = formatTime(plannedDuration);
  }
}

export function stopSession() {
  if (countdownInterval) {
    clearInterval(countdownInterval); countdownInterval = null;
    if (noSleep) noSleep.disable();
    stopSilentLoop();
    statusEl.textContent = t('status_ready');
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    display.textContent  = formatTime(getTotalSeconds());
    return;
  }
  if (!timerInterval) return;
  clearInterval(timerInterval); timerInterval = null;
  setMeditating(false);
  if (noSleep) noSleep.disable();
  stopSilentLoop();
  var actual = Math.round((Date.now() - sessionStart) / 1000);
  if (notesEnabled) showNoteField(sessionStart, plannedDuration, currentSound, false, actual);
  else saveSession(sessionStart, plannedDuration, false, actual, currentSound, '');
  statusEl.textContent = t('status_stopped');
  btnStart.disabled    = false;
  btnStop.disabled     = true;
  btnStart.textContent = t('btn_start');
  display.textContent  = formatTime(plannedDuration);
}

// ─── Button listeners ─────────────────────────────────────────────

export function initTimerButtons() {
  btnStart.addEventListener('click', function() {
    unlockAudio();
    btnStart.disabled    = true;
    statusEl.textContent = t('status_ready');
    if (!noSleep && window.NoSleep) noSleep = new NoSleep();
    if (noSleep) noSleep.enable();
    startCountdown();
  });
  btnStop.addEventListener('click', stopSession);
}

