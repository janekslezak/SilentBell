// ─── Audio Engine ────────────────────────────────────────────────

var _audioCtx     = null;
var _chugpiMaster = null;
var _silentLoop   = null;

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

// ─── Context management ───────────────────────────────────────────

function _createFresh() {
  if (_audioCtx) { try { _audioCtx.close(); } catch(e) {} }
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  _audioCtx     = new AudioCtx();
  _chugpiMaster = null;
  return _audioCtx;
}

function _isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

export function ensureAudioContext() {
  if (!_audioCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    _audioCtx = new AudioCtx();
  }
  if (_isContextBroken(_audioCtx)) _audioCtx = _createFresh();
  if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
    _audioCtx.resume().catch(function(e) { console.warn('ctx.resume():', e); });
  }
  return _audioCtx;
}

export function resetAudioContext() {
  _audioCtx     = null;
  _chugpiMaster = null;
}

// ─── Visibility / focus recovery ─────────────────────────────────

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible' || !_audioCtx) return;
  if (_isContextBroken(_audioCtx)) resetAudioContext();
});

window.addEventListener('focus', function() {
  if (!_audioCtx) return;
  if (_isContextBroken(_audioCtx)) resetAudioContext();
});

// ─── iOS silent-switch bypass ─────────────────────────────────────

export function startSilentLoop() {
  if (!_silentLoop) {
    _silentLoop = new Audio(SILENT_MP3);
    _silentLoop.loop   = true;
    _silentLoop.volume = 0.01;
    _silentLoop.setAttribute('playsinline', '');
    _silentLoop.setAttribute('x-webkit-airplay', 'deny');
  }
  _silentLoop.play().catch(function(e) { console.warn('Silent loop:', e); });
}

export function stopSilentLoop() {
  if (_silentLoop) {
    _silentLoop.pause();
    _silentLoop.currentTime = 0;
  }
}

export function unlockAudio() {
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
    resetAudioContext();
    try { ensureAudioContext(); startSilentLoop(); }
    catch(e2) { console.warn('unlockAudio retry:', e2); }
  }
}

// ─── Chugpi master bus ────────────────────────────────────────────

export function getChugpiMaster() {
  var ctx = ensureAudioContext();
  if (_chugpiMaster && _chugpiMaster.context === ctx) return _chugpiMaster;
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 6;
  comp.ratio.value = 4; comp.attack.value = 0.001; comp.release.value = 0.15;
  var gain = ctx.createGain();
  gain.gain.value = 0.85;
  comp.connect(gain);
  gain.connect(ctx.destination);
  _chugpiMaster = comp;
  return _chugpiMaster;
}

// ─── Temple Bell ──────────────────────────────────────────────────

export function playTempleBell(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = ensureAudioContext();
  var t0  = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.02;   master.release.value = 0.5;
  var masterGain = ctx.createGain();
  masterGain.gain.value = 0.7 * velocity;
  master.connect(masterGain);
  masterGain.connect(ctx.destination);

  var partials = [
    { freq: 110,  gainPeak: 0.55, decay: 14.0 },
    { freq: 220,  gainPeak: 0.45, decay: 12.0 },
    { freq: 330,  gainPeak: 0.20, decay: 9.0  },
    { freq: 293,  gainPeak: 0.18, decay: 8.5  },
    { freq: 440,  gainPeak: 0.12, decay: 7.0  },
    { freq: 550,  gainPeak: 0.08, decay: 5.5  },
    { freq: 660,  gainPeak: 0.06, decay: 4.5  },
    { freq: 880,  gainPeak: 0.04, decay: 3.5  },
    { freq: 1100, gainPeak: 0.025,decay: 2.8  },
    { freq: 1320, gainPeak: 0.015,decay: 2.2  },
  ];
  partials.forEach(function(p) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(p.gainPeak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + p.decay + 0.1);
  });

  var noise = ctx.createBufferSource();
  var nBuf  = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  var nd    = nBuf.getChannelData(0);
  for (var i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.3;
  noise.buffer = nBuf;
  var nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.3 * velocity, t0);
  nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  noise.connect(nGain); nGain.connect(master);
  noise.start(t0);
}

// ─── Temple Bell — Higher Pitch ───────────────────────────────────

export function playTempleBellHigh(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx = ensureAudioContext();
  var t0  = startTime;
  var master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; master.knee.value = 20; master.ratio.value = 1.5;
  master.attack.value = 0.02;   master.release.value = 0.5;
  var masterGain = ctx.createGain();
  masterGain.gain.value = 0.7 * velocity;
  master.connect(masterGain);
  masterGain.connect(ctx.destination);

  var partials = [
    { freq: 220,  gainPeak: 0.55, decay: 12.0 },
    { freq: 440,  gainPeak: 0.45, decay: 10.0 },
    { freq: 660,  gainPeak: 0.20, decay: 7.5  },
    { freq: 587,  gainPeak: 0.18, decay: 7.0  },
    { freq: 880,  gainPeak: 0.12, decay: 5.5  },
    { freq: 1100, gainPeak: 0.08, decay: 4.5  },
    { freq: 1320, gainPeak: 0.06, decay: 3.5  },
    { freq: 1760, gainPeak: 0.04, decay: 2.8  },
    { freq: 2200, gainPeak: 0.025,decay: 2.2  },
    { freq: 2640, gainPeak: 0.015,decay: 1.8  },
  ];
  partials.forEach(function(p) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(p.gainPeak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + p.decay + 0.1);
  });

  var noise = ctx.createBufferSource();
  var nBuf  = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  var nd    = nBuf.getChannelData(0);
  for (var i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.3;
  noise.buffer = nBuf;
  var nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.3 * velocity, t0);
  nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  noise.connect(nGain); nGain.connect(master);
  noise.start(t0);
}

// ─── Chugpi (죽비) Synthesizer ───────────────────────────────────

export function playChugpiNow(startTime, velocity) {
  velocity = velocity !== undefined ? velocity : 1.0;
  var ctx  = ensureAudioContext();
  var t0   = startTime;
  var bus  = getChugpiMaster();

  // Crack layer
  var crackBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.018), ctx.sampleRate);
  var cd = crackBuf.getChannelData(0);
  for (var i = 0; i < cd.length; i++) {
    var env = Math.exp(-i / (cd.length * 0.25));
    cd[i] = (Math.random() * 2 - 1) * env;
  }
  var crack = ctx.createBufferSource();
  crack.buffer = crackBuf;
  var crackHp = ctx.createBiquadFilter();
  crackHp.type = 'highpass'; crackHp.frequency.value = 1800;
  var crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(1.1 * velocity, t0);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);
  crack.connect(crackHp); crackHp.connect(crackGain); crackGain.connect(bus);
  crack.start(t0);

  // Body layer
  var bodyBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.09), ctx.sampleRate);
  var bd = bodyBuf.getChannelData(0);
  for (var j = 0; j < bd.length; j++) {
    var benv = Math.exp(-j / (bd.length * 0.3));
    bd[j] = (Math.random() * 2 - 1) * benv;
  }
  var body = ctx.createBufferSource();
  body.buffer = bodyBuf;
  var bodyBp = ctx.createBiquadFilter();
  bodyBp.type = 'bandpass'; bodyBp.frequency.value = 700; bodyBp.Q.value = 1.2;
  var bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.7 * velocity, t0);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  body.connect(bodyBp); bodyBp.connect(bodyGain); bodyGain.connect(bus);
  body.start(t0);

  // Snap transient
  var snapOsc = ctx.createOscillator();
  snapOsc.type = 'triangle';
  snapOsc.frequency.setValueAtTime(900, t0);
  snapOsc.frequency.exponentialRampToValueAtTime(200, t0 + 0.025);
  var snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.45 * velocity, t0);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  snapOsc.connect(snapGain); snapGain.connect(bus);
  snapOsc.start(t0); snapOsc.stop(t0 + 0.045);

  // Mid resonance
  var midOsc = ctx.createOscillator();
  midOsc.type = 'sine';
  midOsc.frequency.value = 420;
  var midGain = ctx.createGain();
  midGain.gain.setValueAtTime(0.18 * velocity, t0 + 0.005);
  midGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  midOsc.connect(midGain); midGain.connect(bus);
  midOsc.start(t0 + 0.005); midOsc.stop(t0 + 0.2);
}

// ─── Unified play functions ───────────────────────────────────────

export function playBell(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playTempleBell(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

export function playBellHigh(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playTempleBellHigh(ctx.currentTime + timeSeconds); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

export function playChugpi(timeSeconds) {
  timeSeconds = timeSeconds || 0;
  var ctx = ensureAudioContext();
  function doPlay() { playChugpiNow(ctx.currentTime + timeSeconds, 1.0); }
  if (ctx.state === 'suspended') { ctx.resume().then(doPlay); } else { doPlay(); }
}

export function playSound(type, timeSeconds) {
  timeSeconds = timeSeconds || 0;
  if (type === 'none') return;
  if (type === 'chugpi')         playChugpi(timeSeconds);
  else if (type === 'bell-high') playBellHigh(timeSeconds);
  else                           playBell(timeSeconds);
}

export function playStrokes(type, count, startDelay) {
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

export function playSessionEnd(ctx, currentSound) {
  var now = ctx.currentTime;
  if (currentSound === 'chugpi') {
    getChugpiMaster();
    playChugpiNow(now + 0.15, 1.0);
    playChugpiNow(now + 1.65, 1.0);
    playChugpiNow(now + 3.15, 1.0);
  } else if (currentSound === 'bell-high') {
    playTempleBellHigh(now + 0.0, 0.55);
    playTempleBellHigh(now + 1.8, 0.55);
    playTempleBellHigh(now + 5.8, 1.0);
    playTempleBellHigh(now + 9.8, 1.0);
  } else {
    playTempleBell(now + 0.0, 0.55);
    playTempleBell(now + 1.8, 0.55);
    playTempleBell(now + 5.8, 1.0);
    playTempleBell(now + 9.8, 1.0);
  }
  setTimeout(stopSilentLoop, 13000);
}
