// ─── i18n ────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    app_title:         'Silent Bell',
    nav_timer:         'Timer',
    nav_log:           'Log',
    nav_settings:      'Settings',
    status_ready:      'Ready',
    status_meditating: 'Meditating…',
    status_complete:   'Session complete 🙏',
    status_stopped:    'Stopped early',
    status_prepare:    'Prepare… {secs}s',
    label_sound:       'Sound',
    label_interval:    'Interval sound every',
    sound_bell:        'Bell',
    sound_bell_high:   'Bell (Higher pitch)',
    sound_chugpi:      'Jugbi 죽비',
    sound_silent:      'Silent',
    interval_none:     'None',
    btn_start:         'Start',
    btn_stop:          'Stop',
    btn_export:        'Export CSV',
    btn_clear:         'Clear Log',
    btn_save:          'Save',
    settings_duration: 'Default duration (min)',
    settings_sound:    'Sound',
    settings_prepare:  'Prepare countdown (sec)',
    settings_notes:    'Session notes',
    notes_on:          'Enabled',
    notes_off:         'Disabled',
    settings_saved:    'Saved ✓',
    log_sessions:      'Sessions',
    log_total:         'Total time',
    log_completed:     'Completed',
    log_planned:       'planned',
    log_stopped:       '⚠ stopped early',
    confirm_clear:     'Clear all session history?',
    ios_install:       'To install: tap the Share button ↑ then "Add to Home Screen"',
    log_streak:        'Streak',
    log_days:          'days',
    note_placeholder:  'Note (optional)',
    note_save:         'Save ✓'
  },
  pl: {
    app_title:         'Dzwon Ciszy',
    nav_timer:         'Timer',
    nav_log:           'Dziennik',
    nav_settings:      'Ustawienia',
    status_ready:      'Gotowy',
    status_meditating: 'Medytacja…',
    status_complete:   'Sesja zakończona 🙏',
    status_stopped:    'Przerwano',
    status_prepare:    'Przygotuj się… {secs}s',
    label_sound:       'Dźwięk',
    label_interval:    'Dźwięk co każde',
    sound_bell:        'Dzwon',
    sound_bell_high:   'Dzwon (Wyższy dźwięk)',
    sound_chugpi:      'Jugbi 죽비',
    sound_silent:      'Cisza',
    interval_none:     'Brak',
    btn_start:         'Start',
    btn_stop:          'Stop',
    btn_export:        'Eksport CSV',
    btn_clear:         'Wyczyść',
    btn_save:          'Zapisz',
    settings_duration: 'Domyślny czas (min)',
    settings_sound:    'Dźwięk',
    settings_prepare:  'Odliczanie przed startem (s)',
    settings_notes:    'Notatki sesji',
    notes_on:          'Włączone',
    notes_off:         'Wyłączone',
    settings_saved:    'Zapisano ✓',
    log_sessions:      'Sesje',
    log_total:         'Łączny czas',
    log_completed:     'Ukończone',
    log_planned:       'zaplanowano',
    log_stopped:       '⚠ przerwano',
    confirm_clear:     'Wyczyścić historię sesji?',
    ios_install:       'Aby zainstalować: wybierz Udostępnij ↑, potem „Dodaj do ekranu głównego"',
    log_streak:        'Seria',
    log_days:          'dni',
    note_placeholder:  'Notatka (opcjonalna)',
    note_save:         'Zapisz ✓'
  },
  ko: {
    app_title:         '침묵의 종',
    nav_timer:         '타이머',
    nav_log:           '기록',
    nav_settings:      '설정',
    status_ready:      '준비',
    status_meditating: '명상 중…',
    status_complete:   '세션 완료 🙏',
    status_stopped:    '중단됨',
    status_prepare:    '준비하세요… {secs}초',
    label_sound:       '소리',
    label_interval:    '간격 소리 (매)',
    sound_bell:        '범종',
    sound_bell_high:   '범종 (높은 음)',
    sound_chugpi:      '죽비',
    sound_silent:      '무음',
    interval_none:     '없음',
    btn_start:         '시작',
    btn_stop:          '정지',
    btn_export:        'CSV 내보내기',
    btn_clear:         '기록 삭제',
    btn_save:          '저장',
    settings_duration: '기본 시간 (분)',
    settings_sound:    '소리',
    settings_prepare:  '준비 카운트다운 (초)',
    settings_notes:    '세션 메모',
    notes_on:          '활성화',
    notes_off:         '비활성화',
    settings_saved:    '저장됨 ✓',
    log_sessions:      '세션',
    log_total:         '총 시간',
    log_completed:     '완료',
    log_planned:       '계획',
    log_stopped:       '⚠ 중단됨',
    confirm_clear:     '모든 세션 기록을 삭제하시겠습니까?',
    ios_install:       '설치하려면: 공유 버튼을 탭한 후 "홈 화면에 추가"를 선택하세요',
    log_streak:        '연속',
    log_days:          '일',
    note_placeholder:  '메모 (선택)',
    note_save:         '저장 ✓'
  }
};

var currentLang  = localStorage.getItem('lang')  || 'en';
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
  var allLangs    = ['en', 'pl', 'ko'];
  var otherLangs  = allLangs.filter(function(l) { return l !== currentLang; });
  var langDisplay = { en: 'EN', pl: 'PL', ko: '한' };
  var btns = document.querySelectorAll('.btn-lang');
  btns.forEach(function(btn, i) {
    btn.dataset.lang = otherLangs[i];
    btn.textContent  = langDisplay[otherLangs[i]];
  });
  var logView = document.getElementById('view-log');
  if (logView && logView.classList.contains('active')) renderLog();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.getElementById('btn-theme').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentTheme === 'dark' ? '#111820' : '#f0ece4';
}

document.querySelectorAll('.btn-lang').forEach(function(btn) {
  btn.addEventListener('click', function() {
    currentLang = btn.dataset.lang;
    localStorage.setItem('lang', currentLang);
    applyLang();
  });
});

document.getElementById('btn-theme').addEventListener('click', function() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
});

// ─── Audio Engine ────────────────────────────────────────────────

var noSleep      = null;
var audioCtx     = null;
var silentLoop   = null;
var chugpiMaster = null;

function createFreshAudioContext() {
  if (audioCtx) {
    try { audioCtx.close(); } catch(e) {}
  }
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioCtx     = new AudioCtx();
  chugpiMaster = null;
  return audioCtx;
}

function getAudioContext() {
  if (!audioCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

function ensureAudioContext() {
  var ctx = getAudioContext();
  if (isContextBroken(ctx)) {
    ctx = createFreshAudioContext();
  }
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    ctx.resume().catch(function(e) { console.warn('ctx.resume():', e); });
  }
  return ctx;
}

// ─── Visibility / focus recovery ─────────────────────────────────

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx     = null;
    chugpiMaster = null;
  }
});

window.addEventListener('focus', function() {
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx     = null;
    chugpiMaster = null;
  }
});

// ─── iOS silent-switch bypass ─────────────────────────────────────

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

function startSilentLoop() {
  if (!silentLoop) {
    silentLoop = new Audio(SILENT_MP3);
    silentLoop.loop   = true;
    silentLoop.volume = 0.01;
    silentLoop.setAttribute('playsinline', '');
    silentLoop.setAttribute('x-webkit-airplay', 'deny');
  }
  silentLoop.play().catch(function(e) { console.warn('Silent loop:', e); });
}

function stopSilentLoop() {
  if (silentLoop) {
    silentLoop.pause();
    silentLoop.currentTime = 0;
  }
}

function unlockAudio() {
  try {
    var ctx = ensureAudioContext();
    var buf = ctx.createBuffer(1, 512, ctx.sampleRate);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    startSilentLoop();
    getChugpiMaster();
  } catch(e) {
    console.warn('unlockAudio:', e);
    audioCtx     = null;
    chugpiMaster = null;
    try {
      ensureAudioContext();
      startSilentLoop();
    } catch(e2) { console.warn('unlockAudio retry:', e2); }
  }
}

// ─── Temple Bell Synthesizer ──────────────────────────────────────

function playTempleBell(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = getAudioContext();
  var t0  = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.02; master.release.value = 0.5;
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 6000; lpf.Q.value = 0.5;
  var tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 10.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 17.0);
  master.connect(lpf); lpf.connect(tailFade); tailFade.connect(ctx.destination);
  var clankSize = Math.floor(ctx.sampleRate * 0.04);
  var clankBuf  = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  var clankData = clankBuf.getChannelData(0);
  for (var i = 0; i < clankSize; i++)
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  var clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  var clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; clankBp.frequency.value = 4000; clankBp.Q.value = 0.5;
  var clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.004);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  clankSrc.connect(clankBp); clankBp.connect(clankGain); clankGain.connect(master);
  clankSrc.start(t0); clankSrc.stop(t0 + 0.08);
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    var osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); env.connect(master);
    osc.start(t0); osc.stop(t0 + decayTime + 2.0);
  }
  addPartial(110,  0.32, 0.015, 16.0);
  addPartial(304,  0.22, 0.010, 11.0);
  addPartial(594,  0.14, 0.008,  8.0);
  addPartial(982,  0.08, 0.005,  5.5);
  addPartial(1627, 0.04, 0.004,  3.5);
  var shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; shimmerLfo.frequency.value = 4.5;
  var shimmerDepth = ctx.createGain(); shimmerDepth.gain.value = 0.02;
  var shimmerFund  = ctx.createOscillator();
  shimmerFund.type = 'sine'; shimmerFund.frequency.value = 110;
  var shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.08);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  shimmerLfo.connect(shimmerDepth); shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); shimmerEnv.connect(master);
  shimmerLfo.start(t0); shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 16.0); shimmerFund.stop(t0 + 16.0);
}

// ─── Temple Bell — Higher Pitch ───────────────────────────────────

function playTempleBellHigh(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = getAudioContext();
  var t0  = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.02; master.release.value = 0.5;
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 7000; lpf.Q.value = 0.5;
  var tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 8.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  master.connect(lpf); lpf.connect(tailFade); tailFade.connect(ctx.destination);
  var clankSize = Math.floor(ctx.sampleRate * 0.035);
  var clankBuf  = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  var clankData = clankBuf.getChannelData(0);
  for (var i = 0; i < clankSize; i++)
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  var clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  var clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; clankBp.frequency.value = 5500; clankBp.Q.value = 0.5;
  var clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.003);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  clankSrc.connect(clankBp); clankBp.connect(clankGain); clankGain.connect(master);
  clankSrc.start(t0); clankSrc.stop(t0 + 0.07);
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    var osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); env.connect(master);
    osc.start(t0); osc.stop(t0 + decayTime + 2.0);
  }
  addPartial(165,  0.32, 0.012, 12.0);
  addPartial(456,  0.22, 0.008,  8.5);
  addPartial(891,  0.14, 0.006,  6.0);
  addPartial(1473, 0.08, 0.004,  4.0);
  addPartial(2440, 0.04, 0.003,  2.5);
  var shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; shimmerLfo.frequency.value = 5.5;
  var shimmerDepth = ctx.createGain(); shimmerDepth.gain.value = 0.02;
  var shimmerFund  = ctx.createOscillator();
  shimmerFund.type = 'sine'; shimmerFund.frequency.value = 165;
  var shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.07);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 11.0);
  shimmerLfo.connect(shimmerDepth); shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); shimmerEnv.connect(master);
  shimmerLfo.start(t0); shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 13.0); shimmerFund.stop(t0 + 13.0);
}

// ─── Singing Bowl Edge (standard pitch) ──────────────────────────

function playSingingBowlEdge(startTime) {
  var ctx = getAudioContext(); var t0 = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.05; master.release.value = 0.6;
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 5000; lpf.Q.value = 0.5;
  master.connect(lpf); lpf.connect(ctx.destination);
  var noiseSize = Math.floor(ctx.sampleRate * 0.8);
  var noiseBuf  = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  var noiseData = noiseBuf.getChannelData(0);
  for (var i = 0; i < noiseSize; i++) {
    var hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  var noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuf;
  var bp1 = ctx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 220; bp1.Q.value = 8.0;
  var bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 220; bp2.Q.value = 8.0;
  var noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.5);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.7);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.85);
  noiseSrc.connect(bp1); bp1.connect(bp2); bp2.connect(noiseGain); noiseGain.connect(master);
  noiseSrc.start(t0); noiseSrc.stop(t0 + 0.9);
  function addEdgePartial(freq, gainPeak, decayTime) {
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.35);
    env.gain.setValueAtTime(gainPeak, t0 + 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); env.connect(master); osc.start(t0); osc.stop(t0 + decayTime + 1.5);
  }
  addEdgePartial(110, 0.07, 5.5); addEdgePartial(304, 0.04, 3.5); addEdgePartial(594, 0.02, 2.0);
}

// ─── Singing Bowl Edge (higher pitch) ────────────────────────────

function playSingingBowlEdgeHigh(startTime) {
  var ctx = getAudioContext(); var t0 = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.05; master.release.value = 0.6;
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 6000; lpf.Q.value = 0.5;
  master.connect(lpf); lpf.connect(ctx.destination);
  var noiseSize = Math.floor(ctx.sampleRate * 0.8);
  var noiseBuf  = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  var noiseData = noiseBuf.getChannelData(0);
  for (var i = 0; i < noiseSize; i++) {
    var hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  var noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuf;
  var bp1 = ctx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 330; bp1.Q.value = 8.0;
  var bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 330; bp2.Q.value = 8.0;
  var noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.45);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.65);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.80);
  noiseSrc.connect(bp1); bp1.connect(bp2); bp2.connect(noiseGain); noiseGain.connect(master);
  noiseSrc.start(t0); noiseSrc.stop(t0 + 0.85);
  function addEdgePartial(freq, gainPeak, decayTime) {
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.30);
    env.gain.setValueAtTime(gainPeak, t0 + 0.50); env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); env.connect(master); osc.start(t0); osc.stop(t0 + decayTime + 1.5);
  }
  addEdgePartial(165, 0.07, 4.5); addEdgePartial(456, 0.04, 2.8); addEdgePartial(891, 0.02, 1.6);
}

// ─── Chugpi (죽비) Synthesizer ────────────────────────────────────

function getChugpiMaster() {
  var ctx = getAudioContext();
  if (!chugpiMaster) {
    chugpiMaster = ctx.createDynamicsCompressor();
    chugpiMaster.threshold.value = -10; chugpiMaster.knee.value = 8;
    chugpiMaster.ratio.value = 2.5; chugpiMaster.attack.value = 0.001;
    chugpiMaster.release.value = 0.15;
    chugpiMaster.connect(ctx.destination);
    var primeBuf = ctx.createBuffer(1, 2048, ctx.sampleRate);
    var primeSrc = ctx.createBufferSource();
    primeSrc.buffer = primeBuf; primeSrc.connect(chugpiMaster); primeSrc.start(0);
  }
  return chugpiMaster;
}

function playChugpiNow(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = getAudioContext(); var master = getChugpiMaster();
  var now = startTime; var v = velocity;
  var snapSize = Math.floor(ctx.sampleRate * 0.015);
  var snapBuf  = ctx.createBuffer(1, snapSize, ctx.sampleRate);
  var snapData = snapBuf.getChannelData(0);
  for (var i = 0; i < snapSize; i++)
    snapData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapSize, 2.5);
  var snapSrc   = ctx.createBufferSource(); snapSrc.buffer = snapBuf;
  var snapBpHi  = ctx.createBiquadFilter();
  snapBpHi.type = 'bandpass'; snapBpHi.frequency.value = 2400; snapBpHi.Q.value = 1.2;
  var snapBpMid = ctx.createBiquadFilter();
  snapBpMid.type = 'bandpass'; snapBpMid.frequency.value = 1400; snapBpMid.Q.value = 0.9;
  var snapGainHi  = ctx.createGain(); snapGainHi.gain.value  = 0.6;
  var snapGainMid = ctx.createGain(); snapGainMid.gain.value = 0.4;
  var snapEnv = ctx.createGain();
  snapEnv.gain.setValueAtTime(0.0, now);
  snapEnv.gain.linearRampToValueAtTime(2.8 * v, now + 0.001);
  snapEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
  snapSrc.connect(snapBpHi);  snapBpHi.connect(snapGainHi);   snapGainHi.connect(snapEnv);
  snapSrc.connect(snapBpMid); snapBpMid.connect(snapGainMid); snapGainMid.connect(snapEnv);
  snapEnv.connect(master); snapSrc.start(now); snapSrc.stop(now + 0.018);
  var flesSize = Math.floor(ctx.sampleRate * 0.08);
  var flesBuf  = ctx.createBuffer(1, flesSize, ctx.sampleRate);
  var flesData = flesBuf.getChannelData(0);
  for (var j = 0; j < flesSize; j++)
    flesData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / flesSize, 1.6);
  var flesSrc  = ctx.createBufferSource(); flesSrc.buffer = flesBuf;
  var flesBpLo = ctx.createBiquadFilter();
  flesBpLo.type = 'bandpass'; flesBpLo.frequency.value = 500;  flesBpLo.Q.value = 0.9;
  var flesBpMid = ctx.createBiquadFilter();
  flesBpMid.type = 'bandpass'; flesBpMid.frequency.value = 950; flesBpMid.Q.value = 0.8;
  var flesBpHi = ctx.createBiquadFilter();
  flesBpHi.type = 'bandpass'; flesBpHi.frequency.value = 1600; flesBpHi.Q.value = 1.0;
  var flesGLo  = ctx.createGain(); flesGLo.gain.value  = 0.40;
  var flesGMid = ctx.createGain(); flesGMid.gain.value = 0.40;
  var flesGHi  = ctx.createGain(); flesGHi.gain.value  = 0.20;
  var flesEnv  = ctx.createGain();
  flesEnv.gain.setValueAtTime(0.0, now);
  flesEnv.gain.linearRampToValueAtTime(4.8 * v, now + 0.003);
  flesEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
  flesSrc.connect(flesBpLo);  flesBpLo.connect(flesGLo);   flesGLo.connect(flesEnv);
  flesSrc.connect(flesBpMid); flesBpMid.connect(flesGMid); flesGMid.connect(flesEnv);
  flesSrc.connect(flesBpHi);  flesBpHi.connect(flesGHi);   flesGHi.connect(flesEnv);
  flesEnv.connect(master); flesSrc.start(now); flesSrc.stop(now + 0.09);
  var palmOsc = ctx.createOscillator(); palmOsc.type = 'sine';
  palmOsc.frequency.setValueAtTime(200, now);
  palmOsc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
  var palmEnv = ctx.createGain();
  palmEnv.gain.setValueAtTime(0.0, now);
  palmEnv.gain.linearRampToValueAtTime(0.35 * v, now + 0.004);
  palmEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  palmOsc.connect(palmEnv); palmEnv.connect(master);
  palmOsc.start(now); palmOsc.stop(now + 0.09);
  var thudSize = Math.floor(ctx.sampleRate * 0.055);
  var thudBuf  = ctx.createBuffer(1, thudSize, ctx.sampleRate);
  var thudData = thudBuf.getChannelData(0);
  for (var k = 0; k < thudSize; k++)
    thudData[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / thudSize, 2.5);
  var thudSrc = ctx.createBufferSource(); thudSrc.buffer = thudBuf;
  var thudLp  = ctx.createBiquadFilter();
  thudLp.type = 'lowpass'; thudLp.frequency.value = 280; thudLp.Q.value = 1.0;
  var thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.0, now);
  thudGain.gain.linearRampToValueAtTime(2.2 * v, now + 0.004);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  thudSrc.connect(thudLp); thudLp.connect(thudGain); thudGain.connect(master);
  thudSrc.start(now); thudSrc.stop(now + 0.06);
}

// ─── Unified play functions ───────────────────────────────────────

function playBell(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playTempleBell(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

function playBellHigh(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playTempleBellHigh(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

function playChugpi(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playChugpiNow(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

function playSound(type, timeSeconds) {
  timeSeconds = timeSeconds || 0;
  if (type === 'none') return;
  if (type === 'chugpi')         playChugpi(timeSeconds);
  else if (type === 'bell-high') playBellHigh(timeSeconds);
  else                           playBell(timeSeconds);
}

function playStrokes(type, count, startDelay) {
  startDelay = startDelay || 0;
  if (type === 'none') return;
  var interval = type === 'chugpi' ? 1.5 : 1.4;
  if (type === 'chugpi') {
    var ctx = ensureAudioContext(); getChugpiMaster();
    var leadIn = 0.15;
    for (var i = 0; i < count; i++) {
      (function(delay) {
        function doPlay() { playChugpiNow(ctx.currentTime + delay, 1.0); }
        if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
      })(leadIn + startDelay + i * interval);
    }
  } else {
    for (var i = 0; i < count; i++) playSound(type, startDelay + i * interval);
  }
}

// ─── Meditation UI state ──────────────────────────────────────────

function setMeditating(active) {
  document.getElementById('view-timer').classList.toggle('meditating', active);
}

// ─── State ───────────────────────────────────────────────────────

var timerInterval     = null;
var countdownInterval = null;
var sessionStart      = null;
var endTimestamp      = null;
var plannedDuration   = 0;
var intervalBellMs    = 0;
var nextIntervalAt    = null;
var currentSound      = 'bell';
var selectedMinutes   = 20;
var selectedSeconds   = 0;
var prepareSeconds    = 10;
var notesEnabled      = true;

// ─── DOM refs ────────────────────────────────────────────────────

var display        = document.getElementById('display');
var statusEl       = document.getElementById('status');
var btnStart       = document.getElementById('btn-start');
var btnStop        = document.getElementById('btn-stop');
var intervalSelect = document.getElementById('interval-select');

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

function formatTime(secs) {
  var m = String(Math.floor(Math.abs(secs) / 60)).padStart(2, '0');
  var s = String(Math.abs(secs) % 60).padStart(2, '0');
  return m + ':' + s;
}

function getTotalSeconds() {
  return selectedMinutes * 60 + selectedSeconds;
}

function setTime(totalSecs) {
  totalSecs       = Math.min(28800, Math.max(60, totalSecs));
  selectedMinutes = Math.floor(totalSecs / 60);
  selectedSeconds = totalSecs % 60;
  display.textContent = formatTime(totalSecs);
}

// ─── Interactive timer display ────────────────────────────────────

var displayWrap = document.getElementById('display-wrap');
var dragStartY  = null;
var dragTotal   = null;
var dragUnit    = 60;

function changeTime(deltaSecs) {
  if (timerInterval || countdownInterval) return;
  setTime(getTotalSeconds() + deltaSecs);
}

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
  var leftHalf = (touch.clientX - rect.left) < rect.width / 2;
  dragStartY   = touch.clientY;
  dragTotal    = getTotalSeconds();
  dragUnit     = leftHalf ? 60 : 1;
}, { passive: true });

displayWrap.addEventListener('touchmove', function(e) {
  if (dragStartY === null) return;
  var delta    = Math.round((dragStartY - e.touches[0].clientY) / 12);
  var newTotal = Math.min(28800, Math.max(60, dragTotal + delta * dragUnit));
  selectedMinutes     = Math.floor(newTotal / 60);
  selectedSeconds     = newTotal % 60;
  display.textContent = formatTime(newTotal);
}, { passive: true });

displayWrap.addEventListener('touchend', function() {
  dragStartY = null; dragTotal = null;
});

displayWrap.addEventListener('mousedown', function(e) {
  if (timerInterval || countdownInterval) return;
  var rect     = displayWrap.getBoundingClientRect();
  var leftHalf = (e.clientX - rect.left) < rect.width / 2;
  dragUnit   = leftHalf ? 60 : 1;
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
document.addEventListener('mouseup', function() {
  dragStartY = null; dragTotal = null;
});

// ─── Start / Stop buttons ────────────────────────────────────────

btnStart.addEventListener('click', function() {
  unlockAudio();
  btnStart.disabled    = true;
  statusEl.textContent = t('status_ready');
  if (!noSleep && window.NoSleep) noSleep = new NoSleep();
  if (noSleep) noSleep.enable();
  startCountdown();
});

btnStop.addEventListener('click', stopSession);

// ─── Prepare Countdown ───────────────────────────────────────────

function startCountdown() {
  var secsLeft = prepareSeconds;
  if (secsLeft <= 0) { startSession(); return; }
  btnStart.disabled = true;
  btnStop.disabled  = false;
  function updateDisplay() {
    statusEl.textContent = t('status_prepare').replace('{secs}', secsLeft);
    display.textContent  = formatTime(secsLeft);
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

function tick() {
  var now       = Date.now();
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
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    btnStart.textContent = t('btn_start');
    display.textContent  = formatTime(plannedDuration);
  }
}

function stopSession() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    if (noSleep) noSleep.disable();
    stopSilentLoop();
    statusEl.textContent = t('status_ready');
    btnStart.disabled    = false;
    btnStop.disabled     = true;
    display.textContent  = formatTime(getTotalSeconds());
    return;
  }
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  setMeditating(false);
  if (noSleep) noSleep.disable();
  stopSilentLoop();
  var actual = Math.round((Date.now() - sessionStart) / 1000);

  if (notesEnabled) showNoteField(false, actual);
  else saveSession(false, actual, '');

  statusEl.textContent = t('status_stopped');
  btnStart.disabled    = false;
  btnStop.disabled     = true;
  btnStart.textContent = t('btn_start');
  display.textContent  = formatTime(plannedDuration);
}

// ─── Log ─────────────────────────────────────────────────────────

function getSessions() {
  try { return JSON.parse(localStorage.getItem('meditation_log')) || []; }
  catch(e) { return []; }
}

function saveSession(completed, actualSecs, note) {
  var sessions = getSessions();
  sessions.unshift({
    id:        Date.now(),
    date:      new Date(sessionStart).toLocaleDateString(
                 { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[currentLang] || 'en-GB'),
    startTime: new Date(sessionStart).toLocaleTimeString('en-GB',
                 { hour: '2-digit', minute: '2-digit' }),
    planned:   plannedDuration,
    actual:    actualSecs !== undefined ? actualSecs : plannedDuration,
    completed: completed,
    sound:     currentSound,
    note:      note || ''
  });
  localStorage.setItem('meditation_log', JSON.stringify(sessions));
}

// ─── Session Note ─────────────────────────────────────────────────

function showNoteField(completed, actualSecs) {
  var wrap  = document.getElementById('note-wrap');
  var input = document.getElementById('note-input');
  var btn   = document.getElementById('note-save-btn');
  if (!wrap) { saveSession(completed, actualSecs, ''); return; }

  var saved = false;
  input.value        = '';
  input.placeholder  = t('note_placeholder');
  btn.textContent    = t('note_save');
  wrap.style.display = 'flex';
  input.focus();

  function doSave() {
    if (saved) return;
    saved = true;
    wrap.style.display = 'none';
    saveSession(completed, actualSecs, input.value.trim());
  }

  btn.onclick     = doSave;
  input.onkeydown = function(e) { if (e.key === 'Enter') doSave(); };
  input.onblur    = function()  { setTimeout(doSave, 200); };
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.addEventListener('click', doSave, { once: true });
  });
}

function formatDuration(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return s > 0 ? (m + 'm ' + s + 's') : (m + 'm');
}

// ─── Streak ───────────────────────────────────────────────────────

function computeStreak(sessions) {
  var dateSet = {};
  sessions.forEach(function(s) {
    if (!s.completed) return;
    var d = new Date(s.id);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    dateSet[k] = true;
  });
  var streak = 0;
  for (var i = 0; i < 365; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    if (dateSet[k]) { streak++; } else { break; }
  }
  return streak;
}

// ─── Weekly Chart ─────────────────────────────────────────────────

function buildWeekChart(sessions) {
  var W = 7, BW = 28, GAP = 8, H = 56, LH = 18, TOPH = 16;
  var svgW   = W * (BW + GAP) - GAP;
  var cs     = getComputedStyle(document.documentElement);
  var accent = cs.getPropertyValue('--accent').trim() || '#88c0d0';
  var muted  = cs.getPropertyValue('--muted').trim()  || '#7b8fa1';
  var border = cs.getPropertyValue('--border').trim() || '#2e3a4e';

  var dayMins = {}, days = [];
  for (var i = W - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    var label = d.toLocaleDateString(
      { pl: 'pl-PL', ko: 'ko-KR', en: 'en-GB' }[currentLang] || 'en-GB',
      { weekday: 'narrow' }
    );
    days.push({ key: k, label: label });
    dayMins[k] = 0;
  }

  sessions.forEach(function(s) {
    var d = new Date(s.id);
    var k = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    if (dayMins[k] !== undefined) dayMins[k] += Math.round(s.actual / 60);
  });

  var maxM     = Math.max(1, Math.max.apply(null, days.map(function(d) { return dayMins[d.key]; })));
  var todayKey = days[W - 1].key;

  var bars = days.map(function(day, i) {
    var mins = dayMins[day.key];
    var bh   = mins > 0 ? Math.max(4, Math.round((mins / maxM) * H)) : 2;
    var x    = i * (BW + GAP);
    var fill = mins > 0 ? accent : border;
    var op   = day.key === todayKey ? '1' : '0.65';

    var barRect = '<rect x="' + x + '" y="' + (H - bh) + '" width="' + BW +
      '" height="' + bh + '" rx="3" fill="' + fill + '" opacity="' + op + '">' +
      '<title>' + mins + ' min</title></rect>';

    var minLabel = mins > 0
      ? '<text x="' + (x + BW / 2) + '" y="' + (H - bh - 4) +
        '" text-anchor="middle" font-size="9" fill="' + accent +
        '" opacity="' + op + '">' + mins + '</text>'
      : '';

    var dayLabel = '<text x="' + (x + BW / 2) + '" y="' + (H + LH - 2) +
      '" text-anchor="middle" font-size="10" fill="' + muted + '">' + day.label + '</text>';

    return barRect + minLabel + dayLabel;
  }).join('');

  return '<svg width="100%" viewBox="0 0 ' + svgW + ' ' + (H + LH + TOPH) +
    '" style="display:block;margin:14px 0 6px">' +
    '<g transform="translate(0,' + TOPH + ')">' + bars + '</g></svg>';
}

// ─── Render Log ───────────────────────────────────────────────────

function renderLog() {
  var sessions  = getSessions();
  var totalSecs = sessions.reduce(function(a, s) { return a + s.actual; }, 0);
  var totalH    = Math.floor(totalSecs / 3600);
  var totalM    = Math.floor((totalSecs % 3600) / 60);

  var streak = computeStreak(sessions);
  var streakHtml = streak > 0
    ? ' &nbsp;🔥 <strong>' + streak + '</strong> ' + t('log_days')
    : '';

  document.getElementById('log-summary').innerHTML =
    t('log_sessions') + ': <strong>' + sessions.length + '</strong> &nbsp;' +
    t('log_total') + ': <strong>' + totalH + 'h ' + totalM + 'm</strong> &nbsp;' +
    t('log_completed') + ': <strong>' + sessions.filter(function(s) { return s.completed; }).length + '</strong>' +
    streakHtml;

  var chartEl = document.getElementById('log-chart');
  if (chartEl) chartEl.innerHTML = sessions.length ? buildWeekChart(sessions) : '';

  document.getElementById('log-list').innerHTML = sessions.map(function(s) {
    var noteHtml = s.note
      ? '<div class="log-note">' + s.note.replace(/</g, '&lt;') + '</div>'
      : '';
    return '<li>' +
      '<div class="log-date">' + s.date + ' &nbsp; ' + s.startTime + '</div>' +
      '<div class="log-detail">' +
        formatDuration(s.actual) + ' / ' + formatDuration(s.planned) + ' ' + t('log_planned') +
        (!s.completed ? ' &nbsp; ' + t('log_stopped') : '') +
      '</div>' + noteHtml + '</li>';
  }).join('');
}

// ─── CSV Export ───────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', function() {
  var sessions = getSessions();
  var rows = [['Date', 'Start', 'Planned (s)', 'Actual (s)', 'Completed', 'Sound', 'Note']].concat(
    sessions.map(function(s) {
      return [
        s.date, s.startTime, s.planned, s.actual, s.completed, s.sound,
        '"' + (s.note || '').replace(/"/g, '""') + '"'
      ];
    })
  );
  var csv = rows.map(function(r) { return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'meditation_log.csv';
  a.click();
});

// ─── CSV Import ───────────────────────────────────────────────────

document.getElementById('btn-import-csv').addEventListener('click', function() {
  document.getElementById('import-csv-file').click();
});

document.getElementById('import-csv-file').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var lines  = ev.target.result.split(/\r?\n/).filter(function(l) { return l.trim(); });
      var header = lines[0].split(',');

      function col(name) {
        return header.findIndex(function(h) {
          return h.trim().toLowerCase() === name.toLowerCase();
        });
      }
      var iDate      = col('Date');
      var iStart     = col('Start');
      var iPlanned   = col('Planned (s)');
      var iActual    = col('Actual (s)');
      var iCompleted = col('Completed');
      var iSound     = col('Sound');
      var iNote      = col('Note');

      if (iDate < 0 || iActual < 0) throw new Error('Unrecognised CSV format');

      var imported = [];
      for (var i = 1; i < lines.length; i++) {
        var parts = [];
        var line  = lines[i];
        var inQ   = false;
        var cur   = '';
        for (var c = 0; c < line.length; c++) {
          var ch = line[c];
          if (ch === '"')              { inQ = !inQ; }
          else if (ch === ',' && !inQ) { parts.push(cur); cur = ''; }
          else                         { cur += ch; }
        }
        parts.push(cur);

        var actual    = parseInt(parts[iActual])  || 0;
        var planned   = parseInt(parts[iPlanned]) || actual;
        var completed = iCompleted >= 0
          ? (parts[iCompleted].trim().toLowerCase() === 'true')
          : true;
        var note     = iNote  >= 0 ? parts[iNote].trim()  : '';
        var dateStr  = iDate  >= 0 ? parts[iDate].trim()  : '';
        var startStr = iStart >= 0 ? parts[iStart].trim() : '';
        var id = Date.parse(dateStr + ' ' + startStr) || (Date.now() - (lines.length - i) * 1000);

        imported.push({
          id:        id,
          date:      dateStr,
          startTime: startStr,
          planned:   planned,
          actual:    actual,
          completed: completed,
          sound:     iSound >= 0 ? parts[iSound].trim() : 'bell',
          note:      note
        });
      }

      if (!imported.length) throw new Error('No rows found');

      var existing = getSessions();
      var merged   = existing.slice();
      imported.forEach(function(s) {
        if (!merged.find(function(x) { return x.id === s.id; })) merged.push(s);
      });
      merged.sort(function(a, b) { return b.id - a.id; });
      localStorage.setItem('meditation_log', JSON.stringify(merged));
      renderLog();
      alert('Imported ' + imported.length + ' sessions from CSV.');
    } catch(err) {
      alert('Could not import CSV: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ─── Clear Log ────────────────────────────────────────────────────

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
var settingsNotes    = document.getElementById('settings-notes');

function loadSettings() {
  var dur      = localStorage.getItem('settings_duration');
  var sound    = localStorage.getItem('settings_sound');
  var prep     = localStorage.getItem('settings_prepare');
  var interval = localStorage.getItem('settings_interval');
  var notes    = localStorage.getItem('settings_notes');

  if (dur) {
    settingsDuration.value = dur;
    selectedMinutes        = parseInt(dur);
    selectedSeconds        = 0;
    display.textContent    = formatTime(selectedMinutes * 60);
  }
  if (sound)    { settingsSound.value = sound; currentSound = sound; }
  if (interval) { intervalSelect.value = interval; }

  var p = (prep !== null && prep !== '') ? parseInt(prep) : prepareSeconds;
  prepareSeconds = p;
  if (settingsPrepare) settingsPrepare.value = p;

  if (notes) {
    notesEnabled        = notes === 'on';
    settingsNotes.value = notes;
  }
}

settingsSound.addEventListener('change', function() {
  currentSound = settingsSound.value;
  localStorage.setItem('settings_sound', currentSound);
});

intervalSelect.addEventListener('change', function() {
  localStorage.setItem('settings_interval', intervalSelect.value);
});

settingsDuration.addEventListener('change', function() {
  var dur = parseInt(settingsDuration.value);
  if (dur > 0) {
    localStorage.setItem('settings_duration', dur);
    selectedMinutes     = dur;
    selectedSeconds     = 0;
    display.textContent = formatTime(dur * 60);
  }
});

settingsPrepare.addEventListener('change', function() {
  var prep = parseInt(settingsPrepare.value);
  if (!isNaN(prep) && prep >= 0) {
    prepareSeconds = prep;
    localStorage.setItem('settings_prepare', prep);
  }
});

settingsNotes.addEventListener('change', function() {
  notesEnabled = settingsNotes.value === 'on';
  localStorage.setItem('settings_notes', settingsNotes.value);
});

// ─── Test Sound ───────────────────────────────────────────────────

document.getElementById('btn-test-sound').addEventListener('click', function() {
  unlockAudio();
  var type = settingsSound.value;
  if (type === 'chugpi') playStrokes('chugpi', 1);
  else if (type !== 'none') playSound(type);
});

// ─── iOS Install Banner ───────────────────────────────────────────

(function() {
  var isIos        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true;
  var dismissed    = localStorage.getItem('iosPromptDismissed');
  if (!isIos || isStandalone || dismissed) return;

  var banner = document.getElementById('ios-install-banner');
  var text   = document.getElementById('ios-install-text');
  var close  = document.getElementById('ios-install-close');
  if (!banner) return;

  text.textContent     = t('ios_install');
  banner.style.display = 'flex';

  close.addEventListener('click', function() {
    banner.style.display = 'none';
    localStorage.setItem('iosPromptDismissed', '1');
  });
})();

// ─── Init ────────────────────────────────────────────────────────

applyLang();
applyTheme();
loadSettings();

