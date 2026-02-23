// ─── i18n ────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    app_title: 'Silent Bell',
    nav_timer: 'Timer',
    nav_log: 'Log',
    nav_settings: 'Settings',
    status_ready: 'Ready',
    status_loading: 'Loading sound…',
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
    btn_loading: 'Loading…',
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
    status_loading: 'Ładowanie dźwięku…',
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
    btn_loading: 'Ładowanie…',
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

let currentLang = localStorage.getItem('lang') || 'en';
let currentTheme = localStorage.getItem('theme') || 'dark';

function t(key) {
  return STRINGS[currentLang][key] || STRINGS['en'][key] || key;
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('btn-lang').textContent = currentLang === 'en' ? 'PL' : 'EN';
  const logView = document.getElementById('view-log');
  if (logView.classList.contains('active')) renderLog();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('btn-theme').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content =
    currentTheme === 'dark' ? '#111820' : '#f0ece4';
}

document.getElementById('btn-lang').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'pl' : 'en';
  localStorage.setItem('lang', currentLang);
  applyLang();
});

document.getElementById('btn-theme').addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
});

// ─── Audio Engine ────────────────────────────────────────────────

let bellAudio = null;
let noSleep = null;

// Shared persistent AudioContext — created once, reused for all chugpi sounds
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

// Unlock iOS audio on user gesture: resume shared ctx + silent bell play
async function unlockAudio() {
  // 1. Resume Web AudioContext (needed for chugpi / Web Audio API)
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // 2. Play a silent clone of bellAudio to unlock HTMLAudioElement on iOS
  if (bellAudio) {
    const silent = bellAudio.cloneNode();
    silent.volume = 0.001;
    try { await silent.play(); } catch (_) {}
  }
}

async function initAudio() {
  if (bellAudio) return;
  bellAudio = new Audio('bell.mp3');
  bellAudio.preload = 'auto';
  await new Promise((resolve, reject) => {
    bellAudio.addEventListener('canplaythrough', resolve, { once: true });
    bellAudio.addEventListener('error', reject, { once: true });
    bellAudio.load();
  });
}

function playBell(timeSeconds = 0) {
  if (!bellAudio) return;
  setTimeout(() => {
    const clip = bellAudio.cloneNode();
    clip.play().catch(e => console.error('Bell play failed:', e));
  }, timeSeconds * 1000);
}

function playChugpi(timeSeconds = 0) {
  setTimeout(() => {
    const ctx = getAudioContext();

    // Resume if suspended (iOS may suspend between interactions)
    const doPlay = () => {
      const now = ctx.currentTime;

      // Layer 1: sharp crack
      const crackSize = ctx.sampleRate * 0.08;
      const crackBuf = ctx.createBuffer(1, crackSize, ctx.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackSize; i++)
        crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackSize, 4);
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackBuf;
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.value = 3500;
      crackFilter.Q.value = 0.6;
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(3.5, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      crackSrc.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(ctx.destination);
      crackSrc.start(now);
      crackSrc.stop(now + 0.08);

      // Layer 2: woody resonance
      const resonanceSize = ctx.sampleRate * 0.3;
      const resBuf = ctx.createBuffer(1, resonanceSize, ctx.sampleRate);
      const resData = resBuf.getChannelData(0);
      for (let i = 0; i < resonanceSize; i++)
        resData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / resonanceSize, 12);
      const resSrc = ctx.createBufferSource();
      resSrc.buffer = resBuf;
      const resFilter = ctx.createBiquadFilter();
      resFilter.type = 'bandpass';
      resFilter.frequency.value = 900;
      resFilter.Q.value = 1.2;
      const resGain = ctx.createGain();
      resGain.gain.setValueAtTime(2.0, now);
      resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      resSrc.connect(resFilter);
      resFilter.connect(resGain);
      resGain.connect(ctx.destination);
      resSrc.start(now);
      resSrc.stop(now + 0.3);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay).catch(e => console.error('AudioContext resume failed:', e));
    } else {
      doPlay();
    }
  }, timeSeconds * 1000);
}

function playSound(type, timeSeconds = 0) {
  if (type === 'none') return;
  if (type === 'chugpi') playChugpi(timeSeconds);
  else playBell(timeSeconds);
}

function playStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  const interval = type === 'chugpi' ? 1.5 : 1.4;
  for (let i = 0; i < count; i++)
    playSound(type, startDelay + i * interval);
}

// ─── Meditation UI state ──────────────────────────────────────────

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

// ─── State ───────────────────────────────────────────────────────

let timerInterval = null;
let countdownInterval = null;
let sessionStart = null;
let endTimestamp = null;
let plannedDuration = 0;
let intervalBellMs = 0;
let nextIntervalAt = null;
let currentSound = 'bell';
let selectedMinutes = 20;
let prepareSeconds = 10;

// ─── DOM ─────────────────────────────────────────────────────────

const display = document.getElementById('display');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const soundSelect = document.getElementById('sound-select');
const intervalSelect = document.getElementById('interval-select');
const customMin = document.getElementById('custom-min');
const presets = document.querySelectorAll('.preset');

// ─── Navigation ──────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'log') renderLog();
  });
});

// ─── Duration ────────────────────────────────────────────────────

function selectPreset(min) {
  selectedMinutes = min;
  presets.forEach(p => p.classList.toggle('selected', +p.dataset.min === min));
  customMin.value = '';
  display.textContent = formatTime(min * 60);
}

presets.forEach(p => p.addEventListener('click', () => selectPreset(+p.dataset.min)));
customMin.addEventListener('input', () => {
  const v = parseInt(customMin.value);
  if (v > 0) {
    selectedMinutes = v;
    presets.forEach(p => p.classList.remove('selected'));
    display.textContent = formatTime(v * 60);
  }
});

// ─── Timer ───────────────────────────────────────────────────────

function formatTime(secs) {
  const m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  const s = String(Math.abs(secs) % 60).padStart(2, '0');
  return `${m}:${s}`;
}

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  btnStart.textContent = t('btn_loading');
  statusEl.textContent = t('status_loading');

  try {
    await initAudio();
  } catch (e) {
    console.error('Failed to load bell.mp3:', e);
    statusEl.textContent = 'Failed to load bell.mp3';
    btnStart.disabled = false;
    btnStart.textContent = t('btn_start');
    return;
  }

  // ← iOS fix: unlock both HTMLAudio and Web AudioContext
  //   right here inside the click handler, before any setTimeout delay
  await unlockAudio();

  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();

  btnStart.textContent = t('btn_start');
  startCountdown();
});

btnStop.addEventListener('click', stopSession);

// ─── Prepare Countdown ───────────────────────────────────────────

function startCountdown() {
  currentSound = soundSelect.value;
  let secsLeft = prepareSeconds;

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

  countdownInterval = setInterval(() => {
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
  const now = Date.now();
  const remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
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
  const actual = Math.round((Date.now() - sessionStart) / 1000);
  saveSession(false, actual);
  statusEl.textContent = t('status_stopped');
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnStart.textContent = t('btn_start');
  display.textContent = formatTime(plannedDuration);
}

// ─── Log ─────────────────────────────────────────────────────────

function saveSession(completed, actualSecs = null) {
  const sessions = getSessions();
  sessions.unshift({
    id: Date.now(),
    date: new Date(sessionStart).toLocaleDateString(
      currentLang === 'pl' ? 'pl-PL' : 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    }),
    planned: plannedDuration,
    actual: actualSecs !== null ? actualSecs : plannedDuration,
    completed,
    sound: currentSound
  });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
}

function getSessions() {
  try { return JSON.parse(localStorage.getItem('meditation_log')) || []; }
  catch { return []; }
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function renderLog() {
  const sessions = getSessions();
  const totalSecs = sessions.reduce((a, s) => a + s.actual, 0);
  const totalH = Math.floor(totalSecs / 3600);
  const totalM = Math.floor((totalSecs % 3600) / 60);
  document.getElementById('log-summary').innerHTML =
    `${t('log_sessions')}: <strong>${sessions.length}</strong> &nbsp;
     ${t('log_total')}: <strong>${totalH}h ${totalM}m</strong> &nbsp;
     ${t('log_completed')}: <strong>${sessions.filter(s => s.completed).length}</strong>`;
  document.getElementById('log-list').innerHTML = sessions.map(s => `
    <li>
      <div class="log-date">${s.date} &nbsp; ${s.startTime}</div>
      <div class="log-detail">
        ${formatDuration(s.actual)} / ${formatDuration(s.planned)} ${t('log_planned')}
        ${!s.completed ? ` &nbsp; ${t('log_stopped')}` : ''}
      </div>
    </li>`).join('');
}

document.getElementById('btn-export').addEventListener('click', () => {
  const sessions = getSessions();
  const rows = [
    ['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound'],
    ...sessions.map(s => [s.date, s.startTime, s.planned, s.actual, s.completed, s.sound])
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'meditation_log.csv';
  a.click();
});

document.getElementById('btn-clear-log').addEventListener('click', () => {
  if (confirm(t('confirm_clear'))) {
    localStorage.removeItem('meditation_log');
    renderLog();
  }
});

// ─── Settings ────────────────────────────────────────────────────

const settingsDuration = document.getElementById('settings-duration');
const settingsSound = document.getElementById('settings-sound');
const settingsPrepare = document.getElementById('settings-prepare');
const settingsSaved = document.getElementById('settings-saved');

function loadSettings() {
  const dur = localStorage.getItem('settings_duration');
  const sound = localStorage.getItem('settings_sound');
  const prep = localStorage.getItem('settings_prepare');
  if (dur) { settingsDuration.value = dur; }
  if (sound) { settingsSound.value = sound; }
  if (prep !== null) {
    prepareSeconds = parseInt(prep);
    if (settingsPrepare) settingsPrepare.value = prepareSeconds;
  } else {
    if (settingsPrepare) settingsPrepare.value = prepareSeconds;
  }
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const dur = parseInt(settingsDuration.value);
  const sound = settingsSound.value;
  const prep = parseInt(settingsPrepare.value);
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
  setTimeout(() => { settingsSaved.style.display = 'none'; }, 2000);
});

// ─── Init ────────────────────────────────────────────────────────

applyLang();
applyTheme();
loadSettings();

