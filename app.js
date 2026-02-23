// ─── Audio Engine ────────────────────────────────────────────────
let ctx = null;
let bellBuffer = null;
let audioReady = false;

// ─── NoSleep ─────────────────────────────────────────────────────
let noSleep = null;

async function initAudio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') await ctx.resume();

  if (bellBuffer || audioReady) return;

  try {
    const response    = await fetch('bell.mp3');
    const arrayBuffer = await response.arrayBuffer();
    bellBuffer        = await ctx.decodeAudioData(arrayBuffer);
    audioReady        = true;
  } catch (e) {
    console.warn('bell.mp3 failed, using synthesized fallback:', e);
    audioReady = true;
  }
}

function playBell(time = 0) {
  if (!ctx) return;
  if (bellBuffer) {
    const src  = ctx.createBufferSource();
    src.buffer = bellBuffer;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + time);
  } else {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime + time;
    osc.frequency.setValueAtTime(432, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 2.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    osc.start(now);
    osc.stop(now + 4.5);
  }
}

function playChugpi(time = 0) {
  if (!ctx) return;
  const now     = ctx.currentTime + time;
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
}

function playSound(type, time = 0) {
  if (type === 'none') return;
  if (type === 'chugpi') playChugpi(time);
  else playBell(time);
}

function playStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  for (let i = 0; i < count; i++)
    playSound(type, startDelay + i * 1.4);
}

// ─── State ───────────────────────────────────────────────────────
let timerInterval   = null;
let sessionStart    = null;
let endTimestamp    = null;
let plannedDuration = 0;
let intervalBellMs  = 0;
let nextIntervalAt  = null;
let currentSound    = 'bowl';
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
  btnStart.disabled    = true;
  btnStart.textContent = 'Loading…';
  statusEl.textContent = 'Loading sound…';

  await initAudio();

  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();

  btnStart.textContent = 'Start';
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

  statusEl.textContent = 'Meditating…';
  btnStart.disabled = true;
  btnStop.disabled  = false;

  timerInterval = setInterval(tick, 500);
}

function tick() {
  const now       = Date.now();
  const remaining = Math.max(0, Math.round((endTimestamp - now) / 1000));
  display.textContent = formatTime(remaining);

  if (nextIntervalAt && now >= nextIntervalAt) {
    playSound(currentSound);
    nextIntervalAt += intervalBellMs;
    if (nextIntervalAt >= endTimestamp) nextIntervalAt = null;
  }

  if (remaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;

    if (noSleep) noSleep.disable();

    playStrokes(currentSound, 3);
    saveSession(true);
    statusEl.textContent = 'Session complete 🙏';
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    btnStart.textContent = 'Start';
    display.textContent  = formatTime(plannedDuration);
  }
}

function stopSession() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;

  if (noSleep) noSleep.disable();

  const actual = Math.round((Date.now() - sessionStart) / 1000);
  saveSession(false, actual);
  statusEl.textContent = 'Stopped early';
  btnStart.disabled    = false;
  btnStop.disabled     = true;
  btnStart.textContent = 'Start';
  display.textContent  = formatTime(plannedDuration);
}

// ─── Log ─────────────────────────────────────────────────────────
function saveSession(completed, actualSecs = null) {
  const sessions = getSessions();
  sessions.unshift({
    id:        Date.now(),
    date:      new Date(sessionStart).toLocaleDateString('en-GB'),
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
    `Sessions: <strong>${sessions.length}</strong><br>
     Total time: <strong>${totalH}h ${totalM}m</strong><br>
     Completed: <strong>${sessions.filter(s => s.completed).length}</strong>`;

  document.getElementById('log-list').innerHTML = sessions.map(s => `
    <li>
      <span class="log-date">${s.date} ${s.startTime}</span><br>
      <span class="log-detail">
        ${formatDuration(s.actual)} / ${formatDuration(s.planned)} planned
        &nbsp;${s.completed ? '✓' : '⚠ stopped early'} · ${s.sound}
      </span>
    </li>`).join('');
}

// ─── Export CSV ──────────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  const sessions = getSessions();
  const rows = [
    ['Date', 'Start', 'Planned(s)', 'Actual(s)', 'Completed', 'Sound'],
    ...sessions.map(s => [s.date, s.startTime, s.planned, s.actual, s.completed, s.sound])
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'meditation_log.csv';
  a.click();
});

document.getElementById('btn-clear-log').addEventListener('click', () => {
  if (confirm('Clear all session history?')) {
    localStorage.removeItem('meditation_log');
    renderLog();
  }
});

// ─── Settings ────────────────────────────────────────────────────
function loadSettings() {
  const s = JSON.parse(localStorage.getItem('meditation_settings') || '{}');
  if (s.duration) {
    selectedMinutes = s.duration;
    document.getElementById('default-duration').value = s.duration;
    display.textContent = formatTime(s.duration * 60);
  }
  if (s.sound) {
    soundSelect.value = s.sound;
    document.getElementById('default-sound').value = s.sound;
  }
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const d = +document.getElementById('default-duration').value;
  const s =  document.getElementById('default-sound').value;
  localStorage.setItem('meditation_settings', JSON.stringify({ duration: d, sound: s }));
  const msg = document.getElementById('settings-saved');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
});

// ─── Init ────────────────────────────────────────────────────────
loadSettings();
selectPreset(selectedMinutes);

