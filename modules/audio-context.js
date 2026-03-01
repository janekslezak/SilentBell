// ─── Audio Context Module ─────────────────────────────────────────
// Simple, reliable audio context management with iOS-specific handling.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';
import { startAudioKeepalive, stopAudioKeepalive, setupVisibilityHandler } from './wakelock.js';

let audioCtx = null;
let isUnlocked = false;

// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Debug logging
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[AudioContext]', ...args);
}

// Create a fresh audio context
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

// Get or create audio context
export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    log('Created AudioContext, state:', audioCtx.state);
  }
  return audioCtx;
}

// Check if context is broken (interrupted or closed)
export function isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

// Ensure audio context is ready (resumed if suspended)
export async function ensureAudioContext() {
  let ctx = getAudioContext();
  
  // If context is broken, create a new one
  if (isContextBroken(ctx)) {
    log('AudioContext broken, creating new one');
    ctx = createFreshAudioContext();
  }
  
  // Resume if suspended
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

// Unlock audio (must be called from user interaction)
export async function unlockAudio() {
  log('Unlocking audio...');
  
  try {
    let ctx = getAudioContext();
    
    // If context is broken, create fresh
    if (isContextBroken(ctx)) {
      ctx = createFreshAudioContext();
    }
    
    // Create and play a silent buffer to unlock (required for iOS)
    const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    // Resume the context
    await ctx.resume();
    
    // Start silent loop for iOS audio session persistence
    startSilentLoop();
    
    // Start audio keepalive for iOS (monitors and maintains audio context)
    if (isIOS) {
      startAudioKeepalive(ctx);
    }
    
    isUnlocked = true;
    log('Audio unlocked, state:', ctx.state);
    
    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    
    // Try creating a fresh context as fallback
    try {
      const ctx = createFreshAudioContext();
      await ctx.resume();
      startSilentLoop();
      
      if (isIOS) {
        startAudioKeepalive(ctx);
      }
      
      isUnlocked = true;
      log('Audio unlocked (fallback), state:', ctx.state);
      return ctx;
    } catch (e2) {
      log('unlockAudio fallback failed:', e2.message);
      throw e2;
    }
  }
}

// Reset audio context
export function resetAudioContext() {
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
  }
  audioCtx = null;
  isUnlocked = false;
  stopAudioKeepalive();
  log('AudioContext reset');
}

// Check if audio is unlocked and running
export function isAudioUnlocked() {
  return isUnlocked && audioCtx && audioCtx.state === 'running';
}

// Get current audio context state
export function getAudioContextState() {
  return {
    state: audioCtx?.state || 'none',
    isUnlocked,
    isIOS
  };
}

// ─── iOS-Specific Handling ───────────────────────────────────────

if (isIOS) {
  log('iOS detected, setting up handlers');
  
  // Setup visibility handler for iOS
  setupVisibilityHandler(audioCtx);
  
  // Handle page lifecycle events
  window.addEventListener('pagehide', () => {
    log('Page hide - audio context state:', audioCtx?.state);
  });
  
  window.addEventListener('pageshow', () => {
    log('Page show - audio context state:', audioCtx?.state);
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  });
  
  // Handle focus/blur for iOS
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

// ─── Visibility Recovery ─────────────────────────────────────────

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

// ─── Before Unload Cleanup ───────────────────────────────────────

window.addEventListener('beforeunload', () => {
  stopAudioKeepalive();
  stopSilentLoop();
});
