// ─── i18n ────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    app_title: 'Silent Bell',
    nav_timer: 'Timer',
    nav_log: 'Log',
    nav_settings: 'Settings',
    status_ready: 'Ready',
    status_meditating: 'Meditating…',
    status_complete: 'Session complete 🙏',
    status_stopped: 'Stopped early',
    status_prepare: 'Prepare… {secs}s',
    label_sound: 'Sound',
    label_interval: 'Interval bells every',
    sound_bell: 'Bell',
    sound_chugpi: 'Jugbi 죽비',
    sound_silent: 'Silent',
    interval_none: 'None',
    btn_start: 'Start',
    btn_stop: 'Stop',
    btn_export: 'Export CSV',
    btn_clear: 'Clear Log',
    btn_save: 'Save',
    settings_duration: 'Default duration (min)',
    settings_sound: 'Default sound',
    settings_prepare: 'Prepare countdown (sec)',
    settings_saved: 'Saved ✓',
    custom_placeholder: 'Custom min',
    log_sessions: 'Sessions',
    log_total: 'Total time',
    log_completed: 'Completed',
    log_planned: 'planned',
    log_stopped: '⚠ stopped early',
    confirm_clear: 'Clear all session history?'
  },
  pl: {
    app_title: 'Dzwon Ciszy',
    nav_timer: 'Timer',
    nav_log: 'Dziennik',
    nav_settings: 'Ustawienia',
    status_ready: 'Gotowy',
    status_meditating: 'Medytacja…',
    status_complete: 'Sesja zakończona 🙏',
    status_stopped: 'Przerwano',
    status_prepare: 'Przygotuj się… {secs}s',
    label_sound: 'Dźwięk',
    label_interval: 'Dzwon co',
    sound_bell: 'Dzwon',
    sound_chugpi: 'Jugbi 죽비',
    sound_silent: 'Cicho',
    interval_none: 'Brak',
    btn_start: 'Start',
    btn_stop: 'Stop',
    btn_export: 'Eksport CSV',
    btn_clear: 'Wyczyść',
    btn_save: 'Zapisz',
    settings_duration: 'Domyślny czas (min)',
    settings_sound: 'Domyślny dźwięk',
    settings_prepare: 'Odliczanie przed startem (s)',
    settings_saved: 'Zapisano ✓',
    custom_placeholder: 'Własny czas',
    log_sessions: 'Sesje',
    log_total: 'Łączny czas',
    log_completed: 'Ukończone',
    log_planned: 'zaplanowano',
    log_stopped: '⚠ przerwano',
    confirm_clear: 'Wyczyścić historię sesji?'
  }
};

var currentLang = localStorage.getItem('lang') || 'en';
var currentTheme = localStorage.getItem('theme') || 'dark';

function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key])
    || (STRINGS['en'] && STRINGS['en'][key])
    || key;
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('btn-lang').textContent = currentLang === 'en' ? 'PL' : 'EN';
  var logView = document.getElementById('view-log');
  if (logView && logView.classList.contains('active')) renderLog();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('btn-theme').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentTheme === 'dark' ? '#111820' : '#f0ece4';
}

document.getElementById('btn-lang').addEventListener('click', function() {
  currentLang = currentLang === 'en' ? 'pl' : 'en';
  localStorage.setItem('lang', currentLang);
  applyLang();
});

document.getElementById('btn-theme').addEventListener('click', function() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
});

// ─── Audio Engine ────────────────────────────────────────────────

var noSleep = null;
var sharedAudioCtx = null;
var silentLoop = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

// ─── Silent-switch bypass for iOS ────────────────────────────────
// A looping silent HTMLAudioElement forces iOS to route ALL audio
// through the media category, which ignores the silent switch.

function createSilentLoop() {
  if (silentLoop) return;
  // Minimal valid silent MP3 as base64 data URI — no extra file needed
  var SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAA' +
    'IVRSQ0sAAAAZAAAAA0xlbmd0aAAAAAAAAAAAAAAAAAAAAAAAAAD/+0DEAAAB' +
    'aABgAAAAAA0gAAAAAAxhTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
  silentLoop = new Audio(SILENT_MP3);
  silentLoop.loop = true;
  silentLoop.volume = 0.001;
  silentLoop.setAttribute('playsinline', '');
  silentLoop.setAttribute('x-webkit-airplay', 'deny');
}

function startSilentLoop() {
  createSilentLoop();
  silentLoop.play().catch(function(e) { console.warn('Silent loop failed:', e); });
}

function stopSilentLoop() {
  if (silentLoop) {
    silentLoop.pause();
    silentLoop.currentTime = 0;
  }
}

function unlockAudio() {
  try {
    var ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // Silent zero-filled buffer — activates AudioContext on iOS
    var silentBuf = ctx.createBuffer(1, 512, ctx.sampleRate);
    var silentSrc = ctx.createBufferSource();
    silentSrc.buffer = silentBuf;
    silentSrc.connect(ctx.destination);
    silentSrc.start(0);
    // Start silent loop to switch iOS into media audio category
    startSilentLoop();
  } catch (e) {
    console.warn('unlockAudio failed:', e);
  }
}

// ─── Temple Bell Synthesizer ──────────────────────────────────────

function playTempleBell(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = getAudioContext();
  var t0 = startTime;

  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -6;
  master.knee.value = 6;
  master.ratio.value = 3;
  master.attack.value = 0.003;
  master.release.value = 0.25;
  master.connect(ctx.destination);

  // Strike transient
  var clankSize = Math.floor(ctx.sampleRate * 0.04);
  var clankBuf = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  var clankData = clankBuf.getChannelData(0);
  for (var i = 0; i < clankSize; i++)
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 2);
  var clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  var clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass';
  clankBp.frequency.value = 6000;
  clankBp.Q.value = 0.8;
  var clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.001, t0);
  clankGain.gain.linearRampToValueAtTime(1.2 * velocity, t0 + 0.002);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  clankSrc.connect(clankBp);
  clankBp.connect(clankGain);
  clankGain.connect(master);
  clankSrc.start(t0);
  clankSrc.stop(t0 + 0.07);

  // Sinusoidal partial helper
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + decayTime + 0.1);
  }

  // Fundamental + inharmonic partials (real bell acoustic ratios)
  addPartial(110,  0.55, 0.012, 14.0);
  addPartial(304,  0.40, 0.008,  9.0);
  addPartial(594,  0.28, 0.006,  6.5);
  addPartial(982,  0.18, 0.004,  4.0);
  addPartial(1627, 0.10, 0.003,  2.5);

  // Shimmer tremolo — gentle LFO on fundamental for living sustain
  var shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine';
  shimmerLfo.frequency.value = 4.5;
  var shimmerDepth = ctx.createGain();
  shimmerDepth.gain.value = 0.06;
  var shimmerFund = ctx.createOscillator();
  shimmerFund.type = 'sine';
  shimmerFund.frequency.value = 110;
  var shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.001, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.15 * velocity, t0 + 0.05);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  shimmerLfo.connect(shimmerDepth);
  shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv);
  shimmerEnv.connect(master);
  shimmerLfo.start(t0);
  shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 14.1);
  shimmerFund.stop(t0 + 14.1);
}

// ─── Chugpi (죽비) Synthesizer ────────────────────────────────────

function playChugpiNow(startTime) {
  var ctx = getAudioContext();
  var now = startTime;

  var crackSize = Math.floor(ctx.sampleRate * 0.08);
  var crackBuf = ctx.createBuffer(1, crackSize, ctx.sampleRate);
  var crackData = crackBuf.getChannelData(0);
  for (var i = 0; i < crackSize; i++)
    crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackSize, 4);
  var crackSrc = ctx.createBufferSource();
  crackSrc.buffer = crackBuf;
  var crackFilter = ctx.createBiquadFilter();
  crackFilter.type = 'bandpass';
  crackFilter.frequency.value = 3500;
  crackFilter.Q.value = 0.6;
  var crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(3.5, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  crackSrc.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(ctx.destination);
  crackSrc.start(now);
  crackSrc.stop(now + 0.09);

  var resSize = Math.floor(ctx.sampleRate * 0.3);
  var resBuf = ctx.createBuffer(1, resSize, ctx.sampleRate);
  var resData = resBuf.getChannelData(0);
  for (var j = 0; j < resSize; j++)
    resData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / resSize, 12);
  var resSrc = ctx.createBufferSource();
  resSrc.buffer = resBuf;
  var resFilter = ctx.createBiquadFilter();
  resFilter.type = 'bandpass';
  resFilter.frequency.value = 900;
  resFilter.Q.value = 1.2;
  var resGain = ctx.createGain();
  resGain.gain.setValueAtTime(2.0, now);
  resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  resSrc.connect(resFilter);
  resFilter.connect(resGain);
  resGain.connect(ctx.destination);
  resSrc.start(now);
  resSrc.stop(now + 0.31);
}

// ─── Unified play functions ───────────────────────────────────────

function playBell(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = getAudioContext();
  function doPlay() { playTempleBell(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') {
    ctx.resume().then(doPlay);
  } else {
    doPlay();
  }
}

function playChugpi(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = getAudioContext();
  function doPlay() { playChugpiNow(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') {
    ctx.resume().then(doPlay);
  } else {
    doPlay();
  }
}

function playSound(type, timeSeconds) {
  timeSeconds = timeSeconds || 0;
  if (type === 'none') return;
  if (type === 'chugpi') playChugpi(timeSeconds);
  else playBell(timeSeconds);
}

function playStrokes(type, count, startDelay) {
  startDelay = startDelay || 0;
  if (type === 'none') return;
  var interval = type === 'chugpi' ? 1.5 : 1.4;
  for (var i = 0; i < count; i++) {
    playSound(type, startDelay + i * interval);
  }
}

// ─── Meditation UI state ──────────────────────────────────────────

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

// ─── State ───────────────────────────────────────────────────────

var timerInterval = null;
var countdownInterval = null;
var sessionStart = null;
var endTimestamp = null;
var plannedDuration = 0;
var intervalBellMs = 0;
var nextIntervalAt = null;
var currentSound = 'bell';
var selectedMinutes = 20;
var prepareSeconds = 10;

// ─── DOM refs ────────────────────────────────────────────────────

var display        = document.getElementById('display');
var statusEl       = document.getElementById('status');
var btnStart       = document.getElementById('btn-start');
var btnStop        = document.getElementById('btn-stop');
var soundSelect    = document.getElementById('sound-select');
var intervalSelect = document.getElementById('interval-select');
var customMin      = document.getElementById('custom-min');
var presets        = document.querySelectorAll('.preset');

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

// ─── Duration ────────────────────────────────────────────────────

function selectPreset(min) {
  selectedMinutes = min;
  presets.forEach(function(p) {
    p.classList.toggle('selected', +p.dataset.min === min);
  });
  customMin.value = '';
  display.textContent = formatTime(min * 60);
}

presets.forEach(function(p) {
  p.addEventListener('click', function() { selectPreset(+p.dataset.min); });
});

customMin.addEventListener('input', function() {
  var v = parseInt(customMin.value);
  if (v > 0) {
    selectedMinutes = v;
    presets.forEach(function(p) { p.classList.remove('selected'); });
    display.textContent = formatTime(v * 60);
  }
});

// ─── Timer ───────────────────────────────────────────────────────

function formatTime(secs) {
  var m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  var s = String(Math.abs(secs) % 60).padStart(2, '0');
  return m + ':' + s;
}

// ─── Start / Stop buttons ────────────────────────────────────────

btnStart.addEventListener('click', function() {
  // Must be synchronous inside click — unlocks AudioContext and
  // starts silent loop to bypass iOS silent switch
  unlockAudio();

  btnStart.disabled = true;
  statusEl.textContent = t('status_ready');

  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();

  startCountdown();
});

btnStop.addEventListener('click', stopSession);

// ─── Prepare Countdown ───────────────────────────────────────────

function startCountdown() {
  currentSound = soundSelect.value;
  var secsLeft = prepareSeconds;

  if (secsLeft <= 0) {
    startSession();
    return;
  }

  btnStart.disabled = true;
  btnStop.disabled = false;

  function updateDisplay() {
    statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    display.textContent = formatTime(secsLeft);
  }

  updateDisplay();

  countdownInterval = setInterval(function() {
    secsLeft--;
    if (secsLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startSession();
    } else {
      updateDisplay();
    }
  }, 1000);
}

// ─── Session ─────────────────────────────────────────────────────

function startSession() {
  currentSound = soundSelect.value;
  intervalBellMs = +intervalSelect.value * 60 * 1000;
  plannedDuration = selectedMinutes * 60;
  sessionStart = Date.now();
  endTimestamp = sessionStart + plannedDuration * 1000;
  nextIntervalAt = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;

  if (currentSound === 'chugpi') playStrokes('chugpi', 3);
  else playStrokes(currentSound, 1);

  statusEl.textContent = t('status_meditating');
  btnStart.disabled = true;
  btnStop.disabled = false;
  setMeditating(true);
  timerInterval = setInterval(tick, 500);
}

function tick() {
  var now = Date.now();
  var remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  display.textContent = formatTime(remaining);

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
    stopSilentLoop();
    playStrokes(currentSound, 3);
    saveSession(true);
    statusEl.textContent = t('status_complete');
    btnStart.disabled = false;
    btnStop.disabled = true;
    btnStart.textContent = t('btn_start');
    display.textContent = formatTime(plannedDuration);
  }
}

function stopSession() {
  // Cancel countdown if still running
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    if (noSleep) noSleep.disable();
    stopSilentLoop();
    statusEl.textContent = t('status_ready');
    btnStart.disabled = false;
    btnStop.disabled = true;
    display.textContent = formatTime(selectedMinutes * 60);
    return;
  }

  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  setMeditating(false);
  if (noSleep) noSleep.disable();
  stopSilentLoop();
  var actual = Math.round((Date.now() - sessionStart) / 1000);
  saveSession(false, actual);
  statusEl.textContent = t('status_stopped');
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnStart.textContent = t('btn_start');
  display.textContent = formatTime(plannedDuration);
}

// ─── Log ─────────────────────────────────────────────────────────

function saveSession(completed, actualSecs) {
  var sessions = getSessions();
  sessions.unshift({
    id: Date.now(),
    date: new Date(sessionStart).toLocaleDateString(currentLang === 'pl' ? 'pl-PL' : 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    planned: plannedDuration,
    actual: actualSecs !== undefined ? actualSecs : plannedDuration,
    completed: completed,
    sound: currentSound
  });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
}

function getSessions() {
  try { return JSON.parse(localStorage.getItem('meditation_log')) || []; }
  catch (e) { return []; }
}

function formatDuration(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return s > 0 ? (m + 'm ' + s + 's') : (m + 'm');
}

function renderLog() {
  var sessions = getSessions();
  var totalSecs = sessions.reduce(function(a, s) { return a + s.actual; }, 0);
  var totalH = Math.floor(totalSecs / 3600);
  var totalM = Math.floor((totalSecs % 3600) / 60);
  document.getElementById('log-summary').innerHTML =
    t('log_sessions') + ': <strong>' + sessions.length + '</strong> &nbsp; ' +
    t('log_total') + ': <strong>' + totalH + 'h ' + totalM + 'm</strong> &nbsp; ' +
    t('log_completed') + ': <strong>' + sessions.filter(function(s) { return s.completed; }).length + '</strong>';
  document.getElementById('log-list').innerHTML = sessions.map(function(s) {
    return '<li>' +
      '<div class="log-date">' + s.date + ' &nbsp; ' + s.startTime + '</div>' +
      '<div class="log-detail">' +
        formatDuration(s.actual) + ' / ' + formatDuration(s.planned) + ' ' + t('log_planned') +
        (!s.completed ? ' &nbsp; ' + t('log_stopped') : '') +
      '</div></li>';
  }).join('');
}

document.getElementById('btn-export').addEventListener('click', function() {
  var sessions = getSessions();
  var rows = [['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound']].concat(
    sessions.map(function(s) {
      return [s.date, s.startTime, s.planned, s.actual, s.completed, s.sound];
    })
  );
  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'meditation_log.csv';
  a.click();
});

document.getElementById('btn-clear-log').addEventListener('click', function() {
  if (confirm(t('confirm_clear'))) {
    localStorage.removeItem('meditation_log');
    renderLog();
  }
});

// ─── Settings ────────────────────────────────────────────────────

var settingsDuration = document.getElementById('settings-duration');
var settingsSound    = document.getElementById('settings-sound');
var settingsPrepare  = document.getElementById('settings-prepare');
var settingsSaved    = document.getElementById('settings-saved');

function loadSettings() {
  var dur   = localStorage.getItem('settings_duration');
  var sound = localStorage.getItem('settings_sound');
  var prep  = localStorage.getItem('settings_prepare');
  if (dur) { settingsDuration.value = dur; }
  if (sound) {
    settingsSound.value = sound;
    soundSelect.value = sound;
  }
  if (prep !== null && prep !== '') {
    prepareSeconds = parseInt(prep);
    if (settingsPrepare) settingsPrepare.value = prepareSeconds;
  } else {
    if (settingsPrepare) settingsPrepare.value = prepareSeconds;
  }
}

document.getElementById('btn-save-settings').addEventListener('click', function() {
  var dur   = parseInt(settingsDuration.value);
  var sound = settingsSound.value;
  var prep  = parseInt(settingsPrepare.value);
  if (dur > 0) {
    localStorage.setItem('settings_duration', dur);
    selectPreset(dur);
  }
  localStorage.setItem('settings_sound', sound);
  soundSelect.value = sound;
  if (!isNaN(prep) && prep >= 0) {
    prepareSeconds = prep;
    localStorage.setItem('settings_prepare', prep);
  }
  settingsSaved.style.display = 'inline';
  setTimeout(function() { settingsSaved.style.display = 'none'; }, 2000);
});

// ─── Init ────────────────────────────────────────────────────────

applyLang();
applyTheme();
loadSettings();


