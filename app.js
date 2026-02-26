// ─── Silent Bell - Main Application Entry Point ──────────────────

import { t, initI18n, getCurrentLang } from './modules/i18n.js';
import { unlockAudio } from './modules/audio-context.js';
import { playSound, playStrokes } from './modules/audio.js';
import { stopSilentLoop } from './modules/silent-loop.js';
import {
  formatTime, getTotalSeconds, setTime, changeTime, isTimerRunning,
  startCountdown, startSession, stopSession, clearCountdown,
  initNoSleep, enableNoSleep, disableNoSleep,
  setCurrentSound, getTimerState
} from './modules/timer.js';
import {
  renderLog, exportCSV, importCSV, saveManualSession, clearLog,
  setSessionStart, setPlannedDuration, setCurrentSoundForLog
} from './modules/log.js';
import { initSettingsRefs, loadSettings, setupSettingsListeners } from './modules/settings.js';

// ─── DOM refs ────────────────────────────────────────────────────

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const intervalSelect = document.getElementById('interval-select');

// ─── Service Worker Registration ─────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js')
      .then(function(registration) {
        console.log('SW registered: ', registration.scope);
      })
      .catch(function(error) {
        console.log('SW registration failed: ', error);
      });
  });
}

// ─── Navigation ──────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

// ─── Interactive Timer Display ────────────────────────────────────

var dragStartY = null;
var dragTotal = null;
var dragUnit = 60;

document.getElementById('display-up').addEventListener('click', function(e) {
  if (!changeTime(0)) return;
  setTime(getTotalSeconds() + (e.shiftKey ? 1 : 60), display);
});

document.getElementById('display-down').addEventListener('click', function(e) {
  if (!changeTime(0)) return;
  setTime(getTotalSeconds() - (e.shiftKey ? 1 : 60), display);
});

var displayWrap = document.getElementById('display-wrap');

displayWrap.addEventListener('touchstart', function(e) {
  if (isTimerRunning()) return;
  var touch = e.touches[0];
  var rect = displayWrap.getBoundingClientRect();
  var leftHalf = (touch.clientX - rect.left) < rect.width / 2;
  dragStartY = touch.clientY;
  dragTotal = getTotalSeconds();
  dragUnit = leftHalf ? 60 : 1;
}, { passive: true });

displayWrap.addEventListener('touchmove', function(e) {
  if (dragStartY === null) return;
  var delta = Math.round((dragStartY - e.touches[0].clientY) / 12);
  var newTotal = Math.min(28800, Math.max(60, dragTotal + delta * dragUnit));
  setTime(newTotal, display);
}, { passive: true });

displayWrap.addEventListener('touchend', function() {
  dragStartY = null; dragTotal = null;
});

displayWrap.addEventListener('mousedown', function(e) {
  if (isTimerRunning()) return;
  var rect = displayWrap.getBoundingClientRect();
  var leftHalf = (e.clientX - rect.left) < rect.width / 2;
  dragUnit = leftHalf ? 60 : 1;
  dragStartY = e.clientY;
  dragTotal = getTotalSeconds();
});

document.addEventListener('mousemove', function(e) {
  if (dragStartY === null) return;
  var delta = Math.round((dragStartY - e.clientY) / 12);
  var newTotal = Math.min(28800, Math.max(60, dragTotal + delta * dragUnit));
  setTime(newTotal, display);
});

document.addEventListener('mouseup', function() {
  dragStartY = null; dragTotal = null;
});

// ─── Start / Stop Buttons ────────────────────────────────────────

btnStart.addEventListener('click', function() {
  unlockAudio();
  btnStart.disabled = true;
  statusEl.textContent = t('status_ready');
  initNoSleep();
  enableNoSleep();
  
  var state = getTimerState();
  setSessionStart(Date.now());
  setPlannedDuration(getTotalSeconds());
  setCurrentSoundForLog(state.currentSound);
  
  startCountdown(display, statusEl, btnStart, btnStop, function() {
    startSession(display, statusEl, btnStart, btnStop, intervalSelect.value);
  });
});

btnStop.addEventListener('click', function() {
  var result = stopSession(display, statusEl, btnStart, btnStop);
  if (result.stopped && !result.early) {
    disableNoSleep();
  }
});

// ─── CSV Export / Import ─────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', exportCSV);

document.getElementById('btn-import-csv').addEventListener('click', function() {
  document.getElementById('import-csv-file').click();
});

document.getElementById('import-csv-file').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  importCSV(file, function(count) {
    alert('Imported ' + count + ' sessions from CSV.');
  }, function(err) {
    alert('Could not import CSV: ' + err);
  });
  e.target.value = '';
});

// ─── Manual Session Entry ────────────────────────────────────────

document.getElementById('btn-manual-log').addEventListener('click', function() {
  var form = document.getElementById('manual-entry');
  var visible = form.style.display === 'flex';
  if (visible) {
    form.style.display = 'none';
  } else {
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    document.getElementById('manual-date').value =
      now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    document.getElementById('manual-time').value =
      pad(now.getHours()) + ':' + pad(now.getMinutes());
    document.getElementById('manual-duration').value = '';
    document.getElementById('manual-note').value = '';
    document.getElementById('manual-note').placeholder = t('note_placeholder');
    form.style.display = 'flex';
  }
});

document.getElementById('manual-cancel-btn').addEventListener('click', function() {
  document.getElementById('manual-entry').style.display = 'none';
});

document.getElementById('manual-save-btn').addEventListener('click', function() {
  var dateVal = document.getElementById('manual-date').value;
  var timeVal = document.getElementById('manual-time').value;
  var durVal = parseInt(document.getElementById('manual-duration').value);
  var noteVal = document.getElementById('manual-note').value.trim();
  if (!durVal || durVal < 1) {
    alert(t('manual_err_dur'));
    return;
  }
  if (!dateVal) {
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    dateVal = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }
  if (!timeVal) timeVal = '00:00';
  saveManualSession(dateVal, timeVal, durVal, noteVal);
  document.getElementById('manual-entry').style.display = 'none';
  renderLog();
  alert(t('manual_saved'));
});

// ─── Clear Log ────────────────────────────────────────────────────

document.getElementById('btn-clear-log').addEventListener('click', function() {
  if (confirm(t('confirm_clear'))) {
    clearLog();
    renderLog();
  }
});

// ─── Test Sound ───────────────────────────────────────────────────

document.getElementById('btn-test-sound').addEventListener('click', function() {
  unlockAudio();
  var type = document.getElementById('settings-sound').value;
  if (type === 'chugpi') playStrokes('chugpi', 1);
  else if (type !== 'none') playSound(type);
});

// ─── iOS Install Banner ───────────────────────────────────────────

(function() {
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true;
  var dismissed = localStorage.getItem('iosPromptDismissed');
  if (!isIos || isStandalone || dismissed) return;

  var banner = document.getElementById('ios-install-banner');
  var text = document.getElementById('ios-install-text');
  var close = document.getElementById('ios-install-close');
  if (!banner) return;

  text.textContent = t('ios_install');
  banner.style.display = 'flex';

  close.addEventListener('click', function() {
    banner.style.display = 'none';
    localStorage.setItem('iosPromptDismissed', '1');
  });
})();

// ─── Initialization ──────────────────────────────────────────────

initI18n();
initSettingsRefs();
loadSettings(display);
setupSettingsListeners(display);
