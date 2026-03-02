// ─── Audio Context Module ─────────────────────────────────────────
// Simple, reliable audio context management with iOS-specific handling.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

let audioCtx = null;
let isUnlocked = false;

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
  log('Unlocking audio...');
  
  try {
    let ctx = getAudioContext();
    
    if (isContextBroken(ctx)) {
      ctx = createFreshAudioContext();
    }
    
    const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    await ctx.resume();
    
    startSilentLoop();
    
    isUnlocked = true;
    log('Audio unlocked, state:', ctx.state);
    
    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    
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
    isIOS
  };
}

if (isIOS) {
  log('iOS detected, setting up handlers');
  
  window.addEventListener('pagehide', () => {
    log('Page hide - audio context state:', audioCtx?.state);
  });
  
  window.addEventListener('pageshow', () => {
    log('Page show - audio context state:', audioCtx?.state);
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  });
  
  window.addEventListener('blur', () => {
    log('Window blur - maintaining audio session');
  });
  
  window.addEventListener('focus', () => {
    log('Window focus - checking audio session');
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  });
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
