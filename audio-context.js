// ─── Audio Context Module ─────────────────────────────────────────
// Simple, reliable audio context management with iOS-specific handling.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

let audioCtx = null;
let isUnlocked = false;
let unlockPromise = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[AudioContext]', ...args);
}

export function createFreshAudioContext() {
  if (audioCtx) {
    try { 
      audioCtx.close(); 
    } catch(e) {}
  }
  
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioCtx();
  isUnlocked = false;
  
  log('Created fresh AudioContext');
  return audioCtx;
}

export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    log('Created AudioContext, state:', audioCtx.state);
  }
  return audioCtx;
}

export function isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

export async function ensureAudioContext() {
  let ctx = getAudioContext();
  
  if (isContextBroken(ctx)) {
    log('AudioContext broken, creating new one');
    ctx = createFreshAudioContext();
  }
  
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    try {
      log('Resuming AudioContext...');
      await ctx.resume();
      log('AudioContext resumed, state:', ctx.state);
    } catch (e) {
      log('AudioContext resume failed:', e.message);
    }
  }
  
  return ctx;
}

export async function unlockAudio() {
  // If already unlocking, return existing promise
  if (unlockPromise) {
    log('Audio unlock already in progress, waiting...');
    return unlockPromise;
  }
  
  // If already unlocked and running, just return
  if (isUnlocked && audioCtx && audioCtx.state === 'running') {
    log('Audio already unlocked and running');
    return audioCtx;
  }
  
  unlockPromise = _doUnlockAudio();
  
  try {
    const result = await unlockPromise;
    return result;
  } finally {
    unlockPromise = null;
  }
}

async function _doUnlockAudio() {
  log('Unlocking audio...');
  
  try {
    let ctx = getAudioContext();
    
    if (isContextBroken(ctx)) {
      ctx = createFreshAudioContext();
    }
    
    // iOS-specific: Play a short silent sound to unlock
    if (isIOS) {
      log('iOS: Playing unlock sound...');
      
      // Create a short beep to unlock audio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = 1; // Very low frequency (almost silent)
      gain.gain.value = 0.001; // Very quiet
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.001);
      
      // Also try with a buffer source for redundancy
      const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } else {
      // Non-iOS: simpler approach
      const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    
    await ctx.resume();
    
    // Wait a moment for iOS to process
    if (isIOS) {
      await new Promise(r => setTimeout(r, 50));
    }
    
    startSilentLoop();
    
    isUnlocked = true;
    log('Audio unlocked, state:', ctx.state);
    
    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    
    // Fallback: try creating a fresh context
    try {
      const ctx = createFreshAudioContext();
      await ctx.resume();
      startSilentLoop();
      
      isUnlocked = true;
      log('Audio unlocked (fallback), state:', ctx.state);
      return ctx;
    } catch (e2) {
      log('unlockAudio fallback failed:', e2.message);
      throw e2;
    }
  }
}

export function resetAudioContext() {
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
  }
  audioCtx = null;
  isUnlocked = false;
  log('AudioContext reset');
}

export function isAudioUnlocked() {
  return isUnlocked && audioCtx && audioCtx.state === 'running';
}

export function getAudioContextState() {
  return {
    state: audioCtx?.state || 'none',
    isUnlocked,
    isIOS,
    isUnlocking: !!unlockPromise
  };
}

// iOS-specific handlers
if (isIOS) {
  log('iOS detected, setting up audio handlers');
  
  window.addEventListener('pagehide', () => {
    log('Page hide - audio context state:', audioCtx?.state);
  });
  
  window.addEventListener('pageshow', async () => {
    log('Page show - audio context state:', audioCtx?.state);
    if (audioCtx?.state === 'suspended') {
      try {
        await audioCtx.resume();
        log('AudioContext resumed on pageshow');
      } catch (e) {
        log('Failed to resume on pageshow:', e.message);
      }
    }
  });
  
  window.addEventListener('blur', () => {
    log('Window blur - maintaining audio session');
  });
  
  window.addEventListener('focus', async () => {
    log('Window focus - checking audio session');
    if (audioCtx?.state === 'suspended') {
      try {
        await audioCtx.resume();
        log('AudioContext resumed on focus');
      } catch (e) {
        log('Failed to resume on focus:', e.message);
      }
    }
  });
  
  // Handle audio session interruptions (phone calls, etc.)
  if (audioCtx) {
    audioCtx.onstatechange = () => {
      log('AudioContext state changed to:', audioCtx?.state);
    };
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  
  log('Visibility changed to visible');
  
  if (!audioCtx) return;
  
  if (isContextBroken(audioCtx)) {
    log('AudioContext broken on visibility change, recreating...');
    createFreshAudioContext();
  } else if (audioCtx.state === 'suspended') {
    log('Resuming AudioContext on visibility change...');
    audioCtx.resume().catch(() => {});
  }
});

window.addEventListener('beforeunload', () => {
  stopSilentLoop();
});
