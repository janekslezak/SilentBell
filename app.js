// ─── i18n ────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    app_title:          'Silent Bell',
    nav_timer:          'Timer',
    nav_log:            'Log',
    nav_settings:       'Settings',
    status_ready:       'Ready',
    status_loading:     'Loading sound…',
    status_meditating:  'Meditating…',
    status_complete:    'Session complete 🙏',
    status_stopped:     'Stopped early',
    label_sound:        'Sound',
    label_interval:     'Interval bells every',
    sound_bell:         'Bell',
    sound_chugpi:       'Korean 죽비 (Chugpi)',
    sound_silent:       'Silent',
    interval_none:      'None',
    btn_start:          'Start',
    btn_stop:           'Stop',
    btn_loading:        'Loading…',
    btn_export:         'Export CSV',
    btn_clear:          'Clear Log',
    btn_save:           'Save',
    settings_duration:  'Default duration (min)',
    settings_sound:     'Default sound',
    settings_saved:     'Saved ✓',
    custom_placeholder: 'Custom min',
    log_sessions:       'Sessions',
    log_total:          'Total time',
    log_completed:      'Completed',
    log_planned:        'planned',
    log_stopped:        '⚠ stopped early',
    confirm_clear:      'Clear all session history?'
  },
  pl: {
    app_title:          'Dzwon Ciszy',
    nav_timer:          'Timer',
    nav_log:            'Dziennik',
    nav_settings:       'Ustawienia',
    status_ready:       'Gotowy',
    status_loading:     'Ładowanie dźwięku…',
    status_meditating:  'Medytacja…',
    status_complete:    'Sesja zakończona 🙏',
    status_stopped:     'Przerwano',
    label_sound:        'Dźwięk',
    label_interval:     'Dzwon co',
    sound_bell:         'Dzwon',
    sound_chugpi:       'Koreański 죽비 (Chugpi)',
    sound_silent:       'Cicho',
    interval_none:      'Brak',
    btn_start:          'Start',
    btn_stop:           'Stop',
    btn_loading:        'Ładowanie…',
    btn_export:         'Eksport CSV',
    btn_clear:          'Wyczyść',
    btn_save:           'Zapisz',
    settings_duration:  'Domyślny czas (min)',
    settings_sound:     'Domyślny dźwięk',
    settings_saved:     'Zapisano ✓',
    custom_placeholder: 'Własny czas',
    log_sessions:       'Sesje',
    log_total:          'Łączny czas',
    log_completed:      'Ukończone',
    log_planned:        'zaplanowano',
    log_stopped:        '⚠ przerwano',
    confirm_clear:      'Wyczyścić historię sesji?'
  }
};

let currentLang  = localStorage.getItem('lang')  || 'en';
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
let noSleep   = null;

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
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  setTimeout(() => {
    const now     = ctx.currentTime;
    const bufSize = ctx.sampleRate * 0.12;
    const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 8);
    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value         = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.15);
  }, timeSeconds * 1000);
}

function playSound(type, timeSeconds = 0) {
  if (type === 'none') return;
  if (type === 'chugpi') playChugpi(timeSeconds);
  else playBell(timeSeconds);
}

function playStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  for (let i = 0; i < count; i++)
    playSound(type, startDelay + i * 1.4);
}

// ─── Meditation UI state ──────────────────────────────────────────

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

// ─── State ───────────────────────────────────────────────────────

let timerInterval   = null;
let sessionStart    = null;
let endTimestamp    = null;
let plannedDuration = 0;
let intervalBellMs  = 0;
let nextIntervalAt  = null;
let currentSound    = 'bell';
let selectedMinutes = 20;

// ─── DOM ─────────────────────────────────────────────────────────

const display        = document.getElementById('display');
const statusEl       = document.getElementById('status');
const btnStart       = document.getElementById('btn-start');
const btnStop        = document.getElementById('btn-stop');
const soundSelect    = document.getElementById('sound-select');
const intervalSelect = document.getElementById('interval-select');
const customMin      = document.getElementById('custom-min');
const presets        = document.querySelectorAll('.preset');

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
  customMin.value     = '';
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
  btnStart.disabled    = true;
  btnStart.textContent = t('btn_loading');
  statusEl.textContent = t('status_loading');

  try {
    await initAudio();
  } catch (e) {
    console.error('Failed to load bell.mp3:', e);
    statusEl.textContent = 'Failed to load bell.mp3';
    btnStart.disabled    = false;
    btnStart.textContent = t('btn_start');
    return;
  }

  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();

  btnStart.textContent = t('btn_start');
  startSession();
});

btnStop.addEventListener('click', stopSession);

function startSession() {
  currentSound    = soundSelect.value;
  intervalBellMs  = +intervalSelect.value * 60 * 1000;
  plannedDuration = selectedMinutes * 60;
  sessionStart    = Date.now();
  endTimestamp    = sessionStart + plannedDuration * 1000;
  nextIntervalAt  = intervalBellMs > 0 ? sessionStart + intervalBellMs : null;

  if (currentSound === 'chugpi') playStrokes('chugpi', 3);
  else playStrokes(currentSound, 1);

  statusEl.textContent = t('status_meditating');
  btnStart.disabled    = true;
  btnStop.disabled     = false;
  setMeditating(true);
  timerInterval = setInterval(tick, 500);
}

function tick() {
  const now       = Date.now();
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
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    btnStart.textContent = t('btn_start');
    display.textContent  = formatTime(plannedDuration);
  }
}

function stopSession() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  setMeditating(false);
  if (noSleep) noSleep.disable();
  const actual = Math.round((Date.now() - sessionStart) / 1000);
  saveSession(false, actual);
  statusEl.textContent = t('status_stopped');
  btnStart.disabled    = false;
  btnStop.disabled     = true;
  btnStart.textContent = t('btn_start');
  display.textContent  = formatTime(plannedDuration);
}

// ─── Log ─────────────────────────────────────────────────────────

function saveSession(completed, actualSecs = null) {
  const sessions = getSessions();
  sessions.unshift({
    id:        Date.now(),
    date:      new Date(sessionStart).toLocaleDateString(
                 currentLang === 'pl' ? 'pl-PL' : 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB', {
                 hour: '2-digit', minute: '2-digit'
               }),
    planned:   plannedDuration,
    actual:    actualSecs !== null ? actualSecs : plannedDuration,
    completed,
    sound:     currentSound
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
  const sessions  = getSessions();
  const totalSecs = sessions.reduce((a, s) => a + s.actual, 0);
  const totalH    = Math.floor(totalSecs / 3600);
  const totalM    = Math.floor((totalSecs % 3600) / 60);

  document.getElementById('log-summary').innerHTML =
    `${t('log_sessions')}: <strong>${sessions.length}</strong> &nbsp;
     ${t('log_total')}: <strong>${totalH}h ${totalM}m</strong> &nbsp;
     ${t('log_completed')}: <strong>${sessions.filter(s => s.completed).length}</strong>`;

  document.getElementById('log-list').innerHTML = sessions.map(s => `
    <li>
      <div class="log-date">${s.date} &nbsp; ${s.startTime}</div>
      <div class="log-detail">
        ${formatDuration(s.actual)} / ${formatDuration(s.planned)} ${t('log_planned')}
        ${!s.completed ? `&nbsp; ${t('log_stopped')}` : ''}
      </div>
    </li>
  `).join('');
}

document.getElementById('btn-export').addEventListener('click', () => {
  const sessions = getSessions();
  const rows = [
    ['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound'],
    ...sessions.map(s => [s.date, s.startTime, s.planned, s.actual, s.completed, s.sound])
  ];
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
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
const settingsSound    = document.getElementById('settings-sound');
const settingsSaved    = document.getElementById('settings-saved');

function loadSettings() {
  const dur   = localStorage.getItem('settings_duration');
  const sound = localStorage.getItem('settings_sound');
  if (dur)   settingsDuration.value = dur;
  if (sound) settingsSound.value    = sound;
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const dur   = parseInt(settingsDuration.value);
  const sound = settingsSound.value;
  if (dur > 0) {
    localStorage.setItem('settings_duration', dur);
    selectPreset(dur);
  }
  localStorage.setItem('settings_sound', sound);
  soundSelect.value = sound;
  settingsSaved.style.display = 'inline';
  setTimeout(() => settingsSaved.style.display = 'none', 2000);
});

// ─── Init ────────────────────────────────────────────────────────

applyLang();
applyTheme();
loadSettings();

