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

