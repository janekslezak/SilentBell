// ─── Audio Context Module ─────────────────────────────────────────

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

let audioCtx = null;

export function createFreshAudioContext() {
  if (audioCtx) {
    try { audioCtx.close(); } catch(e) {}
  }
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioCtx();
  return audioCtx;
}

export function getAudioContext() {
  if (!audioCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

export function isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

export function ensureAudioContext() {
  var ctx = getAudioContext();
  if (isContextBroken(ctx)) {
    ctx = createFreshAudioContext();
  }
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    ctx.resume().catch(function(e) { console.warn('ctx.resume():', e); });
  }
  return ctx;
}

export function resetAudioContext() {
  audioCtx = null;
}

// ─── Visibility / focus recovery ─────────────────────────────────

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx = null;
  }
});

window.addEventListener('focus', function() {
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx = null;
  }
});

// ─── Audio Unlock ─────────────────────────────────────────────────

export function unlockAudio() {
  try {
    var ctx = ensureAudioContext();
    var buf = ctx.createBuffer(1, 512, ctx.sampleRate);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    startSilentLoop();
  } catch(e) {
    console.warn('unlockAudio:', e);
    audioCtx = null;
    try {
      ensureAudioContext();
      startSilentLoop();
    } catch(e2) { console.warn('unlockAudio retry:', e2); }
  }
}
