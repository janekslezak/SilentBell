// ─── Audio Context Module ─────────────────────────────────────────
// Audio context management with iOS-specific handling.

let audioCtx = null;
let isUnlocked = false;
let scheduledSource = null;
let audioBuffers = new Map();

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

    // iOS: Play a short audible sound to unlock - must be audible, not silent
    if (isIOS) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.001; // Very quiet but audible
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.01); // 10ms beep
      
      log('Played unlock beep');
    }

    // Resume the context
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      await ctx.resume();
      log('AudioContext resumed, state:', ctx.state);
    }

    isUnlocked = ctx.state === 'running';
    log('Audio unlocked, state:', ctx.state);

    return ctx;
  } catch (e) {
    log('unlockAudio error:', e.message);
    throw e;
  }
}

// Load audio file into buffer for scheduling
export async function loadAudioBuffer(url) {
  const ctx = getAudioContext();
  
  if (audioBuffers.has(url)) {
    return audioBuffers.get(url);
  }
  
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioBuffers.set(url, audioBuffer);
    log('Loaded audio buffer:', url);
    return audioBuffer;
  } catch (e) {
    log('Failed to load audio buffer:', url, e.message);
    throw e;
  }
}

// Schedule a sound to play after a delay (for iOS countdown)
export function scheduleSound(buffer, delaySeconds, volume = 1.0) {
  const ctx = getAudioContext();
  
  // Cancel any previously scheduled sound
  cancelScheduledSound();
  
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  
  source.buffer = buffer;
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  const startTime = ctx.currentTime + delaySeconds;
  source.start(startTime);
  
  scheduledSource = source;
  
  log('Scheduled sound in', delaySeconds, 'seconds at time', startTime);
  
  // Return cancel function
  return () => {
    if (scheduledSource) {
      try {
        scheduledSource.stop();
        scheduledSource.disconnect();
        log('Cancelled scheduled sound');
      } catch (e) {
        // Already played or stopped
      }
      scheduledSource = null;
    }
  };
}

export function cancelScheduledSound() {
  if (scheduledSource) {
    try {
      scheduledSource.stop();
      scheduledSource.disconnect();
    } catch (e) {}
    scheduledSource = null;
    log('Cancelled previous scheduled sound');
  }
}

export function isAudioUnlocked() {
  return isUnlocked && audioCtx?.state === 'running';
}

// Handle visibility changes - try to resume when page becomes visible
if (isIOS) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      log('Page visible, attempting to resume AudioContext...');
      audioCtx.resume().then(() => {
        log('AudioContext resumed on visibility change, state:', audioCtx.state);
        isUnlocked = audioCtx.state === 'running';
      }).catch((e) => {
        log('Failed to resume on visibility change:', e.message);
      });
    }
  });
}
