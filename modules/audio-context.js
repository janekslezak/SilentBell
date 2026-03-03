// ─── Audio Context Module ─────────────────────────────────────────
// Simple, reliable audio context management with iOS-specific handling.

let audioCtx = null;
let isUnlocked = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[AudioContext]', ...args);
}

export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    log('Created AudioContext, state:', audioCtx.state);
  }
  return audioCtx;
}

export async function unlockAudio() {
  if (isUnlocked && audioCtx?.state === 'running') {
    log('Audio already unlocked');
    return audioCtx;
  }

  log('Unlocking audio...');
  
  try {
    const ctx = getAudioContext();
    
    // iOS: Play a short silent sound to unlock
    if (isIOS) {
      const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      log('Played silent unlock sound');
    }
    
    // Resume the context
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      await ctx.resume();
      log('AudioContext resumed, state:', ctx.state);
    }
    
    isUnlocked = true;
    log('Audio unlocked successfully');
    
    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    throw e;
  }
}

export function isAudioUnlocked() {
  return isUnlocked && audioCtx?.state === 'running';
}

// Handle visibility changes
if (isIOS) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      log('Page visible, resuming AudioContext...');
      audioCtx.resume().catch(() => {});
    }
  });
}
