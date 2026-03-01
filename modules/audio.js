// ─── Audio Engine Module ─────────────────────────────────────────
// Synthesized meditation sounds with error handling.

import { 
  getAudioContext, 
  ensureAudioContext,
  unlockAudio 
} from './audio-context.js';

// Re-export for convenience
export { getAudioContext, ensureAudioContext, unlockAudio } from './audio-context.js';

let chugpiMaster = null;

// Get or create Chugpi master compressor
export function getChugpiMaster() {
  const ctx = getAudioContext();
  if (!chugpiMaster) {
    chugpiMaster = ctx.createDynamicsCompressor();
    chugpiMaster.threshold.value = -10; 
    chugpiMaster.knee.value = 8;
    chugpiMaster.ratio.value = 2.5; 
    chugpiMaster.attack.value = 0.001;
    chugpiMaster.release.value = 0.15;
    chugpiMaster.connect(ctx.destination);
    
    // Prime the audio graph
    const primeBuf = ctx.createBuffer(1, 2048, ctx.sampleRate);
    const primeSrc = ctx.createBufferSource();
    primeSrc.buffer = primeBuf; 
    primeSrc.connect(chugpiMaster); 
    primeSrc.start(0);
  }
  return chugpiMaster;
}

export function resetChugpiMaster() {
  chugpiMaster = null;
}

// ─── Temple Bell Synthesizer ──────────────────────────────────────

export function playTempleBell(startTime, velocity = 1.0) {
  const ctx = getAudioContext();
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.02; 
  master.release.value = 0.5;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 6000; 
  lpf.Q.value = 0.5;
  
  const tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 10.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 17.0);
  
  master.connect(lpf); 
  lpf.connect(tailFade); 
  tailFade.connect(ctx.destination);
  
  // Clank
  const clankSize = Math.floor(ctx.sampleRate * 0.04);
  const clankBuf = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  const clankData = clankBuf.getChannelData(0);
  for (let i = 0; i < clankSize; i++) {
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  }
  
  const clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  
  const clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; 
  clankBp.frequency.value = 4000; 
  clankBp.Q.value = 0.5;
  
  const clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.004);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  
  clankSrc.connect(clankBp); 
  clankBp.connect(clankGain); 
  clankGain.connect(master);
  clankSrc.start(t0); 
  clankSrc.stop(t0 + 0.08);
  
  // Partials
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master);
    osc.start(t0); 
    osc.stop(t0 + decayTime + 2.0);
  }
  
  addPartial(110,  0.32, 0.015, 16.0);
  addPartial(304,  0.22, 0.010, 11.0);
  addPartial(594,  0.14, 0.008,  8.0);
  addPartial(982,  0.08, 0.005,  5.5);
  addPartial(1627, 0.04, 0.004,  3.5);
  
  // Shimmer
  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; 
  shimmerLfo.frequency.value = 4.5;
  const shimmerDepth = ctx.createGain(); 
  shimmerDepth.gain.value = 0.02;
  const shimmerFund = ctx.createOscillator();
  shimmerFund.type = 'sine'; 
  shimmerFund.frequency.value = 110;
  const shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.08);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  shimmerLfo.connect(shimmerDepth); 
  shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); 
  shimmerEnv.connect(master);
  shimmerLfo.start(t0); 
  shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 16.0); 
  shimmerFund.stop(t0 + 16.0);
}

// ─── Temple Bell — Higher Pitch ───────────────────────────────────

export function playTempleBellHigh(startTime, velocity = 1.0) {
  const ctx = getAudioContext();
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.02; 
  master.release.value = 0.5;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 7000; 
  lpf.Q.value = 0.5;
  
  const tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 8.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  
  master.connect(lpf); 
  lpf.connect(tailFade); 
  tailFade.connect(ctx.destination);
  
  // Clank
  const clankSize = Math.floor(ctx.sampleRate * 0.035);
  const clankBuf = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  const clankData = clankBuf.getChannelData(0);
  for (let i = 0; i < clankSize; i++) {
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  }
  
  const clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  
  const clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; 
  clankBp.frequency.value = 5500; 
  clankBp.Q.value = 0.5;
  
  const clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.003);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  
  clankSrc.connect(clankBp); 
  clankBp.connect(clankGain); 
  clankGain.connect(master);
  clankSrc.start(t0); 
  clankSrc.stop(t0 + 0.07);
  
  // Partials
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master);
    osc.start(t0); 
    osc.stop(t0 + decayTime + 2.0);
  }
  
  addPartial(165,  0.32, 0.012, 12.0);
  addPartial(456,  0.22, 0.008,  8.5);
  addPartial(891,  0.14, 0.006,  6.0);
  addPartial(1473, 0.08, 0.004,  4.0);
  addPartial(2440, 0.04, 0.003,  2.5);
  
  // Shimmer
  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; 
  shimmerLfo.frequency.value = 5.5;
  const shimmerDepth = ctx.createGain(); 
  shimmerDepth.gain.value = 0.02;
  const shimmerFund = ctx.createOscillator();
  shimmerFund.type = 'sine'; 
  shimmerFund.frequency.value = 165;
  const shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.07);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 11.0);
  shimmerLfo.connect(shimmerDepth); 
  shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); 
  shimmerEnv.connect(master);
  shimmerLfo.start(t0); 
  shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 13.0); 
  shimmerFund.stop(t0 + 13.0);
}

// ─── Singing Bowl Edge (standard pitch) ──────────────────────────

export function playSingingBowlEdge(startTime) {
  const ctx = getAudioContext(); 
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.05; 
  master.release.value = 0.6;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 5000; 
  lpf.Q.value = 0.5;
  
  master.connect(lpf); 
  lpf.connect(ctx.destination);
  
  // Noise
  const noiseSize = Math.floor(ctx.sampleRate * 0.8);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  
  const noiseSrc = ctx.createBufferSource(); 
  noiseSrc.buffer = noiseBuf;
  const bp1 = ctx.createBiquadFilter(); 
  bp1.type = 'bandpass'; 
  bp1.frequency.value = 220; 
  bp1.Q.value = 8.0;
  const bp2 = ctx.createBiquadFilter(); 
  bp2.type = 'bandpass'; 
  bp2.frequency.value = 220; 
  bp2.Q.value = 8.0;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.5);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.7);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.85);
  
  noiseSrc.connect(bp1); 
  bp1.connect(bp2); 
  bp2.connect(noiseGain); 
  noiseGain.connect(master);
  noiseSrc.start(t0); 
  noiseSrc.stop(t0 + 0.9);
  
  // Partials
  function addEdgePartial(freq, gainPeak, decayTime) {
    const osc = ctx.createOscillator(); 
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); 
    env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.35);
    env.gain.setValueAtTime(gainPeak, t0 + 0.55); 
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master); 
    osc.start(t0); 
    osc.stop(t0 + decayTime + 1.5);
  }
  
  addEdgePartial(110, 0.07, 5.5); 
  addEdgePartial(304, 0.04, 3.5); 
  addEdgePartial(594, 0.02, 2.0);
}

// ─── Singing Bowl Edge (higher pitch) ────────────────────────────

export function playSingingBowlEdgeHigh(startTime) {
  const ctx = getAudioContext(); 
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.05; 
  master.release.value = 0.6;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 6000; 
  lpf.Q.value = 0.5;
  
  master.connect(lpf); 
  lpf.connect(ctx.destination);
  
  // Noise
  const noiseSize = Math.floor(ctx.sampleRate * 0.8);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  
  const noiseSrc = ctx.createBufferSource(); 
  noiseSrc.buffer = noiseBuf;
  const bp1 = ctx.createBiquadFilter(); 
  bp1.type = 'bandpass'; 
  bp1.frequency.value = 330; 
  bp1.Q.value = 8.0;
  const bp2 = ctx.createBiquadFilter(); 
  bp2.type = 'bandpass'; 
  bp2.frequency.value = 330; 
  bp2.Q.value = 8.0;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.45);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.65);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.80);
  
  noiseSrc.connect(bp1); 
  bp1.connect(bp2); 
  bp2.connect(noiseGain); 
  noiseGain.connect(master);
  noiseSrc.start(t0); 
  noiseSrc.stop(t0 + 0.85);
  
  // Partials
  function addEdgePartial(freq, gainPeak, decayTime) {
    const osc = ctx.createOscillator(); 
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); 
    env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.30);
    env.gain.setValueAtTime(gainPeak, t0 + 0.50); 
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master); 
    osc.start(t0); 
    osc.stop(t0 + decayTime + 1.5);
  }
  
  addEdgePartial(165, 0.07, 4.5); 
  addEdgePartial(456, 0.04, 2.8); 
  addEdgePartial(891, 0.02, 1.6);
}

// ─── Chugpi (죽비) Synthesizer ────────────────────────────────────

export function playChugpiNow(startTime, velocity = 1.0) {
  const ctx = getAudioContext(); 
  const master = getChugpiMaster();
  const now = startTime ?? ctx.currentTime; 
  const v = velocity;
  
  // Snap
  const snapSize = Math.floor(ctx.sampleRate * 0.015);
  const snapBuf = ctx.createBuffer(1, snapSize, ctx.sampleRate);
  const snapData = snapBuf.getChannelData(0);
  for (let i = 0; i < snapSize; i++) {
    snapData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapSize, 2.5);
  }
  
  const snapSrc = ctx.createBufferSource(); 
  snapSrc.buffer = snapBuf;
  const snapBpHi = ctx.createBiquadFilter();
  snapBpHi.type = 'bandpass'; 
  snapBpHi.frequency.value = 2400; 
  snapBpHi.Q.value = 1.2;
  const snapBpMid = ctx.createBiquadFilter();
  snapBpMid.type = 'bandpass'; 
  snapBpMid.frequency.value = 1400; 
  snapBpMid.Q.value = 0.9;
  const snapGainHi = ctx.createGain(); 
  snapGainHi.gain.value = 0.6;
  const snapGainMid = ctx.createGain(); 
  snapGainMid.gain.value = 0.4;
  const snapEnv = ctx.createGain();
  snapEnv.gain.setValueAtTime(0.0, now);
  snapEnv.gain.linearRampToValueAtTime(2.8 * v, now + 0.001);
  snapEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
  
  snapSrc.connect(snapBpHi);  
  snapBpHi.connect(snapGainHi);   
  snapGainHi.connect(snapEnv);
  snapSrc.connect(snapBpMid); 
  snapBpMid.connect(snapGainMid); 
  snapGainMid.connect(snapEnv);
  snapEnv.connect(master); 
  snapSrc.start(now); 
  snapSrc.stop(now + 0.018);
  
  // Flesh
  const flesSize = Math.floor(ctx.sampleRate * 0.08);
  const flesBuf = ctx.createBuffer(1, flesSize, ctx.sampleRate);
  const flesData = flesBuf.getChannelData(0);
  for (let j = 0; j < flesSize; j++) {
    flesData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / flesSize, 1.6);
  }
  
  const flesSrc = ctx.createBufferSource(); 
  flesSrc.buffer = flesBuf;
  const flesBpLo = ctx.createBiquadFilter();
  flesBpLo.type = 'bandpass'; 
  flesBpLo.frequency.value = 500;  
  flesBpLo.Q.value = 0.9;
  const flesBpMid = ctx.createBiquadFilter();
  flesBpMid.type = 'bandpass'; 
  flesBpMid.frequency.value = 950; 
  flesBpMid.Q.value = 0.8;
  const flesBpHi = ctx.createBiquadFilter();
  flesBpHi.type = 'bandpass'; 
  flesBpHi.frequency.value = 1600; 
  flesBpHi.Q.value = 1.0;
  const flesGLo = ctx.createGain(); 
  flesGLo.gain.value = 0.40;
  const flesGMid = ctx.createGain(); 
  flesGMid.gain.value = 0.40;
  const flesGHi = ctx.createGain(); 
  flesGHi.gain.value = 0.20;
  const flesEnv = ctx.createGain();
  flesEnv.gain.setValueAtTime(0.0, now);
  flesEnv.gain.linearRampToValueAtTime(4.8 * v, now + 0.003);
  flesEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
  
  flesSrc.connect(flesBpLo);  
  flesBpLo.connect(flesGLo);   
  flesGLo.connect(flesEnv);
  flesSrc.connect(flesBpMid); 
  flesBpMid.connect(flesGMid); 
  flesGMid.connect(flesEnv);
  flesSrc.connect(flesBpHi);  
  flesBpHi.connect(flesGHi);   
  flesGHi.connect(flesEnv);
  flesEnv.connect(master); 
  flesSrc.start(now); 
  flesSrc.stop(now + 0.09);
  
  // Palm
  const palmOsc = ctx.createOscillator(); 
  palmOsc.type = 'sine';
  palmOsc.frequency.setValueAtTime(200, now);
  palmOsc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
  const palmEnv = ctx.createGain();
  palmEnv.gain.setValueAtTime(0.0, now);
  palmEnv.gain.linearRampToValueAtTime(0.35 * v, now + 0.004);
  palmEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  palmOsc.connect(palmEnv); 
  palmEnv.connect(master);
  palmOsc.start(now); 
  palmOsc.stop(now + 0.09);
  
  // Thud
  const thudSize = Math.floor(ctx.sampleRate * 0.055);
  const thudBuf = ctx.createBuffer(1, thudSize, ctx.sampleRate);
  const thudData = thudBuf.getChannelData(0);
  for (let k = 0; k < thudSize; k++) {
    thudData[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / thudSize, 2.5);
  }
  
  const thudSrc = ctx.createBufferSource(); 
  thudSrc.buffer = thudBuf;
  const thudLp = ctx.createBiquadFilter();
  thudLp.type = 'lowpass'; 
  thudLp.frequency.value = 280; 
  thudLp.Q.value = 1.0;
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.0, now);
  thudGain.gain.linearRampToValueAtTime(2.2 * v, now + 0.004);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  
  thudSrc.connect(thudLp); 
  thudLp.connect(thudGain); 
  thudGain.connect(master);
  thudSrc.start(now); 
  thudSrc.stop(now + 0.06);
}

// ─── Unified play functions ───────────────────────────────────────

export function playBell(timeSeconds = 0) {
  const ctx = getAudioContext();
  
  function doPlay() { 
    playTempleBell(ctx.currentTime + timeSeconds); 
  }
  
  if (ctx.state === 'suspended') { 
    ctx.resume().then(doPlay).catch(() => doPlay()); 
  } else { 
    doPlay(); 
  }
}

export function playBellHigh(timeSeconds = 0) {
  const ctx = getAudioContext();
  
  function doPlay() { 
    playTempleBellHigh(ctx.currentTime + timeSeconds); 
  }
  
  if (ctx.state === 'suspended') { 
    ctx.resume().then(doPlay).catch(() => doPlay()); 
  } else { 
    doPlay(); 
  }
}

export function playChugpi(timeSeconds = 0) {
  const ctx = getAudioContext();
  
  function doPlay() { 
    playChugpiNow(ctx.currentTime + timeSeconds); 
  }
  
  if (ctx.state === 'suspended') { 
    ctx.resume().then(doPlay).catch(() => doPlay()); 
  } else { 
    doPlay(); 
  }
}

export function playSound(type, timeSeconds = 0) {
  if (type === 'none') return;
  
  if (type === 'chugpi') {
    playChugpi(timeSeconds);
  } else if (type === 'bell-high') {
    playBellHigh(timeSeconds);
  } else {
    playBell(timeSeconds);
  }
}

export function playStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  
  const interval = type === 'chugpi' ? 1.5 : 1.4;
  
  if (type === 'chugpi') {
    const ctx = getAudioContext(); 
    getChugpiMaster();
    const leadIn = 0.15;
    
    for (let i = 0; i < count; i++) {
      const delay = leadIn + startDelay + i * interval;
      
      function doPlay() { 
        playChugpiNow(ctx.currentTime + delay, 1.0); 
      }
      
      if (ctx.state === 'suspended') { 
        ctx.resume().then(doPlay).catch(() => doPlay()); 
      } else { 
        doPlay(); 
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      playSound(type, startDelay + i * interval);
    }
  }
}
