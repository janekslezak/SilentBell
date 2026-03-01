// ─── Audio Context Module ─────────────────────────────────────────
// Simple, reliable audio context management with proper unlocking.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

let audioCtx = null;
let isUnlocked = false;

// Create a fresh audio context
export function createFreshAudioContext() {
  if (audioCtx) {
    try { audioCtx.close(); } catch(e) {}
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioCtx();
  isUnlocked = false;
  return audioCtx;
}

// Get or create audio context
export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

// Check if context is broken
export function isContextBroken(ctx) {
  return ctx.state === 'interrupted' || ctx.state === 'closed';
}

// Ensure audio context is ready (resumed if suspended)
export async function ensureAudioContext() {
  const ctx = getAudioContext();
  
  // If context is broken, create a new one
  if (isContextBroken(ctx)) {
    audioCtx = createFreshAudioContext();
  }
  
  // Resume if suspended
  if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
    try {
      await audioCtx.resume();
      isUnlocked = true;
    } catch (e) {
      console.warn('Audio context resume failed:', e);
    }
  }
  
  return audioCtx;
}

// Unlock audio (must be called from user interaction)
export async function unlockAudio() {
  try {
    const ctx = getAudioContext();
    
    // Create and play a silent buffer to unlock
    const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    // Resume the context
    await ctx.resume();
    
    // Start silent loop for iOS
    startSilentLoop();
    
    isUnlocked = true;
    console.log('Audio unlocked, state:', ctx.state);
    
    return ctx;
  } catch (e) {
    console.warn('unlockAudio error:', e);
    // Try creating a fresh context
    try {
      const ctx = createFreshAudioContext();
      await ctx.resume();
      startSilentLoop();
      isUnlocked = true;
      return ctx;
    } catch (e2) {
      console.warn('unlockAudio retry failed:', e2);
      throw e2;
    }
  }
}

// Reset audio context
export function resetAudioContext() {
  audioCtx = null;
  isUnlocked = false;
}

// Check if audio is unlocked
export function isAudioUnlocked() {
  return isUnlocked && audioCtx && audioCtx.state === 'running';
}

// ─── Visibility / focus recovery ─────────────────────────────────

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx = null;
  }
});

window.addEventListener('focus', () => {
  if (!audioCtx) return;
  if (isContextBroken(audioCtx)) {
    audioCtx = null;
  }
});
