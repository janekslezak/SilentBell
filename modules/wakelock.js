// ─── Wake Lock Module ────────────────────────────────────────────
// Comprehensive screen wake lock for iOS, Android, and all browsers.
// Uses multiple fallback strategies to ensure audio continues playing.

import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

// Wake lock state
let nativeWakeLock = null;
let noSleepInstance = null;
let videoElement = null;
let isActive = false;
let currentMethod = null;

// Platform detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor) && !/Chrome/.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

// Debug logging
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[WakeLock]', ...args);
}

// ─── Native Wake Lock API ────────────────────────────────────────

async function acquireNativeWakeLock() {
  if (!('wakeLock' in navigator)) {
    throw new Error('Native Wake Lock API not supported');
  }
  
  try {
    nativeWakeLock = await navigator.wakeLock.request('screen');
    
    nativeWakeLock.addEventListener('release', () => {
      log('Native wake lock released');
      nativeWakeLock = null;
      
      // Auto-reacquire if still needed and visible
      if (isActive && document.visibilityState === 'visible') {
        log('Auto-reacquiring wake lock...');
        setTimeout(() => acquireWakeLock(), 100);
      }
    });
    
    log('Native wake lock acquired');
    return true;
  } catch (err) {
    log('Native wake lock failed:', err.message);
    throw err;
  }
}

// ─── NoSleep.js Fallback ─────────────────────────────────────────

async function acquireNoSleepWakeLock() {
  if (typeof window.NoSleep === 'undefined') {
    throw new Error('NoSleep.js not available');
  }
  
  try {
    if (!noSleepInstance) {
      noSleepInstance = new window.NoSleep();
    }
    
    await noSleepInstance.enable();
    log('NoSleep.js wake lock acquired');
    return true;
  } catch (err) {
    log('NoSleep.js failed:', err.message);
    throw err;
  }
}

// ─── Video Element Fallback (iOS-specific) ───────────────────────

async function acquireVideoWakeLock() {
  try {
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('loop', '');
      videoElement.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
      
      // Use a minimal silent WebM video
      const webmBlob = new Blob([
        new Uint8Array([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81,
          0x01, 0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84,
          0x77, 0x65, 0x62, 0x6D, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02])
      ], { type: 'video/webm' });
      
      videoElement.src = URL.createObjectURL(webmBlob);
      document.body.appendChild(videoElement);
    }
    
    // iOS requires user interaction to play video
    videoElement.muted = true;
    videoElement.volume = 0;
    
    await videoElement.play();
    log('Video wake lock acquired');
    return true;
  } catch (err) {
    log('Video wake lock failed:', err.message);
    throw err;
  }
}

// ─── Main Wake Lock API ──────────────────────────────────────────

export async function acquireWakeLock() {
  if (isActive) {
    log('Wake lock already active');
    return currentMethod;
  }
  
  isActive = true;
  
  // Start silent loop for audio continuity (critical for iOS)
  startSilentLoop();
  
  // Try methods in order of preference
  const methods = [
    { name: 'native', fn: acquireNativeWakeLock },
    { name: 'nosleep', fn: acquireNoSleepWakeLock },
    { name: 'video', fn: acquireVideoWakeLock }
  ];
  
  for (const method of methods) {
    try {
      await method.fn();
      currentMethod = method.name;
      log('Using method:', method.name);
      return method.name;
    } catch (err) {
      log(method.name, 'failed, trying next...');
    }
  }
  
  // All methods failed, but we still have silent loop
  log('All wake lock methods failed, using silent loop only');
  currentMethod = 'audio-only';
  return 'audio-only';
}

export async function releaseWakeLock() {
  isActive = false;
  currentMethod = null;
  
  // Stop silent loop
  stopSilentLoop();
  
  // Release native wake lock
  if (nativeWakeLock) {
    try {
      await nativeWakeLock.release();
      log('Native wake lock released');
    } catch (err) {
      log('Error releasing native wake lock:', err.message);
    }
    nativeWakeLock = null;
  }
  
  // Disable NoSleep.js
  if (noSleepInstance) {
    try {
      noSleepInstance.disable();
      log('NoSleep.js disabled');
    } catch (err) {
      log('Error disabling NoSleep.js:', err.message);
    }
    noSleepInstance = null;
  }
  
  // Stop video
  if (videoElement) {
    try {
      videoElement.pause();
      videoElement.currentTime = 0;
      log('Video wake lock stopped');
    } catch (err) {
      log('Error stopping video:', err.message);
    }
  }
}

export function isWakeLockActive() {
  return isActive;
}

export function getWakeLockMethod() {
  return currentMethod;
}

// ─── iOS-Specific Audio Keepalive ────────────────────────────────

// iOS suspends AudioContext when screen locks - we need to keep it alive
let audioKeepaliveInterval = null;
let lastAudioContextState = null;

export function startAudioKeepalive(audioContext) {
  if (audioKeepaliveInterval) {
    clearInterval(audioKeepaliveInterval);
  }
  
  // Monitor and maintain audio context state
  audioKeepaliveInterval = setInterval(() => {
    if (!audioContext) return;
    
    const state = audioContext.state;
    
    if (state !== lastAudioContextState) {
      log('AudioContext state changed:', lastAudioContextState, '->', state);
      lastAudioContextState = state;
    }
    
    // Try to resume if suspended
    if (state === 'suspended') {
      log('Attempting to resume AudioContext...');
      audioContext.resume().catch(() => {});
    }
    
    // Play a silent buffer to keep audio session alive
    try {
      const buffer = audioContext.createBuffer(1, 128, audioContext.sampleRate);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (e) {}
    
  }, 1000); // Check every second
  
  log('Audio keepalive started');
}

export function stopAudioKeepalive() {
  if (audioKeepaliveInterval) {
    clearInterval(audioKeepaliveInterval);
    audioKeepaliveInterval = null;
    log('Audio keepalive stopped');
  }
}

// ─── Visibility Change Handler ───────────────────────────────────

// iOS often releases wake lock when visibility changes
export function setupVisibilityHandler(audioContext) {
  document.addEventListener('visibilitychange', async () => {
    log('Visibility changed:', document.visibilityState);
    
    if (document.visibilityState === 'visible') {
      // Page became visible - reacquire if needed
      if (isActive && !nativeWakeLock && !noSleepInstance) {
        log('Reacquiring wake lock after visibility change...');
        await acquireWakeLock();
      }
      
      // Resume audio context if suspended
      if (audioContext && audioContext.state === 'suspended') {
        log('Resuming AudioContext after visibility change...');
        audioContext.resume().catch(() => {});
      }
    }
  });
}

// ─── iOS Standalone Mode Check ───────────────────────────────────

export function isIOSStandalone() {
  return isIOS && isStandalone;
}

// iOS in standalone mode (added to home screen) has different behavior
export function setupIOSStandaloneHandler() {
  if (!isIOSStandalone()) return;
  
  log('iOS standalone mode detected');
  
  // iOS standalone apps have better audio persistence
  // but still need the silent loop
  window.addEventListener('pagehide', () => {
    log('Page hide event - maintaining audio session');
  });
  
  window.addEventListener('pageshow', () => {
    log('Page show event - checking audio session');
  });
}

// ─── Cleanup ─────────────────────────────────────────────────────

export function cleanupWakeLock() {
  releaseWakeLock();
  stopAudioKeepalive();
  
  if (videoElement) {
    try {
      URL.revokeObjectURL(videoElement.src);
      videoElement.remove();
    } catch (e) {}
    videoElement = null;
  }
}

// ─── Debug Info ──────────────────────────────────────────────────

export function getWakeLockInfo() {
  return {
    isActive,
    currentMethod,
    isIOS,
    isSafari,
    isStandalone,
    nativeWakeLock: nativeWakeLock ? { released: nativeWakeLock.released } : null,
    noSleepInstance: noSleepInstance ? { enabled: noSleepInstance.enabled } : null,
    videoElement: videoElement ? { paused: videoElement.paused } : null
  };
}
