// ─── i18n ────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    app_title:        'Silent Bell',
    nav_timer:        'Timer',
    nav_log:          'Log',
    nav_settings:     'Settings',
    status_ready:     'Ready',
    status_meditating:'Meditating…',
    status_complete:  'Session complete 🙏',
    status_stopped:   'Stopped early',
    status_prepare:   'Prepare… {secs}s',
    label_sound:      'Sound',
    label_interval:   'Interval bells every',
    sound_bell:       'Bell',
    sound_chugpi:     'Jugbi 죽비',
    sound_silent:     'Silent',
    interval_none:    'None',
    btn_start:        'Start',
    btn_stop:         'Stop',
    btn_export:       'Export CSV',
    btn_clear:        'Clear Log',
    btn_save:         'Save',
    settings_duration:'Default duration (min)',
    settings_sound:   'Default sound',
    settings_prepare: 'Prepare countdown (sec)',
    settings_saved:   'Saved ✓',
    custom_placeholder:'Custom min',
    log_sessions:     'Sessions',
    log_total:        'Total time',
    log_completed:    'Completed',
    log_planned:      'planned',
    log_stopped:      '⚠ stopped early',
    confirm_clear:    'Clear all session history?'
  },
  pl: {
    app_title:        'Dzwon Ciszy',
    nav_timer:        'Timer',
    nav_log:          'Dziennik',
    nav_settings:     'Ustawienia',
    status_ready:     'Gotowy',
    status_meditating:'Medytacja…',
    status_complete:  'Sesja zakończona 🙏',
    status_stopped:   'Przerwano',
    status_prepare:   'Przygotuj się… {secs}s',
    label_sound:      'Dźwięk',
    label_interval:   'Dzwon co',
    sound_bell:       'Dzwon',
    sound_chugpi:     'Jugbi 죽비',
    sound_silent:     'Cisza',
    interval_none:    'Brak',
    btn_start:        'Start',
    btn_stop:         'Stop',
    btn_export:       'Eksport CSV',
    btn_clear:        'Wyczyść',
    btn_save:         'Zapisz',
    settings_duration:'Domyślny czas (min)',
    settings_sound:   'Domyślny dźwięk',
    settings_prepare: 'Odliczanie przed startem (s)',
    settings_saved:   'Zapisano ✓',
    custom_placeholder:'Własny czas',
    log_sessions:     'Sesje',
    log_total:        'Łączny czas',
    log_completed:    'Ukończone',
    log_planned:      'zaplanowano',
    log_stopped:      '⚠ przerwano',
    confirm_clear:    'Wyczyścić historię sesji?'
  }
};

// ─── i18n helpers ────────────────────────────────────────────────

let currentLang  = localStorage.getItem('lang')  || 'en';
let currentTheme = localStorage.getItem('theme') || 'dark';

const t = key => STRINGS[currentLang]?.[key] ?? STRINGS.en[key] ?? key;

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
  document.getElementById('btn-lang').textContent = currentLang === 'en' ? 'PL' : 'EN';
  if (document.getElementById('view-log').classList.contains('active')) renderLog();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('btn-theme').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentTheme === 'dark' ? '#111820' : '#f0ece4';
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

let noSleep       = null;
let audioCtx      = null;
let silentLoop    = null;

const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

// ─── iOS silent-switch bypass ─────────────────────────────────────
// Looping silent HTMLAudio forces iOS into media audio category,
// which ignores the hardware silent switch (same as Spotify etc.)

const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAA' +
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

function startSilentLoop() {
  if (!silentLoop) {
    silentLoop = new Audio(SILENT_MP3);
    silentLoop.loop = true;
    silentLoop.volume = 0.001;
    silentLoop.setAttribute('playsinline', '');
    silentLoop.setAttribute('x-webkit-airplay', 'deny');
  }
  silentLoop.play().catch(e => console.warn('Silent loop:', e));
}

function stopSilentLoop() {
  if (silentLoop) { silentLoop.pause(); silentLoop.currentTime = 0; }
}

function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    // Silent zero buffer — activates Web AudioContext on iOS
    const buf = ctx.createBuffer(1, 512, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    startSilentLoop();
  } catch (e) { console.warn('unlockAudio:', e); }
}

// ─── Temple Bell Synthesizer ──────────────────────────────────────

function playTempleBell(t0, velocity = 1.0) {
  const ctx = getCtx();

  // Master compressor
  const master = ctx.createDynamicsCompressor();
  Object.assign(master, { threshold: { value: -6 }, knee: { value: 6 },
    ratio: { value: 3 }, attack: { value: 0.003 }, release: { value: 0.25 } });
  master.connect(ctx.destination);

  // Strike transient — noise burst through bandpass
  const clankSize = Math.floor(ctx.sampleRate * 0.04);
  const clankBuf  = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  const clankData = clankBuf.getChannelData(0);
  for (let i = 0; i < clankSize; i++)
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 2);
  const clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  const clankBp   = ctx.createBiquadFilter();
  clankBp.type    = 'bandpass';
  clankBp.frequency.value = 6000;
  clankBp.Q.value = 0.8;
  const clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.001, t0);
  clankGain.gain.linearRampToValueAtTime(1.2 * velocity, t0 + 0.002);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  clankSrc.connect(clankBp); clankBp.connect(clankGain); clankGain.connect(master);
  clankSrc.start(t0); clankSrc.stop(t0 + 0.07);

  // Sinusoidal partial helper
  const addPartial = (freq, peak, attack, decay) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t0);
    env.gain.linearRampToValueAtTime(peak * velocity, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(env); env.connect(master);
    osc.start(t0); osc.stop(t0 + decay + 0.1);
  };

  // Fundamental + inharmonic partials (real bell acoustic ratios)
  addPartial(110,  0.55, 0.012, 14.0);
  addPartial(304,  0.40, 0.008,  9.0);
  addPartial(594,  0.28, 0.006,  6.5);
  addPartial(982,  0.18, 0.004,  4.0);
  addPartial(1627, 0.10, 0.003,  2.5);

  // Shimmer — gentle LFO tremolo on fundamental for living sustain
  const lfo   = ctx.createOscillator();
  lfo.type    = 'sine'; lfo.frequency.value = 4.5;
  const depth = ctx.createGain(); depth.gain.value = 0.06;
  const fund  = ctx.createOscillator();
  fund.type   = 'sine'; fund.frequency.value = 110;
  const sEnv  = ctx.createGain();
  sEnv.gain.setValueAtTime(0.001, t0);
  sEnv.gain.linearRampToValueAtTime(0.15 * velocity, t0 + 0.05);
  sEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  lfo.connect(depth); depth.connect(sEnv.gain);
  fund.connect(sEnv); sEnv.connect(master);
  [lfo, fund].forEach(n => { n.start(t0); n.stop(t0 + 14.1); });
}

// ─── Chugpi (죽비) Synthesizer ────────────────────────────────────

function playChugpiNow(now) {
  const ctx = getCtx();

  // Layer 1: sharp crack
  const mkNoiseBuf = (dur, exp) => {
    const size = Math.floor(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, exp);
    return buf;
  };

  const mkBandpass = (freq, Q) => {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = Q;
    return f;
  };

  const crackSrc  = ctx.createBufferSource();
  crackSrc.buffer = mkNoiseBuf(0.08, 4);
  const crackBp   = mkBandpass(3500, 0.6);
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(3.5, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  crackSrc.connect(crackBp); crackBp.connect(crackGain); crackGain.connect(ctx.destination);
  crackSrc.start(now); crackSrc.stop(now + 0.09);

  // Layer 2: woody resonance
  const resSrc  = ctx.createBufferSource();
  resSrc.buffer = mkNoiseBuf(0.3, 12);
  const resBp   = mkBandpass(900, 1.2);
  const resGain = ctx.createGain();
  resGain.gain.setValueAtTime(2.0, now);
  resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  resSrc.connect(resBp); resBp.connect(resGain); resGain.connect(ctx.destination);
  resSrc.start(now); resSrc.stop(now + 0.31);
}

// ─── Unified play functions ───────────────────────────────────────

function withCtx(fn) {
  const ctx = getCtx();
  ctx.state === 'suspended' ? ctx.resume().then(fn) : fn();
}

const playBell   = (secs = 0) => withCtx(() => playTempleBell(getCtx().currentTime + secs));
const playChugpi = (secs = 0) => withCtx(() => playChugpiNow(getCtx().currentTime + secs));

function playSound(type, secs = 0) {
  if (type === 'none') return;
  type === 'chugpi' ? playChugpi(secs) : playBell(secs);
}

function playStrokes(type, count, delay = 0) {
  if (type === 'none') return;
  const interval = type === 'chugpi' ? 1.5 : 1.4;
  for (let i = 0; i < count; i++) playSound(type, delay + i * interval);
}

// ─── State ───────────────────────────────────────────────────────

let timerInterval    = null;
let countdownInterval= null;
let sessionStart     = null;
let endTimestamp     = null;
let plannedDuration  = 0;
let intervalBellMs   = 0;
let nextIntervalAt   = null;
let currentSound     = 'bell';
let selectedMinutes  = 20;
let prepareSeconds   = 10;

// ─── DOM refs ────────────────────────────────────────────────────

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

const formatTime = secs => {
  const m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  const s = String(Math.abs(secs) % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function selectPreset(min) {
  selectedMinutes = min;
  presets.forEach(p

