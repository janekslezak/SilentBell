// ─── Audio Engine Module ─────────────────────────────────────────
// Procedural sound generation via Web Audio API.
// Generates bell and percussion sounds mathematically — no MP3 files needed
// for the core experience. MP3s serve as fallback for older browsers.
//
// iOS Strategy:
//   1. Try Web Audio API (works on iOS 14.5+ with user gesture)
//   2. Fall back to ios-audio.js MP3-based system if Web Audio fails
//
// Bell synthesis: additive synthesis with inharmonic partials + exponential decay
// Chugpi synthesis: filtered noise burst + low-frequency impact

import { isIOS, supportsWebAudio } from './platform.js';

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[AudioEngine]', ...args); }

let ctx = null;
let masterGain = null;
let isUnlocked = false;

// ─── AudioContext Management ─────────────────────────────────────

export function getContext() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(ctx.destination);
    log('AudioContext created, state:', ctx.state);
  }
  return ctx;
}

export async function unlock() {
  if (isUnlocked && ctx?.state === 'running') return ctx;

  const context = getContext();

  // iOS: play a short audible sound to unlock the audio session
  if (isIOS) {
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.frequency.value = 440;
    g.gain.value = 0.001;
    osc.connect(g);
    g.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.01);
  }

  if (context.state === 'suspended' || context.state === 'interrupted') {
    await context.resume();
  }

  isUnlocked = context.state === 'running';
  log('Audio unlocked, state:', context.state);
  return context;
}

export function isAudioUnlocked() {
  return isUnlocked && ctx?.state === 'running';
}

export function closeContext() {
  if (ctx) {
    try { ctx.close(); } catch {}
    ctx = null;
    masterGain = null;
    isUnlocked = false;
  }
}

// ─── Bell Sound Synthesis ────────────────────────────────────────
// Models a struck metal bell using additive synthesis with
// inharmonic partials. Each partial has its own frequency,
// amplitude, and decay time to create a realistic metallic timbre.

const BELL_PARTIALS = {
  standard: [
    { freq: 1.0,   amp: 1.0,  decay: 4.0 },   // fundamental
    { freq: 2.0,   amp: 0.6,  decay: 3.0 },   // octave
    { freq: 3.0,   amp: 0.25, decay: 2.0 },   // twelfth
    { freq: 4.2,   amp: 0.15, decay: 1.5 },   // inharmonic
    { freq: 5.4,   amp: 0.08, decay: 1.2 },   // inharmonic
    { freq: 6.8,   amp: 0.04, decay: 0.8 },   // inharmonic
    { freq: 8.0,   amp: 0.02, decay: 0.5 },   // high shimmer
  ],
  high: [
    { freq: 1.0,   amp: 1.0,  decay: 3.5 },
    { freq: 2.0,   amp: 0.55, decay: 2.5 },
    { freq: 3.0,   amp: 0.2,  decay: 1.8 },
    { freq: 4.2,   amp: 0.12, decay: 1.3 },
    { freq: 5.4,   amp: 0.06, decay: 1.0 },
    { freq: 6.8,   amp: 0.03, decay: 0.6 },
    { freq: 8.5,   amp: 0.015, decay: 0.4 },
  ]
};

function playBellTone(context, destination, baseFreq, partials, when, duration, volume) {
  const outputGain = context.createGain();
  outputGain.gain.value = volume;
  outputGain.connect(destination);

  partials.forEach((p, i) => {
    const osc = context.createOscillator();
    const g = context.createGain();

    // Slight detune per partial for natural variation
    const detune = (Math.random() - 0.5) * 8;
    osc.frequency.value = baseFreq * p.freq;
    osc.detune.value = detune;

    // Use sine for lower partials, triangle for higher ones (adds metallic edge)
    osc.type = i < 2 ? 'sine' : 'triangle';

    const decay = Math.min(p.decay, duration);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(p.amp, when + 0.02 + i * 0.005); // slight staggered attack
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);

    osc.connect(g);
    g.connect(outputGain);

    osc.start(when);
    osc.stop(when + decay + 0.05);
  });

  // Low-frequency "thud" at strike
  const thudOsc = context.createOscillator();
  const thudGain = context.createGain();
  thudOsc.frequency.value = baseFreq * 0.5;
  thudOsc.type = 'sine';
  thudGain.gain.setValueAtTime(volume * 0.3, when);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
  thudOsc.connect(thudGain);
  thudGain.connect(outputGain);
  thudOsc.start(when);
  thudOsc.stop(when + 0.15);

  // Clean up output gain node
  setTimeout(() => {
    try { outputGain.disconnect(); } catch {}
  }, (duration + 0.5) * 1000);
}

// ─── Chugpi (Wood Block) Synthesis ──────────────────────────────
// Models a wooden percussion sound using filtered noise burst
// plus a low-frequency sinusoidal impact.

function playChugpiTone(context, destination, when, volume) {
  const outputGain = context.createGain();
  outputGain.gain.value = volume;
  outputGain.connect(destination);

  // Noise burst (body of the sound)
  const bufferSize = context.sampleRate * 0.15;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 800;
  bandpass.Q.value = 0.8;

  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.8, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(outputGain);

  noise.start(when);
  noise.stop(when + 0.15);

  // Low-frequency impact (the "wooden" thump)
  const impactOsc = context.createOscillator();
  const impactGain = context.createGain();
  impactOsc.frequency.setValueAtTime(180, when);
  impactOsc.frequency.exponentialRampToValueAtTime(80, when + 0.08);
  impactOsc.type = 'sine';
  impactGain.gain.setValueAtTime(volume * 0.5, when);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  impactOsc.connect(impactGain);
  impactGain.connect(outputGain);
  impactOsc.start(when);
  impactOsc.stop(when + 0.1);

  // High-frequency click (attack transient)
  const clickOsc = context.createOscillator();
  const clickGain = context.createGain();
  clickOsc.frequency.value = 3000;
  clickOsc.type = 'triangle';
  clickGain.gain.setValueAtTime(volume * 0.15, when);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.005);
  clickOsc.connect(clickGain);
  clickGain.connect(outputGain);
  clickOsc.start(when);
  clickOsc.stop(when + 0.01);

  setTimeout(() => {
    try { outputGain.disconnect(); } catch {}
  }, 300);
}

// ─── Public Sound API ────────────────────────────────────────────

export async function playStartBell(type = 'bell') {
  const context = await unlock();
  const when = context.currentTime;
  const partials = type === 'bell-high' ? BELL_PARTIALS.high : BELL_PARTIALS.standard;
  const freq = type === 'bell-high' ? 880 : 523; // E5 or C5
  playBellTone(context, masterGain, freq, partials, when, 5.0, 0.9);
  log('Start bell played:', type);
}

export async function playIntervalBell(type = 'bell') {
  const context = await unlock();
  const when = context.currentTime;
  const partials = type === 'bell-high' ? BELL_PARTIALS.high : BELL_PARTIALS.standard;
  const freq = type === 'bell-high' ? 880 : 523;
  playBellTone(context, masterGain, freq, partials, when, 3.5, 0.6);
  log('Interval bell played:', type);
}

export async function playEndBell(type = 'bell') {
  const context = await unlock();
  const when = context.currentTime;
  const partials = type === 'bell-high' ? BELL_PARTIALS.high : BELL_PARTIALS.standard;
  const freq = type === 'bell-high' ? 880 : 523;
  playBellTone(context, masterGain, freq, partials, when, 8.0, 1.0);
  log('End bell played:', type);
}

export async function playChugpi() {
  const context = await unlock();
  const when = context.currentTime;
  playChugpiTone(context, masterGain, when, 0.9);
  log('Chugpi played');
}

export async function playTestSound(type = 'bell') {
  if (type === 'chugpi') {
    await playChugpi();
  } else if (type !== 'none') {
    await playStartBell(type);
  }
}

export function stopAll() {
  if (!ctx) return;
  // Suspend context to immediately cut all sound
  try {
    ctx.suspend();
    // Resume after a brief moment so future sounds can play
    setTimeout(() => {
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }, 100);
  } catch {}
  log('All sounds stopped');
}

// ─── Capability Detection ────────────────────────────────────────

export function canUseWebAudio() {
  return supportsWebAudio();
}

// Check if Web Audio sounds good enough on this device.
// On some older iOS devices, the oscillators can sound thin.
// This can be used to decide MP3 vs procedural fallback.
export function preferProceduralAudio() {
  if (!supportsWebAudio()) return false;
  // iOS 14.5+ has good Web Audio support
  if (isIOS) {
    const ver = (() => {
      const m = navigator.userAgent.match(/OS (\d+)[_\.]?(\d+)?/);
      return m ? parseInt(m[1], 10) : 0;
    })();
    return ver >= 14;
  }
  // Android and desktop: Web Audio works well
  return true;
}
